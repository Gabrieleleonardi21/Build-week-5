package it.epicode.eventi.mail;

import it.epicode.eventi.event.Event;
import it.epicode.eventi.ticket.Ticket;
import it.epicode.eventi.ticket.TicketCreated;
import it.epicode.eventi.ticket.TicketRepository;
import it.epicode.eventi.user.User;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Email di iscrizione (Parte 2): ticket al partecipante e avviso al proprietario.
 * email_sent_at si valorizza solo se il ticket e' partito; altrimenti il job ritenta.
 */
@Component
public class TicketMailListener {

	// Si ritentano solo i ticket vecchi di almeno 5 minuti: quelli nuovi li sta ancora inviando il listener.
	private static final int RETRY_AFTER_MINUTES = 5;

	private final TicketRepository ticketRepository;
	private final MailService mailService;

	public TicketMailListener(TicketRepository ticketRepository, MailService mailService) {
		this.ticketRepository = ticketRepository;
		this.mailService = mailService;
	}

	@Async
	@TransactionalEventListener
	public void onTicketCreated(TicketCreated event) {
		send(event.ticketId(), true);
	}

	// Il reinvio riguarda solo il ticket: il proprietario ha comunque la notifica in piattaforma.
	@Scheduled(fixedDelayString = "PT10M")
	public void retryFailed() {
		OffsetDateTime before = OffsetDateTime.now().minusMinutes(RETRY_AFTER_MINUTES);
		for (Ticket ticket : ticketRepository.findTop50ByEmailSentAtIsNullAndIssuedAtBefore(before)) {
			send(ticket.getId(), false);
		}
	}

	private void send(UUID ticketId, boolean notifyOwner) {
		Ticket ticket = ticketRepository.findWithDetailsById(ticketId).orElse(null);
		if (ticket == null) {
			return;
		}
		Event event = ticket.getEvent();
		User participant = ticket.getUser();
		String participantName = participant.getFirstName() + " " + participant.getLastName();
		String when = MailFormats.dateTime(event.getStartsAt());

		boolean sent = mailService.sendTemplate(participant.getEmail(), "Il tuo ticket per " + event.getTitle(), "ticket",
				Map.of(
						"firstName", participant.getFirstName(),
						"participantName", participantName,
						"eventTitle", event.getTitle(),
						"eventDate", when,
						"eventPlace", place(event),
						"ticketCode", ticket.getCode(),
						"eventId", event.getId()));
		if (sent) {
			ticketRepository.markEmailSent(ticket.getId(), OffsetDateTime.now());
		}

		if (notifyOwner) {
			mailService.sendTemplate(event.getOwner().getEmail(), "Nuova iscrizione a " + event.getTitle(),
					"new-participant", Map.of(
							"ownerName", event.getOwner().getFirstName(),
							"participantName", participantName,
							"eventTitle", event.getTitle(),
							"eventDate", when,
							"eventId", event.getId()));
		}
	}

	/** "Nome locale, indirizzo, citta'" oppure solo "indirizzo, citta'". */
	private String place(Event event) {
		String place = event.getAddress() + ", " + event.getCity();
		if (event.getVenueName() != null && !event.getVenueName().isBlank()) {
			place = event.getVenueName() + ", " + place;
		}
		return place;
	}
}
