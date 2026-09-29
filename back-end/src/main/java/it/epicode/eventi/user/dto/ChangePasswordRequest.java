package it.epicode.eventi.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Serve la password attuale: una sessione rubata da sola non basta a cambiarla. */
public record ChangePasswordRequest(
		@NotBlank @Size(max = 72) String currentPassword,
		// 72 e' il limite di BCrypt; quello in byte (caratteri accentati) lo controlla ProfileService.
		@NotBlank @Size(min = 8, max = 72) String newPassword) {
}
