package it.epicode.eventi.event;

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
import jakarta.persistence.Table;

import java.util.UUID;

/** Ingresso, uscita o uscita di sicurezza sulla mappa dell'evento (D08). */
@Entity
@Table(name = "event_markers")
public class EventMarker {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "event_id", nullable = false)
	private Event event;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private MarkerKind kind;

	@Column(length = 100)
	private String label;

	@Column(nullable = false)
	private Double latitude;

	@Column(nullable = false)
	private Double longitude;

	public UUID getId() { return id; }

	public Event getEvent() { return event; }
	public void setEvent(Event event) { this.event = event; }

	public MarkerKind getKind() { return kind; }
	public void setKind(MarkerKind kind) { this.kind = kind; }

	public String getLabel() { return label; }
	public void setLabel(String label) { this.label = label; }

	public Double getLatitude() { return latitude; }
	public void setLatitude(Double latitude) { this.latitude = latitude; }

	public Double getLongitude() { return longitude; }
	public void setLongitude(Double longitude) { this.longitude = longitude; }
}
