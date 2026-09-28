package it.epicode.eventi.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Artista riusabile tra piu' eventi (D07).
 * L'unicita' case-insensitive del nome (indice su lower(name)) vive solo in schema.sql.
 */
@Entity
@Table(name = "artists")
public class Artist {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, length = 150)
	private String name;

	@Column(length = 100)
	private String genre;

	@Column(columnDefinition = "text")
	private String bio;

	@Column(length = 500)
	private String imageUrl;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	protected Artist() {
	}

	public Artist(String name) {
		this.name = name;
	}

	public UUID getId() { return id; }

	public String getName() { return name; }
	public void setName(String name) { this.name = name; }

	public String getGenre() { return genre; }
	public void setGenre(String genre) { this.genre = genre; }

	public String getBio() { return bio; }
	public void setBio(String bio) { this.bio = bio; }

	public String getImageUrl() { return imageUrl; }
	public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

	public OffsetDateTime getCreatedAt() { return createdAt; }
}
