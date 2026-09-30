package it.epicode.eventi.event;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/**
 * Un artista nella scaletta di un evento (tabella event_artists).
 * Prima era un semplice @ManyToMany; ora ha colonne proprie (ordine, orari,
 * locandina) e quindi diventa un'entity con chiave composta.
 */
@Entity
@Table(name = "event_artists")
public class EventArtist {

	// Vuota alla creazione: @MapsId la riempie con gli id di evento e artista al salvataggio.
	@EmbeddedId
	private EventArtistId id = new EventArtistId();

	@MapsId("eventId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "event_id")
	private Event event;

	@MapsId("artistId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "artist_id")
	private Artist artist;

	// 1 = apre la serata. Unica per evento (vincolo in schema.sql).
	@Column(nullable = false)
	private Integer performanceOrder;

	private OffsetDateTime performanceStart;

	private OffsetDateTime performanceEnd;

	@Column(length = 500)
	private String posterUrl;

	@Column(length = 255)
	private String posterStorageKey;

	protected EventArtist() {
	}

	// L'evento lo collega Event.addToLineup(), che tiene allineati i due lati della relazione.
	public EventArtist(Artist artist, Integer performanceOrder) {
		this.artist = artist;
		this.performanceOrder = performanceOrder;
	}

	public EventArtistId getId() { return id; }

	public Event getEvent() { return event; }
	void setEvent(Event event) { this.event = event; }

	public Artist getArtist() { return artist; }

	public Integer getPerformanceOrder() { return performanceOrder; }
	public void setPerformanceOrder(Integer performanceOrder) { this.performanceOrder = performanceOrder; }

	public OffsetDateTime getPerformanceStart() { return performanceStart; }
	public void setPerformanceStart(OffsetDateTime performanceStart) { this.performanceStart = performanceStart; }

	public OffsetDateTime getPerformanceEnd() { return performanceEnd; }
	public void setPerformanceEnd(OffsetDateTime performanceEnd) { this.performanceEnd = performanceEnd; }

	public String getPosterUrl() { return posterUrl; }
	public void setPosterUrl(String posterUrl) { this.posterUrl = posterUrl; }

	public String getPosterStorageKey() { return posterStorageKey; }
	public void setPosterStorageKey(String posterStorageKey) { this.posterStorageKey = posterStorageKey; }
}
