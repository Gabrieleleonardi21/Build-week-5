package it.epicode.eventi.user;

import it.epicode.eventi.user.dto.UserSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Cercare e vedere gli altri utenti: serve il login (anyRequest().authenticated()
 * in SecurityConfig), basta il ruolo USER. I dati completi sono in /api/admin/users.
 */
@RestController
public class UserController {

	private final UserDirectoryService userDirectoryService;

	public UserController(UserDirectoryService userDirectoryService) {
		this.userDirectoryService = userDirectoryService;
	}

	@GetMapping("/api/users")
	public Page<UserSummaryResponse> search(@RequestParam(required = false) String q,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return userDirectoryService.search(q, page, size);
	}

	@GetMapping("/api/users/{id}")
	public UserSummaryResponse get(@PathVariable UUID id) {
		return userDirectoryService.get(id);
	}
}
