package it.epicode.eventi.ticket;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ConflictException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.event.Event;
import it.epicode.eventi.event.EventRepository;
import it.epicode.eventi.event.EventStatus;
import it.epicode.eventi.notification.NotificationService;
import it.epicode.eventi.notification.NotificationType;
import it.epicode.eventi.ticket.dto.ParticipantResponse;
import it.epicode.eventi.ticket.dto.TicketResponse;
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Iscrizione agli eventi (Parte 2): il ticket e' la partecipazione (D09).
 * Dopo il commit TicketCreated fa partire l'email del ticket e quella al proprietario
 * (TicketMailListener); la notifica in piattaforma al proprietario nasce qui.
 */
@Service
public class TicketService {

	private static final int MAX_PAGE_SIZE = 50;
	private static final String CODE_PREFIX = "EVT-";
	private static final int CODE_LENGTH = 8;
	// Niente 0/O ne' 1/I: il codice si legge e si detta senza ambiguita'.
	private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

	private final TicketRepository ticketRepository;
	private final EventRepository eventRepository;
	private final NotificationService notificationService;
	private final ApplicationEventPublisher events;
	private final SecureRandom random = new SecureRandom();

	public TicketService(TicketRepository ticketRepository, EventRepository eventRepository,
			NotificationService notificationService, ApplicationEventPublisher events) {
		this.ticketRepository = ticketRepository;
		this.eventRepository = eventRepository;
		this.notificationService = notificationService;
		this.events = events;
	}

	@Transactional
	public TicketResponse join(UUID eventId, User me) {
		// Lock sull'evento: controllo della capienza e insert non si accavallano con altre iscrizioni.
		Event event = eventRepository.findByIdForUpdate(eventId)
				.orElseThrow(() -> new NotFoundException("Evento non trovato"));
		if (event.getStatus() == EventStatus.CANCELLED) {
			throw new BadRequestException("L'evento e' stato annullato");
		}
		if (!event.getStartsAt().isAfter(OffsetDateTime.now())) {
			throw new BadRequestException("Iscrizioni chiuse: l'evento e' gia' iniziato");
		}
		if (event.getOwner().getId().equals(me.getId())) {
			throw new BadRequestException("Sei l'organizzatore di questo evento");
		}
		Ticket ticket = ticketRepository.findByEventIdAndUserId(eventId, me.getId()).orElse(null);
		if (ticket != null && ticket.getStatus() == TicketStatus.VALID) {
			throw new ConflictException("Sei gia' iscritto a questo evento");
		}
		Integer max = event.getMaxParticipants();
		if (max != null && eventRepository.countTickets(eventId, TicketStatus.VALID) >= max) {
			throw new ConflictException("Evento al completo");
		}

		if (ticket == null) {
			ticket = new Ticket(event, me, newCode());
		} else {
			// Si era disiscritto: stessa riga (uq_tickets_event_user) e stesso codice, email da rimandare.
			ticket.setStatus(TicketStatus.VALID);
			ticket.setEmailSentAt(null);
		}
		// Flush: issuedAt lo valorizza Hibernate all'INSERT e serve nella risposta.
		ticketRepository.saveAndFlush(ticket);

		events.publishEvent(new TicketCreated(ticket.getId()));
		notificationService.notify(event.getOwner(), event, NotificationType.NEW_PARTICIPANT, "Nuovo partecipante",
				me.getFirstName() + " " + me.getLastName() + " si e' iscritto a \"" + event.getTitle() + "\".");
		return TicketResponse.from(ticket);
	}

	/** Disiscrizione (facoltativa): il ticket resta come CANCELLED e il posto si libera. */
	@Transactional
	public void leave(UUID eventId, User me) {
		Ticket ticket = findValid(eventId, me);
		if (!ticket.getEvent().getStartsAt().isAfter(OffsetDateTime.now())) {
			throw new BadRequestException("L'evento e' gia' iniziato");
		}
		ticket.setStatus(TicketStatus.CANCELLED);
	}

	/** Il mio ticket per un evento: al FE serve per mostrare "Iscritto" o il pulsante "Partecipa". */
	@Transactional(readOnly = true)
	public TicketResponse myTicket(UUID eventId, User me) {
		return TicketResponse.from(findValid(eventId, me));
	}

	@Transactional(readOnly = true)
	public Page<TicketResponse> myTickets(User me, int page, int size) {
		return ticketRepository.findByUser(me.getId(), TicketStatus.VALID, pageRequest(page, size))
				.map(TicketResponse::from);
	}

	/**
	 * Partecipanti di un evento: li vedono il proprietario, un MODERATOR/SUPERADMIN e gli altri partecipanti
	 * (servono per le richieste di amicizia, Parte 3). Per tutti gli altri 403.
	 */
	@Transactional(readOnly = true)
	public Page<ParticipantResponse> participants(UUID eventId, User me, int page, int size) {
		Event event = eventRepository.findById(eventId)
				.orElseThrow(() -> new NotFoundException("Evento non trovato"));
		boolean allowed = event.getOwner().getId().equals(me.getId())
				|| me.getRole().isAtLeast(Role.MODERATOR)
				|| ticketRepository.existsByEventIdAndUserIdAndStatus(eventId, me.getId(), TicketStatus.VALID);
		if (!allowed) {
			throw new ForbiddenException("Solo chi partecipa vede gli altri partecipanti");
		}
		return ticketRepository.findParticipants(eventId, TicketStatus.VALID, pageRequest(page, size))
				.map(ParticipantResponse::from);
	}

	// Il ticket si cerca per evento + utente loggato: un id nell'URL non basta a leggere quello di un altro.
	private Ticket findValid(UUID eventId, User me) {
		return ticketRepository.findByEventIdAndUserId(eventId, me.getId())
				.filter(t -> t.getStatus() == TicketStatus.VALID)
				.orElseThrow(() -> new NotFoundException("Non sei iscritto a questo evento"));
	}

	// Es. EVT-7K3M9QA2. SecureRandom: il codice non si indovina; l'UNIQUE su code resta l'ultima difesa.
	private String newCode() {
		String code;
		do {
			StringBuilder sb = new StringBuilder(CODE_PREFIX);
			for (int i = 0; i < CODE_LENGTH; i++) {
				sb.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
			}
			code = sb.toString();
		} while (ticketRepository.existsByCode(code));
		return code;
	}

	private static PageRequest pageRequest(int page, int size) {
		return PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
	}
}
