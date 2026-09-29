package it.epicode.eventi.event.dto;

import it.epicode.eventi.user.User;

import java.util.UUID;

/** Proprietario come lo vede chiunque apra l'evento: niente email ne' altri dati personali. */
public record OwnerResponse(UUID id, String firstName, String lastName, String avatarUrl) {

	public static OwnerResponse from(User user) {
		return new OwnerResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getAvatarUrl());
	}
}
