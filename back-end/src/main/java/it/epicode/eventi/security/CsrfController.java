package it.epicode.eventi.security;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Restituisce il token CSRF nel body. Serve quando FE e BE sono su domini
 * diversi (Render): il FE non puo' leggere il cookie XSRF-TOKEN del BE,
 * ma puo' leggere questa risposta e rimandare il valore nell'header.
 */
@RestController
public class CsrfController {

	@GetMapping("/api/auth/csrf")
	public Map<String, String> csrf(CsrfToken token) {
		// getToken() forza anche la scrittura del cookie XSRF-TOKEN.
		return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
	}
}
