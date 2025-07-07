# Modifications de sécurité pour la route /register et la page Privacy

## Changements apportés

### 1. Route `/register` - Accès sécurisé par invitation uniquement

**Comportement implémenté :**
- **Si utilisateur connecté** : Redirection automatique vers `/home`
- **Si utilisateur non connecté SANS token d'invitation** : Redirection vers `/login`
- **Si utilisateur non connecté AVEC token valide** : Accès autorisé à l'inscription

**Implémentation :**
- Nouvelle logique dans `frontend/src/router/index.ts` ligne ~340
- Vérification du token dans la query string (`?token=...`)
- Protection contre l'accès direct sans invitation

### 2. Page Privacy - Accessible sans connexion

**Comportement implémenté :**
- Page accessible même sans être connecté
- **Sidebar masquée** quand l'utilisateur n'est pas connecté
- Interface épurée pour les visiteurs non connectés

**Implémentation :**
- Modification dans `frontend/src/App.vue`
- Ajout de vérifications d'authentification pour l'affichage de la sidebar
- Condition spéciale pour la route `/privacy`

## Fonctionnalités de sécurité

### Token d'invitation
- Les tokens sont validés côté serveur via `/invitations/validate/:token`
- Redirection automatique vers `/login` si le token est invalide ou expiré
- Email pré-rempli et verrouillé lors d'une inscription par invitation

### Contrôle d'accès
```typescript
// Logique dans le router guard
if (to.path.startsWith('/register')) {
  if (auth.isAuthenticated) {
    return next({ name: "Home" }); // Déjà connecté
  }
  
  if (!token) {
    return next({ name: "Login" }); // Pas de token
  }
  
  return next(); // Token présent, accès autorisé
}
```

### Gestion de la sidebar
```typescript
// Logique dans App.vue
const showSidebar = computed(() => {
  // Masquer si pas connecté
  if (!auth.isAuthenticated) {
    return false;
  }
  
  // Masquer sur privacy si pas connecté
  if (path === "/privacy" && !auth.isAuthenticated) {
    return false;
  }
  
  return true;
});
```

## Test des fonctionnalités

### Test 1 - Accès direct à /register (connecté)
1. Se connecter avec un compte
2. Naviguer vers `/register`
3. **Résultat attendu** : Redirection vers `/home`

### Test 2 - Accès direct à /register (non connecté)
1. Se déconnecter
2. Naviguer vers `/register`
3. **Résultat attendu** : Redirection vers `/login`

### Test 3 - Accès via lien d'invitation
1. Utiliser un lien d'invitation valide : `/register?token=VALID_TOKEN`
2. **Résultat attendu** : Accès au formulaire d'inscription

### Test 4 - Page Privacy sans connexion
1. Se déconnecter
2. Naviguer vers `/privacy`
3. **Résultat attendu** : Page accessible sans sidebar

## Sécurité renforcée

✅ **Inscription uniquement sur invitation**
✅ **Pas d'accès direct à /register sans token**
✅ **Redirection automatique des utilisateurs connectés**
✅ **Interface adaptée pour les pages publiques**
✅ **Validation des tokens côté serveur**

## Compatibilité

- Compatible avec l'ancien système d'inscription par invitation
- Utilise le même store `useRegisterStore`
- Même API backend (`/auth/register-by-invite`)
- Même validation de tokens (`/invitations/validate/:token`) 