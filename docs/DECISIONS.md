# Décisions techniques — LudoTools

| Date | Décision | Contexte | Alternatives considérées |
|------|----------|----------|--------------------------|
| 2026-03-24 | Pas d'auth, identification par localStorage | Équipe de 7 personnes, usage interne, pas de données sensibles | OAuth (trop complexe), PIN par membre (friction inutile) |
| 2026-03-24 | Turso (LibSQL) comme DB | Besoin d'un SQLite hébergé, gratuit, sans cold start | Supabase (overkill), PlanetScale (payant), SQLite embarqué (pas de partage) |
| 2026-03-24 | Drizzle ORM | Type-safe, léger, excellent support SQLite/Turso | Prisma (lourd pour ce use case), Kysely (moins d'écosystème Svelte) |
| 2026-03-24 | Melt UI pour composants headless | Accessibilité native, style custom via Tailwind, écosystème Svelte | Skeleton UI (trop opinionné), shadcn-svelte (pas encore mature), custom (trop de travail) |
| 2026-03-24 | Protection responsable par label en DB | Le label existe déjà, vérification serveur simple | PIN partagé (moins sécurisé, plus de friction UX) |
| 2026-03-24 | ULID pour les IDs | Triables chronologiquement, pas de collision, compatibles texte SQLite | UUID v4 (pas triable), auto-increment (pas distribué) |
| 2026-03-24 | Couleur primaire : bleu roi | Choix de Jonathan. Ex: `#1e40af` (blue-800) ou `#2563eb` (blue-600) | Autres couleurs envisagées mais non retenues |
| 2026-03-24 | Svelte 5 (runes) | Syntaxe moderne, meilleure réactivité, c'est le futur de Svelte | Svelte 4 (legacy) |
| 2026-03-24 | Domaine : ludotools.vercel.app | Suffisant pour un outil interne d'équipe | Domaine custom (pas nécessaire) |
| 2026-03-24 | Melt UI Next Gen (package `melt`) | Version Svelte 5 runes-first, meilleure DX | `@melt-ui/svelte` (legacy Svelte 4) |
| 2026-03-24 | better-sqlite3 pour drizzle-kit local | `@libsql/client` a des problèmes de bindings natifs Windows (npm bug #4828) | `@libsql/client` seul (échoue sur Win) |
| 2026-03-24 | drizzle.config: dialect sqlite en local, turso en prod | Contourne le problème d'authToken requis par le dialect turso en dev | Dialect turso partout (échoue sans token) |
