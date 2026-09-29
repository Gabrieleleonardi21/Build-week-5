package it.epicode.eventi.event;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.event.dto.AiDescriptionRequest;
import it.epicode.eventi.event.dto.AiDescriptionResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

/** Proposta di descrizione con l'AI: solo per chi puo' modificare l'evento (controllo nel service). */
@RestController
public class AiDescriptionController {

	private final AiDescriptionService aiService;
	private final CurrentUsers currentUsers;

	public AiDescriptionController(AiDescriptionService aiService, CurrentUsers currentUsers) {
		this.aiService = aiService;
		this.currentUsers = currentUsers;
	}

	@PostMapping("/api/events/{id}/ai-description")
	public AiDescriptionResponse improve(Principal principal, @PathVariable UUID id,
			@Valid @RequestBody AiDescriptionRequest req) {
		return aiService.improve(id, currentUsers.require(principal), req.text());
	}
}
