# Frontend: piattaforma eventi

React 19 + TypeScript + Vite, Tailwind 4 + shadcn/ui (icone Phosphor), TanStack Query, react-hook-form + zod, react-router, react-leaflet, STOMP.

Regole di comunicazione col backend (sessione, CSRF, errori, upload, tempo reale): [`../docs/API.md`](../docs/API.md).
Endpoint: [`../docs/openapi.yaml`](../docs/openapi.yaml), da cui si generano i tipi in `src/lib/api-schema.ts`.

```bash
npm install
npm run dev        # http://localhost:5173 (backend su 8080: /api e /ws passano dal proxy)
npm run gen:api    # rigenera i tipi dopo ogni modifica agli endpoint
npm run lint && npm run typecheck && npm run test && npm run build
npm run coverage
```

## Struttura

- `src/lib/`: utility condivise (`api`, `csrf`, `errors`, `upload`, `upload-manager`, `dom` con `make()`, `format`, `query`, `roles`).
- `src/components/`: `ui/` (shadcn, generati), `auth/` (AuthProvider e guardie), `layout/`, `uploads/` (pannello degli upload), `feedback/`.
- `src/features/<nome>/`: una cartella per funzionalità con `api.ts`, `schemas.ts`, `hooks/`, `components/`, `pages/` e `routes.tsx`.
  Le rotte si dichiarano nel `routes.tsx` della feature, divise per guardia (`public`, `guest`, `auth`, `admin`).

## Regole (controllate da ESLint)

- Niente operatori ternari: calcolare il valore prima del JSX con `if/else`.
- Niente `innerHTML` / `dangerouslySetInnerHTML`: testo in `{valore}`, nodi DOM con `make()`.
- Niente `any` e niente `console.log`.
- Icone solo da `@phosphor-icons/react`.
- Upload sempre con `uploadManager.enqueue(...)`: coda asincrona con progresso, annulla e riprova; la UI non si blocca.
