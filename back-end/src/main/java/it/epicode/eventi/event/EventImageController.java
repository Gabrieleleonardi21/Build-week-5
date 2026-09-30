package it.epicode.eventi.event;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.event.dto.EventImageResponse;
import it.epicode.eventi.event.dto.LineupEntryResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.UUID;

/**
 * Upload multipart (campo "file") di foto e locandine. Solo scritture: le immagini
 * si leggono gia' nel dettaglio dell'evento (images e lineup[].posterUrl).
 */
@RestController
@RequestMapping("/api/events/{id}")
public class EventImageController {

	private final EventImageService imageService;
	private final CurrentUsers currentUsers;

	public EventImageController(EventImageService imageService, CurrentUsers currentUsers) {
		this.imageService = imageService;
		this.currentUsers = currentUsers;
	}

	@PostMapping(path = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public EventImageResponse addImage(Principal principal, @PathVariable UUID id,
			@RequestPart("file") MultipartFile file) {
		return imageService.add(id, currentUsers.require(principal), file);
	}

	@DeleteMapping("/images/{imageId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteImage(Principal principal, @PathVariable UUID id, @PathVariable UUID imageId) {
		imageService.delete(id, imageId, currentUsers.require(principal));
	}

	@PostMapping(path = "/lineup/{artistId}/poster", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public LineupEntryResponse setPoster(Principal principal, @PathVariable UUID id, @PathVariable UUID artistId,
			@RequestPart("file") MultipartFile file) {
		return imageService.setPoster(id, artistId, currentUsers.require(principal), file);
	}

	@DeleteMapping("/lineup/{artistId}/poster")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deletePoster(Principal principal, @PathVariable UUID id, @PathVariable UUID artistId) {
		imageService.deletePoster(id, artistId, currentUsers.require(principal));
	}
}
