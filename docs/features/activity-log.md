# Epic 7 — Log des modifications

**Complexité** : S
**Statut** : TODO

## Description

Historique visible de toutes les modifications (swaps, ajouts, achats, gestion membres).

## Tâches

- [ ] API GET /api/log — historique paginé
- [ ] UI page log (liste chronologique, récent en premier)
- [ ] LogEntry component (icône type + description + timestamp)
- [ ] Badge "nouvelles modifications" basé sur dernière visite (localStorage)
- [ ] Types de log : swap, game_added, game_purchased, supply_added, supply_purchased, member_added, member_removed, season_created
- [ ] Chaque action significative crée automatiquement une entrée

## Notes

- Le log est créé côté serveur dans chaque endpoint API concerné
- Le badge se base sur `lastVisitedLog` stocké en localStorage
