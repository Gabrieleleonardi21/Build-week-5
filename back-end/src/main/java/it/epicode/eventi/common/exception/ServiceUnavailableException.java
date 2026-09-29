package it.epicode.eventi.common.exception;

/** Servizio esterno (es. AI) non configurato o non raggiungibile: 503, il client puo' riprovare dopo. */
public class ServiceUnavailableException extends RuntimeException {

	public ServiceUnavailableException(String message) {
		super(message);
	}
}
