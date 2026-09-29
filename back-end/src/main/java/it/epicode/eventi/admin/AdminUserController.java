package it.epicode.eventi.admin;

import it.epicode.eventi.admin.dto.AdminUserResponse;
import it.epicode.eventi.admin.dto.RoleChangeRequest;
import it.epicode.eventi.admin.dto.StatusChangeRequest;
import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.UserStatus;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

/**
 * Area admin, account utente. Tutto /api/admin/** richiede almeno MODERATOR
 * (SecurityConfig); cambiare il ruolo richiede SUPERADMIN.
 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

	private final AdminUserService adminUserService;
	private final CurrentUsers currentUsers;

	public AdminUserController(AdminUserService adminUserService, CurrentUsers currentUsers) {
		this.adminUserService = adminUserService;
		this.currentUsers = currentUsers;
	}

	@GetMapping
	public Page<AdminUserResponse> search(@RequestParam(required = false) String q,
			@RequestParam(required = false) Role role, @RequestParam(required = false) UserStatus status,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return adminUserService.search(q, role, status, page, size);
	}

	@GetMapping("/{id}")
	public AdminUserResponse get(@PathVariable UUID id) {
		return adminUserService.get(id);
	}

	@PatchMapping("/{id}/role")
	@PreAuthorize("hasRole('SUPERADMIN')")
	public AdminUserResponse changeRole(Principal principal, @PathVariable UUID id,
			@Valid @RequestBody RoleChangeRequest req) {
		return adminUserService.changeRole(id, req.role(), currentUsers.require(principal));
	}

	@PatchMapping("/{id}/status")
	public AdminUserResponse changeStatus(Principal principal, @PathVariable UUID id,
			@Valid @RequestBody StatusChangeRequest req) {
		return adminUserService.changeStatus(id, req.status(), currentUsers.require(principal));
	}
}
