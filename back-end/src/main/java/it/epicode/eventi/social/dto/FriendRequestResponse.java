package it.epicode.eventi.social.dto;

import it.epicode.eventi.social.Friendship;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.dto.UserSummaryResponse;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Richiesta in attesa. user = l'altra persona: chi l'ha inviata (ricevute)
 * o a chi e' stata inviata (inviate). Evento facoltativo: null se e' stato cancellato.
 */
public record FriendRequestResponse(UUID id, UserSummaryResponse user, UUID eventId, String eventTitle,
		OffsetDateTime createdAt) {

	public static FriendRequestResponse from(Friendship f, User other) {
		return new FriendRequestResponse(f.getId(), UserSummaryResponse.from(other),
				f.getEvent() == null ? null : f.getEvent().getId(),
				f.getEvent() == null ? null : f.getEvent().getTitle(),
				f.getCreatedAt());
	}
}
