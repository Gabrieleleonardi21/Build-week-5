package it.epicode.eventi.common.storage;

import java.util.List;

/**
 * Contratto: chi toglie dal DB righe con un file su Cloudinary pubblica questo evento
 * con i public_id; ImageStorageService cancella i file dopo il commit.
 */
public record StoredFilesRemoved(List<String> storageKeys) {
}
