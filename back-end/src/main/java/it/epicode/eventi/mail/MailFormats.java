package it.epicode.eventi.mail;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Formati usati nelle email. Le date in DB sono UTC (D18): qui si mostrano all'ora italiana. */
final class MailFormats {

	private static final ZoneId ZONE = ZoneId.of("Europe/Rome");
	private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy 'alle' HH:mm");

	private MailFormats() {
	}

	static String dateTime(OffsetDateTime value) {
		return value.atZoneSameInstant(ZONE).format(DATE_TIME);
	}
}
