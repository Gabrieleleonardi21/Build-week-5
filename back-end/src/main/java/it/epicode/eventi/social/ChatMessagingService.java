package it.epicode.eventi.social;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.social.dto.ChatMessageResponse;
import it.epicode.eventi.user.User;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.UUID;

/**
 * Invio dei messaggi di chat in tempo reale (§6.4, D13): solo tra amici ACCEPTED,
 * e solo se il mittente fa parte dell'amicizia. Bandeja e storico REST: ChatHistoryService (/api/chats).
 */
@Service
public class ChatMessagingService {

	private static final int MAX_LENGTH = 2000;

	private final FriendshipRepository friendshipRepository;
	private final ChatMessageRepository messageRepository;
	private final SimpMessagingTemplate messaging;
	private final ApplicationEventPublisher events;

	public ChatMessagingService(FriendshipRepository friendshipRepository, ChatMessageRepository messageRepository,
			SimpMessagingTemplate messaging, ApplicationEventPublisher events) {
		this.friendshipRepository = friendshipRepository;
		this.messageRepository = messageRepository;
		this.messaging = messaging;
		this.events = events;
	}

	@Transactional
	public ChatMessageResponse send(User sender, UUID friendshipId, String content) {
		if (content == null || content.isBlank() || content.length() > MAX_LENGTH) {
			throw new BadRequestException("Messaggio vuoto o oltre " + MAX_LENGTH + " caratteri");
		}
		Friendship f = friendshipRepository.findWithUsersById(friendshipId)
				.orElseThrow(() -> new NotFoundException("Chat non trovata"));
		boolean member = f.getRequester().getId().equals(sender.getId())
				|| f.getAddressee().getId().equals(sender.getId());
		// Amici ACCEPTED ed entrambi attivi: a un account cancellato non si scrive (Friendship.isChatOpen).
		if (!member || !f.isChatOpen()) {
			throw new ForbiddenException("Chat disponibile solo tra amici con account attivo");
		}

		ChatMessage message = new ChatMessage(f, sender, content.trim());
		messageRepository.saveAndFlush(message);

		ChatMessageResponse payload = ChatMessageResponse.from(message);
		// A entrambi: il mittente vede il messaggio anche nelle altre schede aperte.
		events.publishEvent(new ChatMessageSent(
				List.of(f.getRequester().getEmail(), f.getAddressee().getEmail()), payload));
		return payload;
	}

	/** Push dopo il commit: se il salvataggio fallisce, nessuno riceve un messaggio inesistente. */
	@TransactionalEventListener
	public void onMessageSent(ChatMessageSent sent) {
		for (String username : sent.recipientUsernames()) {
			messaging.convertAndSendToUser(username, "/queue/chat", sent.payload());
		}
	}
}
