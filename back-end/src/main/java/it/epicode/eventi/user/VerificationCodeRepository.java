package it.epicode.eventi.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {

	// L'ultimo codice non ancora usato: e' l'unico valido (i reinvii invalidano i precedenti).
	Optional<VerificationCode> findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(User user);

	// Prima di un reinvio: i codici ancora attivi diventano obsoleti (D04).
	@Modifying
	@Query("UPDATE VerificationCode v SET v.usedAt = :now WHERE v.user = :user AND v.usedAt IS NULL")
	int invalidateActiveCodes(@Param("user") User user, @Param("now") OffsetDateTime now);
}
