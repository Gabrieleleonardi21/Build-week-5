package it.epicode.eventi.social;

import it.epicode.eventi.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Messaggio di chat 1:1. Appartiene a un'amicizia, non a una coppia di utenti:
 * senza amicizia la chat non puo' esistere (D13). Che sia ACCEPTED e che il
 * mittente ne faccia parte lo controlla il service.
 */
@Entity
@Table(name = "chat_messages")
public class ChatMessage {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "friendship_id", nullable = false)
	private Friendship friendship;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "sender_id", nullable = false)
	private User sender;

	@Column(nullable = false, length = 2000)
	private String content;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private OffsetDateTime sentAt;

	private OffsetDateTime readAt;

	public UUID getId() { return id; }

	public Friendship getFriendship() { return friendship; }
	public void setFriendship(Friendship friendship) { this.friendship = friendship; }

	public User getSender() { return sender; }
	public void setSender(User sender) { this.sender = sender; }

	public String getContent() { return content; }
	public void setContent(String content) { this.content = content; }

	public OffsetDateTime getSentAt() { return sentAt; }

	public OffsetDateTime getReadAt() { return readAt; }
	public void setReadAt(OffsetDateTime readAt) { this.readAt = readAt; }
}
