# PRD — LudoTools

> **Version:** 1.0
> **Date:** 2026-03-24
> **Auteur:** Jonathan Vouilloz
> **Statut:** Draft

---

## 1. Vision & Contexte

### Problème

À la Ludothèque Pâquis-Sécheron, la gestion interne repose sur des outils dispersés : un Excel pour le planning des samedis, un Google Doc pour les souhaits d'achat de jeux, des emails/messages pour les changements de dernière minute. Cette fragmentation crée plusieurs frictions :

- **Le planning Excel** n'est pas accessible facilement sur mobile, les modifications ne sont pas visibles en temps réel, et il n'y a pas de notification quand un changement est fait.
- **Les souhaits d'achat** se perdent entre mails, messages et Google Docs. Pas de suivi clair de ce qui a été demandé, par qui, et si c'est acheté.
- **Les besoins en matériel/fournitures** (papier ménage, liquide vaisselle, etc.) ne sont pas centralisés — ça se dit à l'oral et ça s'oublie.
- **Aucun historique** des modifications ou des achats passés.

### Solution

LudoTools est une Progressive Web App (PWA) interne et minimaliste qui centralise les petits outils de gestion quotidienne de la ludothèque : planning des samedis, wishlist de jeux à acheter, et liste de matériel/fournitures nécessaires. Accessible sur mobile comme sur desktop, installable sur l'écran d'accueil, sans compte à créer.

### Utilisateur cible

L'équipe de la Ludothèque Pâquis-Sécheron : ~7 personnes (6 en tournus + 1 permanent). Profil non-technique, utilisation principalement sur smartphone. Besoin d'un outil qui "juste marche" sans friction.

Membres actuels :
- **Gabriel** — Permanent samedi (présent chaque samedi)
- **Alessia, Jonathan, Zaynab, Sadja, Francisca, Eduardo** — Tournus (2 personnes par samedi, répartition équitable sur la saison)

### Succès

- L'équipe utilise LudoTools au lieu de l'Excel et du Google Doc dans les 2 premières semaines.
- Les swaps de planning se font directement dans l'app sans passer par des messages.
- La responsable des achats a une vue claire et à jour des jeux et du matériel à acheter.

---

## 2. Scope

### ✅ IN — Ce qu'on fait (V1)

- [ ] **Planning samedis** — Vue du planning de la saison, génération automatique avec répartition équitable, gestion des fermetures/événements
- [ ] **Swaps** — Échange de samedis entre membres, avec log des modifications visible par tous
- [ ] **Identification légère** — Sélection de son nom à la première visite (stocké en localStorage), mise en évidence de ses propres samedis
- [ ] **Wishlist jeux** — Liste des jeux à acheter avec nom, lien (optionnel), prix (optionnel), statut acheté/pas acheté, historique
- [ ] **Liste matériel/fournitures** — Liste des besoins avec catégories, niveau d'urgence, statut acheté, historique
- [ ] **PWA** — Installable sur mobile, fonctionne offline pour la consultation
- [ ] **Log des modifications** — Historique visible de tous les changements (swaps, ajouts, achats)
- [ ] **Gestion des membres** — Ajout/retrait de membres par la responsable
- [ ] **Gestion des saisons** — Création d'une nouvelle saison par la responsable

### ❌ OUT — Ce qu'on ne fait PAS (volontairement)

- Système d'authentification (pas de login/password, pas d'OAuth)
- Système de permissions complexe (pas de rôles avec droits granulaires)
- Notifications push natives (complexité iOS/PWA)
- Inventaire complet des jeux de la ludothèque
- Gestion financière / budget
- Chat ou messagerie interne

### 🔮 LATER — Peut-être plus tard

- Notifications par email lors d'un swap
- Bot WhatsApp connecté à un groupe pour notifier les changements
- Autres petits outils internes selon les besoins de l'équipe
- Export du planning en PDF/image pour partage externe
- Statistiques (nombre de samedis par personne, jeux achetés par mois, etc.)

---

## 3. User Stories & Flows

### Story 1: Première visite — S'identifier

