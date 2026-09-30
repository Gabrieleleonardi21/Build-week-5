package it.epicode.eventi.common.exception;

/** Richiesta formalmente valida ma non accettabile, es. messaggio vuoto o codice scaduto (400). */
public class BadRequestException extends RuntimeException {

	public BadRequestException(String message) {
		super(message);
	}
}
