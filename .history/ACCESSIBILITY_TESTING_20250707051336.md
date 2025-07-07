# Guide de Test d'Accessibilité - Vues DIRECTOR et SERVICE_MANAGER

## Vue d'ensemble

Ce guide explique comment tester l'accessibilité des nouvelles pages d'accueil pour les rôles DIRECTOR et SERVICE_MANAGER, en particulier pour la navigation au clavier et la compatibilité avec les lecteurs d'écran comme VoiceOver.

## Fonctionnalités Testées

### Fonctionnalités DIRECTOR
- ✅ **Statistiques du blog** : Affichage des articles publiés cette semaine
- ✅ **Statistiques des événements** : Nombre d'événements à venir et d'inscriptions
- ✅ **Aperçu des présences** : Présences du jour
- ✅ **Invitation de parent** : Formulaire d'invitation par email

### Fonctionnalités SERVICE_MANAGER
- ✅ **Statistiques du blog** : Affichage des articles publiés cette semaine
- ✅ **Statistiques des événements** : Nombre d'événements à venir et d'inscriptions
- ✅ **Aperçu des présences** : Présences du jour
- ✅ **Invitation de parent** : Formulaire d'invitation par email

### Fonctionnalités SECRETARY
- ✅ **Statistiques du blog** : Affichage des articles publiés cette semaine
- ✅ **Aperçu des présences** : Présences du jour

## Tests d'Accessibilité

### 1. Navigation au Clavier

#### Test des Skip Links
1. Chargez la page d'accueil avec un compte DIRECTOR, SERVICE_MANAGER ou SECRETARY
2. Appuyez sur `Tab` pour naviguer
3. Vérifiez que les skip links apparaissent selon le rôle :

   **DIRECTOR et SERVICE_MANAGER :**
   - "Aller au contenu principal"
   - "Aller aux statistiques du blog"
   - "Aller aux statistiques des événements"
   - "Aller à l'aperçu des présences"
   - "Aller à l'invitation de parent"

   **SECRETARY :**
   - "Aller au contenu principal"
   - "Aller aux statistiques du blog"
   - "Aller à l'aperçu des présences"

4. Appuyez sur `Entrée` sur chaque skip link pour vérifier qu'ils fonctionnent

#### Test de Navigation Séquentielle
1. Utilisez `Tab` pour naviguer vers l'avant
2. Utilisez `Shift + Tab` pour naviguer vers l'arrière
3. Vérifiez que tous les éléments interactifs sont accessibles :
   - Boutons d'action
   - Champs de formulaire
   - Liens

#### Test du Formulaire d'Invitation
1. Naviguez jusqu'au formulaire d'invitation
2. Vérifiez que le champ email est focusable avec `Tab`
3. Saisissez une adresse email
4. Appuyez sur `Entrée` pour soumettre le formulaire
5. Vérifiez que le bouton "Envoyer l'invitation" est accessible

### 2. Tests VoiceOver (macOS)

#### Activation de VoiceOver
1. Appuyez sur `Cmd + F5` pour activer VoiceOver
2. Ou allez dans Préférences Système > Accessibilité > VoiceOver

#### Test de Lecture de Page
1. Utilisez `Control + Option + A` pour lire toute la page
2. Vérifiez que tous les éléments sont correctement annoncés :
   - Titre de la page
   - Sections et leurs titres
   - Boutons et leurs fonctions
   - Valeurs des statistiques et leurs labels

#### Test de Navigation par Titre
1. Utilisez `Control + Option + Cmd + H` pour naviguer par titres
2. Vérifiez la hiérarchie des titres :
   - H1 : Titre principal de la page
   - H2 : Titres des sections
3. Vérifiez que la structure est logique

#### Test de Navigation par Formulaire
1. Utilisez `Control + Option + Cmd + J` pour naviguer par éléments de formulaire
2. Vérifiez que les champs sont correctement labellisés
3. Vérifiez que les instructions d'aide sont lues

#### Test de Navigation par Liens et Boutons
1. Utilisez `Control + Option + Cmd + L` pour les liens
2. Utilisez `Control + Option + Cmd + B` pour les boutons
3. Vérifiez que chaque élément a un nom descriptif

### 3. Tests Automatisés

