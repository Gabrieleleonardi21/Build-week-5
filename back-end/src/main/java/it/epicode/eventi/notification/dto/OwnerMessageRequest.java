package it.epicode.eventi.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Messaggio scritto a mano dal proprietario a tutti i partecipanti (OWNER_MESSAGE). */
public record OwnerMessageRequest(
		@NotBlank @Size(max = 150) String title,
		@NotBlank @Size(max = 5000) String body) {
}
