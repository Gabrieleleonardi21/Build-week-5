package it.epicode.eventi.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyRequest(
		@NotBlank @Email String email,
		@NotBlank @Pattern(regexp = "[0-9]{6}", message = "Il codice e' di 6 cifre") String code) {
}
