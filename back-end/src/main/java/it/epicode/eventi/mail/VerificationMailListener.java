package it.epicode.eventi.mail;

import it.epicode.eventi.user.VerificationCodeCreated;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

/** Email con il codice di conferma: dopo il commit della registrazione, in un thread separato. */
@Component
public class VerificationMailListener {

	private final MailService mailService;

	public VerificationMailListener(MailService mailService) {
		this.mailService = mailService;
	}

	@Async
	@TransactionalEventListener
	public void onCodeCreated(VerificationCodeCreated event) {
		mailService.sendTemplate(event.email(), "Conferma il tuo account", "verification-code", Map.of(
				"firstName", event.firstName(),
				"code", event.code(),
				"minutes", event.validityMinutes()));
	}
}
