package it.epicode.eventi.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;

/**
 * JSON stabile per tutti gli endpoint che restituiscono Page (eventi, artisti, notifiche...):
 * { "content": [...], "page": { "size", "number", "totalElements", "totalPages" } }.
 * Senza, Spring serializza PageImpl cosi' com'e' (pageable, sort...) e la forma puo'
 * cambiare a ogni aggiornamento di Spring Data, rompendo il frontend.
 */
@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
public class PageConfig {
}
