package it.epicode.eventi.websocket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP su WebSocket nativo (niente SockJS).
 * Il FE si collega a ws(s)://<be>/ws; il cookie di sessione autentica l'handshake.
 *  - il client invia su   /app/...         (es. /app/chat.send)
 *  - il client riceve da  /user/queue/...  (notifications, chat, errors)
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	private final String[] allowedOrigins;

	public WebSocketConfig(@Value("${app.cors.allowed-origins}") String[] allowedOrigins) {
		this.allowedOrigins = allowedOrigins;
	}

	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
		// Stesse origini del CORS: un sito estraneo non puo' aprire il socket con il cookie dell'utente.
		registry.addEndpoint("/ws").setAllowedOrigins(allowedOrigins);
	}

	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		// Broker in memoria: basta per una sola istanza del BE.
		registry.enableSimpleBroker("/queue");
		registry.setApplicationDestinationPrefixes("/app");
		registry.setUserDestinationPrefix("/user");
	}
}
