package it.epicode.eventi.user;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.event.EventController;
import it.epicode.eventi.event.EventService;
import it.epicode.eventi.security.SecurityConfig;
import it.epicode.eventi.user.dto.UserSummaryResponse;
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

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Cosa puo' fare un semplice USER: cercare e vedere utenti, creare eventi. */
@WebMvcTest({UserController.class, EventController.class})
@Import(SecurityConfig.class)
class UserControllerTest {

	private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

	@Autowired MockMvc mvc;

	@MockitoBean UserDirectoryService userDirectoryService;
	@MockitoBean EventService eventService;
	@MockitoBean CurrentUsers currentUsers;

	@Test
	void searchUsers_anonymous_returns401() throws Exception {
		mvc.perform(get("/api/users").param("q", "anna")).andExpect(status().isUnauthorized());
	}

	@Test
	void searchUsers_asUser_returnsProfilesWithoutPersonalData() throws Exception {
		when(userDirectoryService.search(eq("anna"), anyInt(), anyInt()))
				.thenReturn(new PageImpl<>(List.of(new UserSummaryResponse(ID, "Anna", "Rossi", null))));

		mvc.perform(get("/api/users").param("q", "anna").with(user("bruno@mail.it").roles("USER")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].firstName").value("Anna"))
				.andExpect(jsonPath("$.content[0].email").doesNotExist())
				.andExpect(jsonPath("$.content[0].role").doesNotExist());
	}

	@Test
	void getUser_asUser_returns200() throws Exception {
		when(userDirectoryService.get(ID)).thenReturn(new UserSummaryResponse(ID, "Anna", "Rossi", null));

		mvc.perform(get("/api/users/" + ID).with(user("bruno@mail.it").roles("USER")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.lastName").value("Rossi"));
	}

	@Test
	void createEvent_asUser_returns201() throws Exception {
		mvc.perform(post("/api/events").with(user("bruno@mail.it").roles("USER")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"title":"Concerto","startsAt":"2030-06-01T21:00:00+02:00",
								 "address":"Via Roma 1","city":"Milano","latitude":45.46,"longitude":9.19}
								"""))
				.andExpect(status().isCreated());
	}

	@Test
	void createEvent_anonymous_returns401() throws Exception {
		mvc.perform(post("/api/events").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isUnauthorized());
	}
}