**En tant que** membre de l'équipe
**Je veux** sélectionner mon nom à ma première visite
**Afin de** voir mes samedis mis en évidence et être identifié dans les actions

**Flow détaillé:**
1. L'utilisateur ouvre l'app pour la première fois (via lien partagé)
2. Un écran d'accueil s'affiche avec la liste des membres de l'équipe
3. L'utilisateur tape sur son nom
4. Son choix est sauvegardé en localStorage
5. Il est redirigé vers la page Planning (page d'accueil par défaut)
6. Ses samedis sont visuellement mis en évidence
7. L'app propose l'installation PWA (banner natif)

**Critères d'acceptation:**
- [ ] La liste des membres est récupérée depuis la base de données
- [ ] Le choix persiste entre les sessions (localStorage)
- [ ] L'utilisateur peut changer son identité dans les paramètres
- [ ] Le label/rôle de chaque membre est affiché à côté du nom

**Edge cases:**
- Si localStorage est vidé → re-afficher l'écran de sélection
- Si le membre a été supprimé depuis → afficher un message et demander de re-sélectionner

---

### Story 2: Consulter le planning

**En tant que** membre de l'équipe
**Je veux** voir le planning des samedis de la saison en cours
**Afin de** savoir quand je travaille et qui sont mes collègues chaque samedi

**Flow détaillé:**
1. L'utilisateur arrive sur la page Planning (page d'accueil)
2. Il voit le prochain samedi à venir en premier (mis en avant)
3. En dessous, la liste de tous les samedis de la saison en cours, en ordre chronologique
4. Chaque samedi affiche : la date, les membres assignés (2 tournants + Gabriel permanent), et un éventuel label d'événement
5. Les samedis de l'utilisateur connecté sont visuellement mis en évidence (surbrillance ou bordure colorée)
6. Les samedis passés sont visuellement atténués
7. Les samedis avec événement spécial affichent un badge/tag avec le type d'événement
8. Les samedis de fermeture sont clairement marqués comme tels

**Critères d'acceptation:**
- [ ] Le prochain samedi est toujours visible en premier
- [ ] Les samedis de l'utilisateur sont clairement identifiables
- [ ] Les événements spéciaux et fermetures sont visuellement distincts
- [ ] On peut filtrer/naviguer entre les saisons (dropdown ou sélecteur)
- [ ] Le nombre de personnes assignées peut varier selon le type d'événement

**Edge cases:**
- Si aucune saison n'existe encore → afficher un message invitant la responsable à en créer une
- Si la saison est terminée → afficher un message et proposer de consulter les anciennes saisons

---

### Story 3: Créer une nouvelle saison (responsable)

**En tant que** responsable
**Je veux** créer et configurer une nouvelle saison
**Afin de** générer le planning des samedis pour toute la période août-juillet

**Flow détaillé:**
1. La responsable accède à la section "Nouvelle saison" (protégée par PIN ou réservée au rôle responsable)
2. Elle définit la période : date de début (ex: 1er août 2026) et date de fin (ex: 31 juillet 2027)
3. L'app liste automatiquement tous les samedis de cette période
4. Elle sélectionne les samedis de fermeture (vacances scolaires, jours fériés, etc.) en les cochant sur un calendrier
5. Elle peut marquer certains samedis comme événements spéciaux : elle choisit le type (portes ouvertes, événement, ouverture exceptionnelle, etc.) et le nombre de personnes requises pour ce samedi
6. Elle sélectionne les membres qui participent au tournus pour cette saison
7. Elle définit le nombre de personnes par samedi standard (par défaut : 2, configurable)
8. Elle valide la génération
9. L'algorithme répartit équitablement les samedis entre les membres du tournus
10. Le planning généré est affiché pour validation
11. Elle confirme → le planning est sauvegardé et visible par tous

**Critères d'acceptation:**
- [ ] Tous les samedis de la période sont listés automatiquement
- [ ] Les fermetures sont exclues de la répartition
- [ ] Les événements spéciaux peuvent avoir un nombre de personnes différent du standard
- [ ] La répartition est équitable (écart max de 1 samedi entre les membres)
- [ ] Le permanent (Gabriel) est automatiquement assigné à tous les samedis ouverts
- [ ] Le planning peut être régénéré avant validation finale
- [ ] La responsable peut ajuster manuellement des assignations avant de valider

