package it.epicode.eventi.event;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.common.exception.ServiceUnavailableException;
import it.epicode.eventi.common.exception.TooManyRequestsException;
import it.epicode.eventi.security.AttemptLimiter;
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.UUID;

import static it.epicode.eventi.event.EventTestData.event;
import static it.epicode.eventi.event.EventTestData.image;
import static it.epicode.eventi.event.EventTestData.user;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** OpenRouter sostituito da MockRestServiceServer: nessuna chiamata vera, nessun costo. */
class AiDescriptionServiceTest {

	static final String URL = "https://ai.test/chat/completions";
	static final String OK = """
			{"id":"x","choices":[{"message":{"role":"assistant","content":"  Una serata indimenticabile.  "}}]}
			""";

	EventService eventService = mock(EventService.class);
	AttemptLimiter limiter = new AttemptLimiter();
	MockRestServiceServer server;
	AiDescriptionService ai;

	User owner = user(Role.USER);
	Event event = event(owner);

	@BeforeEach
	void setUp() {
		RestClient.Builder builder = RestClient.builder().baseUrl("https://ai.test");
		server = MockRestServiceServer.bindTo(builder).build();
		ai = new AiDescriptionService(eventService, limiter, mock(PlatformTransactionManager.class),
				builder.build(), "modello-test", true, Duration.ZERO);
		when(eventService.findEditable(event.getId(), owner)).thenReturn(event);
	}

	@Test
	void improve_sendsDraftAndCoverAndReturnsTrimmedProposal() {
		event.addImage(image("eventi-dev/cover", 0));
		server.expect(requestTo(URL)).andExpect(method(HttpMethod.POST))
				.andExpect(jsonPath("$.model").value("modello-test"))
				.andExpect(jsonPath("$.messages[0].role").value("system"))
				.andExpect(jsonPath("$.messages[1].content[0].text").value(containsString("Bozza")))
				.andExpect(jsonPath("$.messages[1].content[1].image_url.url")
						.value("https://res.cloudinary.com/x/eventi-dev/cover"))
				.andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

		String proposal = ai.improve(event.getId(), owner, "Bozza del concerto").proposal();

		assertThat(proposal).isEqualTo("Una serata indimenticabile.");
		server.verify();
	}

	@Test
	void improve_blankDraft_usesSavedDescriptionWithoutImage() {
		event.setDescription("Descrizione salvata");
		server.expect(requestTo(URL))
				.andExpect(jsonPath("$.messages[1].content[0].text")
						.value(containsString("Descrizione salvata")))
				.andExpect(jsonPath("$.messages[1].content[1]").doesNotExist())
				.andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

		ai.improve(event.getId(), owner, "   ");

		server.verify();
	}

	@Test
	void improve_noTextAtAll_throwsBadRequestWithoutCallingAi() {
		assertThatThrownBy(() -> ai.improve(event.getId(), owner, null)).isInstanceOf(BadRequestException.class);
		server.verify();
	}

	@Test
	void improve_notOwner_throwsForbiddenWithoutCallingAi() {
		User intruder = user(Role.USER);
		when(eventService.findEditable(event.getId(), intruder)).thenThrow(new ForbiddenException("no"));

		assertThatThrownBy(() -> ai.improve(event.getId(), intruder, "Bozza")).isInstanceOf(ForbiddenException.class);
		server.verify();
	}

	@Test
	void improve_cancelledEvent_throwsBadRequest() {
		event.setStatus(EventStatus.CANCELLED);

		assertThatThrownBy(() -> ai.improve(event.getId(), owner, "Bozza")).isInstanceOf(BadRequestException.class);
	}

	@Test
	void improve_aiError_throwsServiceUnavailable() {
		server.expect(requestTo(URL)).andRespond(withServerError());

		assertThatThrownBy(() -> ai.improve(event.getId(), owner, "Bozza"))
				.isInstanceOf(ServiceUnavailableException.class);
	}

	@Test
	void improve_emptyChoices_throwsServiceUnavailable() {
		server.expect(requestTo(URL)).andRespond(withSuccess("{\"choices\":[]}", MediaType.APPLICATION_JSON));

		assertThatThrownBy(() -> ai.improve(event.getId(), owner, "Bozza"))
				.isInstanceOf(ServiceUnavailableException.class);
	}

