package it.epicode.eventi.event.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Creazione e modifica di un artista. imageUrl solo http/https: javascript:... diventerebbe XSS nel FE. */
public record ArtistRequest(
		@NotBlank @Size(max = 150) String name,
		@Size(max = 100) String genre,
		@Size(max = 5000) String bio,
		@Size(max = 500)
		@Pattern(regexp = "(?i)(https?://\\S+)?", message = "Sono ammessi solo link http o https")
		String imageUrl) {
}
