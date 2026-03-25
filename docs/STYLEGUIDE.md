# Guide de style — LudoTools

## Design

- **Style** : Minimaliste / Clean — inspiration Linear, Notion, Folk CMS
- **Couleur primaire** : Bleu roi (`#1e40af` / blue-800 pour le principal, `#2563eb` / blue-600 pour les accents/hover)
- **Typographie** : Inter ou System font stack
- **Icônes** : Lucide Icons
- **Espacement** : Généreux, pas de surcharge visuelle

## Navigation

- **Mobile** : Bottom tab bar (5 onglets : Planning, Jeux, Matériel, Log, Paramètres)
- **Desktop** : Sidebar ou top nav, même structure

## Responsive

- Mobile-first : design pour 375px+
- Breakpoints : sm (640px), md (768px), lg (1024px)
- Planning en liste verticale sur mobile, grille/calendrier possible sur desktop

## Nommage

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Composants Svelte | PascalCase | `SlotCard.svelte` |
| Fichiers utilitaires | camelCase | `formatDate.ts` |
| Routes | kebab-case | `/game-wishes` |
| Variables / fonctions | camelCase | `getMemberName()` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_SLOTS_PER_DAY` |
| Types / Interfaces | PascalCase | `SaturdaySlot` |

## Patterns

### Error handling

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Structure des composants

- Un composant = une responsabilité
- Logique métier dans `$lib/server/` ou `$lib/utils/`
- Pas de requêtes DB dans les composants

### Commits

Format Conventional Commits :
- `feat(planning): add slot card component`
- `fix(api): handle null response from server`
- `docs: update README with setup instructions`
- `refactor(db): simplify query logic`
- `chore: update dependencies`

## Composants clés

| Composant | Usage |
|-----------|-------|
| `SlotCard` | Carte d'un samedi (date, membres, badge événement) |
| `WishlistItem` | Ligne jeu/article (nom, prix, statut, bouton acheté) |
| `LogEntry` | Entrée de log (icône + description + timestamp) |
| `MemberPill` | Pill avec nom membre (couleur différente si "moi") |
| `Badge` | Tag événements/urgence (event, closed, urgent) |
| `BottomNav` | Barre navigation mobile (5 onglets) |
