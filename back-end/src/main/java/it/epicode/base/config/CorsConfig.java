package it.epicode.base.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * In produzione FE e BE stanno su due domini diversi: senza CORS il browser
 * blocca ogni fetch. Le origini ammesse arrivano da ALLOWED_ORIGIN.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

	private final String[] origini;

	public CorsConfig(@Value("${app.cors.allowed-origins}") String[] origini) {
		this.origini = origini;
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/api/**")
				.allowedOrigins(origini)
				.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
				.allowedHeaders("*")
				.maxAge(3600);
	}
}