**Edge cases:**
- Si le nombre de samedis n'est pas divisible équitablement → répartir au plus juste (écart max 1)
- Si un membre est ajouté en cours de saison → redistribution manuelle nécessaire
- Si une saison existe déjà pour la même période → avertir et proposer d'écraser ou d'annuler

---

### Story 4: Faire un swap de samedi

**En tant que** membre de l'équipe
**Je veux** échanger mon samedi avec un autre membre
**Afin de** m'organiser quand je ne suis pas disponible

**Flow détaillé:**
1. L'utilisateur consulte le planning et repère un samedi où il ne peut pas venir
2. Il tape sur ce samedi (ou sur un bouton "Échanger")
3. Il voit la liste des autres samedis avec les membres assignés
4. Il sélectionne le samedi avec lequel il veut échanger et le membre concerné
5. L'échange se fait immédiatement (pas de validation requise par l'autre membre — confiance interne)
6. Un log est créé : "[Membre A] a échangé le samedi [Date X] avec [Membre B] le samedi [Date Y]"
7. Le planning est mis à jour pour tout le monde

**Critères d'acceptation:**
- [ ] Le swap est instantané, sans approbation requise
- [ ] Les deux samedis concernés sont mis à jour simultanément
- [ ] Un log de modification est créé avec date, heure, et détail du swap
- [ ] Le planning se rafraîchit pour tous les utilisateurs (polling)
- [ ] On ne peut pas swapper un samedi de fermeture

**Edge cases:**
- Si on essaie de swapper avec un samedi où on est déjà assigné → bloquer avec message
- Si le samedi ciblé a un nombre de personnes différent (événement) → permettre mais afficher un avertissement
- Si Gabriel (permanent) essaie de swapper → bloquer (il est sur tous les samedis)

---

### Story 5: Ajouter un jeu à la wishlist

**En tant que** membre de l'équipe
**Je veux** ajouter un jeu que j'aimerais qu'on achète
**Afin que** la responsable des achats ait une liste centralisée et à jour

**Flow détaillé:**
1. L'utilisateur navigue vers l'onglet "Jeux à acheter"
2. Il voit la liste des jeux proposés, triés par date d'ajout (récents en premier)
3. Il tape sur "Ajouter un jeu"
4. Il remplit le formulaire : nom du jeu (obligatoire), lien d'achat (optionnel), prix estimé (optionnel)
5. Le jeu est ajouté à la liste avec le nom du membre qui l'a proposé et la date

**Critères d'acceptation:**
- [ ] Seul le nom du jeu est obligatoire
- [ ] Le membre qui a ajouté le jeu est affiché
- [ ] La liste se met à jour en temps réel pour tous

**Edge cases:**
- Si le jeu existe déjà dans la liste (même nom) → avertir mais permettre l'ajout (doublons possibles pour des éditions différentes)

---

### Story 6: Marquer un jeu comme acheté

**En tant que** membre de l'équipe
**Je veux** marquer un jeu comme acheté
**Afin que** l'équipe sache que le jeu a été commandé/acheté

**Flow détaillé:**
1. L'utilisateur est sur l'onglet "Jeux à acheter"
2. Il voit les jeux non achetés en premier
3. Il tape sur le bouton "Acheté" à côté d'un jeu
4. Le jeu passe en statut "acheté" avec la date et le nom de la personne qui l'a marqué
5. Le jeu est déplacé dans une section "Historique" / "Déjà achetés" (visible mais secondaire)

**Critères d'acceptation:**
- [ ] Tout le monde peut marquer un jeu comme acheté
- [ ] Le jeu reste visible dans l'historique
- [ ] On peut annuler un marquage (remettre en "à acheter") en cas d'erreur
- [ ] Un log est créé

**Edge cases:**
- Si quelqu'un marque comme acheté par erreur → possibilité de revenir en arrière

---

### Story 7: Gérer la liste matériel/fournitures

**En tant que** membre de l'équipe
**Je veux** signaler un besoin en matériel ou fournitures
**Afin que** la personne responsable du matériel sache quoi acheter

