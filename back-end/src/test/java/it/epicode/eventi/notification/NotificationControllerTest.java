package it.epicode.eventi.notification;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Solo il controller + la vera SecurityConfig: chi puo' chiamare cosa. */
@WebMvcTest(NotificationController.class)
@Import(SecurityConfig.class)
class NotificationControllerTest {

	@Autowired MockMvc mvc;

	@MockitoBean NotificationService notificationService;
	@MockitoBean CurrentUsers currentUsers;

	@Test
	void unreadCount_anonymous_returns401() throws Exception {
		mvc.perform(get("/api/notifications/unread-count")).andExpect(status().isUnauthorized());
	}

	@Test
	void unreadCount_loggedIn_returns200() throws Exception {
		mvc.perform(get("/api/notifications/unread-count").with(user("anna@mail.it")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.unread").value(0));
	}

	@Test
	void ownerMessage_withoutCsrf_returns403() throws Exception {
		mvc.perform(post("/api/events/00000000-0000-0000-0000-000000000001/messages").with(user("anna@mail.it"))
						.contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Info\",\"body\":\"Testo\"}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void ownerMessage_emptyBody_returns400() throws Exception {
		mvc.perform(post("/api/events/00000000-0000-0000-0000-000000000001/messages")
						.with(user("anna@mail.it")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"\",\"body\":\"\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.title").exists());
	}
}
