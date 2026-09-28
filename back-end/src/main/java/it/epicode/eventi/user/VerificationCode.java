package it.epicode.eventi.user;

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

/** Codice di conferma email a 6 cifre, monouso, valido 15 minuti (D04). */
@Entity
@Table(name = "verification_codes")
public class VerificationCode {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(nullable = false, length = 6)
	private String code;

	@Column(nullable = false)
	private OffsetDateTime expiresAt;

	// Valorizzato alla conferma o quando un reinvio lo rende obsoleto.
	private OffsetDateTime usedAt;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	public UUID getId() { return id; }

	public User getUser() { return user; }
	public void setUser(User user) { this.user = user; }

	public String getCode() { return code; }
	public void setCode(String code) { this.code = code; }

	public OffsetDateTime getExpiresAt() { return expiresAt; }
	public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }

	public OffsetDateTime getUsedAt() { return usedAt; }
	public void setUsedAt(OffsetDateTime usedAt) { this.usedAt = usedAt; }

	public OffsetDateTime getCreatedAt() { return createdAt; }
}
