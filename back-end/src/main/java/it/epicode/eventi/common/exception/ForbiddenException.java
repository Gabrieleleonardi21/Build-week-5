package it.epicode.eventi.common.exception;

/** Operazione non consentita all'utente autenticato, es. non e' il proprietario (403). */
public class ForbiddenException extends RuntimeException {

	public ForbiddenException(String message) {
		super(message);
	}
}
