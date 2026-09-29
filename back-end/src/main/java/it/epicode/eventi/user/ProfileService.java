package it.epicode.eventi.user;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.common.exception.TooManyRequestsException;
import it.epicode.eventi.common.storage.ImageStorageService;
import it.epicode.eventi.common.storage.StoredFilesRemoved;
import it.epicode.eventi.security.AttemptLimiter;
import it.epicode.eventi.security.UserSessions;
import it.epicode.eventi.user.dto.AddressDto;
import it.epicode.eventi.user.dto.ChangePasswordRequest;
import it.epicode.eventi.user.dto.DeleteAccountRequest;
import it.epicode.eventi.user.dto.ProfileResponse;
import it.epicode.eventi.user.dto.UpdateProfileRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.List;
import java.util.UUID;

/**
 * Il profilo dell'utente loggato (/api/me): dati anagrafici, password, avatar e
 * cancellazione dell'account. Si lavora sempre sull'utente della sessione, mai su
 * un id arrivato dalla richiesta (SECURITY.md §2).
 */
@Service
public class ProfileService {

	static final int MAX_PASSWORD_ATTEMPTS = 5;
	private static final int BCRYPT_MAX_BYTES = 72;

	private static final Logger log = LoggerFactory.getLogger(ProfileService.class);

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final AttemptLimiter limiter;
	private final UserSessions userSessions;
	private final ImageStorageService storage;
	private final TransactionTemplate tx;
	private final ApplicationEventPublisher events;

