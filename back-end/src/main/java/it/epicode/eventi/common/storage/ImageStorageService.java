package it.epicode.eventi.common.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import it.epicode.eventi.common.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;

/**
 * Upload e cancellazione delle immagini su Cloudinary (D06): in DB finiscono solo URL e public_id.
 * Serve a tutti i moduli (foto evento, locandine, in futuro avatar).
 * Senza CLOUDINARY_URL l'app parte lo stesso: falliscono solo upload e cancellazioni.
 */
@Service
public class ImageStorageService {

	/** Risultato dell'upload: URL pubblico (https) + public_id per cancellare il file. */
	public record StoredImage(String url, String storageKey) {
	}

	public static final long MAX_BYTES = 5L * 1024 * 1024;
	private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
	private static final String DEFAULT_FOLDER = "eventi-dev";

	private static final Logger log = LoggerFactory.getLogger(ImageStorageService.class);

	private final Cloudinary cloudinary;
	private final String folder;

	public ImageStorageService(@Value("${app.cloudinary.url}") String cloudinaryUrl,
			@Value("${app.cloudinary.folder:" + DEFAULT_FOLDER + "}") String folder) {
		if (cloudinaryUrl == null || cloudinaryUrl.isBlank()) {
			this.cloudinary = null;
			// Visibile subito nei log di avvio (es. su Render), non al primo upload durante la demo.
			log.warn("storage_disabled CLOUDINARY_URL non configurata: upload immagini disabilitati");
		} else {
			this.cloudinary = new Cloudinary(cloudinaryUrl);
		}
		// Variabile presente ma vuota (es. "CLOUDINARY_FOLDER=" nel .env): si usa comunque il default.
		if (folder == null || folder.isBlank()) {
			this.folder = DEFAULT_FOLDER;
		} else {
			this.folder = folder.trim();
		}
	}

	/** Controlla il file e lo carica. Da chiamare dopo i controlli di permesso, per non caricare file inutili. */
	public StoredImage upload(MultipartFile file) {
		byte[] bytes = validImageBytes(file);
		requireConfigured();
		try {
			// allowed_formats: anche Cloudinary rifiuta tutto cio' che non e' un'immagine ammessa.
			Map<?, ?> result = cloudinary.uploader().upload(bytes, ObjectUtils.asMap(
					"folder", folder,
					"resource_type", "image",
					"allowed_formats", "jpg,png,webp"));
			return new StoredImage((String) result.get("secure_url"), (String) result.get("public_id"));
		} catch (IOException ex) {
			throw new UncheckedIOException("Upload immagine fallito", ex);
		}
	}

	/**
	 * Cancella i file solo dopo il commit: se la transazione fallisce le righe restano
	 * e i file anche, niente immagini rotte. @Async: la risposta HTTP non aspetta Cloudinary.
	 * Un errore qui lascia solo un file orfano sullo storage, quindi si logga e basta.
	 */
	@Async
	@TransactionalEventListener(fallbackExecution = true)
	public void onFilesRemoved(StoredFilesRemoved removed) {
		for (String key : removed.storageKeys()) {
			deleteQuietly(key);
		}
	}

	/**
	 * Cancella subito un file, senza mai lanciare eccezioni. Serve anche a chi ha appena
	 * caricato un file ma poi non e' riuscito a salvare la riga: il file non resta orfano.
	 */
	public void deleteQuietly(String storageKey) {
		try {
			requireConfigured();
			cloudinary.uploader().destroy(storageKey, ObjectUtils.emptyMap());
		} catch (IOException | RuntimeException ex) {
			log.warn("storage_delete_failed key={} cause={}", storageKey, ex.getMessage());
		}
	}

	/**
	 * Tipo e dimensione dichiarati dal browser si possono falsificare:
	 * si controllano anche i primi byte del file (firma del formato).
	 */
	static byte[] validImageBytes(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new BadRequestException("Nessuna immagine ricevuta");
		}
		if (file.getSize() > MAX_BYTES) {
			throw new BadRequestException("L'immagine supera i 5 MB");
		}
		if (!ALLOWED_TYPES.contains(file.getContentType())) {
			throw new BadRequestException("Formati ammessi: JPEG, PNG, WebP");
		}
		byte[] bytes = readBytes(file);
		if (!isJpeg(bytes) && !isPng(bytes) && !isWebp(bytes)) {
			throw new BadRequestException("Il file non e' un'immagine JPEG, PNG o WebP valida");
		}
		return bytes;
	}

	private static byte[] readBytes(MultipartFile file) {
		try {
			return file.getBytes();
		} catch (IOException ex) {
			throw new UncheckedIOException("Lettura del file fallita", ex);
		}
	}

	// Firme dei formati: JPEG FF D8 FF, PNG 89 'PNG' 0D 0A 1A 0A, WebP "RIFF" ???? "WEBP".
	private static boolean isJpeg(byte[] b) {
		return startsWith(b, 0, (byte) 0xFF, (byte) 0xD8, (byte) 0xFF);
	}

	private static boolean isPng(byte[] b) {
		return startsWith(b, 0, (byte) 0x89, (byte) 'P', (byte) 'N', (byte) 'G', (byte) 0x0D, (byte) 0x0A,
				(byte) 0x1A, (byte) 0x0A);
	}

	private static boolean isWebp(byte[] b) {
		return startsWith(b, 0, (byte) 'R', (byte) 'I', (byte) 'F', (byte) 'F')
				&& startsWith(b, 8, (byte) 'W', (byte) 'E', (byte) 'B', (byte) 'P');
	}

	private static boolean startsWith(byte[] bytes, int offset, byte... signature) {
		if (bytes.length < offset + signature.length) {
			return false;
		}
		return Arrays.equals(bytes, offset, offset + signature.length, signature, 0, signature.length);
	}

	private void requireConfigured() {
		if (cloudinary == null) {
			throw new IllegalStateException("CLOUDINARY_URL non configurata");
		}
	}
}
