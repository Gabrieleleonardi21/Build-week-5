package it.epicode.eventi.common.storage;

import it.epicode.eventi.common.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Solo la validazione dei file: nessuna chiamata a Cloudinary (CLOUDINARY_URL vuota). */
class ImageStorageServiceTest {

	static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0};
	static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0};
	static final byte[] WEBP = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'};

	@Test
	void validImageBytes_acceptsJpegPngWebp() {
		assertThat(ImageStorageService.validImageBytes(file("image/jpeg", JPEG))).isEqualTo(JPEG);
		assertThat(ImageStorageService.validImageBytes(file("image/png", PNG))).isEqualTo(PNG);
		assertThat(ImageStorageService.validImageBytes(file("image/webp", WEBP))).isEqualTo(WEBP);
	}

	@Test
	void validImageBytes_emptyFile_throwsBadRequest() {
		assertThatThrownBy(() -> ImageStorageService.validImageBytes(file("image/png", new byte[0])))
				.isInstanceOf(BadRequestException.class);
	}

	@Test
	void validImageBytes_tooLarge_throwsBadRequest() {
		byte[] big = new byte[(int) ImageStorageService.MAX_BYTES + 1];
		System.arraycopy(JPEG, 0, big, 0, JPEG.length);
		assertThatThrownBy(() -> ImageStorageService.validImageBytes(file("image/jpeg", big)))
				.isInstanceOf(BadRequestException.class)
				.hasMessageContaining("5 MB");
	}

	@Test
	void validImageBytes_disallowedContentType_throwsBadRequest() {
		assertThatThrownBy(() -> ImageStorageService.validImageBytes(file("image/svg+xml", JPEG)))
				.isInstanceOf(BadRequestException.class);
	}

	@Test
	void validImageBytes_fakeContentType_throwsBadRequest() {
		// Uno script rinominato: il browser dice "image/png", ma i byte non sono un PNG.
		byte[] script = "<script>alert(1)</script>".getBytes();
		assertThatThrownBy(() -> ImageStorageService.validImageBytes(file("image/png", script)))
				.isInstanceOf(BadRequestException.class)
				.hasMessageContaining("non e' un'immagine");
	}

	@Test
	void upload_withoutCloudinaryUrl_throwsAfterValidation() {
		ImageStorageService storage = new ImageStorageService("");
		assertThatThrownBy(() -> storage.upload(file("image/jpeg", JPEG)))
				.isInstanceOf(IllegalStateException.class);
	}

	@Test
	void onFilesRemoved_withoutCloudinaryUrl_onlyLogs() {
		// Un file orfano sullo storage non deve far fallire nulla.
		ImageStorageService storage = new ImageStorageService("");
		assertThatCode(() -> storage.onFilesRemoved(new StoredFilesRemoved(List.of("eventi/abc"))))
				.doesNotThrowAnyException();
	}

	private static MockMultipartFile file(String contentType, byte[] bytes) {
		return new MockMultipartFile("file", "foto", contentType, bytes);
	}
}
