package it.epicode.eventi.event;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Chiave composta di event_artists: (event_id, artist_id).
 * I due valori li copia Hibernate dalle relazioni (@MapsId in EventArtist):
 * il codice applicativo non li imposta mai.
 */
@Embeddable
public class EventArtistId implements Serializable {

	@Column(name = "event_id")
	private UUID eventId;

	@Column(name = "artist_id")
	private UUID artistId;

	protected EventArtistId() {
	}

	public UUID getEventId() { return eventId; }

	public UUID getArtistId() { return artistId; }

	// Obbligatori per una chiave composta: Hibernate confronta le chiavi per valore.
	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		if (!(o instanceof EventArtistId other)) {
			return false;
		}
		return Objects.equals(eventId, other.eventId) && Objects.equals(artistId, other.artistId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(eventId, artistId);
	}
}
