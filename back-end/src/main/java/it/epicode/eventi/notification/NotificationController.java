package it.epicode.eventi.notification;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.notification.dto.NotificationResponse;
import it.epicode.eventi.notification.dto.OwnerMessageRequest;
import it.epicode.eventi.notification.dto.UnreadCountResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

/** Tutti gli endpoint richiedono login (anyRequest().authenticated() in SecurityConfig). */
@RestController
public class NotificationController {

	private final NotificationService notificationService;
	private final CurrentUsers currentUsers;

	public NotificationController(NotificationService notificationService, CurrentUsers currentUsers) {
		this.notificationService = notificationService;
		this.currentUsers = currentUsers;
	}

	@GetMapping("/api/notifications")
	public Page<NotificationResponse> mine(Principal principal,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return notificationService.mine(currentUsers.require(principal), page, size);
	}

	@GetMapping("/api/notifications/unread-count")
	public UnreadCountResponse unreadCount(Principal principal) {
		return new UnreadCountResponse(notificationService.unreadCount(currentUsers.require(principal)));
	}

	@PatchMapping("/api/notifications/{id}/read")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void markRead(Principal principal, @PathVariable UUID id) {
		notificationService.markRead(id, currentUsers.require(principal));
	}

	@PostMapping("/api/events/{eventId}/messages")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void ownerMessage(Principal principal, @PathVariable UUID eventId,
			@Valid @RequestBody OwnerMessageRequest req) {
		notificationService.ownerMessage(eventId, currentUsers.require(principal), req);
	}
}
