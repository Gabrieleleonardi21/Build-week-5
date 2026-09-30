package it.epicode.eventi.admin.dto;

import it.epicode.eventi.user.UserStatus;
import jakarta.validation.constraints.NotNull;

/** Solo ACTIVE (riattiva) o DEACTIVATED (disattiva): PENDING_VERIFICATION lo decide la verifica email. */
public record StatusChangeRequest(@NotNull UserStatus status) {
}
