package it.epicode.eventi.event.dto;

import it.epicode.eventi.event.Event;
import it.epicode.eventi.event.EventArtist;
import it.epicode.eventi.event.EventStatus;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** Dettaglio dell'evento (pagina dell'evento). participants = ticket VALID, li conta il service. */
public record EventResponse(
		UUID id,
		String title,
		String description,
		OffsetDateTime startsAt,
		OffsetDateTime endsAt,
		String venueName,
		String address,
		String city,
		String province,
		Double latitude,
		Double longitude,
		Integer maxParticipants,
		long participants,
		EventStatus status,
		OwnerResponse owner,
		List<EventImageResponse> images,
		List<LineupEntryResponse> lineup,
		List<MarkerResponse> markers,
		OffsetDateTime createdAt,
		OffsetDateTime updatedAt) {

	public static EventResponse from(Event e, long participants) {
		// Dopo una modifica la lista in memoria non e' riordinata dall'@OrderBy: si ordina qui.
		List<LineupEntryResponse> lineup = e.getLineup().stream()
				.sorted(Comparator.comparing(EventArtist::getPerformanceOrder))
				.map(LineupEntryResponse::from)
				.toList();
		return new EventResponse(e.getId(), e.getTitle(), e.getDescription(), e.getStartsAt(), e.getEndsAt(),
				e.getVenueName(), e.getAddress(), e.getCity(), e.getProvince(), e.getLatitude(), e.getLongitude(),
				e.getMaxParticipants(), participants, e.getStatus(), OwnerResponse.from(e.getOwner()),
				e.getImages().stream().map(EventImageResponse::from).toList(),
				lineup,
				e.getMarkers().stream().map(MarkerResponse::from).toList(),
				e.getCreatedAt(), e.getUpdatedAt());
	}
}
