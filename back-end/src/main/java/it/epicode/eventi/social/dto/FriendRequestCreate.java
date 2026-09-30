package it.epicode.eventi.social.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Richiesta di amicizia: a chi, e l'evento a cui partecipate entrambi. */
public record FriendRequestCreate(@NotNull UUID addresseeId, @NotNull UUID eventId) {
}
