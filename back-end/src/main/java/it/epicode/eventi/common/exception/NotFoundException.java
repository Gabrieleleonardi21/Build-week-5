package it.epicode.eventi.common.exception;

/** Risorsa inesistente (404). */
public class NotFoundException extends RuntimeException {

	public NotFoundException(String message) {
		super(message);
	}
}
