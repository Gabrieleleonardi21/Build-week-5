package it.epicode.eventi.common.exception;

/**
 * Password corretta ma account non utilizzabile (403). Il codice dice al FE
 * cosa mostrare: EMAIL_NOT_VERIFIED -> schermata del codice, ACCOUNT_DEACTIVATED.
 */
public class AccountNotActiveException extends RuntimeException {

	private final String code;

	public AccountNotActiveException(String code, String message) {
		super(message);
		this.code = code;
	}

	public String getCode() { return code; }
}
