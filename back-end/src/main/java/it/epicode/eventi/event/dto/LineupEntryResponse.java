package it.epicode.eventi.event.dto;

import it.epicode.eventi.event.Artist;
import it.epicode.eventi.event.EventArtist;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Un artista nella scaletta della serata, con i dati dell'artista gia' inclusi. */
public record LineupEntryResponse(
		UUID artistId,
		String artistName,
		String genre,
		String imageUrl,
		Integer performanceOrder,
		OffsetDateTime performanceStart,
		OffsetDateTime performanceEnd,
		String posterUrl) {

	public static LineupEntryResponse from(EventArtist entry) {
		Artist artist = entry.getArtist();
		return new LineupEntryResponse(artist.getId(), artist.getName(), artist.getGenre(), artist.getImageUrl(),
				entry.getPerformanceOrder(), entry.getPerformanceStart(), entry.getPerformanceEnd(),
				entry.getPosterUrl());
	}
}
