package it.epicode.eventi.social.dto;

import it.epicode.eventi.social.ChatMessage;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Messaggio di chat: stesso formato per il push STOMP e per lo storico REST. */
public record ChatMessageResponse(
		UUID id,
		UUID friendshipId,
		UUID senderId,
		String content,
		OffsetDateTime sentAt,
		OffsetDateTime readAt) {

	public static ChatMessageResponse from(ChatMessage m) {
		return new ChatMessageResponse(m.getId(), m.getFriendship().getId(), m.getSender().getId(),
				m.getContent(), m.getSentAt(), m.getReadAt());
	}
}
