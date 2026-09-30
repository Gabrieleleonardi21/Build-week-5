package it.epicode.eventi.event.dto;

import it.epicode.eventi.event.Event;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Segnaposto sulla mappa pubblica (D14): solo quello che serve a disegnarlo e al popup. */
public record EventPinResponse(UUID id, String title, OffsetDateTime startsAt, String city,
		Double latitude, Double longitude) {

	public static EventPinResponse from(Event e) {
		return new EventPinResponse(e.getId(), e.getTitle(), e.getStartsAt(), e.getCity(),
				e.getLatitude(), e.getLongitude());
	}
}
