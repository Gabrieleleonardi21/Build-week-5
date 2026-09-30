package it.epicode.eventi.auth;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.common.exception.AccountNotActiveException;
import it.epicode.eventi.common.exception.TooManyRequestsException;
import it.epicode.eventi.security.AuthUser;
import it.epicode.eventi.security.CsrfController;
import it.epicode.eventi.security.SecurityConfig;
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserStatus;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Controller auth + la vera SecurityConfig: rotte pubbliche, CSRF, sessione, codici di errore. */
@WebMvcTest({AuthController.class, CsrfController.class})
@Import(SecurityConfig.class)
class AuthControllerTest {

	private static final String LOGIN_JSON = "{\"email\":\"anna@mail.it\",\"password\":\"password123\"}";

	@Autowired MockMvc mvc;

	@MockitoBean AuthService authService;
	@MockitoBean CurrentUsers currentUsers;

	@Test
	void csrf_anonymous_returnsToken() throws Exception {
		mvc.perform(get("/api/auth/csrf"))
				.andExpect(status().isOk())
				// Il nome non si verifica: csrf() di spring-security-test sostituisce il repository
				// nel contesto condiviso tra i test.
				.andExpect(jsonPath("$.headerName").isNotEmpty())
				.andExpect(jsonPath("$.token").isNotEmpty());
	}

	@Test
	void me_anonymous_returns401() throws Exception {
		mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
	}

	@Test
	void me_loggedIn_returnsUserWithoutPasswordHash() throws Exception {
		when(currentUsers.require(any())).thenReturn(anna());

		mvc.perform(get("/api/auth/me").with(user("anna@mail.it")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("anna@mail.it"))
				.andExpect(jsonPath("$.role").value("USER"))
				.andExpect(jsonPath("$.passwordHash").doesNotExist());
	}

	@Test
	void register_withoutCsrf_returns403() throws Exception {
		mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void register_invalidData_returns400WithFieldErrors() throws Exception {
		mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
						.content("{\"email\":\"non-email\",\"password\":\"corta\",\"firstName\":\"Anna\","
								+ "\"lastName\":\"Rossi\",\"birthDate\":\"2000-01-01\",\"privacyAccepted\":false}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.email").exists())
				.andExpect(jsonPath("$.errors.password").exists())
				.andExpect(jsonPath("$.errors.privacyAccepted").exists());
	}

	@Test
	void login_withoutCsrf_returns403() throws Exception {
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(LOGIN_JSON))
				.andExpect(status().isForbidden());
	}

	@Test
	void login_success_savesSecurityContextInSessionAndRotatesCsrf() throws Exception {
		when(authService.authenticate(eq("anna@mail.it"), eq("password123"), anyString()))
				.thenReturn(new AuthUser(UUID.randomUUID(), "anna@mail.it", null, Role.USER, UserStatus.ACTIVE));
		when(currentUsers.require(any())).thenReturn(anna());

		// Il browser arriva con il cookie XSRF-TOKEN anonimo, che il login deve cancellare.
		mvc.perform(post("/api/auth/login").with(csrf()).cookie(new Cookie("XSRF-TOKEN", "anonimo"))
						.contentType(MediaType.APPLICATION_JSON).content(LOGIN_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("anna@mail.it"))
				.andExpect(request().sessionAttribute("SPRING_SECURITY_CONTEXT", notNullValue()))
				// Il vecchio token CSRF viene cancellato: il FE deve rileggerlo.
				.andExpect(cookie().maxAge("XSRF-TOKEN", 0));
	}

	@Test
	void login_badCredentials_returns401() throws Exception {
		when(authService.authenticate(anyString(), anyString(), anyString()))
				.thenThrow(new BadCredentialsException("Credenziali non valide"));

		mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(LOGIN_JSON))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("Credenziali non valide"));
	}

	@Test
	void login_emailNotVerified_returns403WithCode() throws Exception {
		when(authService.authenticate(anyString(), anyString(), anyString()))
				.thenThrow(new AccountNotActiveException("EMAIL_NOT_VERIFIED", "Conferma la tua email"));

		mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(LOGIN_JSON))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"))
				.andExpect(request().sessionAttribute("SPRING_SECURITY_CONTEXT", org.hamcrest.Matchers.nullValue()));
	}

	@Test
	void login_tooManyAttempts_returns429WithRetryAfter() throws Exception {
		when(authService.authenticate(anyString(), anyString(), anyString()))
				.thenThrow(new TooManyRequestsException(900));

		mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(LOGIN_JSON))
				.andExpect(status().isTooManyRequests())
				.andExpect(header().string("Retry-After", "900"));
	}

	@Test
	void logout_returns204() throws Exception {
		mvc.perform(post("/api/auth/logout").with(user("anna@mail.it")).with(csrf()))
				.andExpect(status().isNoContent());
	}

	@Test
	void adminRoute_asUser_returns403() throws Exception {
		mvc.perform(get("/api/admin/users").with(user("anna@mail.it").roles("USER")))
				.andExpect(status().isForbidden());
	}

	@Test
	void responses_includeContentSecurityPolicy() throws Exception {
		mvc.perform(get("/api/auth/csrf"))
				.andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"));
	}

	private static User anna() {
		return new User("anna@mail.it", "$2a$12$hash", "Anna", "Rossi", LocalDate.of(2000, 1, 1), OffsetDateTime.now());
	}
}
