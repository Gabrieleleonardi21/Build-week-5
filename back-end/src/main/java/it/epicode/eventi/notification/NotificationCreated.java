package it.epicode.eventi.notification;

import it.epicode.eventi.notification.dto.NotificationResponse;

/** Notifica salvata, da spingere via WebSocket dopo il commit. */
public record NotificationCreated(String recipientUsername, NotificationResponse payload) {
}
