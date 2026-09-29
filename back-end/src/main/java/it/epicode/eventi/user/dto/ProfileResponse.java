package it.epicode.eventi.user.dto;

import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Il mio profilo completo (solo per me stesso, su /api/me). Gli altri utenti vedono
 * UserSummaryResponse. passwordHash non c'e' mai (SECURITY.md §2).
 */
public record ProfileResponse(
		UUID id,
		String email,
		String firstName,
		String lastName,
		LocalDate birthDate,
		AddressDto address,
		String phone,
		String avatarUrl,
		Role role,
		OffsetDateTime createdAt) {

	public static ProfileResponse from(User user) {
		return new ProfileResponse(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(),
				user.getBirthDate(), AddressDto.from(user.getAddress()), user.getPhone(), user.getAvatarUrl(),
				user.getRole(), user.getCreatedAt());
	}
}