**Flow détaillé:**
1. L'utilisateur navigue vers l'onglet "Matériel"
2. Il voit la liste des besoins, triés par urgence puis par date
3. Il tape sur "Ajouter un besoin"
4. Il remplit : nom de l'article (obligatoire), catégorie (ménage, bureau, matériel animation, autre), urgence (normal/urgent), lien (optionnel), prix estimé (optionnel)
5. L'article est ajouté à la liste avec le nom du membre et la date
6. Pour marquer comme acheté → même flow que la wishlist jeux
7. Les articles achetés passent en historique

**Critères d'acceptation:**
- [ ] Les catégories sont prédéfinies mais extensibles (pouvoir en ajouter)
- [ ] Les articles urgents sont visuellement distincts (badge rouge ou similaire)
- [ ] Le tri par défaut est : urgents en premier, puis par date
- [ ] Historique des articles achetés accessible
- [ ] Tout le monde peut ajouter et marquer comme acheté

**Edge cases:**
- Si aucune catégorie ne correspond → utiliser "Autre" avec un champ texte libre

---

### Story 8: Consulter le log des modifications

**En tant que** membre de l'équipe
**Je veux** voir l'historique des modifications récentes
**Afin de** savoir ce qui a changé depuis ma dernière visite

**Flow détaillé:**
1. Un indicateur (badge) sur l'icône de log montre le nombre de modifications depuis la dernière visite
2. L'utilisateur ouvre le log (page dédiée ou panneau latéral)
3. Il voit les modifications récentes : swaps, ajouts de jeux/matériel, marquages "acheté", ajouts/retraits de membres
4. Chaque entrée montre : qui, quoi, quand

**Critères d'acceptation:**
- [ ] Le log est ordonné chronologiquement (récent en premier)
- [ ] Chaque action significative crée une entrée de log
- [ ] Le badge de nouvelles modifications se base sur la dernière visite de l'utilisateur (stockée en localStorage)

---

### Story 9: Gérer les membres (responsable)

**En tant que** responsable
**Je veux** ajouter ou retirer des membres de l'équipe
**Afin de** maintenir la liste à jour quand l'équipe change

**Flow détaillé:**
1. La responsable accède à la section "Gestion" (accessible via paramètres ou menu)
2. Elle voit la liste des membres avec leur label/rôle
3. Elle peut ajouter un nouveau membre : nom + label (animateur, permanent, responsable matériel, etc.)
4. Elle peut modifier le label d'un membre existant
5. Elle peut retirer un membre (avec confirmation)

**Critères d'acceptation:**
- [ ] L'ajout d'un membre est immédiat et visible par tous
- [ ] Le retrait d'un membre ne supprime pas ses données historiques (logs, wishlists)
- [ ] Le label est un champ texte libre
- [ ] Cette section est réservée aux membres avec le label "responsable" (ou protégée par PIN)

**Edge cases:**
- Si on retire un membre qui est assigné à des samedis futurs → avertir et demander de réassigner d'abord
- Si on ajoute un membre en milieu de saison → il n'est pas automatiquement ajouté au planning existant

---

## 4. Data Model

### Entités principales

