# Plan — Calendrier interne complet (vacances membres + accueils + événements)

## Context

Aujourd'hui LudoTools gère uniquement les samedis de la ludothèque. Le reste de la vie de la ludo (vacances/congés des membres, accueils scolaires, événements internes type "spécial pré-ados", vacances scolaires GE, jours fériés) est éparpillé dans des Excel et docs externes. Ce plan centralise tout ça dans LudoTools sous une nouvelle section **Calendrier**, avec workflow d'approbation léger, détection de conflits et vue desktop + mobile. Le périmètre principal est la gestion interne par la responsable, mais chaque membre peut soumettre ses demandes de vacances. La vue planning samedis existante reste séparée (pas de fusion).

L'objectif final (phases ultérieures) est qu'au début de l'année la responsable puisse cadrer tous les événements de l'année sans chevauchement, puis qu'à terme les écoles puissent remplir leurs infos via un formulaire dédié.

## Périmètre & ordre d'exécution

Découpage en incréments livrables, chacun shippable indépendamment :

1. **Fondations** : nouveau tab "Calendrier", écoles (CRUD), périodes scolaires (saisie manuelle).
2. **Absences membres** : demande + workflow d'approbation responsable.
3. **Événements & accueils** : CRUD, assignation, détection de conflits, récurrence optionnelle.
4. **Vue calendrier unifiée** : mois (desktop) + agenda (mobile), filtres.
5. *(Phase 2, hors plan)* Import auto calendrier scolaire GE depuis le site web.
6. *(Phase 2, hors plan)* Formulaire/portail écoles.

## Modèle de données (Drizzle — `src/lib/server/schema.ts`)

Toutes les tables suivent les conventions existantes : ULID `id`, timestamps `createdAt` ISO string, dates en `YYYY-MM-DD`, heures en `HH:MM`, pas de soft-delete.

### `schools`
- `id`, `name`, `address?`, `contactName?`, `contactEmail?`, `phone?`, `notes?`, `createdAt`
- Réutilisable d'année en année (l'école garde son historique d'événements).

### `schoolPeriods`
Vacances scolaires GE, fériés, ponts, journées spéciales. Saisie manuelle pour le premier jet (parsing du site GE en phase 2).
- `id`, `label`, `type` enum `'vacation' | 'holiday' | 'pont' | 'special'`
- `startDate`, `endDate` (YYYY-MM-DD, inclusives)
- `isBlocking` boolean — si true, empêche la création d'événements de type accueil scolaire dans cette plage (warning bloquant ; les événements internes restent autorisés).
- `year` (int) pour faciliter le filtrage annuel
- `createdAt`

### `absences`
- `id`, `memberId` → `members.id`
- `type` enum `'vacation' | 'leave' | 'training' | 'unavailable'`
- `startDate`, `endDate` (inclusives)
- `startTime?`, `endTime?` — null = journée entière. Si renseignés, applicables uniquement quand `startDate === endDate` (demi-journée / créneau).
- `status` enum `'pending' | 'approved' | 'rejected'` (par défaut `pending`, ou `approved` direct si la responsable saisit elle-même)
- `requestNote?`, `responseNote?`
- `requestedBy` → `members.id`, `respondedBy?` → `members.id`, `respondedAt?`
- `createdAt`

### `events`
Couvre **accueils partenaires** ET **événements internes** (un seul modèle, distingué par `kind`).
- `id`, `title`, `kind` enum `'accueil' | 'internal'`
- `schoolId?` → `schools.id` (uniquement si `kind='accueil'` et école renseignée)
- `classLabel?`, `contactName?`, `contactEmail?`, `ageRange?`, `childCount?` (champs accueil — tous optionnels pour rester flexible)
- `date`, `startTime`, `endTime` (granularité minute via HH:MM)
- `location?` (texte libre — locaux ludo, école, autre)
- `status` enum `'draft' | 'sent' | 'confirmed'` (par défaut `draft`)
- `recurrenceGroupId?` (ULID partagé entre événements générés par la même récurrence — permet "modifier toutes les occurrences")
- `notes?`, `createdAt`, `createdBy` → `members.id`

