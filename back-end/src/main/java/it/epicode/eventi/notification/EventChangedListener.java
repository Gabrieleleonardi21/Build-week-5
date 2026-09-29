package it.epicode.eventi.notification;

import it.epicode.eventi.event.Event;
import it.epicode.eventi.event.EventChanged;
import it.epicode.eventi.event.EventRepository;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Modifica o annullamento di un evento -> notifica a tutti i possessori di ticket.
 * @EventListener sincrono: le notifiche entrano nella stessa transazione della modifica,
 * quindi se la modifica fallisce non resta nessuna notifica.
 */
@Component
public class EventChangedListener {

	private final EventRepository eventRepository;
	private final NotificationService notificationService;

	public EventChangedListener(EventRepository eventRepository, NotificationService notificationService) {
		this.eventRepository = eventRepository;
		this.notificationService = notificationService;
	}

	@EventListener
	public void onEventChanged(EventChanged change) {
		Event event = eventRepository.getReferenceById(change.eventId());
		if (change.cancelled()) {
			notificationService.notifyHolders(event, NotificationType.EVENT_CANCELLED,
					"Evento annullato", "L'evento \"" + event.getTitle() + "\" e' stato annullato.");
			return;
		}
		notificationService.notifyHolders(event, NotificationType.EVENT_UPDATED,
				"Evento aggiornato", "L'evento \"" + event.getTitle() + "\" e' stato modificato: controlla i dettagli.");
	}
}
