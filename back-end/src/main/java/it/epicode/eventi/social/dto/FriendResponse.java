package it.epicode.eventi.social.dto;

import it.epicode.eventi.user.dto.UserSummaryResponse;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Un amico nella lista. friendshipId e' anche l'id della chat
 * (storico su /api/chats/{id}/messages, invio su /app/chat.send).
 */
public record FriendResponse(UUID friendshipId, UserSummaryResponse friend, OffsetDateTime since,
		long unreadMessages) {
}
