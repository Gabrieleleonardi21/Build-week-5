package it.epicode.eventi.admin;

import it.epicode.eventi.admin.dto.AdminUserResponse;
import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.event.ArtistController;
import it.epicode.eventi.event.ArtistService;
import it.epicode.eventi.event.dto.ArtistResponse;
import it.epicode.eventi.security.SecurityConfig;
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static it.epicode.eventi.admin.TestUsers.user;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Chi puo' chiamare cosa con i tre ruoli, con la vera SecurityConfig (RoleHierarchy compresa).
 * ArtistController c'e' per verificare la gerarchia anche su @PreAuthorize.
 */
@WebMvcTest({AdminUserController.class, ArtistController.class})
@Import(SecurityConfig.class)
class AdminUserControllerTest {

	private static final String USERS = "/api/admin/users";
	private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

	@Autowired MockMvc mvc;

	@MockitoBean AdminUserService adminUserService;
	@MockitoBean ArtistService artistService;
	@MockitoBean CurrentUsers currentUsers;

	// ---------- area admin: /api/admin/** da MODERATOR in su ----------

	@Test
	void listUsers_anonymous_returns401() throws Exception {
		mvc.perform(get(USERS)).andExpect(status().isUnauthorized());
	}

	@Test
	void listUsers_asUser_returns403() throws Exception {
		mvc.perform(get(USERS).with(user("anna@mail.it").roles("USER"))).andExpect(status().isForbidden());
	}

	@Test
	void listUsers_asModerator_returns200() throws Exception {
		when(adminUserService.search(any(), any(), any(), anyInt(), anyInt())).thenReturn(new PageImpl<>(List.of()));

		mvc.perform(get(USERS).with(user("mod@mail.it").roles("MODERATOR"))).andExpect(status().isOk());
	}

	@Test
	void listUsers_asSuperadmin_returns200ThroughHierarchy() throws Exception {
		when(adminUserService.search(any(), any(), any(), anyInt(), anyInt())).thenReturn(new PageImpl<>(List.of()));

		mvc.perform(get(USERS).with(user("super@mail.it").roles("SUPERADMIN"))).andExpect(status().isOk());
	}

	@Test
	void listUsers_invalidRoleFilter_returns400() throws Exception {
		mvc.perform(get(USERS).param("role", "ADMIN").with(user("mod@mail.it").roles("MODERATOR")))
				.andExpect(status().isBadRequest());
	}

	// ---------- cambio ruolo: solo SUPERADMIN ----------

	@Test
	void changeRole_asModerator_returns403() throws Exception {
		mvc.perform(patch(USERS + "/" + ID + "/role").with(user("mod@mail.it").roles("MODERATOR")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"MODERATOR\"}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void changeRole_asSuperadmin_returns200() throws Exception {
		when(currentUsers.require(any())).thenReturn(user("super@mail.it", Role.SUPERADMIN, UserStatus.ACTIVE));
		when(adminUserService.changeRole(eq(ID), eq(Role.MODERATOR), any())).thenReturn(response(Role.MODERATOR));

		mvc.perform(patch(USERS + "/" + ID + "/role").with(user("super@mail.it").roles("SUPERADMIN")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"MODERATOR\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.role").value("MODERATOR"));
	}

	@Test
	void changeRole_withoutCsrf_returns403() throws Exception {
		mvc.perform(patch(USERS + "/" + ID + "/role").with(user("super@mail.it").roles("SUPERADMIN"))
						.contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"MODERATOR\"}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void changeRole_missingRole_returns400() throws Exception {
		mvc.perform(patch(USERS + "/" + ID + "/role").with(user("super@mail.it").roles("SUPERADMIN")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest());
	}

	// ---------- cambio stato: da MODERATOR in su ----------

	@Test
	void changeStatus_asModerator_returns200() throws Exception {
		when(currentUsers.require(any())).thenReturn(user("mod@mail.it", Role.MODERATOR, UserStatus.ACTIVE));
		when(adminUserService.changeStatus(eq(ID), eq(UserStatus.DEACTIVATED), any())).thenReturn(response(Role.USER));

		mvc.perform(patch(USERS + "/" + ID + "/status").with(user("mod@mail.it").roles("MODERATOR")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DEACTIVATED\"}"))
				.andExpect(status().isOk());
	}

	@Test
	void changeStatus_asUser_returns403() throws Exception {
		mvc.perform(patch(USERS + "/" + ID + "/status").with(user("anna@mail.it").roles("USER")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DEACTIVATED\"}"))
				.andExpect(status().isForbidden());
	}

	// ---------- moderazione artisti: @PreAuthorize("hasRole('MODERATOR')") ----------

	@Test
	void updateArtist_asUser_returns403() throws Exception {
		mvc.perform(put("/api/artists/" + ID).with(user("anna@mail.it").roles("USER")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Caparezza\"}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void updateArtist_asSuperadmin_returns200ThroughHierarchy() throws Exception {
		when(artistService.update(eq(ID), any())).thenReturn(new ArtistResponse(ID, "Caparezza", null, null, null));

		mvc.perform(put("/api/artists/" + ID).with(user("super@mail.it").roles("SUPERADMIN")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Caparezza\"}"))
				.andExpect(status().isOk());
	}

	@Test
	void deleteArtist_asModerator_returns204() throws Exception {
		mvc.perform(delete("/api/artists/" + ID).with(user("mod@mail.it").roles("MODERATOR")).with(csrf()))
				.andExpect(status().isNoContent());
	}

	@Test
	void deleteArtist_asUser_returns403() throws Exception {
		mvc.perform(delete("/api/artists/" + ID).with(user("anna@mail.it").roles("USER")).with(csrf()))
				.andExpect(status().isForbidden());
	}

	private static AdminUserResponse response(Role role) {
		return new AdminUserResponse(ID, "anna@mail.it", "Anna", "Rossi", role, UserStatus.ACTIVE, null, null, null);
	}
}
