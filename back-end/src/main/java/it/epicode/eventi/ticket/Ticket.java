package it.epicode.eventi.ticket;

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
 * Il ticket e' la partecipazione (D09): i partecipanti di un evento sono i
 * possessori di ticket VALID. Titolo, data e nome si leggono via join (D10).
 */
@Entity
@Table(name = "tickets")
public class Ticket {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "event_id", nullable = false)
	private Event event;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	// Codice leggibile stampato sul biglietto, es. EVT-7K3M9QA2.
	@Column(nullable = false, length = 12, unique = true)
	private String code;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private TicketStatus status = TicketStatus.VALID;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private OffsetDateTime issuedAt;

	// NULL = email ancora da inviare o da ritentare.
	private OffsetDateTime emailSentAt;

	protected Ticket() {
	}

	public Ticket(Event event, User user, String code) {
		this.event = event;
		this.user = user;
		this.code = code;
	}

	public UUID getId() { return id; }

	public Event getEvent() { return event; }
	public void setEvent(Event event) { this.event = event; }

	public User getUser() { return user; }
	public void setUser(User user) { this.user = user; }

	public String getCode() { return code; }
	public void setCode(String code) { this.code = code; }

	public TicketStatus getStatus() { return status; }
	public void setStatus(TicketStatus status) { this.status = status; }

	public OffsetDateTime getIssuedAt() { return issuedAt; }

	public OffsetDateTime getEmailSentAt() { return emailSentAt; }
	public void setEmailSentAt(OffsetDateTime emailSentAt) { this.emailSentAt = emailSentAt; }
}
