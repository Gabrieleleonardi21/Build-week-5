package it.epicode.eventi.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Sicurezza con sessione server-side (D01): niente JWT, il browser riceve il
 * cookie di sessione e il cookie XSRF-TOKEN.
 *
 * Scheletro delle fondamenta: il modulo Auth (persona A) aggiunge
 * UserDetailsService, AuthenticationManager e gli endpoint di login/logout.
 * Nota per il login JSON: il SecurityContext va salvato esplicitamente con
 * HttpSessionSecurityContextRepository, altrimenti la sessione resta anonima.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				// Usa il bean "corsConfigurationSource" definito sotto.
				.cors(Customizer.withDefaults())
				// Il FE legge il cookie XSRF-TOKEN (o GET /api/auth/csrf) e lo rimanda
				// nell'header X-XSRF-TOKEN su POST/PUT/PATCH/DELETE.
				// Handler "plain": il valore dell'header coincide con quello del cookie.
				.csrf(csrf -> csrf
						.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
						.csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
				// Niente pagina di login HTML ne' popup Basic: e' un'API JSON.
				.formLogin(AbstractHttpConfigurer::disable)
				.httpBasic(AbstractHttpConfigurer::disable)
				// Non autenticato -> 401 (senza redirect); autenticato ma senza permessi -> 403.
				.exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers("/actuator/health/**", "/api/stato", "/error").permitAll()
						.requestMatchers("/api/auth/**").permitAll()
						// Mappa pubblica ed elenco artisti visibili anche senza login (Parte 5).
						.requestMatchers(HttpMethod.GET, "/api/events/**", "/api/artists/**").permitAll()
						.anyRequest().authenticated());
		return http.build();
	}

	// Costo 12: circa 250 ms per hash, abbastanza lento contro il brute force.
	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder(12);
	}

	/**
	 * CORS con credenziali: origini esplicite (mai "*"), altrimenti il browser
	 * non manda il cookie di sessione. Le origini arrivano da ALLOWED_ORIGIN.
	 */
	@Bean
	public CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") List<String> origins) {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(origins);
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN"));
		config.setAllowCredentials(true);
		config.setMaxAge(3600L);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/api/**", config);
		source.registerCorsConfiguration("/ws/**", config);
		return source;
	}
}
