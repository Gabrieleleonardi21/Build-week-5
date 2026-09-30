## Cosa cambia

<!-- Una o due righe: quale parte, quali endpoint o pagine. -->

## Come provarlo

<!-- Comandi o passi per vederlo funzionare (account demo: vedi docs/STATO.md). -->

## Controlli

- [ ] Test verdi (`./mvnw verify` per il backend, `npm run lint && npm run typecheck && npm run test && npm run build` per il frontend)
- [ ] Endpoint cambiati: aggiornati `docs/openapi.yaml` e i tipi (`npm run gen:api`)
- [ ] Schema cambiato: `schema.sql` + migrazione in `db/migrations/` + entity
- [ ] Aggiornata la riga della mia parte in `docs/STATO.md`
