package it.epicode.eventi.user;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** Indirizzo dell'utente: le cinque colonne address_* di users, raggruppate in Java. */
@Embeddable
public class Address {

	@Column(name = "address_street", length = 255)
	private String street;

	@Column(name = "address_city", length = 100)
	private String city;

	@Column(name = "address_postal_code", length = 10)
	private String postalCode;

	@Column(name = "address_province", length = 2)
	private String province;

	// Il DEFAULT 'IT' del DB non scatta con Hibernate: il valore iniziale va qui.
	@Column(name = "address_country", length = 2)
	private String country = "IT";

	public String getStreet() { return street; }
	public void setStreet(String street) { this.street = street; }

	public String getCity() { return city; }
	public void setCity(String city) { this.city = city; }

	public String getPostalCode() { return postalCode; }
	public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

	public String getProvince() { return province; }
	public void setProvince(String province) { this.province = province; }

	public String getCountry() { return country; }
	public void setCountry(String country) { this.country = country; }
}
