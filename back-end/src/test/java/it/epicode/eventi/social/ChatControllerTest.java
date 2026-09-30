package it.epicode.eventi.social;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.security.SecurityConfig;
import it.epicode.eventi.social.dto.ChatMessageResponse;
import it.epicode.eventi.social.dto.ChatSummaryResponse;
import it.epicode.eventi.user.dto.UserSummaryResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Bandeja e storico delle chat con la vera SecurityConfig. */
@WebMvcTest(ChatController.class)
@Import(SecurityConfig.class)
class ChatControllerTest {

	private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
	private static final UUID OTHER = UUID.fromString("00000000-0000-0000-0000-000000000002");

	@Autowired MockMvc mvc;

	@MockitoBean ChatHistoryService chatHistoryService;
	@MockitoBean CurrentUsers currentUsers;

	@Test
	void inbox_anonymous_returns401() throws Exception {
		mvc.perform(get("/api/chats")).andExpect(status().isUnauthorized());
	}

	@Test
	void inbox_returnsChatsWithUserNameEvenIfNotFriendsAnymore() throws Exception {
		ChatMessageResponse last = new ChatMessageResponse(UUID.randomUUID(), ID, OTHER, "Ciao!", OffsetDateTime.now(), null);
		when(chatHistoryService.inbox(any(), anyInt(), anyInt())).thenReturn(new PageImpl<>(List.of(
				new ChatSummaryResponse(ID, new UserSummaryResponse(OTHER, "Bruno", "Bianchi", null), false, last, 1))));

		mvc.perform(get("/api/chats").with(user("anna@mail.it")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].user.firstName").value("Bruno"))
				.andExpect(jsonPath("$.content[0].canWrite").value(false))
				.andExpect(jsonPath("$.content[0].lastMessage.content").value("Ciao!"))
				.andExpect(jsonPath("$.content[0].unreadMessages").value(1))
				.andExpect(jsonPath("$.content[0].user.email").doesNotExist());
	}

	@Test
	void messages_returnsHistory() throws Exception {
		when(chatHistoryService.messages(eq(ID), any(), anyInt(), anyInt())).thenReturn(new PageImpl<>(List.of(
				new ChatMessageResponse(UUID.randomUUID(), ID, OTHER, "Ciao!", OffsetDateTime.now(), null))));

		mvc.perform(get("/api/chats/" + ID + "/messages").with(user("anna@mail.it")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].content").value("Ciao!"));
	}

	@Test
	void messages_notYourChat_returns404() throws Exception {
		when(chatHistoryService.messages(eq(ID), any(), anyInt(), anyInt()))
				.thenThrow(new NotFoundException("Chat non trovata"));

		mvc.perform(get("/api/chats/" + ID + "/messages").with(user("carla@mail.it")))
				.andExpect(status().isNotFound());
	}

	@Test
	void markRead_withoutCsrf_returns403() throws Exception {
		mvc.perform(patch("/api/chats/" + ID + "/read").with(user("anna@mail.it")))
				.andExpect(status().isForbidden());
	}

	@Test
	void markRead_returns204() throws Exception {
		mvc.perform(patch("/api/chats/" + ID + "/read").with(user("anna@mail.it")).with(csrf()))
				.andExpect(status().isNoContent());
	}
}
