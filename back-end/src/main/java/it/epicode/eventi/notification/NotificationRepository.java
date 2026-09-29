package it.epicode.eventi.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

	// Usa l'indice idx_notifications_recipient (recipient_id, created_at DESC).
	Page<Notification> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);

	long countByRecipientIdAndReadAtIsNull(UUID recipientId);
}
