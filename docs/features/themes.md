# Epic 12 — Thèmes & Check-ups espace animation

## Statut : DONE

## Objectif
Tracker l'état des objets dans les boîtes à thèmes de l'espace animation. Thèmes réutilisables, check-ups réguliers, résolution des problèmes.

## Tâches

- [x] 5 tables DB : `themes`, `theme_items`, `theme_periods`, `checkups`, `checkup_entries`
- [x] API REST complète (10 routes sous `/api/themes/`)
- [x] Page `/themes` : thème actif, problèmes en cours, panel items avec édition inline, historique
- [x] Page `/themes/checkup/new` : formulaire avec statuts par objet (présent/cassé/perdu/à rajouter) + suggestions
- [x] Page `/themes/checkup/[id]` : 3 sections (problèmes résolvables, suggestions "ajouter à la liste", objets OK collapsible)
- [x] Résolution inline : `resolvedAt`, `resolvedBy`, `resolutionType` sur `checkupEntries`
- [x] Modal "Changement de thème" : choisir existant ou créer nouveau avec items
- [x] Layout : onglet "Thèmes" + badge orange problèmes non résolus
- [x] Migration DB appliquée

## Décisions clés
- Thèmes réutilisables via `themePeriods` — une période par installation
- Résolution directement sur `checkupEntries` (pas de table séparée)
- `needs_more` = quantité insuffisante d'un item existant (résolution: "Complété")
- `suggestion` = nouvel objet à ajouter (bouton "Ajouter à la liste" → crée un `themeItem`)

## Commit : `361c04f`
