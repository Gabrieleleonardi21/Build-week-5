package it.epicode.eventi.event.dto;

import it.epicode.eventi.event.MarkerKind;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Ingresso, uscita o uscita di sicurezza da disegnare sulla mappa dell'evento (D08). */
public record MarkerRequest(
		@NotNull MarkerKind kind,
		@Size(max = 100) String label,
		@NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
		@NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude) {
}