### `eventAssignments`
- `id`, `eventId` → `events.id` (cascade delete), `memberId` → `members.id`
- Unique `(eventId, memberId)`. Plusieurs membres possibles par événement, pas de min/max imposé.

## Routes & UI

Nouvelle entrée dans `tabs` de `src/routes/+layout.svelte` (icône Calendar de Lucide — déjà utilisée pour planning, choisir CalendarDays pour distinguer).

```
/calendrier              → vue calendrier unifiée (mois desktop / agenda mobile)
/calendrier/absences     → liste + saisie + approbations
/calendrier/events       → liste + édition
/calendrier/events/new   → formulaire création (accueil ou interne)
/calendrier/events/[id]  → détail + édition
/calendrier/periods      → CRUD périodes scolaires (admin only)
/schools                 → CRUD écoles (sous Calendrier ou en sous-page de /calendrier/schools — choisir /calendrier/schools pour grouper)
```

API correspondante sous `src/routes/api/calendar/` :
- `schools/+server.ts` (GET, POST), `schools/[id]/+server.ts` (PUT, DELETE)
- `periods/+server.ts`, `periods/[id]/+server.ts`
- `absences/+server.ts`, `absences/[id]/+server.ts`, `absences/[id]/decision/+server.ts` (approve/reject — admin)
- `events/+server.ts`, `events/[id]/+server.ts`
- `events/[id]/assignments/+server.ts` (POST/DELETE)
- `events/check-conflicts/+server.ts` (POST — payload : date, heures, membres, lieu → renvoie liste de conflits)

Toutes les routes admin protégées via `requireResponsable(request)` (déjà dans `src/lib/server/auth.ts`). Saisie d'absence par soi-même : autorisée si `memberId === actor`.

## Détection de conflits

Utilitaire pur dans `src/lib/utils/conflicts.ts` (nouveau), appelé côté serveur depuis `events/check-conflicts` et côté client pour preview en live dans le formulaire d'événement.

Signature :
```ts
checkEventConflicts(input: {
  date: string; startTime: string; endTime: string;
  memberIds: string[]; location?: string;
  excludeEventId?: string; // pour l'édition
}, context: {
  events: Event[]; assignments: EventAssignment[];
  absences: Absence[]; schoolPeriods: SchoolPeriod[];
  saturdaySlots: SaturdaySlot[];
}): Conflict[]
```

Types de conflit retournés :
- `member_double_booked` — membre déjà assigné à un autre event qui chevauche
- `member_on_absence` — absence approuvée couvrant la date/heure
- `member_on_pending_absence` — warning seulement
- `school_vacation` — `isBlocking=true` et `kind='accueil'` → bloquant ; sinon warning
- `holiday` — warning
- `saturday_overlap` — date est un samedi avec slot ouvert → warning
- `location_conflict` — même `location` (string match insensible casse) à un autre event chevauchant

Le formulaire affiche les conflits en temps réel. Bloquants en rouge, warnings en orange. La responsable peut quand même forcer la sauvegarde des warnings (pas des bloquants stricts, mais on garde même les bloquants franchissables avec confirmation explicite, pour éviter les impasses).

Helpers dates à réutiliser depuis `src/lib/utils/dates.ts` (`today()`, parsing ISO). Ajouter dans le même fichier :
- `dateRangeOverlap(aStart, aEnd, bStart, bEnd): boolean`
- `timeRangeOverlap(aStart, aEnd, bStart, bEnd): boolean`
- `eachDateInRange(start, end): string[]`

## Workflow absences

