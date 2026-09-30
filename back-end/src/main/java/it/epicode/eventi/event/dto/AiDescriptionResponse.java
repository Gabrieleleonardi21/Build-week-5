package it.epicode.eventi.event.dto;

/**
 * Proposta dell'AI: non viene salvata, il proprietario la conferma con PUT /api/events/{id}.
 * E' testo generato: il FE la mostra con textContent, mai come HTML (XSS).
 */
public record AiDescriptionResponse(String proposal) {
}
