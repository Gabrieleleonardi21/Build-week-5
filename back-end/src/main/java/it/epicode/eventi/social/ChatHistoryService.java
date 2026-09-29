package it.epicode.eventi.social;

import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.social.dto.ChatMessageResponse;
import it.epicode.eventi.social.dto.ChatSummaryResponse;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.dto.UserSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

/**
 * Chat come su Instagram (D13): bandeja delle conversazioni, storico e letture.
 * Una chat e' la riga dell'amicizia (chatId = friendshipId) ed esiste finche' i due sono
 * amici (ACCEPTED) o lo sono stati (REMOVED): togliere un amico non cancella lo storico,
 * che resta in bandeja con il nome dell'utente, leggibile ma non piu' scrivibile.
 * L'invio in tempo reale e' in ChatMessagingService (solo ACCEPTED).
 */
@Service
public class ChatHistoryService {

	private static final int MAX_PAGE_SIZE = 50;
	private static final Set<FriendshipStatus> CHAT_STATUSES = EnumSet.of(FriendshipStatus.ACCEPTED, FriendshipStatus.REMOVED);

	private final FriendshipRepository friendshipRepository;
	private final ChatMessageRepository messageRepository;

	public ChatHistoryService(FriendshipRepository friendshipRepository, ChatMessageRepository messageRepository) {
		this.friendshipRepository = friendshipRepository;
		this.messageRepository = messageRepository;
	}

	/** Le mie conversazioni con almeno un messaggio, dalla piu' recente. */
	@Transactional(readOnly = true)
	public Page<ChatSummaryResponse> inbox(User me, int page, int size) {
		return messageRepository.findLastMessagePerChat(me.getId(), CHAT_STATUSES, pageRequest(page, size))
				.map(last -> {
					Friendship f = last.getFriendship();
					User other = f.getRequester().getId().equals(me.getId()) ? f.getAddressee() : f.getRequester();
					return new ChatSummaryResponse(f.getId(), UserSummaryResponse.from(other),
							f.getStatus() == FriendshipStatus.ACCEPTED, ChatMessageResponse.from(last),
							messageRepository.countByFriendshipIdAndSenderIdNotAndReadAtIsNull(f.getId(), me.getId()));
				});
	}

	/** Storico dal messaggio piu' recente. Solo i due utenti lo vedono (IDOR: l'id nell'URL non basta). */
	@Transactional(readOnly = true)
	public Page<ChatMessageResponse> messages(UUID chatId, User me, int page, int size) {
		findChatForMember(chatId, me);
		return messageRepository.findByFriendshipIdOrderBySentAtDesc(chatId, pageRequest(page, size))
				.map(ChatMessageResponse::from);
	}

	/** Segna come letti i messaggi ricevuti in questa chat (quelli inviati da me non si toccano). */
	@Transactional
	public void markRead(UUID chatId, User me) {
		findChatForMember(chatId, me);
		messageRepository.markRead(chatId, me.getId(), OffsetDateTime.now());
	}

	// Chi non fa parte della chat, o se la chat non esiste (richiesta PENDING/REJECTED), riceve 404.
	private Friendship findChatForMember(UUID chatId, User me) {
		return friendshipRepository.findWithUsersById(chatId)
				.filter(f -> f.getRequester().getId().equals(me.getId()) || f.getAddressee().getId().equals(me.getId()))
				.filter(f -> CHAT_STATUSES.contains(f.getStatus()))
				.orElseThrow(() -> new NotFoundException("Chat non trovata"));
	}

	private static PageRequest pageRequest(int page, int size) {
		return PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
	}
}
