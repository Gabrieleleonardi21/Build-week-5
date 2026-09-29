package it.epicode.eventi.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Conferma della cancellazione dell'account con la password attuale: l'operazione non si annulla. */
public record DeleteAccountRequest(@NotBlank @Size(max = 72) String password) {
}
