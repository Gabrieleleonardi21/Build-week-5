package it.epicode.eventi.social;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.social.dto.FriendRequestCreate;
import it.epicode.eventi.social.dto.FriendRequestResponse;
import it.epicode.eventi.social.dto.FriendResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

/**
 * Amicizie: richieste, risposte, elenco amici. Tutto richiede login (anyRequest().authenticated()).
 * Bandeja e storico delle chat sono in ChatController (/api/chats).
 */
@RestController
@RequestMapping("/api/friendships")
public class FriendshipController {

	private final FriendshipService friendshipService;
	private final CurrentUsers currentUsers;

	public FriendshipController(FriendshipService friendshipService, CurrentUsers currentUsers) {
		this.friendshipService = friendshipService;
		this.currentUsers = currentUsers;
	}

	/** I miei amici, con i messaggi non letti di ogni chat. */
	@GetMapping
	public Page<FriendResponse> friends(Principal principal,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return friendshipService.friends(currentUsers.require(principal), page, size);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public FriendRequestResponse request(Principal principal, @Valid @RequestBody FriendRequestCreate req) {
		return friendshipService.request(currentUsers.require(principal), req.addresseeId(), req.eventId());
	}

	@GetMapping("/requests/received")
	public Page<FriendRequestResponse> received(Principal principal,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return friendshipService.received(currentUsers.require(principal), page, size);
	}

	@GetMapping("/requests/sent")
	public Page<FriendRequestResponse> sent(Principal principal,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return friendshipService.sent(currentUsers.require(principal), page, size);
	}

	@PostMapping("/{id}/accept")
	public FriendResponse accept(Principal principal, @PathVariable UUID id) {
		return friendshipService.accept(id, currentUsers.require(principal));
	}

	@PostMapping("/{id}/reject")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void reject(Principal principal, @PathVariable UUID id) {
		friendshipService.reject(id, currentUsers.require(principal));
	}

	/** Ritira una richiesta inviata o toglie un amico (la chat resta in /api/chats, in sola lettura). */
	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void remove(Principal principal, @PathVariable UUID id) {
		friendshipService.remove(id, currentUsers.require(principal));
	}

}
