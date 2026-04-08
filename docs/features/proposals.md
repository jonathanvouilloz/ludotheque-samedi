# Plan — Epic 11 : Propositions partenaires (workflow Excel remplacé)

## Context

Aujourd'hui, pour planifier les accueils annuels (écoles, foyers, partenaires), l'équipe se réunit pour cadrer en interne quelles dates sont disponibles pour chaque partenaire (qui anime, quel lieu, quel créneau horaire), produit **un fichier Excel par partenaire** avec la liste des dates proposées, l'envoie par email, et attend que le partenaire retourne le fichier rempli avec les détails par créneau (classe, contact, âge moyen, nombre d'enfants).

L'Epic 10 a livré la création d'events individuels avec conflits. Mais le **workflow amont** — préparer un lot de créneaux → l'envoyer à une école → attendre son remplissage → valider → intégrer au calendrier — reste encore dans Excel.

Cet Epic remplace ce processus par un flux LudoTools natif : la responsable crée une **proposition** (un lot de créneaux brouillons pour une école précise), génère un **lien public tokenisé**, le transmet par email manuellement, et l'école remplit chaque créneau via un formulaire web. Après soumission, la responsable revoit et confirme → les events deviennent définitifs et rejoignent le calendrier normal.

## Workflow cible

1. **Création (interne)** — La responsable va sur `/calendrier/proposals/new`, choisit une école destinataire, fixe une date limite de réponse, puis ajoute une liste de créneaux (date, heure début/fin, membres assignés, lieu). Elle peut aussi utiliser la récurrence hebdo existante. À la sauvegarde → création d'une `proposal` + N `events` brouillons liés, avec détection de conflits comme dans l'Epic 10.

