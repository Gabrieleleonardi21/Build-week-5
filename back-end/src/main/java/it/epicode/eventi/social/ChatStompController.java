package it.epicode.eventi.social;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.social.dto.SendChatMessage;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Chat in tempo reale: il FE pubblica su /app/chat.send e riceve su /user/queue/chat.
 * Gli errori (es. non siete amici) tornano al solo mittente su /user/queue/errors.
 */
@Controller
public class ChatStompController {

	private final ChatMessagingService chatService;
	private final CurrentUsers currentUsers;

	public ChatStompController(ChatMessagingService chatService, CurrentUsers currentUsers) {
		this.chatService = chatService;
		this.currentUsers = currentUsers;
	}

	@MessageMapping("/chat.send")
	public void send(Principal principal, @Payload SendChatMessage message) {
		chatService.send(currentUsers.require(principal), message.friendshipId(), message.content());
	}

	// Solo il messaggio dell'eccezione applicativa: mai stack trace o dettagli interni.
	@MessageExceptionHandler
	@SendToUser(destinations = "/queue/errors", broadcast = false)
	public String handleError(RuntimeException ex) {
		return ex.getMessage();
	}
}