#### Exécution des Tests
```bash
# Naviguer vers le dossier frontend
cd frontend

# Exécuter les tests d'accessibilité
npm run test:accessibility

# Ou exécuter les tests spécifiques
npm run test -- --grep "Accessibility Tests for Home Views"
```

#### Tests Inclus
- Vérification des skip links
- Validation des ARIA labels et rôles
- Test des éléments de formulaire accessibles
- Vérification de la hiérarchie des titres
- Test des live regions pour les messages
- Vérification du contraste des couleurs

### 4. Checklist d'Accessibilité

#### Structure et Sémantique
- [ ] Les skip links sont présents et fonctionnels
- [ ] La hiérarchie des titres est correcte (H1 → H2 → H3)
- [ ] Les sections utilisent des éléments `<section>` sémantiques
- [ ] L'élément `<main>` est présent et unique
- [ ] L'attribut `lang="fr"` est défini

#### Formulaires
- [ ] Tous les champs ont des labels associés
- [ ] Les champs requis sont marqués avec `required`
- [ ] Les instructions d'aide sont liées avec `aria-describedby`
- [ ] Les messages d'erreur sont dans des live regions

#### Navigation
- [ ] Tous les éléments interactifs sont accessibles au clavier
- [ ] L'ordre de tabulation est logique
- [ ] Les éléments focusés ont un indicateur visuel
- [ ] Les boutons désactivés ont `aria-disabled="true"`

#### Contenu Multimédia
- [ ] Les icônes décoratives ont `aria-hidden="true"`
- [ ] Les images fonctionnelles ont des textes alternatifs
- [ ] Les animations respectent `prefers-reduced-motion`

#### Messages et Feedback
- [ ] Les messages de succès utilisent `aria-live="polite"`
- [ ] Les messages d'erreur utilisent `aria-live="assertive"`
- [ ] Les états de chargement sont annoncés

### 5. Outils de Test Recommandés

#### Extensions Navigateur
- **axe DevTools** : Audit d'accessibilité automatisé
- **WAVE** : Évaluation de l'accessibilité web
- **Lighthouse** : Audit de performance et d'accessibilité

#### Outils en Ligne de Commande
- **axe-core** : Tests automatisés d'accessibilité
- **pa11y** : Validation d'accessibilité en ligne de commande

#### Lecteurs d'Écran
- **VoiceOver** (macOS) : Lecteur d'écran intégré
- **NVDA** (Windows) : Lecteur d'écran gratuit
- **JAWS** (Windows) : Lecteur d'écran professionnel

### 6. Problèmes Courants et Solutions

#### Problème : Skip Links Non Visibles
**Solution** : Vérifiez que les skip links deviennent visibles au focus
```css
.skip-link:focus {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  padding: 0.5rem;
  background: #000;
  color: #fff;
}
```

#### Problème : Statistiques Non Annoncées
**Solution** : Associez les valeurs avec leurs labels
```html
<div class="stat-content">
  <div class="stat-value" aria-describedby="stat-label-1">42</div>
  <div class="stat-label" id="stat-label-1">Articles publiés</div>
</div>
```

#### Problème : Formulaire Non Accessible
**Solution** : Vérifiez les associations label-input
```html
<label for="email-input">Adresse e-mail</label>
<input id="email-input" type="email" aria-describedby="email-help" />
<div id="email-help">Format : utilisateur@exemple.com</div>
```

### 7. Critères de Réussite

#### Niveau A (Minimum)
- Navigation au clavier complète
- Textes alternatifs pour les images
- Labels pour les formulaires
- Contraste minimum 3:1

#### Niveau AA (Recommandé)
- Contraste 4.5:1 pour le texte normal
- Contraste 3:1 pour le texte large
- Pas de contenu clignotant
- Taille de cible minimum 44px

#### Niveau AAA (Excellent)
- Contraste 7:1 pour le texte normal
- Contraste 4.5:1 pour le texte large
- Pas de limite de temps
- Aide contextuelle disponible

### 8. Ressources Supplémentaires

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Articles](https://webaim.org/articles/)
- [A11Y Project](https://www.a11yproject.com/)

### 9. Contact et Support

Pour toute question sur l'accessibilité ou pour signaler des problèmes :
- Créer une issue dans le repository
- Contacter l'équipe de développement
- Consulter la documentation technique

---

*Ce guide est maintenu à jour avec les dernières pratiques d'accessibilité web. Dernière mise à jour : Janvier 2025* 