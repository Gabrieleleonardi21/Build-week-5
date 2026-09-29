package it.epicode.eventi.admin.dto;

import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Utente come lo vede l'area admin: dati dell'account, mai passwordHash. */
public record AdminUserResponse(
		UUID id,
		String email,
		String firstName,
		String lastName,
		Role role,
		UserStatus status,
		OffsetDateTime emailVerifiedAt,
		OffsetDateTime anonymizedAt,
		OffsetDateTime createdAt) {

	public static AdminUserResponse from(User u) {
		return new AdminUserResponse(u.getId(), u.getEmail(), u.getFirstName(), u.getLastName(), u.getRole(),
				u.getStatus(), u.getEmailVerifiedAt(), u.getAnonymizedAt(), u.getCreatedAt());
	}
}
