package it.epicode.eventi.event.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Creazione e modifica di un evento. La PUT sostituisce tutto, scaletta e marker compresi:
 * lineup o markers null o vuoti = nessun artista / nessun marker.
 * Proprietario, stato e date di sistema non ci sono di proposito: li imposta il backend.
 * L'ordine di lineup e' l'ordine della serata (il primo apre).
 */
public record EventRequest(
		@NotBlank @Size(max = 150) String title,
		@Size(max = 10000) String description,
		@NotNull OffsetDateTime startsAt,
		OffsetDateTime endsAt,
		@Size(max = 150) String venueName,
		@NotBlank @Size(max = 255) String address,
		@NotBlank @Size(max = 100) String city,
		@Pattern(regexp = "([A-Za-z]{2})?", message = "La provincia e' una sigla di 2 lettere") String province,
		@NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
		@NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
		@Positive Integer maxParticipants,
		@Size(max = 30) List<@NotNull @Valid LineupEntryRequest> lineup,
		@Size(max = 30) List<@NotNull @Valid MarkerRequest> markers) {
}
