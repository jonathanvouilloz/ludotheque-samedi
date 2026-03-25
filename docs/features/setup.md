# Epic 1 — Setup projet

**Complexité** : M
**Statut** : TODO

## Description

Initialiser le projet SvelteKit avec toutes les dépendances et la configuration de base : DB, ORM, styling, PWA.

## Tâches

- [ ] Initialiser projet SvelteKit (adapter Vercel)
- [ ] Installer et configurer Tailwind CSS
- [ ] Installer et configurer Drizzle ORM + @libsql/client
- [ ] Créer le schéma Drizzle (`schema.ts`) avec toutes les tables du data model
- [ ] Configurer la connexion DB (Turso en prod, SQLite local en dev)
- [ ] Installer Melt UI
- [ ] Installer Lucide Icons (lucide-svelte)
- [ ] Installer et configurer ulid
- [ ] Configurer vite-plugin-pwa / @vite-pwa/sveltekit (manifest basique)
- [ ] Créer le layout principal avec bottom tab bar (placeholder)
- [ ] Créer les pages vides pour chaque route (planning, games, supplies, log, settings)
- [ ] Configurer les variables d'environnement (.env.example)
- [ ] Premier déploiement Vercel (smoke test)

## Notes

- SQLite local en dev via `file:local.db` pour ne pas dépendre de Turso pendant le développement
- Le schéma Drizzle doit couvrir les 6 tables du PRD : members, seasons, saturday_slots, assignments, game_wishes, supply_needs, activity_log
