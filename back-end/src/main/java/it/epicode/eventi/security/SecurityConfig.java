package it.epicode.eventi.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Sicurezza con sessione server-side (D01): niente JWT, il browser riceve il
 * cookie di sessione e il cookie XSRF-TOKEN.
 *
 * Login, registrazione e verifica email: AuthController / AuthService.
 * AuthenticationManager e UserDetailsService: AuthenticationConfig.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http, CsrfTokenRepository csrfTokenRepository)
			throws Exception {
		http
				// Usa il bean "corsConfigurationSource" definito sotto.
				.cors(Customizer.withDefaults())
				// Il FE legge il cookie XSRF-TOKEN (o GET /api/auth/csrf) e lo rimanda
				// nell'header X-XSRF-TOKEN su POST/PUT/PATCH/DELETE.
				// Handler "plain": il valore dell'header coincide con quello del cookie.
				.csrf(csrf -> csrf
						.csrfTokenRepository(csrfTokenRepository)
						.csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
				// Niente pagina di login HTML ne' popup Basic: e' un'API JSON.
				.formLogin(AbstractHttpConfigurer::disable)
				.httpBasic(AbstractHttpConfigurer::disable)
				// POST /api/auth/logout (con CSRF): invalida la sessione e risponde 204, senza redirect.
				// Il cookie SESSION lo cancella Spring Session, con gli stessi attributi SameSite/Secure.
				.logout(logout -> logout
						.logoutUrl("/api/auth/logout")
						.logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
				// Il BE risponde solo JSON: nessuna risorsa da caricare, nessun iframe.
				.headers(headers -> headers
						.contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'")))
				// Non autenticato -> 401 (senza redirect); autenticato ma senza permessi -> 403.
				.exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers("/actuator/health/**", "/api/stato", "/error").permitAll()
						// Elenco esplicito: /api/auth/me e simili restano protetti.
						.requestMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
						.requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login",
								"/api/auth/verify", "/api/auth/resend-code").permitAll()
						// Partecipanti e ticket sono dati personali: login anche in GET.
						// Deve stare prima del permitAll su /api/events/** qui sotto (vince la prima regola).
						.requestMatchers(HttpMethod.GET, "/api/events/*/participants", "/api/events/*/tickets/**")
						.authenticated()
						// Mappa pubblica ed elenco artisti visibili anche senza login (Parte 5).
						.requestMatchers(HttpMethod.GET, "/api/events/**", "/api/artists/**").permitAll()
						// Cambiare ruoli: solo SUPERADMIN. Il resto dell'area admin: da MODERATOR in su.
						.requestMatchers(HttpMethod.PATCH, "/api/admin/users/*/role").hasRole("SUPERADMIN")
						.requestMatchers("/api/admin/**").hasRole("MODERATOR")
						.anyRequest().authenticated());
		return http.build();
	}

	/**
	 * SUPERADMIN include MODERATOR, che include USER: hasRole("MODERATOR") vale anche
	 * per un SUPERADMIN, sia qui sia in @PreAuthorize. Stesso ordine dell'enum Role.
	 * static: la method security lo legge mentre si sta ancora configurando.
	 */
	@Bean
	static RoleHierarchy roleHierarchy() {
		return RoleHierarchyImpl.withDefaultRolePrefix()
				.role("SUPERADMIN").implies("MODERATOR")
				.role("MODERATOR").implies("USER")
				.build();
	}

	/**
	 * Cookie XSRF-TOKEN leggibile da JS (httpOnly=false), con gli stessi SameSite/Secure
	 * del cookie di sessione: su Render FE e BE sono cross-site e senza SameSite=None
	 * il browser non lo rimanderebbe, quindi ogni POST risponderebbe 403.
	 */
	@Bean
	public CsrfTokenRepository csrfTokenRepository(
			@Value("${server.servlet.session.cookie.same-site:lax}") String sameSite,
			@Value("${server.servlet.session.cookie.secure:false}") boolean secure) {
		CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
		repository.setCookieCustomizer(cookie -> cookie.sameSite(sameSite).secure(secure));
		return repository;
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
