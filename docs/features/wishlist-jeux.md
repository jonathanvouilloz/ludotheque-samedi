# Epic 5 — Wishlist jeux

**Complexité** : S
**Statut** : TODO

## Description

Liste des jeux à acheter avec CRUD simple et historique des achats.

## Tâches

- [ ] API GET /api/games — liste des jeux
- [ ] API POST /api/games — ajouter un jeu
- [ ] API PUT /api/games/[id] — modifier statut (acheté/non acheté)
- [ ] UI liste des jeux (non achetés en premier)
- [ ] UI formulaire ajout (nom obligatoire, lien optionnel, prix optionnel)
- [ ] Bouton "Acheté" avec enregistrement de qui + quand
- [ ] Section historique "Déjà achetés"
- [ ] Possibilité d'annuler un marquage (remettre en "à acheter")
- [ ] Log automatique à chaque action
- [ ] WishlistItem component

## Edge cases

- Jeu avec même nom déjà dans la liste → avertir mais permettre (éditions différentes)
