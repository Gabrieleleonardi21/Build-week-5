package it.epicode.eventi.auth;

import it.epicode.eventi.auth.dto.RegisterRequest;
import it.epicode.eventi.auth.dto.ResendCodeRequest;
import it.epicode.eventi.auth.dto.VerifyRequest;
import it.epicode.eventi.common.exception.AccountNotActiveException;
import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ConflictException;
import it.epicode.eventi.common.exception.TooManyRequestsException;
import it.epicode.eventi.security.AttemptLimiter;
import it.epicode.eventi.security.AuthUser;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserRepository;
import it.epicode.eventi.user.UserStatus;
import it.epicode.eventi.user.VerificationCode;
import it.epicode.eventi.user.VerificationCodeCreated;
import it.epicode.eventi.user.VerificationCodeRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Locale;

/**
 * Registrazione, verifica email e controllo delle credenziali.
 * La sessione HTTP la crea AuthController: qui niente request/response.
 */
@Service
public class AuthService {

	static final int CODE_VALIDITY_MINUTES = 15;
	static final int MAX_LOGIN_PER_EMAIL = 5;
	// Alto: dietro un proxy piu' utenti possono arrivare con lo stesso IP.
	static final int MAX_LOGIN_PER_IP = 30;
	static final int MAX_VERIFY_ATTEMPTS = 5;
	static final int MAX_RESENDS = 3;
	private static final int BCRYPT_MAX_BYTES = 72;

	private final UserRepository userRepository;
	private final VerificationCodeRepository codeRepository;
	private final PasswordEncoder passwordEncoder;
	private final AuthenticationManager authenticationManager;
	private final AttemptLimiter limiter;
	private final ApplicationEventPublisher events;
	private final SecureRandom random = new SecureRandom();

	public AuthService(UserRepository userRepository, VerificationCodeRepository codeRepository,
			PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager,
			AttemptLimiter limiter, ApplicationEventPublisher events) {
		this.userRepository = userRepository;
		this.codeRepository = codeRepository;
		this.passwordEncoder = passwordEncoder;
		this.authenticationManager = authenticationManager;
		this.limiter = limiter;
		this.events = events;
	}

	// D05: email sempre minuscola e senza spazi, in DB e nelle ricerche.
	static String normalizeEmail(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	@Transactional
	public User register(RegisterRequest req) {
		if (exceedsBcryptLimit(req.password())) {
			throw new BadRequestException("Password troppo lunga");
		}
		String email = normalizeEmail(req.email());
		if (userRepository.existsByEmail(email)) {
			throw new ConflictException("Email gia' registrata");
		}
		// L'UNIQUE su email copre due registrazioni simultanee (409 dal GlobalExceptionHandler).
		User user = new User(email, passwordEncoder.encode(req.password()),
				req.firstName().trim(), req.lastName().trim(), req.birthDate(), OffsetDateTime.now());
		userRepository.save(user);
		issueCode(user);
		return user;
	}

	/** Codice corretto e non scaduto: l'account passa ad ACTIVE. */
	@Transactional
	public void verify(VerifyRequest req) {
		String email = normalizeEmail(req.email());
		String key = "verify:" + email;
		if (limiter.isBlocked(key, MAX_VERIFY_ATTEMPTS)) {
			throw tooManyRequests();
		}
		OffsetDateTime now = OffsetDateTime.now();
		User user = userRepository.findByEmail(email)
				.filter(u -> u.getStatus() == UserStatus.PENDING_VERIFICATION)
				.orElse(null);
		VerificationCode code = user == null ? null
				: codeRepository.findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(user).orElse(null);
		// Stesso errore per email inesistente, gia' attiva o codice sbagliato: non si rivela nulla.
		if (code == null || !code.getExpiresAt().isAfter(now) || !sameCode(code.getCode(), req.code())) {
			limiter.record(key);
			throw new BadRequestException("Codice non valido o scaduto");
		}
		code.setUsedAt(now);
		user.setStatus(UserStatus.ACTIVE);
		user.setEmailVerifiedAt(now);
		limiter.reset(key);
	}

	/** Risposta identica anche se l'email non esiste o e' gia' attiva. */
	@Transactional
	public void resendCode(ResendCodeRequest req) {
		String email = normalizeEmail(req.email());
		String key = "resend:" + email;
		if (limiter.isBlocked(key, MAX_RESENDS)) {
			throw tooManyRequests();
		}
		limiter.record(key);
		userRepository.findByEmail(email)
				.filter(u -> u.getStatus() == UserStatus.PENDING_VERIFICATION)
				.ifPresent(this::issueCode);
	}

	/**
	 * Controlla email e password con limite di tentativi.
	 * Restituisce l'utente senza hash, pronto da mettere in sessione.
	 */
	public AuthUser authenticate(String rawEmail, String password, String clientIp) {
		String email = normalizeEmail(rawEmail);
		String emailKey = "login:email:" + email;
		String ipKey = "login:ip:" + clientIp;
		if (limiter.isBlocked(emailKey, MAX_LOGIN_PER_EMAIL) || limiter.isBlocked(ipKey, MAX_LOGIN_PER_IP)) {
			throw tooManyRequests();
		}

		AuthUser user;
		try {
			if (exceedsBcryptLimit(password)) {
				throw new BadCredentialsException("Password troppo lunga");
			}
			user = (AuthUser) authenticationManager
					.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email, password))
					.getPrincipal();
		} catch (AuthenticationException ex) {
			limiter.record(emailKey);
			limiter.record(ipKey);
			throw new BadCredentialsException("Credenziali non valide");
		}

		// Password corretta ma account non utilizzabile: si dice perche', senza creare la sessione.
		switch (user.status()) {
			case PENDING_VERIFICATION -> throw new AccountNotActiveException("EMAIL_NOT_VERIFIED",
					"Conferma la tua email prima di accedere");
			case DEACTIVATED -> throw new AccountNotActiveException("ACCOUNT_DEACTIVATED", "Account disattivato");
			case ACTIVE -> limiter.reset(emailKey);
		}
		return user.withoutPassword();
	}

	private void issueCode(User user) {
		OffsetDateTime now = OffsetDateTime.now();
		codeRepository.invalidateActiveCodes(user, now);
		String code = "%06d".formatted(random.nextInt(1_000_000));
		codeRepository.save(new VerificationCode(user, code, now.plusMinutes(CODE_VALIDITY_MINUTES)));
		// L'email parte dopo il commit (VerificationMailListener).
		events.publishEvent(new VerificationCodeCreated(user.getEmail(), user.getFirstName(), code,
				CODE_VALIDITY_MINUTES));
	}

	// BCrypt usa solo i primi 72 byte e Spring rifiuta password piu' lunghe con un'eccezione.
	private static boolean exceedsBcryptLimit(String password) {
		return password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES;
	}

	// Confronto a tempo costante: la durata non dice quante cifre sono giuste.
	private static boolean sameCode(String expected, String given) {
		return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), given.getBytes(StandardCharsets.UTF_8));
	}

	private static TooManyRequestsException tooManyRequests() {
		return new TooManyRequestsException(AttemptLimiter.WINDOW.toSeconds());
	}
}
