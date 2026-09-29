package it.epicode.eventi.security;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Limite ai tentativi ripetuti (login, codice di verifica, reinvio codice),
 * per chiave: es. "login:email:anna@mail.it" o "login:ip:1.2.3.4".
 * Finestra fissa di 15 minuti dal primo tentativo.
 *
 * In memoria: basta con una sola istanza del BE (piano free di Render).
 * Con piu' istanze servirebbe una tabella o Redis condivisi.
 */
@Component
public class AttemptLimiter {

	public static final Duration WINDOW = Duration.ofMinutes(15);

	private record Window(Instant start, int count) {
	}

	private final Map<String, Window> windows = new ConcurrentHashMap<>();
	private final Clock clock;

	public AttemptLimiter() {
		this(Clock.systemUTC());
	}

	// Per i test: orologio controllabile.
	AttemptLimiter(Clock clock) {
		this.clock = clock;
	}

	public boolean isBlocked(String key, int max) {
		return count(key) >= max;
	}

	public void record(String key) {
		Instant now = clock.instant();
		windows.merge(key, new Window(now, 1),
				(old, fresh) -> expired(old, now) ? fresh : new Window(old.start(), old.count() + 1));
	}

	public void reset(String key) {
		windows.remove(key);
	}

	private int count(String key) {
		Window w = windows.get(key);
		return w == null || expired(w, clock.instant()) ? 0 : w.count();
	}

	private static boolean expired(Window w, Instant now) {
		return !now.isBefore(w.start().plus(WINDOW));
	}

	// Senza pulizia la mappa crescerebbe con ogni email inventata da un attaccante.
	@Scheduled(fixedRate = 5, timeUnit = TimeUnit.MINUTES)
	void cleanup() {
		Instant now = clock.instant();
		windows.values().removeIf(w -> expired(w, now));
	}
}
