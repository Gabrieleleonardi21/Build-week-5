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
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserRepository;
import it.epicode.eventi.user.UserStatus;
import it.epicode.eventi.user.VerificationCode;
import it.epicode.eventi.user.VerificationCodeCreated;
import it.epicode.eventi.user.VerificationCodeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

	@Mock UserRepository userRepository;
	@Mock VerificationCodeRepository codeRepository;
	@Mock AuthenticationManager authenticationManager;
	@Mock ApplicationEventPublisher events;
	// Costo 4 invece di 12: stesso algoritmo, test veloci.
	@Spy PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
	@Spy AttemptLimiter limiter = new AttemptLimiter();
	@InjectMocks AuthService authService;

	// ---------- register ----------

	@Test
	void register_savesNormalizedEmailBcryptHashAndSendsCode() {
		User saved = authService.register(registerRequest("  Anna@Mail.IT ", "password123"));

		assertThat(saved.getEmail()).isEqualTo("anna@mail.it");
		assertThat(saved.getPasswordHash()).startsWith("$2a$").isNotEqualTo("password123");
		assertThat(passwordEncoder.matches("password123", saved.getPasswordHash())).isTrue();
		assertThat(saved.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
		assertThat(saved.getRole()).isEqualTo(Role.USER);
		verify(userRepository).save(saved);

		ArgumentCaptor<VerificationCodeCreated> event = ArgumentCaptor.forClass(VerificationCodeCreated.class);
		verify(events).publishEvent(event.capture());
		assertThat(event.getValue().email()).isEqualTo("anna@mail.it");
		assertThat(event.getValue().code()).matches("[0-9]{6}");
		verify(codeRepository).save(any(VerificationCode.class));
	}

	@Test
	void register_existingEmail_throwsConflict() {
		when(userRepository.existsByEmail("anna@mail.it")).thenReturn(true);

		assertThatThrownBy(() -> authService.register(registerRequest("anna@mail.it", "password123")))
				.isInstanceOf(ConflictException.class);
		verify(userRepository, never()).save(any());
	}

	@Test
	void register_passwordOver72Bytes_throwsBadRequest() {
		// 40 caratteri accentati = 80 byte in UTF-8: passa @Size(max = 72) ma non BCrypt.
		String password = "è".repeat(40);

		assertThatThrownBy(() -> authService.register(registerRequest("anna@mail.it", password)))
				.isInstanceOf(BadRequestException.class);
	}

	// ---------- verify ----------

	@Test
	void verify_correctCode_activatesAccount() {
		User user = pendingUser();
		VerificationCode code = new VerificationCode(user, "123456", OffsetDateTime.now().plusMinutes(10));
		when(userRepository.findByEmail("anna@mail.it")).thenReturn(Optional.of(user));
		when(codeRepository.findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(user)).thenReturn(Optional.of(code));

		authService.verify(new VerifyRequest("Anna@mail.it", "123456"));

		assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
		assertThat(user.getEmailVerifiedAt()).isNotNull();
		assertThat(code.getUsedAt()).isNotNull();
	}

	@Test
	void verify_wrongCode_throwsAndCountsAttempt() {
		User user = pendingUser();
		VerificationCode code = new VerificationCode(user, "123456", OffsetDateTime.now().plusMinutes(10));
		when(userRepository.findByEmail("anna@mail.it")).thenReturn(Optional.of(user));
		when(codeRepository.findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(user)).thenReturn(Optional.of(code));

		assertThatThrownBy(() -> authService.verify(new VerifyRequest("anna@mail.it", "654321")))
				.isInstanceOf(BadRequestException.class);
		assertThat(user.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
		verify(limiter).record("verify:anna@mail.it");
	}

	@Test
	void verify_expiredCode_throwsBadRequest() {
		User user = pendingUser();
		VerificationCode code = new VerificationCode(user, "123456", OffsetDateTime.now().minusMinutes(1));
		when(userRepository.findByEmail("anna@mail.it")).thenReturn(Optional.of(user));
		when(codeRepository.findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(user)).thenReturn(Optional.of(code));

		assertThatThrownBy(() -> authService.verify(new VerifyRequest("anna@mail.it", "123456")))
				.isInstanceOf(BadRequestException.class);
		assertThat(user.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
	}

	@Test
	void verify_afterMaxWrongAttempts_throwsTooManyRequests() {
		when(userRepository.findByEmail("anna@mail.it")).thenReturn(Optional.empty());
		for (int i = 0; i < AuthService.MAX_VERIFY_ATTEMPTS; i++) {
			assertThatThrownBy(() -> authService.verify(new VerifyRequest("anna@mail.it", "000000")))
					.isInstanceOf(BadRequestException.class);
		}

		assertThatThrownBy(() -> authService.verify(new VerifyRequest("anna@mail.it", "000000")))
				.isInstanceOf(TooManyRequestsException.class);
	}

	// ---------- resend ----------

	@Test
	void resendCode_unknownEmail_doesNothingButDoesNotFail() {
		when(userRepository.findByEmail("nessuno@mail.it")).thenReturn(Optional.empty());

		authService.resendCode(new ResendCodeRequest("nessuno@mail.it"));

		verify(events, never()).publishEvent(any());
	}

	@Test
	void resendCode_pendingUser_invalidatesOldCodesAndSendsNew() {
		User user = pendingUser();
		when(userRepository.findByEmail("anna@mail.it")).thenReturn(Optional.of(user));

		authService.resendCode(new ResendCodeRequest("anna@mail.it"));

		verify(codeRepository).invalidateActiveCodes(any(User.class), any(OffsetDateTime.class));
		verify(events).publishEvent(any(VerificationCodeCreated.class));
	}

	// ---------- authenticate ----------

	@Test
	void authenticate_activeUser_returnsPrincipalWithoutHash() {
		loginSucceedsWith(UserStatus.ACTIVE);

		AuthUser user = authService.authenticate("Anna@Mail.it", "password123", "1.2.3.4");

		assertThat(user.email()).isEqualTo("anna@mail.it");
		assertThat(user.passwordHash()).isNull();
	}

	@Test
	void authenticate_wrongPassword_throwsBadCredentialsAndCountsAttempt() {
		when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));

		assertThatThrownBy(() -> authService.authenticate("anna@mail.it", "sbagliata", "1.2.3.4"))
				.isInstanceOf(BadCredentialsException.class);
		verify(limiter).record("login:email:anna@mail.it");
		verify(limiter).record("login:ip:1.2.3.4");
	}

	@Test
	void authenticate_afterMaxFailures_throwsTooManyRequestsWithoutCheckingPassword() {
		when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
		for (int i = 0; i < AuthService.MAX_LOGIN_PER_EMAIL; i++) {
			assertThatThrownBy(() -> authService.authenticate("anna@mail.it", "sbagliata", "1.2.3.4"))
					.isInstanceOf(BadCredentialsException.class);
		}

		assertThatThrownBy(() -> authService.authenticate("anna@mail.it", "password123", "1.2.3.4"))
				.isInstanceOf(TooManyRequestsException.class);
		verify(authenticationManager, org.mockito.Mockito.times(AuthService.MAX_LOGIN_PER_EMAIL)).authenticate(any());
	}

	@Test
	void authenticate_pendingUser_throwsEmailNotVerified() {
		loginSucceedsWith(UserStatus.PENDING_VERIFICATION);

		assertThatThrownBy(() -> authService.authenticate("anna@mail.it", "password123", "1.2.3.4"))
				.isInstanceOf(AccountNotActiveException.class)
				.extracting("code").isEqualTo("EMAIL_NOT_VERIFIED");
	}

	@Test
	void authenticate_deactivatedUser_throwsAccountDeactivated() {
		loginSucceedsWith(UserStatus.DEACTIVATED);

		assertThatThrownBy(() -> authService.authenticate("anna@mail.it", "password123", "1.2.3.4"))
				.isInstanceOf(AccountNotActiveException.class)
				.extracting("code").isEqualTo("ACCOUNT_DEACTIVATED");
	}

	// ---------- helper ----------

	private void loginSucceedsWith(UserStatus status) {
		AuthUser principal = new AuthUser(UUID.randomUUID(), "anna@mail.it", "$2a$04$hash", Role.USER, status);
		when(authenticationManager.authenticate(any())).thenReturn(
				UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities()));
	}

	private static RegisterRequest registerRequest(String email, String password) {
		return new RegisterRequest(email, password, "Anna", "Rossi", LocalDate.of(2000, 1, 1), true);
	}

	private static User pendingUser() {
		return new User("anna@mail.it", "$2a$04$hash", "Anna", "Rossi", LocalDate.of(2000, 1, 1), OffsetDateTime.now());
	}
}
