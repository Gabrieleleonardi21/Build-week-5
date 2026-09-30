package it.epicode.eventi.dev;

import it.epicode.eventi.event.MarkerKind;
import it.epicode.eventi.user.Role;

import java.util.List;

/**
 * Dati demo del seeder: solo valori, nessuna logica. Nomi e artisti sono inventati;
 * luoghi e coordinate sono reali, cosi' la mappa mostra i pin nei posti giusti.
 */
final class DemoData {

	private DemoData() {
	}

	record UserSpec(String email, String firstName, String lastName, int birthYear, String city, Role role) {
	}

	record ArtistSpec(String name, String genre, String bio) {
	}

	/** Esibizione in scaletta: minuti dall'inizio dell'evento e durata. */
	record SlotSpec(String artist, int startOffsetMinutes, int durationMinutes) {
	}

	record MarkerSpec(MarkerKind kind, String label, double latitude, double longitude) {
	}

	record EventSpec(String key, String ownerEmail, String title, String description, int daysFromNow,
			int startHour, int durationHours, String venue, String address, String city, String province,
			double latitude, double longitude, Integer maxParticipants, List<SlotSpec> lineup,
			List<MarkerSpec> markers, int images) {
	}

	static final List<UserSpec> USERS = List.of(
			new UserSpec("admin@eventi.dev", "Giulia", "Ferri", 1988, "Milano", Role.SUPERADMIN),
			new UserSpec("moderatore@eventi.dev", "Paolo", "Greco", 1990, "Roma", Role.MODERATOR),
			new UserSpec("marco.rinaldi@eventi.dev", "Marco", "Rinaldi", 1992, "Bologna", Role.USER),
			new UserSpec("chiara.esposito@eventi.dev", "Chiara", "Esposito", 1995, "Napoli", Role.USER),
			new UserSpec("luca.moretti@eventi.dev", "Luca", "Moretti", 1998, "Milano", Role.USER),
			new UserSpec("sara.colombo@eventi.dev", "Sara", "Colombo", 2000, "Torino", Role.USER),
			new UserSpec("davide.romano@eventi.dev", "Davide", "Romano", 1996, "Firenze", Role.USER),
			new UserSpec("elena.fontana@eventi.dev", "Elena", "Fontana", 1999, "Verona", Role.USER));

	static final List<ArtistSpec> ARTISTS = List.of(
			new ArtistSpec("Blue Trio", "Jazz", "Trio acustico nato nei club di Bologna, standard e brani originali."),
			new ArtistSpec("Marea Elettrica", "Elettronica", "Duo di synth e percussioni dal vivo."),
			new ArtistSpec("I Fari", "Indie rock", "Band torinese con tre album e un tour europeo alle spalle."),
			new ArtistSpec("Sofia Conti", "Cantautorato", "Voce e chitarra, testi in italiano e dialetto veneto."),
			new ArtistSpec("DJ Vesuvio", "House", "Resident dei club napoletani, set lunghi e caldi."),
			new ArtistSpec("Orchestra dei Navigli", "Classica", "Ensemble di 24 elementi, repertorio da Vivaldi al cinema."),
			new ArtistSpec("Controvento", "Folk", "Musica popolare del sud con organetto e tamburi a cornice."),
			new ArtistSpec("Nebbia", "Ambient", "Paesaggi sonori lenti per ascolti all'aperto."),
			new ArtistSpec("Luna Rossa Quartet", "Swing", "Quartetto swing anni '40, perfetto per ballare."),
			new ArtistSpec("Aria di Sud", "Pop", "Band pop pugliese con ritornelli da cantare in coro."));

	private static List<MarkerSpec> gates(double lat, double lng) {
		return List.of(
				new MarkerSpec(MarkerKind.ENTRANCE, "Ingresso principale", lat + 0.0008, lng - 0.0006),
				new MarkerSpec(MarkerKind.EXIT, "Uscita", lat - 0.0007, lng + 0.0008),
				new MarkerSpec(MarkerKind.EMERGENCY_EXIT, "Uscita di emergenza", lat + 0.0004, lng + 0.0010));
	}

