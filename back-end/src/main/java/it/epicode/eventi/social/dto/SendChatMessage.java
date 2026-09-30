package it.epicode.eventi.social.dto;

import java.util.UUID;

/** Payload STOMP inviato su /app/chat.send. La validazione del testo e' in ChatMessagingService. */
public record SendChatMessage(UUID friendshipId, String content) {
}
