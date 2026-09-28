package it.epicode.eventi.social;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {
}
