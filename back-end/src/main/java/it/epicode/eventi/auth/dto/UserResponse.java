package it.epicode.eventi.auth.dto;

import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;

import java.util.UUID;

/** Utente corrente per il FE: mai l'entity (niente passwordHash nel JSON). */
public record UserResponse(UUID id, String email, String firstName, String lastName, Role role, String avatarUrl) {

	public static UserResponse from(User user) {
		return new UserResponse(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(),
				user.getRole(), user.getAvatarUrl());
	}
}
