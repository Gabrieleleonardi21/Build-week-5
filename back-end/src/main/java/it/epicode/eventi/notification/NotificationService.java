package it.epicode.eventi.notification;

import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.event.Event;
import it.epicode.eventi.event.EventRepository;
import it.epicode.eventi.notification.dto.NotificationResponse;
import it.epicode.eventi.notification.dto.OwnerMessageRequest;
import it.epicode.eventi.ticket.TicketRepository;
import it.epicode.eventi.ticket.TicketStatus;
import it.epicode.eventi.user.User;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Notifiche in piattaforma: una riga per destinatario + push WebSocket (D11).
 * I colleghi la usano chiamando notify(...) (iscrizioni, amicizie) o pubblicando EventChanged.
 */
@Service
public class NotificationService {

	private static final int MAX_PAGE_SIZE = 50;

	private final NotificationRepository notificationRepository;
	private final TicketRepository ticketRepository;
	private final EventRepository eventRepository;
	private final ApplicationEventPublisher events;

	public NotificationService(NotificationRepository notificationRepository, TicketRepository ticketRepository,
			EventRepository eventRepository, ApplicationEventPublisher events) {
		this.notificationRepository = notificationRepository;
		this.ticketRepository = ticketRepository;
		this.eventRepository = eventRepository;
		this.events = events;
	}

	/**
	 * Salva una notifica per un destinatario; il push parte dopo il commit (NotificationPushListener).
	 * @param event puo' essere null per le notifiche non legate a un evento
	 */
	@Transactional
	public void notify(User recipient, Event event, NotificationType type, String title, String body) {
		Notification n = new Notification(recipient, event, type, title, body);
		notificationRepository.save(n);
		events.publishEvent(new NotificationCreated(recipient.getEmail(), NotificationResponse.from(n)));
	}

	/** Fan-out: una notifica per ogni possessore di ticket VALID (§6.5). */
	@Transactional
	public void notifyHolders(Event event, NotificationType type, String title, String body) {
		for (User holder : ticketRepository.findHolders(event.getId(), TicketStatus.VALID)) {
			notify(holder, event, type, title, body);
		}
	}

	/** Messaggio del proprietario a tutti i partecipanti: il controllo sta nel backend. */
	@Transactional
	public void ownerMessage(UUID eventId, User me, OwnerMessageRequest req) {
		Event event = eventRepository.findById(eventId)
				.orElseThrow(() -> new NotFoundException("Evento non trovato"));
		if (!event.getOwner().getId().equals(me.getId())) {
			throw new ForbiddenException("Solo il proprietario scrive ai partecipanti");
		}
		notifyHolders(event, NotificationType.OWNER_MESSAGE, req.title(), req.body());
	}

	@Transactional(readOnly = true)
	public Page<NotificationResponse> mine(User me, int page, int size) {
		PageRequest request = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
		return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(me.getId(), request)
				.map(NotificationResponse::from);
	}

	@Transactional(readOnly = true)
	public long unreadCount(User me) {
		return notificationRepository.countByRecipientIdAndReadAtIsNull(me.getId());
	}

	@Transactional
	public void markRead(UUID notificationId, User me) {
		Notification n = notificationRepository.findById(notificationId)
				.orElseThrow(() -> new NotFoundException("Notifica non trovata"));
		if (!n.getRecipient().getId().equals(me.getId())) {
			throw new ForbiddenException("Non e' una tua notifica");
		}
		if (n.getReadAt() == null) {
			n.setReadAt(OffsetDateTime.now());
		}
	}
}
