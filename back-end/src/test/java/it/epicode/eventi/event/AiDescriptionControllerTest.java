package it.epicode.eventi.event;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.common.exception.ServiceUnavailableException;
import it.epicode.eventi.common.exception.TooManyRequestsException;
import it.epicode.eventi.event.dto.AiDescriptionResponse;
import it.epicode.eventi.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Solo il controller + la vera SecurityConfig: le regole dell'AI viste da HTTP.
 * Il service e' finto: qui si verifica che ogni errore diventi lo status giusto per il FE
 * (403 non proprietario, 429 con Retry-After, 503 per il pulsante "Riprova").
 */
@WebMvcTest(AiDescriptionController.class)
@Import(SecurityConfig.class)
class AiDescriptionControllerTest {

	private static final String URL = "/api/events/00000000-0000-0000-0000-000000000001/ai-description";

	@Autowired MockMvc mvc;

	@MockitoBean AiDescriptionService aiService;
	@MockitoBean CurrentUsers currentUsers;

	/** Richiesta di un utente loggato con CSRF valido: il caso normale del FE. */
	private MockHttpServletRequestBuilder loggedIn(String json) {
		return post(URL).with(user("anna@mail.it")).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content(json);
	}

	@Test
	void improve_anonymous_returns401() throws Exception {
		mvc.perform(post(URL).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Festa\"}"))
				.andExpect(status().isUnauthorized());
		verify(aiService, never()).improve(any(), any(), any());
	}

	@Test
	void improve_withoutCsrf_returns403() throws Exception {
		mvc.perform(post(URL).with(user("anna@mail.it"))
						.contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Festa\"}"))
				.andExpect(status().isForbidden());
		verify(aiService, never()).improve(any(), any(), any());
	}

	@Test
	void improve_owner_returns200WithProposal() throws Exception {
		when(aiService.improve(any(), any(), eq("Festa")))
				.thenReturn(new AiDescriptionResponse("Una festa da non perdere"));

		mvc.perform(loggedIn("{\"text\":\"Festa\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.proposal").value("Una festa da non perdere"));
	}

	@Test
	void improve_notOwner_returns403() throws Exception {
		when(aiService.improve(any(), any(), any())).thenThrow(new ForbiddenException("Non sei il proprietario"));

		mvc.perform(loggedIn("{\"text\":\"Festa\"}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void improve_tooManyRequests_returns429WithRetryAfter() throws Exception {
		when(aiService.improve(any(), any(), any())).thenThrow(new TooManyRequestsException(900));

		mvc.perform(loggedIn("{\"text\":\"Festa\"}"))
				.andExpect(status().isTooManyRequests())
				.andExpect(header().string("Retry-After", "900"));
	}

	@Test
	void improve_aiUnavailable_returns503() throws Exception {
		when(aiService.improve(any(), any(), any()))
				.thenThrow(new ServiceUnavailableException("Servizio AI non disponibile, riprova tra poco"));

		mvc.perform(loggedIn("{\"text\":\"Festa\"}"))
				.andExpect(status().isServiceUnavailable())
				.andExpect(jsonPath("$.detail").value("Servizio AI non disponibile, riprova tra poco"));
	}

	@Test
	void improve_textTooLong_returns400() throws Exception {
		String tooLong = "a".repeat(10001);

		mvc.perform(loggedIn("{\"text\":\"" + tooLong + "\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.text").exists());
		verify(aiService, never()).improve(any(), any(), any());
	}
}
