# Plan d'exécution — LudoTools

## Epics

| # | Epic | Complexité | Statut | Détail |
|---|------|-----------|--------|--------|
| 1 | Setup projet | M | DONE | [setup.md](features/setup.md) |
| 2 | Identification & membres | S | DONE | [identification.md](features/identification.md) |
| 3 | Planning & saisons | L | DONE | [planning.md](features/planning.md) |
| 4 | Swaps | M | DONE | [swaps.md](features/swaps.md) |
| 5 | Wishlist jeux | S | DONE | [wishlist-jeux.md](features/wishlist-jeux.md) |
| 6 | Liste matériel | S | DONE | [liste-materiel.md](features/liste-materiel.md) |
| 7 | Log des modifications | S | DONE | [activity-log.md](features/activity-log.md) |
| 8 | PWA & offline | S | DONE | [pwa.md](features/pwa.md) |
| 9 | Polish & responsive | S | DONE | [polish.md](features/polish.md) |
| 10 | Calendrier interne (vacances membres + événements + accueils) | XL | DONE | [calendrier.md](features/calendrier.md) |
| 11 | Propositions partenaires (remplacement Excel) | L | DONE | [proposals.md](features/proposals.md) |

## Ordre d'exécution recommandé

1. **Epic 1 — Setup** : fondations (SvelteKit, DB, Tailwind, structure)
2. **Epic 2 — Identification** : sélection de nom + gestion membres (nécessaire pour tout le reste)
3. **Epic 3 — Planning** : feature principale (création saison, algo répartition, vue planning)
4. **Epic 4 — Swaps** : échanges entre membres (dépend du planning)
5. **Epic 5 — Wishlist jeux** : indépendant du planning, simple CRUD
6. **Epic 6 — Liste matériel** : très similaire à la wishlist, avec catégories/urgence
7. **Epic 7 — Log** : transversal, peut être implémenté en parallèle ou après les features
8. **Epic 8 — PWA** : service worker, manifest, cache offline
9. **Epic 9 — Polish** : responsive desktop, animations, edge cases

## Prochaines étapes

- [x] ~~Démarrer Epic 1 : initialiser SvelteKit + dépendances~~
- [x] ~~Démarrer Epic 2 : identification & gestion des membres~~
- [x] ~~Démarrer Epic 3 : planning & saisons~~
- [x] ~~Démarrer Epic 4 : swaps~~
- [x] ~~Démarrer Epics 5+6 : wishlist jeux + liste matériel~~
- [x] ~~Démarrer Epic 7 : log des modifications~~
- [x] ~~Démarrer Epic 8 : PWA & offline~~
- [x] ~~Démarrer Epic 9 : Polish & responsive~~
- **PROJET V1 TERMINÉ**
