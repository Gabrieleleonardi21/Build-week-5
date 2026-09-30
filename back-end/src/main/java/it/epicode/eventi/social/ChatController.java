package it.epicode.eventi.social;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.social.dto.ChatMessageResponse;
import it.epicode.eventi.social.dto.ChatSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

/**
 * Bandeja e storico delle chat (richiede login). chatId = id dell'amicizia.
 * I messaggi nuovi si inviano via STOMP su /app/chat.send e arrivano su /user/queue/chat.
 */
@RestController
@RequestMapping("/api/chats")
public class ChatController {

	private final ChatHistoryService chatHistoryService;
	private final CurrentUsers currentUsers;

	public ChatController(ChatHistoryService chatHistoryService, CurrentUsers currentUsers) {
		this.chatHistoryService = chatHistoryService;
		this.currentUsers = currentUsers;
	}

	/** Le mie conversazioni, anche con chi non e' piu' amico (canWrite = false). */
	@GetMapping
	public Page<ChatSummaryResponse> inbox(Principal principal,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return chatHistoryService.inbox(currentUsers.require(principal), page, size);
	}

	/** Storico, dal messaggio piu' recente. */
	@GetMapping("/{id}/messages")
	public Page<ChatMessageResponse> messages(Principal principal, @PathVariable UUID id,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "30") int size) {
		return chatHistoryService.messages(id, currentUsers.require(principal), page, size);
	}

	@PatchMapping("/{id}/read")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void markRead(Principal principal, @PathVariable UUID id) {
		chatHistoryService.markRead(id, currentUsers.require(principal));
	}
}
