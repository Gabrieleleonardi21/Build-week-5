package it.epicode.eventi.admin.dto;

import it.epicode.eventi.user.Role;
import jakarta.validation.constraints.NotNull;

public record RoleChangeRequest(@NotNull Role role) {
}