```
┌─────────────────┐       ┌─────────────────────┐       ┌──────────────────┐
│     members     │       │      seasons         │       │   saturday_slots │
├─────────────────┤       ├─────────────────────┤       ├──────────────────┤
│ id: text (PK)   │       │ id: text (PK)        │       │ id: text (PK)    │
│ name: text      │──┐    │ name: text           │──────<│ season_id: text  │
│ label: text     │  │    │ start_date: text     │       │ date: text       │
│ is_permanent: bo│  │    │ end_date: text       │       │ type: text       │
│ is_active: bool │  │    │ default_slots: int   │       │ event_label: text│
│ created_at: text│  │    │ created_at: text     │       │ required_count:  │
└─────────────────┘  │    └─────────────────────┘       │ is_closed: bool  │
                     │                                   └──────────────────┘
                     │                                          │
                     │    ┌─────────────────────┐               │
                     │    │   assignments       │               │
                     └───>├─────────────────────┤<──────────────┘
                          │ id: text (PK)        │
                          │ slot_id: text (FK)   │
                          │ member_id: text (FK) │
                          └─────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐
│   game_wishes       │       │   supply_needs      │
├─────────────────────┤       ├─────────────────────┤
│ id: text (PK)        │       │ id: text (PK)        │
│ name: text           │       │ name: text           │
│ link: text (null)    │       │ link: text (null)    │
│ price: real (null)   │       │ price: real (null)   │
│ added_by: text (FK)  │       │ category: text       │
│ is_purchased: bool   │       │ urgency: text        │
│ purchased_by: text   │       │ added_by: text (FK)  │
│ purchased_at: text   │       │ is_purchased: bool   │
│ created_at: text     │       │ purchased_by: text   │
└─────────────────────┘       │ purchased_at: text   │
                               │ created_at: text     │
                               └─────────────────────┘

┌─────────────────────┐
│   activity_log      │
├─────────────────────┤
│ id: text (PK)        │
│ type: text           │
│ description: text    │
│ actor_id: text (FK)  │
│ metadata: text (JSON)│
│ created_at: text     │
└─────────────────────┘
```

### Détail des tables

#### members
| Champ | Type | Contraintes | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK, ULID | Identifiant unique |
| name | TEXT | NOT NULL, UNIQUE | Nom affiché |
| label | TEXT | NULL | Rôle/fonction (animateur, responsable matériel, etc.) |
| is_permanent | BOOLEAN | DEFAULT false | Si true, assigné automatiquement à tous les samedis |
| is_active | BOOLEAN | DEFAULT true | Membre actif ou retiré (soft delete) |
| created_at | TEXT | DEFAULT now | ISO 8601 |

#### seasons
| Champ | Type | Contraintes | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK, ULID | Identifiant unique |
| name | TEXT | NOT NULL | Nom de la saison (ex: "2026-2027") |
| start_date | TEXT | NOT NULL | Date de début (ISO 8601, ex: "2026-08-01") |
| end_date | TEXT | NOT NULL | Date de fin (ISO 8601, ex: "2027-07-31") |
| default_slots | INTEGER | DEFAULT 2 | Nombre de personnes tournantes par samedi standard |
| created_at | TEXT | DEFAULT now | ISO 8601 |

#### saturday_slots
| Champ | Type | Contraintes | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK, ULID | Identifiant unique |
| season_id | TEXT | FK → seasons.id | Saison parente |
| date | TEXT | NOT NULL | Date du samedi (ISO 8601) |
| type | TEXT | DEFAULT "normal" | "normal", "event", "closed" |
| event_label | TEXT | NULL | Label de l'événement (ex: "Portes ouvertes") |
| required_count | INTEGER | NULL | Nombre de personnes requises (override du default) |
| is_closed | BOOLEAN | DEFAULT false | Fermeture (vacances, jour férié) |

#### assignments
| Champ | Type | Contraintes | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK, ULID | Identifiant unique |
| slot_id | TEXT | FK → saturday_slots.id | Samedi concerné |
| member_id | TEXT | FK → members.id | Membre assigné |
| UNIQUE(slot_id, member_id) | | | Un membre ne peut être assigné qu'une fois par samedi |

#### game_wishes
| Champ | Type | Contraintes | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK, ULID | Identifiant unique |
| name | TEXT | NOT NULL | Nom du jeu |
| link | TEXT | NULL | Lien d'achat |
| price | REAL | NULL | Prix estimé en CHF |
| added_by | TEXT | FK → members.id | Membre qui a proposé |
| is_purchased | BOOLEAN | DEFAULT false | Acheté ou non |
| purchased_by | TEXT | FK → members.id, NULL | Qui a marqué comme acheté |
| purchased_at | TEXT | NULL | Date d'achat (ISO 8601) |
| created_at | TEXT | DEFAULT now | ISO 8601 |

