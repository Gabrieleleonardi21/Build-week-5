package it.epicode.eventi.event.dto;

import it.epicode.eventi.event.EventImage;

import java.util.UUID;

/** Immagine dell'evento: la storageKey di Cloudinary resta nel backend. sortOrder 0 = copertina. */
public record EventImageResponse(UUID id, String url, Integer sortOrder) {

	public static EventImageResponse from(EventImage image) {
		return new EventImageResponse(image.getId(), image.getUrl(), image.getSortOrder());
	}
}
