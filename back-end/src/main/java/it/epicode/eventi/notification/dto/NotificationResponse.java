package it.epicode.eventi.notification.dto;

import it.epicode.eventi.notification.Notification;
import it.epicode.eventi.notification.NotificationType;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Notifica come la vede il frontend, sia via REST sia via WebSocket. */
public record NotificationResponse(
		UUID id,
		NotificationType type,
		String title,
		String body,
		UUID eventId,
		OffsetDateTime readAt,
		OffsetDateTime createdAt) {

	public static NotificationResponse from(Notification n) {
		UUID eventId = null;
		if (n.getEvent() != null) {
			// Su un proxy Hibernate getId() non esegue query.
			eventId = n.getEvent().getId();
		}
		return new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getBody(),
				eventId, n.getReadAt(), n.getCreatedAt());
	}
}
