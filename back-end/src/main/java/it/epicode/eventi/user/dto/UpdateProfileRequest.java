package it.epicode.eventi.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Modifica del profilo (PUT: sostituisce tutti i campi, address null = nessun indirizzo).
 * Email, ruolo, stato e avatar non ci sono di proposito: l'email richiederebbe una nuova
 * verifica, ruolo e stato li cambia solo l'area admin, l'avatar ha il suo upload.
 */
public record UpdateProfileRequest(
		@NotBlank @Size(max = 100) String firstName,
		@NotBlank @Size(max = 100) String lastName,
		@NotNull @Past LocalDate birthDate,
		@Size(max = 30)
		@Pattern(regexp = "(\\+?[0-9 ]{6,29})?", message = "Numero di telefono non valido")
		String phone,
		@Valid AddressDto address) {
}
