package it.epicode.eventi.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * AuthenticationManager usato dal login JSON (AuthService).
 * Separato da SecurityConfig: i test @WebMvcTest importano SecurityConfig
 * e non devono trascinarsi dietro UserDetailsService e repository.
 */
@Configuration
public class AuthenticationConfig {

	@Bean
	public AuthenticationManager authenticationManager(UserDetailsService userDetailsService,
			PasswordEncoder passwordEncoder) {
		// Se l'email non esiste confronta comunque con un hash finto: stessi tempi di risposta.
		DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
		provider.setPasswordEncoder(passwordEncoder);
		return new ProviderManager(provider);
	}
}
