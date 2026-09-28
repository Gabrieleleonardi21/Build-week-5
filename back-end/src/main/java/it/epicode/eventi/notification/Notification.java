package it.epicode.eventi.notification;

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

/** Notifica in piattaforma: una riga per destinatario (D11). */
@Entity
@Table(name = "notifications")
public class Notification {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "recipient_id", nullable = false)
	private User recipient;

	// NULL per le notifiche non legate a un evento (es. amicizie senza evento).
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "event_id")
	private Event event;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private NotificationType type;

	@Column(nullable = false, length = 150)
	private String title;

	@Column(nullable = false, columnDefinition = "text")
	private String body;

	private OffsetDateTime readAt;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	public UUID getId() { return id; }

	public User getRecipient() { return recipient; }
	public void setRecipient(User recipient) { this.recipient = recipient; }

	public Event getEvent() { return event; }
	public void setEvent(Event event) { this.event = event; }

	public NotificationType getType() { return type; }
	public void setType(NotificationType type) { this.type = type; }

	public String getTitle() { return title; }
	public void setTitle(String title) { this.title = title; }

	public String getBody() { return body; }
	public void setBody(String body) { this.body = body; }

	public OffsetDateTime getReadAt() { return readAt; }
	public void setReadAt(OffsetDateTime readAt) { this.readAt = readAt; }

	public OffsetDateTime getCreatedAt() { return createdAt; }
}