1. Membre va sur `/calendrier/absences`, clique "Demander vacances", saisit type/dates/note → POST crée avec `status='pending'`, `requestedBy=actor`.
2. La responsable voit un badge sur le tab "Calendrier" (compteur des `pending`) — petit ajout dans le layout via load function de `+layout.server.ts`.
3. Sur `/calendrier/absences`, la responsable voit la liste des `pending` en haut, avec boutons Approuver / Refuser → POST `decision` met à jour `status`, `respondedBy`, `respondedAt`.
4. Si la responsable saisit pour quelqu'un d'autre, l'absence est créée directement en `approved`.
5. Chaque action loggée via `logActivity()` (`src/lib/server/activity.ts`) avec types `'absence_requested'`, `'absence_approved'`, `'absence_rejected'`. Metadata : memberId, dates, type.

## Vue calendrier unifiée (`/calendrier`)

- **Desktop** : grille mois classique. Cellules = jour. Affichage empilé : bandeau de fond pour `schoolPeriods` (couleur par type), pastilles colorées pour événements, icône absence par membre. Header avec navigation mois ←/→, sélecteur année.
- **Mobile** : vue agenda — liste verticale groupée par jour, sur 4 semaines visibles, scroll infini. Bandeau périodes scolaires en sticky.
- **Filtres** (desktop : sidebar ; mobile : sheet) : par membre (multi), par école (multi), par type (samedi-ludo affiché en read-only / accueil / interne / absence / période scolaire).
- Click sur événement → drawer/dialog avec détails et bouton "Éditer".
- Données chargées via `+page.server.ts` : load tout pour le mois courant ± 1 mois (events + assignments + absences + periods + saturdaySlots), puis filtrage côté client.

Réutilise `formatSamedi`, `formatMonth`, `formatDay` de `src/lib/utils/dates.ts`. Composant `<MemberPill />` réutilisé pour les assignations.

## Récurrence

Création d'événement avec option "Répéter" :
- Fréquence : hebdomadaire uniquement (suffisant pour le besoin "tous les mardis à 14h pendant 6 semaines").
- Champs : nombre d'occurrences OU date de fin.
- À la création → boucle qui génère N events avec le même `recurrenceGroupId` (ULID). Conflits détectés par occurrence ; l'utilisateur voit la liste avant confirmation.
- À l'édition d'une occurrence : choix "cette occurrence seule" ou "toute la série" (UPDATE WHERE recurrenceGroupId = X).
- À la suppression : idem.

## Activity log

Étendre les `type` utilisés dans `activityLog` avec :
`absence_requested`, `absence_approved`, `absence_rejected`, `event_created`, `event_updated`, `event_deleted`, `event_assigned`, `event_unassigned`, `school_created`, `period_created`. Aucun changement de schéma nécessaire (table déjà générique).

## Fichiers à créer

```
src/lib/server/schema.ts                       (édition — 5 nouvelles tables)
src/lib/utils/conflicts.ts                     (nouveau)
src/lib/utils/dates.ts                         (édition — helpers overlap/range)
src/lib/components/calendar/MonthGrid.svelte   (desktop)
src/lib/components/calendar/AgendaList.svelte  (mobile)
src/lib/components/calendar/EventCard.svelte
src/lib/components/calendar/EventForm.svelte
src/lib/components/calendar/AbsenceForm.svelte
src/lib/components/calendar/ConflictList.svelte
src/lib/components/calendar/SchoolForm.svelte
src/lib/components/calendar/PeriodForm.svelte
src/lib/components/calendar/CalendarFilters.svelte

src/routes/+layout.svelte                      (édition — nouveau tab + badge pending)
src/routes/+layout.server.ts                   (édition — count pending absences pour badge)
src/routes/calendrier/+page.svelte
src/routes/calendrier/+page.server.ts
src/routes/calendrier/absences/+page.svelte
src/routes/calendrier/absences/+page.server.ts
src/routes/calendrier/events/+page.svelte
src/routes/calendrier/events/+page.server.ts
src/routes/calendrier/events/new/+page.svelte
src/routes/calendrier/events/[id]/+page.svelte
src/routes/calendrier/events/[id]/+page.server.ts
src/routes/calendrier/periods/+page.svelte
src/routes/calendrier/periods/+page.server.ts
src/routes/calendrier/schools/+page.svelte
src/routes/calendrier/schools/+page.server.ts

src/routes/api/calendar/schools/+server.ts
src/routes/api/calendar/schools/[id]/+server.ts
src/routes/api/calendar/periods/+server.ts
src/routes/api/calendar/periods/[id]/+server.ts
src/routes/api/calendar/absences/+server.ts
src/routes/api/calendar/absences/[id]/+server.ts
src/routes/api/calendar/absences/[id]/decision/+server.ts
src/routes/api/calendar/events/+server.ts
src/routes/api/calendar/events/[id]/+server.ts
src/routes/api/calendar/events/[id]/assignments/+server.ts
src/routes/api/calendar/events/check-conflicts/+server.ts

drizzle/<timestamp>_calendar.sql               (généré via `npm run db:generate`)
```

