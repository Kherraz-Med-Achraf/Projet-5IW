# Blog Feature - Tests Documentation

## 📋 Vue d'ensemble

Cette documentation décrit la suite de tests complète pour la feature blog de l'application APAJH. Les tests couvrent tous les aspects de la fonctionnalité : unités, intégration, sécurité et validation.

## 🧪 Types de tests

### 1. Tests unitaires

#### BlogService (`blog.service.spec.ts`)
- **Couverture** : 100% des méthodes du service
- **Mocks** : PrismaService, AiService
- **Tests** :
  - ✅ Création de posts (Secretary, Director, Service Manager)
  - ✅ Récupération de tous les posts (tri chronologique)
  - ✅ Récupération d'un post par ID
  - ✅ Gestion des réactions (ajout, suppression, modification)
  - ✅ Mise à jour de posts (auteur uniquement)
  - ✅ Suppression de posts (permissions basées sur les rôles)
  - ✅ Formatage des auteurs multi-profils
  - ✅ Comptage des réactions

#### BlogController (`blog.controller.spec.ts`)
- **Couverture** : 100% des endpoints
- **Mocks** : BlogService, Guards
- **Tests** :
  - ✅ Création avec/sans fichiers
  - ✅ Upload d'images et vidéos
  - ✅ Validation des types de fichiers
  - ✅ Gestion des permissions (decorators)
  - ✅ Réponses HTTP appropriées

#### DTOs (`dto/create-blog-post.dto.spec.ts`)
- **Couverture** : Validation complète
- **Tests** :
  - ✅ Validation des champs requis
  - ✅ Limites de longueur (titre: 200, description: 2000)
  - ✅ Types de médias valides (IMAGE, VIDEO)
  - ✅ Types de réactions valides (LIKE, HEART, SMILE, CLAP, PARTY)
  - ✅ Gestion des caractères Unicode
  - ✅ Cas limites et edge cases

### 2. Tests d'intégration E2E

#### Tests complets (`test/blog.e2e-spec.ts`)
- **Base de données** : PostgreSQL de test
- **Authentification** : JWT réels
- **Tests** :
  - ✅ Workflow complet CRUD
  - ✅ Permissions par rôle
  - ✅ Upload de fichiers réels
  - ✅ Sécurité des uploads
  - ✅ Validation des données
  - ✅ Gestion des erreurs

## 🚀 Commandes de test

```bash
# Tous les tests
npm test -- --verbose

# Tests unitaires uniquement
npm test -- --testPathPattern="spec.ts" --verbose

# Tests E2E uniquement
npm test -- --testPathPattern="e2e-spec.ts" --verbose

# Tests avec couverture
npm run test:cov

# Tests en mode watch
npm run test:watch

# Tests spécifiques au blog
npm test -- --testPathPattern="blog" --verbose
```

## 📊 Couverture de tests

### Métriques cibles
- **Lignes** : > 95%
- **Fonctions** : 100%
- **Branches** : > 90%
- **Déclarations** : > 95%

### Zones couvertes
- ✅ Logique métier (BlogService)
- ✅ Endpoints API (BlogController)
- ✅ Validation des données (DTOs)
- ✅ Permissions et sécurité
- ✅ Upload de fichiers
- ✅ Gestion des erreurs
- ✅ Formatage des réponses

## 🔒 Tests de sécurité

### Authentification
- ✅ Rejet des requêtes non authentifiées
- ✅ Validation des tokens JWT
- ✅ Expiration des sessions

### Autorisation
- ✅ Permissions basées sur les rôles
- ✅ Vérification propriétaire pour modifications
- ✅ Restrictions d'accès par endpoint

### Upload de fichiers
- ✅ Validation des types MIME
- ✅ Vérification des extensions
- ✅ Limites de taille (50MB)
- ✅ Rejet des fichiers dangereux

### Validation des données
- ✅ Sanitisation des entrées
- ✅ Limites de longueur
- ✅ Types de données appropriés
- ✅ Protection contre l'injection

## 🎯 Scénarios de test

### Workflow utilisateur complet
1. **Création** : Secretary/Director/Service Manager crée un post
2. **Consultation** : Tous les utilisateurs voient les posts
3. **Réaction** : Parents ajoutent des émojis
4. **Modification** : Auteur modifie son post
5. **Suppression** : Permissions hiérarchiques

### Cas d'erreur
- ✅ Posts inexistants (404)
- ✅ Permissions insuffisantes (403)
- ✅ Données invalides (400)
- ✅ Fichiers non autorisés (400)
- ✅ Utilisateur non authentifié (401)

### Performance
- ✅ Tri chronologique efficace
- ✅ Comptage des réactions optimisé
- ✅ Requêtes avec inclusions appropriées

## 🛠️ Configuration des tests

### Base de données de test
```typescript
// Utilise une base PostgreSQL séparée
DATABASE_URL="postgresql://test:test@localhost:5433/blog_test"
```

### Mocks et fixtures
- **PrismaMock** : Simulation complète de la base
- **AiServiceMock** : Réponses IA prédictibles
- **JwtMock** : Tokens de test valides
- **FileMock** : Fichiers de test temporaires

### Variables d'environnement
```bash
NODE_ENV=test
JWT_SECRET=test-secret
DATABASE_URL=postgresql://test:test@localhost:5433/blog_test
```

## 📈 Métriques de qualité

### Complexité cyclomatique
- **BlogService** : < 10 par méthode
- **BlogController** : < 5 par endpoint
- **DTOs** : < 3 par validation

### Maintenabilité
- **Code dupliqué** : < 3%
- **Longueur des méthodes** : < 50 lignes
- **Couplage** : Faible (mocks efficaces)

## 🔄 Intégration CI/CD

### Pipeline de tests
1. **Lint** : Vérification du code
2. **Unit** : Tests unitaires
3. **Integration** : Tests E2E
4. **Coverage** : Rapport de couverture
5. **Security** : Audit de sécurité

### Critères de succès
- ✅ Tous les tests passent
- ✅ Couverture > 95%
- ✅ Aucune vulnérabilité critique
- ✅ Performance acceptable

## 📝 Bonnes pratiques

### Nommage des tests
```typescript
describe('BlogService', () => {
  describe('createPost', () => {
    it('should create post with secretary author', async () => {
      // Test implementation
    });
  });
});
```

### Structure AAA (Arrange, Act, Assert)
```typescript
it('should toggle reaction successfully', async () => {
  // Arrange
  const postId = 'test-post';
  const userId = 'test-user';
  const dto = { type: ReactionType.LIKE };

  // Act
  const result = await service.toggleReaction(postId, userId, dto);

  // Assert
  expect(result.message).toBe('Réaction ajoutée');
});
```

### Isolation des tests
- Chaque test est indépendant
- Nettoyage après chaque test
- Pas d'état partagé

## 🚨 Gestion des erreurs

### Types d'erreurs testées
- **NotFoundException** : Ressource introuvable
- **ForbiddenException** : Permissions insuffisantes
- **BadRequestException** : Données invalides
- **UnauthorizedException** : Non authentifié

### Validation des messages
```typescript
expect(error).toBeInstanceOf(NotFoundException);
expect(error.message).toBe('Post introuvable');
```

## 📚 Ressources

### Documentation
- [Jest Documentation](https://jestjs.io/docs)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)

### Outils
- **Jest** : Framework de test
- **Supertest** : Tests HTTP
- **class-validator** : Validation des DTOs
- **@nestjs/testing** : Utilitaires NestJS

---

*Cette documentation est maintenue à jour avec chaque modification de la feature blog.* 