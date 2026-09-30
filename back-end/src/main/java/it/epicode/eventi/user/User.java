package it.epicode.eventi.user;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Account e dati anagrafici (tabella users).
 * Le colonne anagrafiche sono nullable solo per l'anonimizzazione (D15):
 * alla registrazione l'obbligatorieta' la impone la validazione dei DTO.
 */
@Entity
@Table(name = "users")
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	// Sempre minuscola e senza spazi: la normalizzazione la fa il service (D05).
	@Column(nullable = false, length = 255, unique = true)
	private String email;

	@Column(nullable = false, length = 100)
	private String passwordHash;

	@Column(nullable = false, length = 100)
	private String firstName;

	@Column(nullable = false, length = 100)
	private String lastName;

	// L'eta' non si salva: si calcola da qui (D03).
	private LocalDate birthDate;

	@Embedded
	private Address address = new Address();

	@Column(length = 30)
	private String phone;

	@Column(length = 500)
	private String avatarUrl;

	// public_id Cloudinary: serve per cancellare il file quando l'avatar cambia o l'account si elimina.
	@Column(length = 255)
	private String avatarStorageKey;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Role role = Role.USER;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private UserStatus status = UserStatus.PENDING_VERIFICATION;

	private OffsetDateTime emailVerifiedAt;

	@Column(nullable = false)
	private OffsetDateTime privacyAcceptedAt;

	private OffsetDateTime anonymizedAt;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private OffsetDateTime updatedAt;

	// Solo per JPA/Hibernate: l'applicazione usa il costruttore con i campi obbligatori.
	protected User() {
	}

	// L'id non si passa mai: lo genera Hibernate al salvataggio (D02).
	public User(String email, String passwordHash, String firstName, String lastName,
			LocalDate birthDate, OffsetDateTime privacyAcceptedAt) {
		this.email = email;
		this.passwordHash = passwordHash;
		this.firstName = firstName;
		this.lastName = lastName;
		this.birthDate = birthDate;
		this.privacyAcceptedAt = privacyAcceptedAt;
	}

	public UUID getId() { return id; }

	public String getEmail() { return email; }
	public void setEmail(String email) { this.email = email; }

	public String getPasswordHash() { return passwordHash; }
	public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

	public String getFirstName() { return firstName; }
	public void setFirstName(String firstName) { this.firstName = firstName; }

	public String getLastName() { return lastName; }
	public void setLastName(String lastName) { this.lastName = lastName; }

	public LocalDate getBirthDate() { return birthDate; }
	public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }

	public Address getAddress() { return address; }
	public void setAddress(Address address) { this.address = address; }

	public String getPhone() { return phone; }
	public void setPhone(String phone) { this.phone = phone; }

	public String getAvatarUrl() { return avatarUrl; }
	public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

	public String getAvatarStorageKey() { return avatarStorageKey; }
	public void setAvatarStorageKey(String avatarStorageKey) { this.avatarStorageKey = avatarStorageKey; }

	public Role getRole() { return role; }
	public void setRole(Role role) { this.role = role; }

	public UserStatus getStatus() { return status; }
	public void setStatus(UserStatus status) { this.status = status; }

	public OffsetDateTime getEmailVerifiedAt() { return emailVerifiedAt; }
	public void setEmailVerifiedAt(OffsetDateTime emailVerifiedAt) { this.emailVerifiedAt = emailVerifiedAt; }

	public OffsetDateTime getPrivacyAcceptedAt() { return privacyAcceptedAt; }
	public void setPrivacyAcceptedAt(OffsetDateTime privacyAcceptedAt) { this.privacyAcceptedAt = privacyAcceptedAt; }

	public OffsetDateTime getAnonymizedAt() { return anonymizedAt; }
	public void setAnonymizedAt(OffsetDateTime anonymizedAt) { this.anonymizedAt = anonymizedAt; }

	public OffsetDateTime getCreatedAt() { return createdAt; }
	public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