	static final List<EventSpec> EVENTS = List.of(
			new EventSpec("jazz-bologna", "marco.rinaldi@eventi.dev", "Jazz sotto le stelle",
					"Una serata di jazz all'aperto in Piazza Maggiore. Porta una coperta: si ascolta seduti sui gradini.",
					6, 21, 3, "Piazza Maggiore", "Piazza Maggiore 1", "Bologna", "BO", 44.4938, 11.3426, 300,
					List.of(new SlotSpec("Blue Trio", 0, 75), new SlotSpec("Luna Rossa Quartet", 90, 75)),
					gates(44.4938, 11.3426), 3),
			new EventSpec("elettronica-milano", "luca.moretti@eventi.dev", "Notte elettronica ai Navigli",
					"Tre set in sequenza dal tramonto a notte fonda sulla Darsena.",
					10, 20, 5, "Darsena", "Viale Gorizia 2", "Milano", "MI", 45.4520, 9.1790, 500,
					List.of(new SlotSpec("Nebbia", 0, 60), new SlotSpec("Marea Elettrica", 75, 90),
							new SlotSpec("DJ Vesuvio", 180, 120)),
					gates(45.4520, 9.1790), 3),
			new EventSpec("indie-torino", "sara.colombo@eventi.dev", "Indie al Valentino",
					"Concerto gratuito nel parco con band emergenti e I Fari come headliner.",
					14, 18, 4, "Parco del Valentino", "Corso Massimo d'Azeglio", "Torino", "TO", 45.0540, 7.6860, null,
					List.of(new SlotSpec("Sofia Conti", 0, 45), new SlotSpec("I Fari", 60, 90)),
					gates(45.0540, 7.6860), 2),
			new EventSpec("classica-milano", "marco.rinaldi@eventi.dev", "Vivaldi in piazza",
					"L'Orchestra dei Navigli suona Le quattro stagioni davanti al Duomo.",
					21, 21, 2, "Piazza del Duomo", "Piazza del Duomo", "Milano", "MI", 45.4642, 9.1900, 800,
					List.of(new SlotSpec("Orchestra dei Navigli", 0, 110)),
					gates(45.4642, 9.1900), 2),
			new EventSpec("folk-napoli", "chiara.esposito@eventi.dev", "Tarantelle al Plebiscito",
					"Musica popolare e danze del sud per tutta la sera.",
					8, 20, 4, "Piazza del Plebiscito", "Piazza del Plebiscito", "Napoli", "NA", 40.8359, 14.2488, 1000,
					List.of(new SlotSpec("Controvento", 0, 90), new SlotSpec("Aria di Sud", 105, 90)),
					gates(40.8359, 14.2488), 3),
			new EventSpec("tramonto-firenze", "davide.romano@eventi.dev", "Ambient al tramonto",
					"Ascolto lento con vista sulla città dal Piazzale Michelangelo.",
					5, 19, 2, "Piazzale Michelangelo", "Piazzale Michelangelo", "Firenze", "FI", 43.7629, 11.2650, 150,
					List.of(new SlotSpec("Nebbia", 0, 100)),
					gates(43.7629, 11.2650), 2),
			new EventSpec("cantautori-verona", "elena.fontana@eventi.dev", "Cantautrici all'Arena",
					"Serata acustica con Sofia Conti e ospiti a sorpresa.",
					30, 21, 2, "Arena di Verona", "Piazza Bra 1", "Verona", "VR", 45.4390, 10.9944, 12,
					List.of(new SlotSpec("Sofia Conti", 0, 100)),
					gates(45.4390, 10.9944), 1),
			new EventSpec("pop-bari", "chiara.esposito@eventi.dev", "Pop sul lungomare",
					"Concerto sul mare con Aria di Sud e dj set finale.",
					18, 21, 4, "Lungomare Nazario Sauro", "Lungomare Nazario Sauro", "Bari", "BA", 41.1250, 16.8710, null,
					List.of(new SlotSpec("Aria di Sud", 0, 90), new SlotSpec("DJ Vesuvio", 105, 120)),
					gates(41.1250, 16.8710), 2),
			new EventSpec("swing-genova", "marco.rinaldi@eventi.dev", "Swing al Porto Antico",
					"Serata da ballare: annullata per il maltempo previsto.",
					3, 21, 3, "Porto Antico", "Calata Molo Vecchio", "Genova", "GE", 44.4110, 8.9270, 200,
					List.of(new SlotSpec("Luna Rossa Quartet", 0, 120)),
					gates(44.4110, 8.9270), 1),
			new EventSpec("jazz-roma-passato", "marco.rinaldi@eventi.dev", "Jazz al Circo Massimo",
					"Evento gia' concluso: resta visibile tra i propri eventi.",
					-7, 21, 3, "Circo Massimo", "Via del Circo Massimo", "Roma", "RM", 41.8861, 12.4853, null,
					List.of(new SlotSpec("Blue Trio", 0, 90)),
					gates(41.8861, 12.4853), 1));

	/** Evento annullato (per vedere lo stato CANCELLED e la notifica ai partecipanti). */
	static final String CANCELLED_EVENT = "swing-genova";

	/** Chi partecipa a cosa (email -> chiavi degli eventi). */
	static final List<List<String>> TICKETS = List.of(
			List.of("luca.moretti@eventi.dev", "jazz-bologna", "folk-napoli", "classica-milano", "swing-genova"),
			List.of("sara.colombo@eventi.dev", "jazz-bologna", "elettronica-milano", "tramonto-firenze"),
			List.of("davide.romano@eventi.dev", "elettronica-milano", "indie-torino", "jazz-roma-passato"),
			List.of("elena.fontana@eventi.dev", "jazz-bologna", "pop-bari", "swing-genova"),
			List.of("chiara.esposito@eventi.dev", "indie-torino", "tramonto-firenze"),
			List.of("marco.rinaldi@eventi.dev", "folk-napoli", "cantautori-verona"));
}
