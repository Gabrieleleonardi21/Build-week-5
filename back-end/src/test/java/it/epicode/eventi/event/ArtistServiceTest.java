package it.epicode.eventi.event;

import it.epicode.eventi.common.exception.ConflictException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.event.dto.ArtistRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.Optional;
import java.util.UUID;

import static it.epicode.eventi.event.EventTestData.artist;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArtistServiceTest {

	@Mock ArtistRepository artistRepository;
	@InjectMocks ArtistService artistService;

	@Test
	void search_clampsPageSizeAndTrimsQuery() {
		when(artistRepository.findByNameContainingIgnoreCaseOrderByNameAsc("band", PageRequest.of(0, 50)))
				.thenReturn(Page.empty());

		artistService.search("  band ", -3, 10_000);

		verify(artistRepository).findByNameContainingIgnoreCaseOrderByNameAsc("band", PageRequest.of(0, 50));
	}

	@Test
	void create_existingNameIgnoringCase_throwsConflict() {
		when(artistRepository.findByNameIgnoreCase("band a")).thenReturn(Optional.of(artist("Band A")));

		assertThatThrownBy(() -> artistService.create(new ArtistRequest(" band a ", null, null, null)))
				.isInstanceOf(ConflictException.class);
		verify(artistRepository, never()).save(any());
	}

	@Test
	void create_blankOptionalFieldsBecomeNull() {
		when(artistRepository.findByNameIgnoreCase("Band A")).thenReturn(Optional.empty());

		var res = artistService.create(new ArtistRequest("Band A", "  ", "", null));

		assertThat(res.genre()).isNull();
		assertThat(res.bio()).isNull();
		verify(artistRepository).save(any(Artist.class));
	}

	@Test
	void update_nameTakenByAnotherArtist_throwsConflict() {
		Artist current = artist("Band A");
		when(artistRepository.findById(current.getId())).thenReturn(Optional.of(current));
		when(artistRepository.findByNameIgnoreCase("Band B")).thenReturn(Optional.of(artist("Band B")));

		assertThatThrownBy(() -> artistService.update(current.getId(), new ArtistRequest("Band B", null, null, null)))
				.isInstanceOf(ConflictException.class);
	}

	@Test
	void update_sameNameDifferentCase_isAllowed() {
		Artist current = artist("Band A");
		when(artistRepository.findById(current.getId())).thenReturn(Optional.of(current));
		when(artistRepository.findByNameIgnoreCase("BAND A")).thenReturn(Optional.of(current));

		var res = artistService.update(current.getId(), new ArtistRequest("BAND A", "rock", null, null));

		assertThat(res.name()).isEqualTo("BAND A");
		assertThat(res.genre()).isEqualTo("rock");
	}

	@Test
	void get_missingArtist_throwsNotFound() {
		UUID id = UUID.randomUUID();
		when(artistRepository.findById(id)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> artistService.get(id)).isInstanceOf(NotFoundException.class);
	}

	@Test
	void findOrCreate_existingArtist_isReused() {
		Artist existing = artist("Caparezza");
		when(artistRepository.findByNameIgnoreCase("caparezza")).thenReturn(Optional.of(existing));

		assertThat(artistService.findOrCreate(" caparezza ")).isSameAs(existing);
		verify(artistRepository, never()).save(any());
	}
}
