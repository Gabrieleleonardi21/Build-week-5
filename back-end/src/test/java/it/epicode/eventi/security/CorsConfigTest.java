package it.epicode.eventi.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** CORS con la vera SecurityConfig: il FE su un altro dominio deve poter leggere Retry-After (429). */
@WebMvcTest(CsrfController.class)
@Import(SecurityConfig.class)
class CorsConfigTest {

	@Autowired MockMvc mvc;

	@Test
	void allowedOrigin_getsCredentialsAndRetryAfterExposed() throws Exception {
		mvc.perform(get("/api/auth/csrf").header(HttpHeaders.ORIGIN, "http://localhost:5173"))
				.andExpect(status().isOk())
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"))
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, containsString("Retry-After")));
	}

	@Test
	void unknownOrigin_isRejected() throws Exception {
		mvc.perform(get("/api/auth/csrf").header(HttpHeaders.ORIGIN, "https://sito-estraneo.example"))
				.andExpect(status().isForbidden());
	}
}
