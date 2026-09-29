package it.epicode.eventi.event;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.common.exception.ServiceUnavailableException;
import it.epicode.eventi.event.dto.AiDescriptionResponse;
import it.epicode.eventi.event.dto.EventImageResponse;
import it.epicode.eventi.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Controller eventi + immagini con la vera SecurityConfig: chi puo' chiamare cosa. */
@WebMvcTest({EventController.class, EventImageController.class, AiDescriptionController.class})
@Import(SecurityConfig.class)
class EventControllerTest {

	static final String EVENT = "/api/events/00000000-0000-0000-0000-000000000001";
	static final MockMultipartFile FILE = new MockMultipartFile("file", "foto.jpg", "image/jpeg", new byte[] {1});

	@Autowired MockMvc mvc;

	@MockitoBean EventService eventService;
	@MockitoBean EventImageService imageService;
	@MockitoBean AiDescriptionService aiService;
	@MockitoBean CurrentUsers currentUsers;

	@Test
	void list_anonymous_returns200() throws Exception {
		when(eventService.search(any(), any(), anyInt(), anyInt())).thenReturn(Page.empty());

		mvc.perform(get("/api/events")).andExpect(status().isOk());
	}

	@Test
	void myEvents_anonymous_returns401() throws Exception {
		mvc.perform(get("/api/me/events")).andExpect(status().isUnauthorized());
	}

	@Test
	void create_anonymous_returns401() throws Exception {
		mvc.perform(post("/api/events").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void create_withoutCsrf_returns403() throws Exception {
		mvc.perform(post("/api/events").with(user("anna@mail.it"))
						.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void create_invalidBody_returns400WithFieldErrors() throws Exception {
		mvc.perform(post("/api/events").with(user("anna@mail.it")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"title\":\"\",\"province\":\"Milano\",\"latitude\":200}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.title").exists())
				.andExpect(jsonPath("$.errors.province").exists())
				.andExpect(jsonPath("$.errors.latitude").exists())
				.andExpect(jsonPath("$.errors.startsAt").exists());
	}

	@Test
	void uploadImage_anonymous_returns401() throws Exception {
		mvc.perform(multipart(EVENT + "/images").file(FILE).with(csrf())).andExpect(status().isUnauthorized());
	}

	@Test
	void uploadImage_loggedIn_returns201() throws Exception {
		when(imageService.add(eq(UUID.fromString("00000000-0000-0000-0000-000000000001")), any(), any()))
				.thenReturn(new EventImageResponse(UUID.randomUUID(), "https://img/1", 0));

		mvc.perform(multipart(EVENT + "/images").file(FILE).with(user("anna@mail.it")).with(csrf()))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.url").value("https://img/1"));
	}

	@Test
	void uploadImage_missingFilePart_returns400() throws Exception {
		mvc.perform(multipart(EVENT + "/images").with(user("anna@mail.it")).with(csrf()))
				.andExpect(status().isBadRequest());
	}

	@Test
	void aiDescription_anonymous_returns401() throws Exception {
		mvc.perform(post(EVENT + "/ai-description").with(csrf())
						.contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Bozza\"}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void aiDescription_loggedIn_returnsProposal() throws Exception {
		when(aiService.improve(any(), any(), eq("Bozza"))).thenReturn(new AiDescriptionResponse("Proposta"));

		mvc.perform(post(EVENT + "/ai-description").with(user("anna@mail.it")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Bozza\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.proposal").value("Proposta"));
	}

	@Test
	void aiDescription_serviceDown_returns503() throws Exception {
		when(aiService.improve(any(), any(), any())).thenThrow(new ServiceUnavailableException("AI giu'"));

		mvc.perform(post(EVENT + "/ai-description").with(user("anna@mail.it")).with(csrf())
						.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isServiceUnavailable())
				.andExpect(jsonPath("$.detail").value("AI giu'"));
	}
}