#### supply_needs
| Champ | Type | Contraintes | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK, ULID | Identifiant unique |
| name | TEXT | NOT NULL | Nom de l'article |
| link | TEXT | NULL | Lien d'achat |
| price | REAL | NULL | Prix estimé en CHF |
| category | TEXT | NOT NULL | "ménage", "bureau", "animation", "autre" |
| urgency | TEXT | DEFAULT "normal" | "normal" ou "urgent" |
| added_by | TEXT | FK → members.id | Membre qui a signalé |
| is_purchased | BOOLEAN | DEFAULT false | Acheté ou non |
| purchased_by | TEXT | FK → members.id, NULL | Qui a marqué comme acheté |
| purchased_at | TEXT | NULL | Date d'achat (ISO 8601) |
| created_at | TEXT | DEFAULT now | ISO 8601 |

#### activity_log
| Champ | Type | Contraintes | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK, ULID | Identifiant unique |
| type | TEXT | NOT NULL | "swap", "game_added", "game_purchased", "supply_added", "supply_purchased", "member_added", "member_removed", "season_created" |
| description | TEXT | NOT NULL | Description lisible ("Jonathan a échangé le 12/10 avec Alessia le 19/10") |
| actor_id | TEXT | FK → members.id | Membre qui a fait l'action |
| metadata | TEXT | NULL | JSON avec les détails supplémentaires |
| created_at | TEXT | DEFAULT now | ISO 8601 |

### Relations
- Un Season a plusieurs SaturdaySlots (1:N)
- Un SaturdaySlot a plusieurs Assignments (1:N)
- Un Member a plusieurs Assignments (1:N)
- Un Member a plusieurs GameWishes (1:N, via added_by)
- Un Member a plusieurs SupplyNeeds (1:N, via added_by)
- Un Member a plusieurs ActivityLogs (1:N, via actor_id)

---

## 5. Stack Technique

### Stack choisie pour ce projet
| Couche | Choix | Justification |
|--------|-------|---------------|
| Framework | SvelteKit | Stack habituelle, SSR + SPA, PWA-ready |
| Database | Turso (LibSQL) | SQLite hébergé, gratuit, pas de mise en veille, léger |
| ORM | Drizzle ORM | Type-safe, léger, excellent support SQLite/Turso |
| Auth | Aucune (identification locale) | localStorage pour l'identité, pas de système d'auth |
| Hosting | Vercel | Adapter SvelteKit officiel, déploiement instantané |
| Styling | Tailwind CSS + Melt UI | Tailwind pour le style minimaliste type Linear/Notion, Melt UI pour les composants headless accessibles (modals, dropdowns, tabs, etc.) |
| PWA | Vite PWA plugin (vite-plugin-pwa) | Service worker, manifest, installation mobile |
| IDs | ULID | Triables chronologiquement, compatibles texte |

### Dépendances clés
```json
{
  "dependencies": {
    "@sveltejs/kit": "latest",
    "@sveltejs/adapter-vercel": "latest",
    "@libsql/client": "latest",
    "drizzle-orm": "latest",
    "@melt-ui/svelte": "latest",
    "ulid": "latest"
  },
  "devDependencies": {
    "tailwindcss": "latest",
    "drizzle-kit": "latest",
    "vite-plugin-pwa": "latest",
    "@vite-pwa/sveltekit": "latest"
  }
}
```

---

## 6. Règles & Conventions

### Structure du projet
```
src/
├── lib/
│   ├── components/        # Composants réutilisables
│   │   ├── ui/            # Boutons, inputs, badges, modals
│   │   ├── planning/      # Composants du planning
│   │   ├── wishlist/      # Composants wishlist jeux
│   │   └── supplies/      # Composants matériel
│   ├── server/
│   │   ├── db.ts          # Client Turso + Drizzle
│   │   └── schema.ts      # Schéma Drizzle (toutes les tables)
│   ├── stores/            # Svelte stores (identité locale, etc.)
│   └── utils/             # Fonctions utilitaires (dates, formatage)
├── routes/
│   ├── +layout.svelte     # Layout principal avec navigation bottom tabs
│   ├── +page.svelte       # Page Planning (accueil)
│   ├── games/
│   │   └── +page.svelte   # Wishlist jeux
│   ├── supplies/
│   │   └── +page.svelte   # Liste matériel
│   ├── log/
│   │   └── +page.svelte   # Log des modifications
│   ├── settings/
│   │   └── +page.svelte   # Paramètres (changer identité, gérer membres/saisons)
│   └── api/               # Endpoints API
│       ├── members/
│       ├── seasons/
│       ├── planning/
│       ├── games/
│       ├── supplies/
│       └── log/
├── app.d.ts
└── service-worker.ts      # Service worker PWA
```

