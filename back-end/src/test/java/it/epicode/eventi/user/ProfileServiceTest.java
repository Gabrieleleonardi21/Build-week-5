package it.epicode.eventi.user;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.common.exception.TooManyRequestsException;
import it.epicode.eventi.common.storage.ImageStorageService;
import it.epicode.eventi.security.AttemptLimiter;
import it.epicode.eventi.security.UserSessions;
import it.epicode.eventi.user.dto.AddressDto;
import it.epicode.eventi.user.dto.ChangePasswordRequest;
import it.epicode.eventi.user.dto.DeleteAccountRequest;
import it.epicode.eventi.user.dto.ProfileResponse;
import it.epicode.eventi.user.dto.UpdateProfileRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

	private static final String PASSWORD = "Password1!";
	private static final String NEW_PASSWORD = "NuovaPassword2!";
	// Stesso algoritmo della produzione, costo minimo: i test restano veloci.
	private static final PasswordEncoder ENCODER = new BCryptPasswordEncoder(4);
	private static final MultipartFile FILE = new MockMultipartFile("file", "avatar.png", "image/png", new byte[] {1});
	private static final ImageStorageService.StoredImage STORED =
			new ImageStorageService.StoredImage("https://img/nuovo.png", "eventi-dev/nuovo");

	@Mock UserRepository userRepository;
	@Mock UserSessions userSessions;
	@Mock ImageStorageService storage;
	// Mock: TransactionTemplate chiama getTransaction/commit, qui senza un DB vero.
	@Mock PlatformTransactionManager transactionManager;

	// Limiter vero: i test sul 429 contano davvero i tentativi.
	private final AttemptLimiter limiter = new AttemptLimiter();
	private ProfileService profileService;
	private User anna;

	@BeforeEach
	void setUp() {
		profileService = new ProfileService(userRepository, ENCODER, limiter, userSessions, storage, transactionManager);
		anna = user("anna@mail.it", Role.USER);
	}

	// ---------- update ----------

	@Test
	void update_replacesDataAndNormalizesAddress() {
		stubLoad(anna);
		UpdateProfileRequest req = new UpdateProfileRequest(" Anna Maria ", "Bianchi", LocalDate.of(1999, 5, 20),
				"  ", new AddressDto("Via Roma 1", "Milano", "20100", "mi", "it"));

		ProfileResponse res = profileService.update(anna, req);

		assertThat(anna.getFirstName()).isEqualTo("Anna Maria");
		assertThat(anna.getLastName()).isEqualTo("Bianchi");
		assertThat(anna.getBirthDate()).isEqualTo(LocalDate.of(1999, 5, 20));
		assertThat(anna.getPhone()).isNull();
		assertThat(anna.getAddress().getProvince()).isEqualTo("MI");
		assertThat(anna.getAddress().getCountry()).isEqualTo("IT");
		assertThat(res.address().city()).isEqualTo("Milano");
	}

	@Test
	void update_withoutAddress_clearsItButResponseKeepsTheObject() {
		stubLoad(anna);

		ProfileResponse res = profileService.update(anna,
				new UpdateProfileRequest("Anna", "Rossi", LocalDate.of(2000, 1, 1), null, null));

		assertThat(anna.getAddress()).isNull();
		assertThat(res.address()).isNotNull();
		assertThat(res.address().street()).isNull();
	}

	// ---------- changePassword ----------

	@Test
	void changePassword_ok_savesNewHashAndClosesOtherSessions() {
		stubLoad(anna);

		profileService.changePassword(anna, new ChangePasswordRequest(PASSWORD, NEW_PASSWORD), "sessione-corrente");

		assertThat(ENCODER.matches(NEW_PASSWORD, anna.getPasswordHash())).isTrue();
		verify(userSessions).invalidateAllExcept("anna@mail.it", "sessione-corrente");
	}

	@Test
	void changePassword_wrongCurrentPassword_throwsBadRequestAndKeepsHash() {
		stubLoad(anna);
		String oldHash = anna.getPasswordHash();

		assertThatThrownBy(() -> profileService.changePassword(anna,
				new ChangePasswordRequest("sbagliata", NEW_PASSWORD), "s"))
				.isInstanceOf(BadRequestException.class);
		assertThat(anna.getPasswordHash()).isEqualTo(oldHash);
		verify(userSessions, never()).invalidateAllExcept(anyString(), anyString());
	}

	@Test
	void changePassword_sameAsCurrent_throwsBadRequest() {
		stubLoad(anna);

		assertThatThrownBy(() -> profileService.changePassword(anna, new ChangePasswordRequest(PASSWORD, PASSWORD), "s"))
				.isInstanceOf(BadRequestException.class);
	}

	@Test
	void changePassword_tooManyWrongAttempts_throws429EvenWithRightPassword() {
		stubLoad(anna);
		ChangePasswordRequest wrong = new ChangePasswordRequest("sbagliata", NEW_PASSWORD);
		for (int i = 0; i < ProfileService.MAX_PASSWORD_ATTEMPTS; i++) {
			assertThatThrownBy(() -> profileService.changePassword(anna, wrong, "s"))
					.isInstanceOf(BadRequestException.class);
		}

		assertThatThrownBy(() -> profileService.changePassword(anna, new ChangePasswordRequest(PASSWORD, NEW_PASSWORD), "s"))
				.isInstanceOf(TooManyRequestsException.class);
		assertThat(ENCODER.matches(PASSWORD, anna.getPasswordHash())).isTrue();
	}

	// ---------- avatar ----------

	@Test
	void setAvatar_ok_savesNewUrl() {
		stubLoad(anna);
		when(storage.upload(FILE)).thenReturn(STORED);

		ProfileResponse res = profileService.setAvatar(anna, FILE);

		assertThat(res.avatarUrl()).isEqualTo("https://img/nuovo.png");
		assertThat(anna.getAvatarUrl()).isEqualTo("https://img/nuovo.png");
		verify(storage, never()).deleteQuietly(anyString());
	}

	@Test
	void setAvatar_saveFailsAfterUpload_deletesUploadedFile() {
		when(storage.upload(FILE)).thenReturn(STORED);
		when(userRepository.findById(anna.getId())).thenReturn(Optional.empty());

		assertThatThrownBy(() -> profileService.setAvatar(anna, FILE)).isInstanceOf(NotFoundException.class);
		verify(storage).deleteQuietly("eventi-dev/nuovo");
	}

	@Test
	void setAvatar_uploadFails_changesNothing() {
		when(storage.upload(FILE)).thenThrow(new BadRequestException("Formati ammessi: JPEG, PNG, WebP"));

		assertThatThrownBy(() -> profileService.setAvatar(anna, FILE)).isInstanceOf(BadRequestException.class);
		assertThat(anna.getAvatarUrl()).isEqualTo("https://img/avatar.png");
		verify(userRepository, never()).findById(any());
	}

	@Test
	void deleteAvatar_removesUrl() {
		stubLoad(anna);

		profileService.deleteAvatar(anna);

		assertThat(anna.getAvatarUrl()).isNull();
	}

	@Test
	void deleteAvatar_withoutAvatar_throwsNotFound() {
		anna.setAvatarUrl(null);
		stubLoad(anna);

		assertThatThrownBy(() -> profileService.deleteAvatar(anna)).isInstanceOf(NotFoundException.class);
	}

	// ---------- deleteAccount (anonimizzazione, D15) ----------

	@Test
	void deleteAccount_ok_anonymizesPersonalDataAndClosesSessions() {
		stubLoad(anna);

		profileService.deleteAccount(anna, new DeleteAccountRequest(PASSWORD));

		assertThat(anna.getEmail()).isEqualTo("anonimo-" + anna.getId() + "@anonimizzato.invalid");
		assertThat(anna.getFirstName()).isEqualTo("Utente");
		assertThat(anna.getLastName()).isEqualTo("eliminato");
		assertThat(anna.getBirthDate()).isNull();
		assertThat(anna.getAddress()).isNull();
		assertThat(anna.getPhone()).isNull();
		assertThat(anna.getAvatarUrl()).isNull();
		assertThat(anna.getStatus()).isEqualTo(UserStatus.DEACTIVATED);
		assertThat(anna.getAnonymizedAt()).isNotNull();
		// Con la vecchia password non si entra piu'.
		assertThat(ENCODER.matches(PASSWORD, anna.getPasswordHash())).isFalse();
		// Le sessioni sono indicizzate con l'email di prima.
		verify(userSessions).invalidateAll("anna@mail.it");
	}

	@Test
	void deleteAccount_wrongPassword_throwsBadRequestAndChangesNothing() {
		stubLoad(anna);

		assertThatThrownBy(() -> profileService.deleteAccount(anna, new DeleteAccountRequest("sbagliata")))
				.isInstanceOf(BadRequestException.class);
		assertThat(anna.getEmail()).isEqualTo("anna@mail.it");
		assertThat(anna.getAnonymizedAt()).isNull();
		assertThat(anna.getStatus()).isEqualTo(UserStatus.ACTIVE);
		verify(userSessions, never()).invalidateAll(anyString());
	}

	@Test
	void deleteAccount_superadmin_throwsBadRequest() {
		User superadmin = user("super@mail.it", Role.SUPERADMIN);
		stubLoad(superadmin);

		assertThatThrownBy(() -> profileService.deleteAccount(superadmin, new DeleteAccountRequest(PASSWORD)))
				.isInstanceOf(BadRequestException.class);
		assertThat(superadmin.getAnonymizedAt()).isNull();
		verify(userSessions, never()).invalidateAll(anyString());
	}

	@Test
	void deleteAccount_moderator_isAllowed() {
		User moderator = user("mod@mail.it", Role.MODERATOR);
		stubLoad(moderator);

		profileService.deleteAccount(moderator, new DeleteAccountRequest(PASSWORD));

		assertThat(moderator.getAnonymizedAt()).isNotNull();
	}

	private void stubLoad(User user) {
		when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
	}

	/** User vero (non mock), con password nota: i test controllano cosa cambia davvero. */
	private static User user(String email, Role role) {
		User u = new User(email, ENCODER.encode(PASSWORD), "Anna", "Rossi", LocalDate.of(2000, 1, 1),
				OffsetDateTime.now());
		// L'id lo genera Hibernate al salvataggio: qui non c'e' database.
		ReflectionTestUtils.setField(u, "id", UUID.randomUUID());
		u.setRole(role);
		u.setStatus(UserStatus.ACTIVE);
		u.setPhone("+39 333 1234567");
		u.setAvatarUrl("https://img/avatar.png");
		return u;
	}
}
