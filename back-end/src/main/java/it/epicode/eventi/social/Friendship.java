package it.epicode.eventi.social;

import it.epicode.eventi.event.Event;
import it.epicode.eventi.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * Richiesta di amicizia tra due partecipanti dello stesso evento.
 * "Una sola riga per coppia in qualunque direzione" e' garantito dall'indice
 * uq_friendships_pair su LEAST/GREATEST, che esiste solo in schema.sql (D12).
 */
@Entity
@Table(name = "friendships")
public class Friendship {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "requester_id", nullable = false)
	private User requester;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "addressee_id", nullable = false)
	private User addressee;

	// Evento in cui e' nata la richiesta (tracciabilita').
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "event_id")
	private Event event;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private FriendshipStatus status = FriendshipStatus.PENDING;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	private OffsetDateTime respondedAt;

	protected Friendship() {
	}

	// Nasce sempre PENDING; event = evento in cui e' nata la richiesta.
	public Friendship(User requester, User addressee, Event event) {
		this.requester = requester;
		this.addressee = addressee;
		this.event = event;
	}

	public UUID getId() { return id; }

	public User getRequester() { return requester; }
	public void setRequester(User requester) { this.requester = requester; }

	public User getAddressee() { return addressee; }
	public void setAddressee(User addressee) { this.addressee = addressee; }

	public Event getEvent() { return event; }
	public void setEvent(Event event) { this.event = event; }

	public FriendshipStatus getStatus() { return status; }
	public void setStatus(FriendshipStatus status) { this.status = status; }

	public OffsetDateTime getCreatedAt() { return createdAt; }

	public OffsetDateTime getRespondedAt() { return respondedAt; }
	public void setRespondedAt(OffsetDateTime respondedAt) { this.respondedAt = respondedAt; }
}
