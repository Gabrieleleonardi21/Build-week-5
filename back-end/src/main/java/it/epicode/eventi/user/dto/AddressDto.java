package it.epicode.eventi.user.dto;

import it.epicode.eventi.user.Address;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Indirizzo del profilo: stesso formato in lettura (ProfileResponse) e in modifica (UpdateProfileRequest). */
public record AddressDto(
		@Size(max = 255) String street,
		@Size(max = 100) String city,
		@Pattern(regexp = "[0-9A-Za-z -]{0,10}", message = "CAP non valido") String postalCode,
		@Pattern(regexp = "([A-Za-z]{2})?", message = "La provincia e' una sigla di 2 lettere") String province,
		@Pattern(regexp = "([A-Za-z]{2})?", message = "Il paese e' un codice di 2 lettere, es. IT") String country) {

	// Hibernate carica come null un indirizzo con tutte le colonne vuote: al FE arriva comunque l'oggetto.
	public static AddressDto from(Address address) {
		if (address == null) {
			return new AddressDto(null, null, null, null, null);
		}
		return new AddressDto(address.getStreet(), address.getCity(), address.getPostalCode(),
				address.getProvince(), address.getCountry());
	}
}