	@Test
	void improve_overLimit_throwsTooManyRequestsWithoutCallingAi() {
		for (int i = 0; i < AiDescriptionService.MAX_REQUESTS; i++) {
			limiter.record("ai:user:" + owner.getId());
		}

		assertThatThrownBy(() -> ai.improve(event.getId(), owner, "Bozza"))
				.isInstanceOf(TooManyRequestsException.class);
		server.verify();
	}

	@Test
	void improve_notConfigured_throwsServiceUnavailable() {
		AiDescriptionService off = new AiDescriptionService(eventService, limiter,
				mock(PlatformTransactionManager.class), RestClient.create(), "m", false, Duration.ZERO);

		assertThatThrownBy(() -> off.improve(UUID.randomUUID(), owner, "Bozza"))
				.isInstanceOf(ServiceUnavailableException.class);
	}

	@Test
	void improve_severalModels_sendsOpenRouterFallbackList() {
		RestClient.Builder builder = RestClient.builder().baseUrl("https://ai.test");
		MockRestServiceServer chain = MockRestServiceServer.bindTo(builder).build();
		AiDescriptionService free = new AiDescriptionService(eventService, limiter,
				mock(PlatformTransactionManager.class), builder.build(), " a:free , b:free,, ", true, Duration.ZERO);
		chain.expect(requestTo(URL))
				.andExpect(jsonPath("$.models[0]").value("a:free"))
				.andExpect(jsonPath("$.models[1]").value("b:free"))
				.andExpect(jsonPath("$.models.length()").value(2))
				.andExpect(jsonPath("$.model").doesNotExist())
				.andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

		free.improve(event.getId(), owner, "Bozza");

		chain.verify();
	}

	@Test
	void improve_blankModelList_isNotConfigured() {
		AiDescriptionService none = new AiDescriptionService(eventService, limiter,
				mock(PlatformTransactionManager.class), RestClient.create(), " , ", true, Duration.ZERO);

		assertThatThrownBy(() -> none.improve(event.getId(), owner, "Bozza"))
				.isInstanceOf(ServiceUnavailableException.class);
	}

	@Test
	void improve_failedCallsDoNotCountTowardsLimit() {
		for (int i = 0; i < AiDescriptionService.MAX_REQUESTS; i++) {
			server.expect(requestTo(URL)).andRespond(withServerError());
		}
		server.expect(requestTo(URL)).andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

		// Tanti 503 di fila (modelli saturi) non esauriscono il limite...
		for (int i = 0; i < AiDescriptionService.MAX_REQUESTS; i++) {
			assertThatThrownBy(() -> ai.improve(event.getId(), owner, "Bozza"))
					.isInstanceOf(ServiceUnavailableException.class);
		}
		// ...quindi il tentativo successivo passa ancora.
		assertThat(ai.improve(event.getId(), owner, "Bozza").proposal()).isEqualTo("Una serata indimenticabile.");
		server.verify();
	}

	@Test
	void improve_successfulCallsCountTowardsLimit() {
		for (int i = 0; i < AiDescriptionService.MAX_REQUESTS; i++) {
			server.expect(requestTo(URL)).andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));
		}
		for (int i = 0; i < AiDescriptionService.MAX_REQUESTS; i++) {
			ai.improve(event.getId(), owner, "Bozza");
		}

		assertThatThrownBy(() -> ai.improve(event.getId(), owner, "Bozza"))
				.isInstanceOf(TooManyRequestsException.class);
		server.verify();
	}

	@Test
	void improve_rateLimitedOnce_retriesAndSucceeds() {
		server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
		server.expect(requestTo(URL)).andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

		assertThat(ai.improve(event.getId(), owner, "Bozza").proposal()).isEqualTo("Una serata indimenticabile.");
		server.verify();
	}

	@Test
	void improve_rateLimitedTwice_givesUpAfterOneRetry() {
		server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
		server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

		assertThatThrownBy(() -> ai.improve(event.getId(), owner, "Bozza"))
				.isInstanceOf(ServiceUnavailableException.class);
		// Esattamente due chiamate: nessun terzo tentativo.
		server.verify();
	}

	@Test
	void improve_otherErrors_areNotRetried() {
		server.expect(requestTo(URL)).andRespond(withUnauthorizedRequest());

		assertThatThrownBy(() -> ai.improve(event.getId(), owner, "Bozza"))
				.isInstanceOf(ServiceUnavailableException.class);
		server.verify();
	}
}
