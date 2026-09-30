package it.epicode.eventi.event.dto;

import jakarta.validation.constraints.Size;

/**
 * Testo da migliorare: la bozza che l'utente sta scrivendo nel form, anche non ancora salvata.
 * Vuoto o assente = si usa la descrizione gia' salvata dell'evento.
 */
public record AiDescriptionRequest(@Size(max = 10000) String text) {
}
