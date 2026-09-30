package it.epicode.eventi.event.dto;

import it.epicode.eventi.event.Event;
import it.epicode.eventi.event.EventStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Evento nelle liste (card): niente scaletta ne' marker, solo la copertina. */
public record EventSummaryResponse(
		UUID id,
		String title,
		OffsetDateTime startsAt,
		OffsetDateTime endsAt,
		String venueName,
		String city,
		String province,
		Double latitude,
		Double longitude,
		EventStatus status,
		String coverUrl) {

	public static EventSummaryResponse from(Event e) {
		// Le immagini sono ordinate per sortOrder: la prima e' la copertina.
		String coverUrl = e.getImages().isEmpty() ? null : e.getImages().getFirst().getUrl();
		return new EventSummaryResponse(e.getId(), e.getTitle(), e.getStartsAt(), e.getEndsAt(), e.getVenueName(),
				e.getCity(), e.getProvince(), e.getLatitude(), e.getLongitude(), e.getStatus(), coverUrl);
	}
}
