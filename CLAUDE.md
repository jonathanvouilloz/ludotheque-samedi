# LudoTools

PWA interne pour la Ludothèque Pâquis-Sécheron (~7 personnes). Centralise le planning des samedis, la wishlist de jeux à acheter, et la liste de matériel/fournitures. Mobile-first, sans authentification (identification par localStorage).

## Stack technique

| Couche | Choix |
|--------|-------|
| Framework | SvelteKit (Svelte 5 — runes) |
| Database | Turso (LibSQL) — SQLite local en dev |
| ORM | Drizzle ORM |
| Auth | Aucune (localStorage) |
| Hosting | Vercel |
| Styling | Tailwind CSS + Melt UI (headless) |
| PWA | vite-plugin-pwa / @vite-pwa/sveltekit |
| IDs | ULID |
| Icônes | Lucide Icons |

## Commandes utiles

```bash
npm run dev          # Dev server (localhost:5173)
npm run build        # Build production
npm run preview      # Preview build local
npm run db:generate  # Générer migrations Drizzle
npm run db:push      # Appliquer migrations
```

## Variables d'environnement

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=eyJ...
PUBLIC_APP_NAME=LudoTools
```

## Conventions de code

- **Composants** : PascalCase (`SlotCard.svelte`)
- **Utilitaires** : camelCase (`formatDate.ts`)
- **Routes** : kebab-case (`/game-wishes`)
- **Variables/fonctions** : camelCase
- **Constantes** : SCREAMING_SNAKE_CASE
- **Types** : PascalCase
- Toujours typer les fonctions (params + retour)
- Pas de `any` sauf cas documenté
- Logique métier séparée des composants UI
- Requêtes DB via server functions / API routes uniquement
- Error handling avec pattern `Result<T>` (success/error)
- Commits : Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)

## Structure du projet

```
src/
├── lib/
│   ├── components/        # UI réutilisables
│   │   ├── ui/            # Boutons, inputs, badges, modals
│   │   ├── planning/      # Composants planning
│   │   ├── wishlist/      # Composants wishlist jeux
│   │   └── supplies/      # Composants matériel
│   ├── server/
│   │   ├── db.ts          # Client Turso + Drizzle
│   │   └── schema.ts      # Schéma Drizzle
│   ├── stores/            # Svelte stores
│   └── utils/             # Fonctions utilitaires
├── routes/
│   ├── +layout.svelte     # Layout + bottom tabs
│   ├── +page.svelte       # Planning (accueil)
│   ├── games/             # Wishlist jeux
│   ├── supplies/          # Liste matériel
│   ├── log/               # Log modifications
│   ├── settings/          # Paramètres + gestion
│   └── api/               # Endpoints API
└── service-worker.ts      # PWA
```

## Documentation

- [PRD complet](PRD-LudoTools.md)
- [Plan d'exécution](docs/PLAN.md)
- [Décisions techniques](docs/DECISIONS.md)
- [Guide de style](docs/STYLEGUIDE.md)
- Features détaillées dans `docs/features/`

## État actuel

**Phase** : V1.1 — 10/10 epics
**Dernier epic** : Epic 10 — Calendrier interne (vacances membres, accueils, événements, vue unifiée)
**Prochaine étape** : Déploiement Vercel + tests sur mobile
