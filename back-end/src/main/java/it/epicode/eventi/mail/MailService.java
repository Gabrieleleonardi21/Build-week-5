package it.epicode.eventi.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Invio email HTML costruite da un template Thymeleaf (templates/mail/*.html).
 * Restituisce true/false invece di lanciare eccezioni: chi chiama decide se
 * ritentare (es. tickets.email_sent_at resta NULL).
 */
@Service
public class MailService {

	private static final Logger log = LoggerFactory.getLogger(MailService.class);

	private final JavaMailSender mailSender;
	private final TemplateEngine templates;
	private final String from;
	private final String frontendUrl;

	public MailService(JavaMailSender mailSender, TemplateEngine templates,
			@Value("${app.mail.from}") String from, @Value("${app.frontend-url}") String frontendUrl) {
		this.mailSender = mailSender;
		this.templates = templates;
		this.from = from;
		this.frontendUrl = frontendUrl;
	}

	/**
	 * @param template nome del file in templates/mail senza estensione, es. "ticket"
	 * @param vars     variabili del template; frontendUrl e subject vengono aggiunti qui
	 */
	public boolean sendTemplate(String to, String subject, String template, Map<String, Object> vars) {
		String html = render(template, subject, vars);
		try {
			MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, StandardCharsets.UTF_8.name());
			helper.setFrom(from);
			helper.setTo(to);
			helper.setSubject(subject);
			helper.setText(html, true);
			mailSender.send(message);
			return true;
		} catch (MailException | MessagingException ex) {
			// Mai loggare il contenuto: puo' contenere il codice di verifica.
			log.warn("mail_failed template={} cause={}", template, ex.getMessage());
			return false;
		}
	}

	/** Separato dall'invio per poterlo verificare nei test senza server SMTP. */
	String render(String template, String subject, Map<String, Object> vars) {
		Map<String, Object> all = new HashMap<>(vars);
		all.put("subject", subject);
		all.put("frontendUrl", frontendUrl);
		return templates.process("mail/" + template, new Context(null, all));
	}
}
