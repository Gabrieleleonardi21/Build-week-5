package it.epicode.eventi.user;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.user.dto.ChangePasswordRequest;
import it.epicode.eventi.user.dto.DeleteAccountRequest;
import it.epicode.eventi.user.dto.ProfileResponse;
import it.epicode.eventi.user.dto.UpdateProfileRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;

/**
 * Profilo dell'utente loggato: tutte le rotte richiedono login (anyRequest().authenticated()
 * in SecurityConfig). GET /api/auth/me resta quello leggero che il FE chiama all'avvio.
 */
@RestController
public class ProfileController {

	private final ProfileService profileService;
	private final CurrentUsers currentUsers;

	public ProfileController(ProfileService profileService, CurrentUsers currentUsers) {
		this.profileService = profileService;
		this.currentUsers = currentUsers;
	}

	@GetMapping("/api/me")
	public ProfileResponse get(Principal principal) {
		return ProfileResponse.from(currentUsers.require(principal));
	}

	@PutMapping("/api/me")
	public ProfileResponse update(Principal principal, @Valid @RequestBody UpdateProfileRequest req) {
		return profileService.update(currentUsers.require(principal), req);
	}

	@PutMapping("/api/me/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void changePassword(Principal principal, @Valid @RequestBody ChangePasswordRequest req,
			HttpServletRequest request) {
		profileService.changePassword(currentUsers.require(principal), req, request.getSession().getId());
	}

	/** Upload multipart, campo "file" (JPEG, PNG o WebP, massimo 5 MB). */
	@PostMapping(path = "/api/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ProfileResponse setAvatar(Principal principal, @RequestPart("file") MultipartFile file) {
		return profileService.setAvatar(currentUsers.require(principal), file);
	}

	@DeleteMapping("/api/me/avatar")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteAvatar(Principal principal) {
		profileService.deleteAvatar(currentUsers.require(principal));
	}

	/** Body JSON { "password": "..." }. Dopo la risposta l'utente e' disconnesso, come con il logout. */
	@DeleteMapping("/api/me")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteAccount(Principal principal, @Valid @RequestBody DeleteAccountRequest req,
			HttpServletRequest request) {
		profileService.deleteAccount(currentUsers.require(principal), req);
		// Il service ha gia' cancellato le sessioni dal DB; cosi' anche il cookie SESSION viene scaduto.
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		SecurityContextHolder.clearContext();
	}
}
