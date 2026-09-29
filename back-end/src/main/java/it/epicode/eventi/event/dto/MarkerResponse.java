package it.epicode.eventi.event.dto;

import it.epicode.eventi.event.EventMarker;
import it.epicode.eventi.event.MarkerKind;

import java.util.UUID;

public record MarkerResponse(UUID id, MarkerKind kind, String label, Double latitude, Double longitude) {

	public static MarkerResponse from(EventMarker marker) {
		return new MarkerResponse(marker.getId(), marker.getKind(), marker.getLabel(),
				marker.getLatitude(), marker.getLongitude());
	}
}