### Conventions de code

**Nommage:**
- Composants: PascalCase (`SlotCard.svelte`)
- Fichiers utilitaires: camelCase (`formatDate.ts`)
- Routes: kebab-case (`/game-wishes`)
- Variables/fonctions: camelCase
- Constantes: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase

**Patterns obligatoires:**
- Toujours typer les fonctions (paramètres + retour)
- Séparer la logique métier des composants UI
- Un composant = une responsabilité
- Error handling explicite (try/catch, pas de fail silencieux)
- Validation des inputs côté serveur ET client

**À éviter:**
- `any` en TypeScript (sauf cas exceptionnel documenté)
- Logique métier dans les composants
- Requêtes DB dans les composants (passer par server functions / API routes)
- Console.log en production
- Secrets en dur dans le code

### Gestion des erreurs

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getMembers(): Promise<Result<Member[]>> {
  try {
    const members = await db.select().from(membersTable).where(eq(membersTable.isActive, true));
    return { success: true, data: members };
  } catch (e) {
    return { success: false, error: 'Erreur lors du chargement des membres' };
  }
}
```

---

## 7. UI/UX Guidelines

### Style général
- **Minimaliste / Clean** — inspiration Linear, Notion, Folk CMS
- **Melt UI** pour les composants interactifs headless (modals, dropdowns, tabs, tooltips, etc.) — fournit l'accessibilité et le comportement, le style est entièrement custom via Tailwind
- Couleurs neutres (grays) avec une couleur primaire à définir
- Typographie : Inter ou System font stack
- Espacement généreux, pas de surcharge visuelle
- Icônes : Lucide Icons (léger, cohérent)

### Navigation
- **Bottom tab bar** (mobile-first) avec 4-5 onglets :
  1. 📅 Planning (accueil)
  2. 🎲 Jeux
  3. 📦 Matériel
  4. 📋 Log
  5. ⚙️ Paramètres
- Sur desktop : sidebar ou top nav, même structure

### Composants clés
| Composant | Description | Comportement |
|-----------|-------------|--------------|
| SlotCard | Carte d'un samedi dans le planning | Affiche date, membres, badge événement. Tap pour swap. |
| WishlistItem | Ligne d'un jeu/article | Nom, prix, badge statut, bouton "acheté" |
| LogEntry | Entrée de log | Icône type + description + timestamp |
| MemberPill | Pill avec nom du membre | Couleur différente si c'est "moi" |
| Badge | Tag pour événements/urgence | Variantes : event, closed, urgent |
| BottomNav | Barre de navigation mobile | 4-5 onglets avec icônes + labels |

### Responsive
- **Mobile-first** : design pensé d'abord pour écrans 375px+
- Breakpoints : sm (640px), md (768px), lg (1024px)
- Le planning est en liste verticale sur mobile, peut passer en grille/calendrier sur desktop

---

## 8. API & Intégrations

### Endpoints internes

| Method | Route | Description | Restriction |
|--------|-------|-------------|-------------|
| GET | /api/members | Liste des membres actifs | — |
| POST | /api/members | Ajouter un membre | Responsable |
| PUT | /api/members/[id] | Modifier un membre (label, statut) | Responsable |
| DELETE | /api/members/[id] | Désactiver un membre (soft delete) | Responsable |
| GET | /api/seasons | Liste des saisons | — |
| POST | /api/seasons | Créer une saison + générer planning | Responsable |
| GET | /api/planning/[seasonId] | Planning complet d'une saison | — |
| POST | /api/planning/swap | Effectuer un swap entre 2 samedis | — |
| GET | /api/games | Liste des jeux (wishlist) | — |
| POST | /api/games | Ajouter un jeu | — |
| PUT | /api/games/[id] | Modifier statut (acheté/non acheté) | — |
| GET | /api/supplies | Liste du matériel | — |
| POST | /api/supplies | Ajouter un besoin | — |
| PUT | /api/supplies/[id] | Modifier statut (acheté/non acheté) | — |
| GET | /api/log | Historique des modifications | — |

### Intégrations externes
| Service | Usage | Credentials needed |
|---------|-------|-------------------|
| Turso | Base de données SQLite | TURSO_DATABASE_URL, TURSO_AUTH_TOKEN |

---

## 9. Sécurité & Auth

### Authentification
- **Pas d'authentification formelle** — l'identité est stockée en localStorage côté client
- Le lien de l'app n'est partagé qu'en interne
- L'identité est envoyée en header ou en body des requêtes API (member_id)

### Autorisations
| Rôle | Permissions |
|------|-------------|
| Membre | Consulter le planning, faire des swaps, ajouter/marquer jeux et matériel, consulter le log |
| Responsable (label) | Tout ci-dessus + créer des saisons, gérer les membres |

### Protection des actions responsable
- Option A : Vérification côté serveur que le member_id a le label "responsable"
- Option B : PIN partagé pour les actions admin (plus simple, moins de friction)
- **Choix recommandé : Option A** (le label est déjà dans la DB, autant l'utiliser)

### Données sensibles
- Pas de données sensibles au sens RGPD/LPD (pas d'email, pas de mot de passe, juste des prénoms)
- Les données sont internes à l'équipe

---

## 10. Déploiement & Environnement

### Variables d'environnement
```env
# Database (Turso)
TURSO_DATABASE_URL=libsql://[db-name]-[account].turso.io
TURSO_AUTH_TOKEN=eyJ...