	public ProfileService(UserRepository userRepository, PasswordEncoder passwordEncoder, AttemptLimiter limiter,
			UserSessions userSessions, ImageStorageService storage, PlatformTransactionManager transactionManager,
			ApplicationEventPublisher events) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.limiter = limiter;
		this.userSessions = userSessions;
		this.storage = storage;
		this.tx = new TransactionTemplate(transactionManager);
		this.events = events;
	}

	@Transactional
	public ProfileResponse update(User me, UpdateProfileRequest req) {
		User user = load(me);
		user.setFirstName(req.firstName().trim());
		user.setLastName(req.lastName().trim());
		user.setBirthDate(req.birthDate());
		user.setPhone(blankToNull(req.phone()));
		user.setAddress(toAddress(req.address()));
		return ProfileResponse.from(user);
	}

	/**
	 * Le altre sessioni dell'utente si chiudono (es. un dispositivo rubato o dimenticato);
	 * quella da cui si cambia la password resta aperta.
	 */
	@Transactional
	public void changePassword(User me, ChangePasswordRequest req, String currentSessionId) {
		User user = load(me);
		checkPassword(user, req.currentPassword());
		if (exceedsBcryptLimit(req.newPassword())) {
			throw new BadRequestException("Password troppo lunga");
		}
		if (req.newPassword().equals(req.currentPassword())) {
			throw new BadRequestException("La nuova password deve essere diversa da quella attuale");
		}
		user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
		userSessions.invalidateAllExcept(user.getEmail(), currentSessionId);
		log.info("password_changed user={}", user.getId());
	}

	/**
	 * Upload fuori transazione, come in EventImageService: Cloudinary impiega secondi e non
	 * deve tenere occupata una connessione del DB. Se il salvataggio fallisce il file appena
	 * caricato si cancella subito. Il vecchio avatar si cancella da Cloudinary dopo il commit.
	 */
	public ProfileResponse setAvatar(User me, MultipartFile file) {
		ImageStorageService.StoredImage stored = storage.upload(file);
		try {
			return tx.execute(status -> {
				User user = load(me);
				removeAvatarFileAfterCommit(user);
				user.setAvatarUrl(stored.url());
				user.setAvatarStorageKey(stored.storageKey());
				return ProfileResponse.from(user);
			});
		} catch (RuntimeException ex) {
			storage.deleteQuietly(stored.storageKey());
			throw ex;
		}
	}

	@Transactional
	public void deleteAvatar(User me) {
		User user = load(me);
		if (user.getAvatarUrl() == null) {
			throw new NotFoundException("Nessun avatar da cancellare");
		}
		clearAvatar(user);
	}

	/**
	 * Cancellazione dell'account = anonimizzazione (D15). La riga resta, perche' eventi,
	 * ticket e amicizie la referenziano; spariscono i dati personali e l'accesso.
	 * Eventi, ticket e amicizie restano e compaiono a nome "Utente eliminato".
	 */
	@Transactional
	public void deleteAccount(User me, DeleteAccountRequest req) {
		User user = load(me);
		// Altrimenti si potrebbe restare senza SUPERADMIN: prima un altro gli cambia il ruolo.
		if (user.getRole() == Role.SUPERADMIN) {
			throw new BadRequestException("Un SUPERADMIN non puo' cancellare il proprio account");
		}
		checkPassword(user, req.password());

		String oldEmail = user.getEmail();
		// Unica e non recapitabile (.invalid, RFC 2606): l'indirizzo vero si libera per una nuova registrazione.
		user.setEmail("anonimo-" + user.getId() + "@anonimizzato.invalid");
		// Hash di una password casuale che nessuno conosce: l'account non e' piu' accessibile.
		user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
		user.setFirstName("Utente");
		user.setLastName("eliminato");
		user.setBirthDate(null);
		user.setAddress(null);
		user.setPhone(null);
		// D15: anche la foto e' un dato personale, il file sparisce da Cloudinary.
		clearAvatar(user);
		user.setStatus(UserStatus.DEACTIVATED);
		user.setAnonymizedAt(OffsetDateTime.now());

		// Le sessioni sono indicizzate per email: si chiudono con quella vecchia.
		userSessions.invalidateAll(oldEmail);
		log.info("account_anonymized user={}", user.getId());
	}

	private User load(User me) {
		return userRepository.findById(me.getId())
				.orElseThrow(() -> new NotFoundException("Utente non trovato"));
	}

	/** Password attuale, con limite di tentativi: una sessione rubata non puo' provarle tutte. */
	private void checkPassword(User user, String password) {
		String key = "password:" + user.getId();
		if (limiter.isBlocked(key, MAX_PASSWORD_ATTEMPTS)) {
			throw new TooManyRequestsException(AttemptLimiter.WINDOW.toSeconds());
		}
		if (exceedsBcryptLimit(password) || !passwordEncoder.matches(password, user.getPasswordHash())) {
			limiter.record(key);
			throw new BadRequestException("Password attuale non corretta");
		}
		limiter.reset(key);
	}

	private static Address toAddress(AddressDto dto) {
		if (dto == null) {
			return null;
		}
		Address address = new Address();
		address.setStreet(blankToNull(dto.street()));
		address.setCity(blankToNull(dto.city()));
		address.setPostalCode(blankToNull(dto.postalCode()));
		address.setProvince(upperOrNull(dto.province()));
		address.setCountry(upperOrNull(dto.country()));
		return address;
	}

	// Come in AuthService: BCrypt usa solo i primi 72 byte e Spring rifiuta password piu' lunghe.
	private static boolean exceedsBcryptLimit(String password) {
		return password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES;
	}

	private static String upperOrNull(String value) {
		String trimmed = blankToNull(value);
		return trimmed == null ? null : trimmed.toUpperCase(Locale.ROOT);
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	private void clearAvatar(User user) {
		removeAvatarFileAfterCommit(user);
		user.setAvatarUrl(null);
		user.setAvatarStorageKey(null);
	}

	// Dopo il commit (ImageStorageService): se la transazione fallisce, riga e file restano allineati.
	// Gli avatar caricati prima della migrazione 003 non hanno la chiave e non si possono cancellare.
	private void removeAvatarFileAfterCommit(User user) {
		if (user.getAvatarStorageKey() != null) {
			events.publishEvent(new StoredFilesRemoved(List.of(user.getAvatarStorageKey())));
		}
	}
}
