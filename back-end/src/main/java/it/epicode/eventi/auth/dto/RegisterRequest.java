package it.epicode.eventi.auth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Il ruolo non c'e' di proposito: chi si registra e' sempre USER. */
public record RegisterRequest(
		@NotBlank @Email @Size(max = 255) String email,
		// 72 e' il limite di BCrypt; quello in byte (caratteri accentati) lo controlla AuthService.
		@NotBlank @Size(min = 8, max = 72) String password,
		@NotBlank @Size(max = 100) String firstName,
		@NotBlank @Size(max = 100) String lastName,
		@NotNull @Past LocalDate birthDate,
		@AssertTrue(message = "La privacy policy va accettata") boolean privacyAccepted) {
}