# App
PUBLIC_APP_NAME=LudoTools
```

### Environnements
| Env | URL | Database |
|-----|-----|----------|
| Local | localhost:5173 | SQLite local (fichier) |
| Prod | ludotools.vercel.app (ou custom) | Turso production |

### PWA Configuration
- **Manifest** : nom "LudoTools", short_name "LudoTools", theme_color à définir, display "standalone"
- **Service Worker** : cache des pages statiques pour consultation offline du planning
- **Icons** : icône simple à créer (peut être un emoji 🎲 stylisé)

---

## 11. Algorithme de génération du planning

### Logique de répartition

```
INPUT:
- Liste des samedis ouverts (excluant les fermetures)
- Liste des membres tournants actifs
- Nombre de slots par samedi (default_slots, ex: 2)
- Samedis spéciaux avec required_count custom

ALGORITHME:
1. Lister tous les samedis ouverts de la saison
2. Pour chaque samedi, déterminer le nombre de slots tournants :
   - Si événement avec required_count → utiliser required_count
   - Sinon → utiliser default_slots
3. Calculer le total de slots à remplir
4. Calculer le nombre idéal de samedis par membre (total_slots / nb_membres)
5. Répartir en round-robin ou aléatoire pondéré :
   - Assigner les membres un par un en priorisant ceux qui ont le moins de samedis
   - Éviter d'assigner la même personne 2 samedis consécutifs si possible
6. Assigner automatiquement les membres permanents à tous les samedis ouverts
7. Retourner le planning pour validation

CONTRAINTES:
- Écart max entre le membre avec le plus et le moins de samedis : 1
- Un membre ne peut pas être assigné 2 fois au même samedi
- Les membres permanents ne comptent pas dans le tournus
```

---

## 12. Questions ouvertes

- [ ] Couleur primaire de l'app à définir
- [ ] Nom de domaine custom ou ludotools.vercel.app suffit ?

### ✅ Résolues
- [x] Membres initiaux → ajout manuel via l'interface (pas de seed)
- [x] Catégories matériel → ménage, bureau, animation, autre (suffisant)
- [x] Protection actions responsable → vérification par label "responsable" en base (pas de PIN)

---

## 13. Changelog

| Date | Version | Changements |
|------|---------|-------------|
| 2026-03-24 | 1.0 | Création initiale |
| 2026-03-24 | 1.1 | Ajout Melt UI + Tailwind, résolution questions ouvertes (seed, catégories, protection responsable) |
