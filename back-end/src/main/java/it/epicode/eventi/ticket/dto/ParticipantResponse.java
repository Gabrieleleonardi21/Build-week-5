package it.epicode.eventi.ticket.dto;

import it.epicode.eventi.user.User;

import java.util.UUID;

/**
 * Partecipante nell'elenco di un evento: l'id serve per la richiesta di amicizia (Parte 3).
 * Niente email ne' altri dati personali.
 */
public record ParticipantResponse(UUID id, String firstName, String lastName, String avatarUrl) {

	public static ParticipantResponse from(User user) {
		return new ParticipantResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getAvatarUrl());
	}
}
