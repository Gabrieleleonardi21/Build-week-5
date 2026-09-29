package it.epicode.eventi.social;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

	// Storico dal piu' recente (usa idx_chat_messages_friendship): il FE carica le pagine piu' vecchie scorrendo.
	Page<ChatMessage> findByFriendshipIdOrderBySentAtDesc(UUID friendshipId, Pageable pageable);

	/**
	 * Bandeja delle chat: l'ultimo messaggio di ogni conversazione dell'utente, dalla piu' recente.
	 * statuses = ACCEPTED e REMOVED: la chat con chi non e' piu' amico resta in elenco, come su Instagram.
	 */
	@Query(value = """
			select m from ChatMessage m
			join fetch m.friendship f join fetch f.requester join fetch f.addressee
			where (f.requester.id = :me or f.addressee.id = :me)
			  and f.status in :statuses
			  and m.sentAt = (select max(m2.sentAt) from ChatMessage m2 where m2.friendship = f)
			order by m.sentAt desc
			""", countQuery = """
			select count(f) from Friendship f
			where (f.requester.id = :me or f.addressee.id = :me)
			  and f.status in :statuses
			  and exists (select m2 from ChatMessage m2 where m2.friendship = f)
			""")
	Page<ChatMessage> findLastMessagePerChat(UUID me, Collection<FriendshipStatus> statuses, Pageable pageable);

	// Messaggi dell'altro utente non ancora letti.
	long countByFriendshipIdAndSenderIdNotAndReadAtIsNull(UUID friendshipId, UUID senderId);

	/** Segna come letti tutti i messaggi ricevuti in una chat (quelli inviati da me non si toccano). */
	@Modifying
	@Query("""
			update ChatMessage m set m.readAt = :now
			where m.friendship.id = :friendshipId and m.sender.id <> :me and m.readAt is null
			""")
	int markRead(UUID friendshipId, UUID me, OffsetDateTime now);
}
