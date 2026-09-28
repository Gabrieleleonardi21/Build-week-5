package it.epicode.eventi.common.exception;

/** Stato in conflitto, es. email gia' registrata o ticket gia' emesso (409). */
public class ConflictException extends RuntimeException {

	public ConflictException(String message) {
		super(message);
	}
}
