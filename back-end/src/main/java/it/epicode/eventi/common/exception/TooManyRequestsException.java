package it.epicode.eventi.common.exception;

/** Troppi tentativi ravvicinati, es. login o codice di verifica (429 + Retry-After). */
public class TooManyRequestsException extends RuntimeException {

	private final long retryAfterSeconds;

	public TooManyRequestsException(long retryAfterSeconds) {
		super("Troppi tentativi, riprova piu' tardi");
		this.retryAfterSeconds = retryAfterSeconds;
	}

	public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
