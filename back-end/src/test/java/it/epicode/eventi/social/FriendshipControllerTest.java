package it.epicode.eventi.social;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.common.exception.ConflictException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.security.SecurityConfig;
import it.epicode.eventi.social.dto.FriendRequestResponse;
import it.epicode.eventi.user.dto.UserSummaryResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Controller amicizie + la vera SecurityConfig: login, CSRF, validazione, codici di errore. */
@WebMvcTest(FriendshipController.class)
@Import(SecurityConfig.class)
class FriendshipControllerTest {

	private static final String BASE = "/api/friendships";
	private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
	private static final UUID OTHER = UUID.fromString("00000000-0000-0000-0000-000000000002");

	@Autowired MockMvc mvc;

	@MockitoBean FriendshipService friendshipService;
	@MockitoBean CurrentUsers currentUsers;

	@Test
	void friends_anonymous_returns401() throws Exception {
		mvc.perform(get(BASE)).andExpect(status().isUnauthorized());
	}

	@Test
	void friends_loggedIn_returns200() throws Exception {
		when(friendshipService.friends(any(), anyInt(), anyInt())).thenReturn(new PageImpl<>(List.of()));

		mvc.perform(get(BASE).with(user("anna@mail.it"))).andExpect(status().isOk());
	}

	@Test
	void request_withoutCsrf_returns403() throws Exception {
		mvc.perform(post(BASE).with(user("anna@mail.it")).contentType(MediaType.APPLICATION_JSON)
						.content("{\"addresseeId\":\"" + OTHER + "\",\"eventId\":\"" + ID + "\"}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void request_valid_returns201() throws Exception {
		when(friendshipService.request(any(), eq(OTHER), eq(ID))).thenReturn(new FriendRequestResponse(ID,
				new UserSummaryResponse(OTHER, "Bruno", "Bianchi", null), ID, "Concerto", OffsetDateTime.now()));

		mvc.perform(post(BASE).with(user("anna@mail.it")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
						.content("{\"addresseeId\":\"" + OTHER + "\",\"eventId\":\"" + ID + "\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.user.firstName").value("Bruno"))
				.andExpect(jsonPath("$.user.email").doesNotExist());
	}

	@Test
	void request_missingFields_returns400() throws Exception {
		mvc.perform(post(BASE).with(user("anna@mail.it")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.addresseeId").exists())
				.andExpect(jsonPath("$.errors.eventId").exists());
	}

	@Test
	void request_alreadyFriends_returns409() throws Exception {
		when(friendshipService.request(any(), any(), any())).thenThrow(new ConflictException("Siete gia' amici"));

		mvc.perform(post(BASE).with(user("anna@mail.it")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
						.content("{\"addresseeId\":\"" + OTHER + "\",\"eventId\":\"" + ID + "\"}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("Siete gia' amici"));
	}

	@Test
	void receivedAndSent_loggedIn_return200() throws Exception {
		when(friendshipService.received(any(), anyInt(), anyInt())).thenReturn(new PageImpl<>(List.of()));
		when(friendshipService.sent(any(), anyInt(), anyInt())).thenReturn(new PageImpl<>(List.of()));

		mvc.perform(get(BASE + "/requests/received").with(user("anna@mail.it"))).andExpect(status().isOk());
		mvc.perform(get(BASE + "/requests/sent").with(user("anna@mail.it"))).andExpect(status().isOk());
	}

	@Test
	void reject_returns204() throws Exception {
		mvc.perform(post(BASE + "/" + ID + "/reject").with(user("bruno@mail.it")).with(csrf()))
				.andExpect(status().isNoContent());
	}

	@Test
	void remove_notMember_returns404() throws Exception {
		doThrow(new NotFoundException("Amicizia non trovata")).when(friendshipService).remove(eq(ID), any());

		mvc.perform(delete(BASE + "/" + ID).with(user("carla@mail.it")).with(csrf()))
				.andExpect(status().isNotFound());
	}

}
