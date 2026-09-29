package it.epicode.eventi.common.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Unico punto in cui le eccezioni diventano risposte HTTP, sempre in formato
 * ProblemDetail (RFC 9457): { type, title, status, detail, instance, ... }.
 * Gli errori standard di Spring MVC (JSON malformato, metodo non ammesso...)
 * li gestisce gia' la classe base.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(BadRequestException.class)
	public ProblemDetail badRequest(BadRequestException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
	}

	@ExceptionHandler(NotFoundException.class)
	public ProblemDetail notFound(NotFoundException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler({ForbiddenException.class, AccessDeniedException.class})
	public ProblemDetail forbidden(RuntimeException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Operazione non consentita");
	}

	@ExceptionHandler(ConflictException.class)
	public ProblemDetail conflict(ConflictException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
	}

	// Vincoli del DB (UNIQUE, CHECK) violati: es. doppia iscrizione allo stesso evento.
	// Il messaggio originale contiene SQL e valori: si logga, non si restituisce.
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ProblemDetail dataIntegrity(DataIntegrityViolationException ex) {
		log.warn("data_integrity_violation cause={}", ex.getMostSpecificCause().getMessage());
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Dati in conflitto con quelli esistenti");
	}

	// Rete di sicurezza: nessun dettaglio interno arriva al client.
	@ExceptionHandler(Exception.class)
	public ProblemDetail unexpected(Exception ex) {
		log.error("unexpected_error", ex);
		return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Errore interno del server");
	}

	/** Bean Validation sui @RequestBody: aggiunge "errors" con campo -> messaggio. */
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(
			MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Map<String, String> errors = new LinkedHashMap<>();
		for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
			// Se un campo ha piu' errori si tiene il primo.
			errors.putIfAbsent(fe.getField(), fe.getDefaultMessage());
		}
		ProblemDetail body = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Dati non validi");
		body.setProperty("errors", errors);
		return ResponseEntity.badRequest().body(body);
	}
}
