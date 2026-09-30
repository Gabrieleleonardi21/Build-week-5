package it.epicode.eventi.notification;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Push della notifica al browser su /user/queue/notifications, solo dopo il commit:
 * se la transazione fallisce l'utente non riceve notifiche fantasma.
 */
@Component
public class NotificationPushListener {

	private final SimpMessagingTemplate messaging;

	public NotificationPushListener(SimpMessagingTemplate messaging) {
		this.messaging = messaging;
	}

	@TransactionalEventListener(fallbackExecution = true)
	public void onNotificationCreated(NotificationCreated event) {
		// Il "nome utente" STOMP e' lo username di Spring Security, cioe' l'email.
		messaging.convertAndSendToUser(event.recipientUsername(), "/queue/notifications", event.payload());
	}
}
