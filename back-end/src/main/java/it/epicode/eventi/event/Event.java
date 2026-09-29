package it.epicode.eventi.event;

import it.epicode.eventi.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Evento pubblicato da un utente (tabella events).
 * Immagini e marker sono parti dell'evento: si salvano e si cancellano con lui.
 */
@Entity
@Table(name = "events")
public class Event {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	// Unico autorizzato a modificare, cancellare e scrivere ai partecipanti.
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "owner_id", nullable = false)
	private User owner;

	@Column(nullable = false, length = 150)
	private String title;

	@Column(columnDefinition = "text")
	private String description;

	@Column(nullable = false)
	private OffsetDateTime startsAt;

	private OffsetDateTime endsAt;

	@Column(length = 150)
	private String venueName;

	@Column(nullable = false, length = 255)
	private String address;

	@Column(nullable = false, length = 100)
	private String city;

	@Column(length = 2)
	private String province;

	@Column(nullable = false)
	private Double latitude;

	@Column(nullable = false)
	private Double longitude;

	// NULL = capienza illimitata.
	private Integer maxParticipants;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EventStatus status = EventStatus.PUBLISHED;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private OffsetDateTime updatedAt;

	// sort_order 0 = copertina.
	@OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("sortOrder ASC")
	private List<EventImage> images = new ArrayList<>();

	@OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<EventMarker> markers = new ArrayList<>();

	// Scaletta della serata (event_artists): le righe appartengono all'evento,
	// gli artisti no (restano condivisi tra eventi, D07).
	@OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("performanceOrder ASC")
	private List<EventArtist> lineup = new ArrayList<>();

	protected Event() {
	}

	// Campi NOT NULL di events; gli altri (descrizione, date di fine, capienza...) con i setter.
	public Event(User owner, String title, OffsetDateTime startsAt, String address, String city,
			Double latitude, Double longitude) {
		this.owner = owner;
		this.title = title;
		this.startsAt = startsAt;
		this.address = address;
		this.city = city;
		this.latitude = latitude;
		this.longitude = longitude;
	}

	/** Aggiunge un'immagine tenendo allineati entrambi i lati della relazione. */
	public void addImage(EventImage image) {
		image.setEvent(this);
		images.add(image);
	}

	/** Aggiunge un artista alla scaletta tenendo allineati entrambi i lati della relazione. */
	public void addToLineup(EventArtist entry) {
		entry.setEvent(this);
		lineup.add(entry);
	}

	/** Aggiunge un marker tenendo allineati entrambi i lati della relazione. */
	public void addMarker(EventMarker marker) {
		marker.setEvent(this);
		markers.add(marker);
	}

	public UUID getId() { return id; }

	public User getOwner() { return owner; }
	public void setOwner(User owner) { this.owner = owner; }

	public String getTitle() { return title; }
	public void setTitle(String title) { this.title = title; }

	public String getDescription() { return description; }
	public void setDescription(String description) { this.description = description; }

	public OffsetDateTime getStartsAt() { return startsAt; }
	public void setStartsAt(OffsetDateTime startsAt) { this.startsAt = startsAt; }

	public OffsetDateTime getEndsAt() { return endsAt; }
	public void setEndsAt(OffsetDateTime endsAt) { this.endsAt = endsAt; }

	public String getVenueName() { return venueName; }
	public void setVenueName(String venueName) { this.venueName = venueName; }

	public String getAddress() { return address; }
	public void setAddress(String address) { this.address = address; }

	public String getCity() { return city; }
	public void setCity(String city) { this.city = city; }

	public String getProvince() { return province; }
	public void setProvince(String province) { this.province = province; }

	public Double getLatitude() { return latitude; }
	public void setLatitude(Double latitude) { this.latitude = latitude; }

	public Double getLongitude() { return longitude; }
	public void setLongitude(Double longitude) { this.longitude = longitude; }

	public Integer getMaxParticipants() { return maxParticipants; }
	public void setMaxParticipants(Integer maxParticipants) { this.maxParticipants = maxParticipants; }

	public EventStatus getStatus() { return status; }
	public void setStatus(EventStatus status) { this.status = status; }

	public OffsetDateTime getCreatedAt() { return createdAt; }
	public OffsetDateTime getUpdatedAt() { return updatedAt; }

	public List<EventImage> getImages() { return images; }
	public List<EventMarker> getMarkers() { return markers; }
	public List<EventArtist> getLineup() { return lineup; }
}