## Patterns existants à réutiliser

- **Auth admin** : `requireResponsable(request)` dans `src/lib/server/auth.ts`
- **Identification client** : `identity` store dans `src/lib/stores/identity.svelte.ts` + `fetchJson()` qui injecte le header `x-member-id`
- **Activity log** : `logActivity()` dans `src/lib/server/activity.ts`
- **ULID** : déjà installé, utilisé partout (ex. `src/routes/api/planning/swap/+server.ts`)
- **Dialog natif** : pattern récent (commit `967c66c`) — réutiliser pour les formulaires modaux
- **Composants pills membres** : `src/lib/components/planning/MemberPill.svelte`
- **Pattern transactionnel** : `db.transaction(tx => …)` pour la création d'événements récurrents (atomicité)

## Vérification end-to-end

Pour chaque incrément :

**Incrément 1 — Fondations**
1. `npm run db:generate && npm run db:push` → migration appliquée sans erreur.
2. `npm run dev`, ouvrir `/calendrier/schools` → créer une école → vérifier en DB (`select * from schools`).
3. `/calendrier/periods` → ajouter "Vacances d'octobre 2026" type=vacation, isBlocking=true → vérifier affichage liste.
4. Tab "Calendrier" visible dans nav desktop ET mobile.

**Incrément 2 — Absences**
1. Se connecter en tant que membre non-responsable → demander vacances → status `pending`.
2. Se connecter en responsable → voir badge sur le tab, approuver → status `approved`.
3. Vérifier 3 entrées dans `activityLog` (requested, approved).
4. Tester demi-journée : absence avec startTime/endTime sur même jour.

**Incrément 3 — Événements**
1. Créer accueil scolaire le mardi 15h-16h30 avec école + 2 membres assignés.
2. Créer un second event sur les mêmes membres au même moment → conflit `member_double_booked` affiché.
3. Créer event sur date couverte par période bloquante → conflit `school_vacation` affiché et bloquant si `kind=accueil`.
4. Créer event sur date d'absence approuvée d'un membre assigné → conflit `member_on_absence`.
5. Créer série récurrente hebdo 6 semaines → 6 events avec même `recurrenceGroupId`, vérifier en DB.
6. Éditer "toute la série" → tous mis à jour.

**Incrément 4 — Vue calendrier**
1. Desktop : grille mois affiche bandeaux périodes + pastilles events + indicateurs absences.
2. Filtre par membre : tout sauf events impliquant ce membre est masqué.
3. Mobile : agenda liste verticale, scroll fluide.
4. Click event → dialog détails s'ouvre.
5. Test responsive : DevTools → 375px largeur → bascule sur AgendaList.

**Régression**
- Vue planning samedis (`/`) inchangée.
- Tabs existants accessibles.
- `npm run build` passe sans erreur TS.

## Hors périmètre (à acter pour phase 2)

- Parsing automatique du calendrier scolaire genevois depuis le site web.
- Portail/formulaire pour les écoles (token public ou auth légère).
- Notifications (email/push) pour approbations d'absence.
- Export iCal du calendrier.
- Statistiques annuelles (heures par membre, par école).
