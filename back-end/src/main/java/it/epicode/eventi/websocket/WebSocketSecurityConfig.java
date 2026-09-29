package it.epicode.eventi.websocket;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.annotation.web.socket.EnableWebSocketSecurity;
import org.springframework.security.messaging.access.intercept.MessageMatcherDelegatingAuthorizationManager;
import org.springframework.security.messaging.web.csrf.CsrfChannelInterceptor;

/**
 * Sicurezza dei messaggi STOMP: solo utenti autenticati, e solo sulle proprie code.
 * Il frame CONNECT deve contenere l'header X-XSRF-TOKEN (stesso token delle chiamate HTTP).
 */
@Configuration
@EnableWebSocketSecurity
public class WebSocketSecurityConfig {

	@Bean
	public AuthorizationManager<Message<?>> messageAuthorizationManager(
			MessageMatcherDelegatingAuthorizationManager.Builder messages) {
		messages
				// CONNECT, DISCONNECT, heartbeat: messaggi senza destinazione.
				.nullDestMatcher().authenticated()
				.simpSubscribeDestMatchers("/user/queue/**").authenticated()
				.simpDestMatchers("/app/**").authenticated()
				// Tutto il resto (es. iscriversi alle code di altri) e' vietato.
				.anyMessage().denyAll();
		return messages.build();
	}

	/**
	 * Di default Spring si aspetta nel CONNECT il token CSRF "mascherato" (XOR). Le chiamate
	 * HTTP usano invece il token semplice (CsrfTokenRequestAttributeHandler in SecurityConfig):
	 * con questo bean il FE manda lo stesso valore in entrambi i casi.
	 */
	@Bean
	public ChannelInterceptor csrfChannelInterceptor() {
		return new CsrfChannelInterceptor();
	}
}
