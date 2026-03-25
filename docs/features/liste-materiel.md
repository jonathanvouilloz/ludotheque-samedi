# Epic 6 — Liste matériel/fournitures

**Complexité** : S
**Statut** : TODO

## Description

Liste des besoins en matériel avec catégories et niveaux d'urgence.

## Tâches

- [ ] API GET /api/supplies — liste du matériel
- [ ] API POST /api/supplies — ajouter un besoin
- [ ] API PUT /api/supplies/[id] — modifier statut
- [ ] UI liste triée par urgence puis date
- [ ] UI formulaire ajout (nom, catégorie, urgence, lien optionnel, prix optionnel)
- [ ] Catégories prédéfinies : ménage, bureau, animation, autre
- [ ] Badge urgent visuellement distinct (rouge)
- [ ] Bouton "Acheté" + historique
- [ ] Possibilité d'annuler un marquage
- [ ] Log automatique à chaque action

## Edge cases

- Catégorie "autre" avec champ texte libre si aucune ne correspond
