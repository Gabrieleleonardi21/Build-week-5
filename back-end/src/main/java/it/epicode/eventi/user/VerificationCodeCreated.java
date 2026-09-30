package it.epicode.eventi.user;

/**
 * Contratto tra auth e mailing: il service di registrazione lo pubblica
 * (ApplicationEventPublisher) dopo aver salvato un codice di verifica.
 * L'email parte solo dopo il commit: se la registrazione fallisce, nessuna email.
 */
public record VerificationCodeCreated(String email, String firstName, String code, int validityMinutes) {
}
