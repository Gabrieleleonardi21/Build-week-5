package it.epicode.eventi.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EventMarkerRepository extends JpaRepository<EventMarker, UUID> {
}