2. **Partage (copie manuelle)** — La page de la proposition affiche un bouton "Copier le lien partenaire" qui met dans le presse-papier `https://…/p/ABC123XYZ`. La responsable colle ça dans son email habituel. (Pas d'envoi automatique — zéro config SMTP à gérer.)

3. **Remplissage (externe, sans auth)** — L'école ouvre le lien, voit son nom + la date limite + les créneaux proposés. Pour chaque créneau elle renseigne : classe, contact enseignant, email, âge moyen, nombre d'enfants, notes ; OU coche "Non intéressé·e" pour décliner ce créneau. Sauvegarde au fur et à mesure (auto-save après perte de focus sur chaque champ). Bouton "Soumettre" à la fin.

4. **Revue (interne)** — Badge sur le tab Calendrier quand une proposition a le statut `submitted`. La responsable ouvre la proposition, voit les réponses par créneau (et ceux déclinés), puis clique "Confirmer" → events passent de `draft` à `confirmed`, proposition passe à `confirmed`. Les créneaux déclinés peuvent être supprimés en un clic ou réassignés (réouverture d'une nouvelle proposition).

5. **Expiration** — Après la deadline, le lien affiche "Proposition expirée" et devient read-only pour l'école. La responsable peut toujours la rouvrir en modifiant la deadline.

## Modèle de données

### Nouvelle table `proposals`
Ajouter dans `src/lib/server/schema.ts` :

- `id` (ULID)
- `title` — ex: "Accueils automne 2026 — École des Pâquis"
- `schoolId` → `schools.id` (non-null, une proposition = une école)
- `token` (unique index) — ULID distinct de l'id, utilisé dans l'URL publique
- `status` — `'draft' | 'sent' | 'submitted' | 'confirmed' | 'expired'`
  - `draft` : préparation interne, pas encore partagée
  - `sent` : lien activé, école peut remplir
  - `submitted` : école a cliqué "Soumettre", en attente de revue
  - `confirmed` : responsable a validé, events promus
  - `expired` : deadline dépassée sans soumission
- `deadline` (YYYY-MM-DD)
- `message` (texte libre affiché à l'école, ex: "Bonjour, voici nos disponibilités…")
- `createdBy` → `members.id`
- `createdAt`, `submittedAt?`, `confirmedAt?`

### Modifications `events` existante
- `proposalId?` → `proposals.id` (null pour les events hors proposition, utile pour les events internes et accueils créés directement)
- `declined?` (boolean default false) — l'école a décliné ce créneau précis
- Réutilise les champs existants `classLabel`, `contactName`, `contactEmail`, `ageRange`, `childCount`, `notes` pour stocker la saisie de l'école.
- Le status d'event reste `draft`/`sent`/`confirmed`. À la confirmation de la proposition → passage `draft` → `confirmed` pour tous les events non-déclinés du lot.

### Types TypeScript
Ajouter `Proposal`, `InsertProposal`, `ProposalStatus` dans les exports du schema.

## API

Nouveau sous-dossier `src/routes/api/calendar/proposals/` :

- **`+server.ts`**
  - `GET` — liste des propositions (admin only), filtrable par statut
  - `POST` — crée une proposition + N events brouillons en transaction. Body : `{ title, schoolId, deadline, message, slots: [{date, startTime, endTime, location, memberIds}], recurrence? }`. Génère un `token` ULID distinct de l'id.

- **`[id]/+server.ts`** (admin)
  - `GET` — détail avec events associés
  - `PUT` — modifier title/message/deadline + gérer les events (ajout/suppression de créneaux)
  - `DELETE` — supprimer la proposition + cascade events

- **`[id]/confirm/+server.ts`** (admin)
  - `POST` — passe à `confirmed`, promeut events non-déclinés à `status=confirmed`, optionnellement supprime les déclinés selon un flag `deleteDeclined`

- **`[id]/send/+server.ts`** (admin)
  - `POST` — passe `draft` → `sent` (active le token)

- **`public/[token]/+server.ts`** (public, pas d'auth)
  - `GET` — renvoie proposal + events (sans infos sensibles : pas d'actorId, pas de memberId brut, juste memberNames)
  - `PATCH` — met à jour un event précis de la proposition. Body : `{ eventId, classLabel?, contactName?, contactEmail?, ageRange?, childCount?, notes?, declined? }`. Vérifie que eventId appartient bien à la proposition, que status est `sent`, que deadline n'est pas dépassée. Chaque PATCH est une auto-save granulaire.
  - `POST submit` — (sous-route `public/[token]/submit/+server.ts`) passe proposal à `submitted`.

### Auth du endpoint public

Le endpoint `public/[token]` **bypasse** `requireResponsable`. Vérification faite sur le token uniquement :
1. Token existe ?
2. Status ∈ `['sent', 'submitted']` (pas `draft`, `confirmed`, `expired`)
3. `deadline >= today` (sinon passage auto en `expired`)

Les routes `api/calendar/proposals/public/*` n'exigent pas de header `x-member-id`.

## Routes UI

### Admin (sous `/calendrier`)

- **`/calendrier/proposals`** — liste groupée par statut (draft / sent / submitted / confirmed / expired), avec badges visuels. Bouton "Nouvelle proposition".

- **`/calendrier/proposals/new`** — formulaire avec :
  - Sélection école (obligatoire, préremplie si `?schoolId=` en query)
  - Titre + message d'accompagnement + deadline
  - **Builder de créneaux** : liste éditable de rows `(date, start, end, lieu, membres)` avec boutons ajouter/dupliquer/supprimer. Support de la récurrence hebdo qui génère plusieurs rows en un clic (réutilise la logique d'Epic 10).
  - Preview conflits en temps réel pour chaque créneau (réutilise `/api/calendar/events/check-conflicts`).
  - Boutons "Enregistrer en brouillon" et "Enregistrer & activer le lien".

- **`/calendrier/proposals/[id]`** — détail admin :
  - Header : école, statut, deadline, token + bouton "Copier le lien"
  - Liste des créneaux avec saisies de l'école si déjà remplies (grisées tant que status < `submitted`)
  - Badge "Décliné" sur les créneaux refusés
  - Actions selon statut :
    - `draft` → "Activer le lien" (POST send)
    - `sent` → "Rouvrir en brouillon", "Modifier", "Supprimer", "Copier le lien"
    - `submitted` → "Confirmer la proposition" (avec case "Supprimer les créneaux déclinés"), "Renvoyer en brouillon"
    - `confirmed` → read-only + lien vers les events dans le calendrier
    - `expired` → "Changer la deadline" pour réactiver

- Lien d'accès rapide "Propositions" ajouté dans la barre de pills de `/calendrier`.

### Public (hors `/calendrier`)

- **`/p/[token]/+page.svelte`** (nouveau layout group `(public)` pour bypasser la sidebar et la logique d'identity) :
  - Page autonome, logo LudoTools en haut, nom de l'école, message de la responsable, deadline affichée
  - Liste des créneaux proposés, chacun dans une carte éditable avec les champs à remplir
  - Chaque champ déclenche un PATCH auto-save sur perte de focus, indicateur visuel "Enregistré ✓"
  - Checkbox "Non intéressée par ce créneau" qui grise les champs
  - Bouton "Soumettre la réponse" en bas → POST submit → message de confirmation
  - Après soumission, la page reste accessible et modifiable tant que status ≠ `confirmed` et deadline valide
  - Messages d'état clairs si : proposition expirée, confirmée (read-only), token inconnu

### Layout group `(public)`

Pour éviter la redirection `goto('/identify')` dans `src/routes/+layout.svelte`, créer un groupe de routes `src/routes/(public)/p/[token]/` avec son propre `+layout.svelte` minimal qui ne dépend pas du store `identity`. Le layout parent reste globalement mais la logique de redirection dans `+layout.svelte` doit aussi checker si pathname commence par `/p/` pour ne pas rediriger.

Alternative plus propre : dans `src/routes/+layout.svelte`, étendre la condition `isOnIdentifyPage` en `isOnPublicPage` qui couvre `/identify` et `/p/`. Et masquer la nav aussi sur ces pages.

## Statut "expired" — mise à jour

Le passage auto en `expired` se fait à la lecture : si le GET admin ou public trouve `status === 'sent' && deadline < today()`, il UPDATE en `expired` avant de renvoyer. Pas de cron nécessaire.

## Badge tab Calendrier

Étendre `checkPendingAbsences()` dans `src/routes/+layout.svelte` en `checkPendingItems()` qui compte pending absences + propositions en `submitted`. Un seul badge cumulatif. Tooltip si besoin pour distinguer.

## Conflits

Le check-conflicts existant (`src/lib/utils/conflicts.ts`) continue de marcher — les events de la proposition ont déjà `date`/`startTime`/`endTime`/`memberIds` quand ils sont créés. À inclure dans le preview lors de la création d'une proposition et dans l'édition admin. **Pas de conflict check côté public** (l'école ne voit pas les conflits internes).

## Activity log

Nouveaux types : `proposal_created`, `proposal_sent`, `proposal_submitted` (actor = null, description mentionne "l'école X"), `proposal_confirmed`, `proposal_expired`, `proposal_deleted`.

## Fichiers à créer / modifier

```
# Schema
EDIT  src/lib/server/schema.ts
  - ajouter table `proposals`
  - ajouter colonnes `proposalId`, `declined` à `events`
  - exporter types

# Utils
EDIT  src/lib/utils/calendar.ts (peut-être, si filtrage proposals dans calendar view nécessaire)

# API admin
CREATE src/routes/api/calendar/proposals/+server.ts
CREATE src/routes/api/calendar/proposals/[id]/+server.ts
CREATE src/routes/api/calendar/proposals/[id]/confirm/+server.ts
CREATE src/routes/api/calendar/proposals/[id]/send/+server.ts

# API public (pas de requireResponsable)
CREATE src/routes/api/calendar/proposals/public/[token]/+server.ts
CREATE src/routes/api/calendar/proposals/public/[token]/submit/+server.ts

# Pages admin
CREATE src/routes/calendrier/proposals/+page.svelte
CREATE src/routes/calendrier/proposals/+page.server.ts
CREATE src/routes/calendrier/proposals/new/+page.svelte
CREATE src/routes/calendrier/proposals/new/+page.server.ts
CREATE src/routes/calendrier/proposals/[id]/+page.svelte
CREATE src/routes/calendrier/proposals/[id]/+page.server.ts

# Page publique
CREATE src/routes/(public)/p/[token]/+page.svelte
CREATE src/routes/(public)/p/[token]/+page.server.ts
CREATE src/routes/(public)/+layout.svelte (minimal, sans identity)

# Composants
CREATE src/lib/components/calendar/ProposalSlotBuilder.svelte (construction multi-créneaux réutilisable)
CREATE src/lib/components/calendar/PartnerSlotCard.svelte (carte remplissage côté public)
CREATE src/lib/components/calendar/CopyLinkButton.svelte (bouton copy-to-clipboard)

# Layout
EDIT  src/routes/+layout.svelte
  - étendre `isOnPublicPage` pour couvrir `/p/`
  - étendre le badge pour inclure propositions submitted
EDIT  src/routes/calendrier/+page.svelte (pill "Propositions" dans la barre rapide)
```

## Patterns existants à réutiliser

- **Auth admin** : `requireResponsable(request)` dans `src/lib/server/auth.ts`
- **Récurrence transactionnelle + détection conflits** : logique de `src/routes/api/calendar/events/+server.ts` à extraire/réutiliser
- **Preview conflits live** : `EventForm.svelte` pattern avec `$effect` + `/check-conflicts` endpoint
- **Formulaire modal** : pattern dialog natif (commit `967c66c`)
- **Activity log** : `logActivity()` dans `src/lib/server/activity.ts`
- **fetchJson / fetchAs** : pour les appels admin. Pour le public, utiliser `fetch` direct sans header.
- **ULID** : `ulid()` pour id ET token (deux séparés)
- **Dates helpers** : `today()`, `formatDay`, `formatSamedi` dans `src/lib/utils/dates.ts`

## Ordre d'implémentation incrémental

1. **Schema + migration `db:push`** — tables + colonnes, types exportés
2. **API admin CRUD basique** — create/read/delete proposals, liste, confirm, send. Avec transaction pour la création des events liés.
3. **Page admin `/calendrier/proposals`** (liste) + `/new` (builder) + `/[id]` (détail). Sans récurrence pour démarrer, juste créneaux un par un.
4. **Récurrence + preview conflits** dans le builder (réutilise Epic 10).
5. **Route publique** `/p/[token]` + API `public/[token]` + layout group `(public)` + adaptation de la redirection identity.
6. **Statut expired + badge cumulatif** tab Calendrier.
7. **Intégration avec calendrier principal** : events liés à une proposition affichés différemment (pastille avec icône "en attente") tant que status ≠ confirmed.

Chaque étape est testable indépendamment.

## Vérification end-to-end

**Incr. 1 — Schema**
1. `npm run db:push` → tables créées sans erreur
2. Insérer manuellement une proposal + event via studio Drizzle → FK `proposalId` marche

**Incr. 2+3 — API + pages admin**
1. Créer une école de test
2. `/calendrier/proposals/new` → créer "Test auto 2026" avec 3 créneaux, école sélectionnée, deadline = today+7
3. Vérifier 3 events `draft` créés avec `proposalId` pointant vers la proposition
4. Le bouton "Copier le lien" met `/p/XYZ` dans le presse-papier
5. `/calendrier/proposals` → la proposition apparaît en "draft"

**Incr. 4 — Récurrence + conflits**
1. Créer proposition avec 1 créneau + récurrence 4 semaines → 4 events générés
2. Préparer une période scolaire bloquante sur la 3e semaine → conflit `school_vacation` affiché, bloquant
3. Créer un membre en vacances approuvée sur la 2e semaine → conflit `member_on_absence`

**Incr. 5 — Route publique**
1. Passer la proposition en `sent` via bouton admin
2. Ouvrir le lien `/p/XYZ` dans un **navigateur en mode privé** (sans identity localStorage) → affiche la proposition sans redirection vers `/identify`
3. Remplir un créneau → auto-save OK, rechargement → valeurs persistées
4. Décliner un créneau → devient grisé
5. Cliquer "Soumettre" → passe à `submitted`
6. Retour admin : badge apparaît sur tab Calendrier
7. Ouvrir la proposition admin → voir les réponses remplies
8. Cliquer "Confirmer la proposition" → events passent à `confirmed`, visibles dans `/calendrier/events` et dans la vue calendrier principale
9. Retourner sur `/p/XYZ` → affiche message "Proposition confirmée" read-only

**Incr. 6 — Expiration**
1. Créer une proposition avec deadline = yesterday
2. Ouvrir `/p/XYZ` ou `/calendrier/proposals` → status auto-passé à `expired`, formulaire public en read-only

**Régression**
- `/calendrier/events/new` (hors proposition) marche toujours
- Events sans `proposalId` s'affichent normalement dans la vue calendrier
- Absences et périodes non impactées
- `npm run build` passe sans erreur TS

## Hors périmètre (phase 3)

- Envoi email automatique via service tiers
- Historique/diff des réponses de l'école
- Support multi-partenaires (foyers, MJC) — pour l'instant tout passe par la table `schools` qui peut être rebaptisée "partners" plus tard si besoin
- Signature électronique / validation légale de la part de l'école
- Export PDF de la proposition pour archive
