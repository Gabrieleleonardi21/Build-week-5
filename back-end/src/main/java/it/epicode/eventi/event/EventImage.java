package it.epicode.eventi.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Foto dell'evento: in DB solo l'URL pubblico, il file sta su Cloudinary (D06). */
@Entity
@Table(name = "event_images")
public class EventImage {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "event_id", nullable = false)
	private Event event;

	@Column(nullable = false, length = 500)
	private String url;

	// public_id Cloudinary: serve per cancellare il file dallo storage.
	@Column(length = 255)
	private String storageKey;

	@Column(nullable = false)
	private Integer sortOrder = 0;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	public UUID getId() { return id; }

	public Event getEvent() { return event; }
	public void setEvent(Event event) { this.event = event; }

	public String getUrl() { return url; }
	public void setUrl(String url) { this.url = url; }

	public String getStorageKey() { return storageKey; }
	public void setStorageKey(String storageKey) { this.storageKey = storageKey; }

	public Integer getSortOrder() { return sortOrder; }
	public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

	public OffsetDateTime getCreatedAt() { return createdAt; }
}
