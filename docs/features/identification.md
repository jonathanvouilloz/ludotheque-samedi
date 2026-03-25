# Epic 2 — Identification & gestion des membres

**Complexité** : S
**Statut** : TODO

## Description

Système d'identification légère (sélection de nom au premier lancement) et CRUD des membres pour la responsable.

## Tâches

### Identification
- [ ] Écran de sélection du nom (première visite)
- [ ] Stocker l'identité en localStorage (member_id)
- [ ] Rediriger vers Planning après sélection
- [ ] Gérer le cas localStorage vidé (re-afficher sélection)
- [ ] Gérer le cas membre supprimé (message + re-sélection)
- [ ] Option de changer son identité dans les paramètres

### Gestion des membres (responsable)
- [ ] API GET /api/members — liste des membres actifs
- [ ] API POST /api/members — ajouter un membre
- [ ] API PUT /api/members/[id] — modifier label/statut
- [ ] API DELETE /api/members/[id] — soft delete (is_active = false)
- [ ] UI liste des membres dans Settings
- [ ] UI formulaire ajout/modification
- [ ] Vérification côté serveur que l'actor est "responsable"
- [ ] Avertissement si on retire un membre assigné à des samedis futurs

## Edge cases

- Membre supprimé mais encore identifié localement → détecter et forcer re-sélection
- Ajout d'un membre en milieu de saison → pas d'ajout auto au planning
