package it.epicode.eventi.event.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/** Artista in scaletta, indicato per nome: se non esiste viene creato (find-or-create, D07). */
public record LineupEntryRequest(
		@NotBlank @Size(max = 150) String artistName,
		OffsetDateTime performanceStart,
		OffsetDateTime performanceEnd) {
}
