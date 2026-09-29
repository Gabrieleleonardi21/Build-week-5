package it.epicode.eventi.event.dto;

import it.epicode.eventi.event.Artist;

import java.util.UUID;

public record ArtistResponse(UUID id, String name, String genre, String bio, String imageUrl) {

	public static ArtistResponse from(Artist artist) {
		return new ArtistResponse(artist.getId(), artist.getName(), artist.getGenre(), artist.getBio(),
				artist.getImageUrl());
	}
}
