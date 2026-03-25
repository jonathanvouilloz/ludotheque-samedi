# Epic 4 — Swaps

**Complexité** : M
**Statut** : TODO

## Description

Échange de samedis entre membres, instantané et sans approbation.

## Tâches

- [ ] API POST /api/planning/swap — effectuer un swap
- [ ] UI flow : tap sur un samedi → sélectionner samedi cible + membre
- [ ] Mise à jour simultanée des deux samedis
- [ ] Création d'un log automatique
- [ ] Rafraîchissement du planning pour tous (polling ou invalidation)
- [ ] Bloquer swap sur samedi de fermeture
- [ ] Bloquer swap si déjà assigné au samedi cible
- [ ] Bloquer Gabriel (permanent) de swapper
- [ ] Avertissement si le samedi cible a un required_count différent

## Edge cases

- Swap avec soi-même → bloquer
- Swap d'un samedi passé → bloquer
- Concurrence (2 swaps simultanés sur le même samedi) → gérer côté DB
