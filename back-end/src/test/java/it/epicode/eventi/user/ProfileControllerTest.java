package it.epicode.eventi.user;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.security.SecurityConfig;
import it.epicode.eventi.user.dto.ProfileResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Le rotte /api/me: login obbligatorio, CSRF sulle scritture, validazione dei DTO. */
@WebMvcTest(ProfileController.class)
@Import(SecurityConfig.class)
class ProfileControllerTest {

	@Autowired MockMvc mvc;

	@MockitoBean ProfileService profileService;
	@MockitoBean CurrentUsers currentUsers;

	private User anna;

	@BeforeEach
	void setUp() {
		anna = new User("anna@mail.it", "$2a$04$hash", "Anna", "Rossi", LocalDate.of(2000, 1, 1), OffsetDateTime.now());
		ReflectionTestUtils.setField(anna, "id", UUID.randomUUID());
		when(currentUsers.require(any())).thenReturn(anna);
	}

	@Test
	void getProfile_anonymous_returns401() throws Exception {
		mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
	}

	@Test
	void getProfile_asUser_returnsOwnDataWithoutPasswordHash() throws Exception {
		mvc.perform(get("/api/me").with(user("anna@mail.it").roles("USER")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("anna@mail.it"))
				.andExpect(jsonPath("$.birthDate").value("2000-01-01"))
				.andExpect(jsonPath("$.address.country").value("IT"))
				.andExpect(jsonPath("$.passwordHash").doesNotExist());
	}

	@Test
	void updateProfile_missingFirstName_returns400WithFieldError() throws Exception {
		mvc.perform(put("/api/me").with(user("anna@mail.it").roles("USER")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"lastName":"Rossi","birthDate":"2000-01-01"}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.firstName").exists());
		verify(profileService, never()).update(any(), any());
	}

	@Test
	void updateProfile_withoutCsrf_returns403() throws Exception {
		mvc.perform(put("/api/me").with(user("anna@mail.it").roles("USER"))
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"firstName":"Anna","lastName":"Rossi","birthDate":"2000-01-01"}
								"""))
				.andExpect(status().isForbidden());
	}

	@Test
	void changePassword_asUser_returns204AndKeepsCurrentSession() throws Exception {
		MockHttpSession session = new MockHttpSession();

		mvc.perform(put("/api/me/password").with(user("anna@mail.it").roles("USER")).with(csrf()).session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"currentPassword":"Password1!","newPassword":"NuovaPassword2!"}
								"""))
				.andExpect(status().isNoContent());

		verify(profileService).changePassword(eq(anna), any(), eq(session.getId()));
	}

	@Test
	void changePassword_newPasswordTooShort_returns400() throws Exception {
		mvc.perform(put("/api/me/password").with(user("anna@mail.it").roles("USER")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"currentPassword":"Password1!","newPassword":"corta"}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.newPassword").exists());
	}

	@Test
	void uploadAvatar_asUser_returns200() throws Exception {
		MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[] {1});
		when(profileService.setAvatar(eq(anna), any())).thenReturn(ProfileResponse.from(anna));

		mvc.perform(multipart("/api/me/avatar").file(file).with(user("anna@mail.it").roles("USER")).with(csrf()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.firstName").value("Anna"));
	}

	@Test
	void deleteAccount_asUser_returns204AndInvalidatesSession() throws Exception {
		MockHttpSession session = new MockHttpSession();

		mvc.perform(delete("/api/me").with(user("anna@mail.it").roles("USER")).with(csrf()).session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"password":"Password1!"}
								"""))
				.andExpect(status().isNoContent());

		verify(profileService).deleteAccount(eq(anna), any());
		assertThat(session.isInvalid()).isTrue();
	}

	@Test
	void deleteAccount_withoutPassword_returns400() throws Exception {
		mvc.perform(delete("/api/me").with(user("anna@mail.it").roles("USER")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest());
		verify(profileService, never()).deleteAccount(any(), any());
	}

	@Test
	void deleteAccount_anonymous_returns401() throws Exception {
		mvc.perform(delete("/api/me").with(csrf())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"password":"Password1!"}
								"""))
				.andExpect(status().isUnauthorized());
	}
}
