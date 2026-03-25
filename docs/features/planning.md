# Epic 3 — Planning & saisons

**Complexité** : L
**Statut** : TODO

## Description

Feature principale : création de saisons, algorithme de répartition équitable, et vue du planning.

## Tâches

### Création de saison (responsable)
- [ ] API POST /api/seasons — créer une saison
- [ ] UI formulaire : période (début/fin), sélection membres tournus, slots par défaut
- [ ] Listing automatique de tous les samedis de la période
- [ ] UI sélection des samedis de fermeture (calendrier interactif)
- [ ] UI marquage événements spéciaux (type + required_count)
- [ ] Sélection des membres participants au tournus

### Algorithme de répartition
- [ ] Implémentation round-robin pondéré
- [ ] Assignation automatique des permanents
- [ ] Contrainte : écart max 1 samedi entre membres
- [ ] Contrainte : éviter 2 samedis consécutifs pour un même membre
- [ ] Support required_count custom pour événements
- [ ] Affichage du planning généré pour validation
- [ ] Possibilité d'ajuster manuellement avant validation
- [ ] Possibilité de régénérer

### Vue planning
- [ ] API GET /api/planning/[seasonId]
- [ ] API GET /api/seasons — liste des saisons
- [ ] Prochain samedi mis en avant
- [ ] Liste chronologique de tous les samedis
- [ ] Mise en évidence des samedis de l'utilisateur connecté
- [ ] Samedis passés visuellement atténués
- [ ] Badges événements spéciaux / fermetures
- [ ] Sélecteur de saison (dropdown)
- [ ] SlotCard component

## Edge cases

- Aucune saison → message invitant la responsable à en créer une
- Saison terminée → message + lien vers anciennes saisons
- Période qui chevauche une saison existante → avertir
- Nombre de samedis non divisible → écart max 1
