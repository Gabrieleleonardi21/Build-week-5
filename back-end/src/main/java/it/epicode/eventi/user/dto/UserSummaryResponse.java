package it.epicode.eventi.user.dto;

import it.epicode.eventi.user.User;

import java.util.UUID;

/**
 * Profilo di un utente come lo vede un altro utente: niente email, ruolo, stato,
 * data di nascita o indirizzo. I dati completi solo nell'area admin (AdminUserResponse).
 */
public record UserSummaryResponse(UUID id, String firstName, String lastName, String avatarUrl) {

	public static UserSummaryResponse from(User user) {
		return new UserSummaryResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getAvatarUrl());
	}
}
