# Guide de Debug WebSocket Chat

## 🔍 Diagnostic des problèmes WebSocket

### 1. **Vérifier la connexion WebSocket**

Dans la console du navigateur (F12), cherchez ces logs :

```
[WebSocket] Connexion à: https://api.educareschool.me/chat
[WebSocket] Connexion établie avec le serveur
[ChatStore] Initialisation du socket WebSocket
```

### 2. **Vérifier l'état de la connexion**

Dans la console, tapez :
```javascript
// Vérifier l'état du socket
window.chatStore = useChatStore();
window.chatStore.getSocketStatus();
```

Résultat attendu :
```javascript
{
  connected: true,
  id: "socket-id-123",
  transport: "websocket"
}
```

### 3. **Tester l'envoi de messages**

Logs attendus lors de l'envoi :
```
[ChatStore] Envoi de message: { chatId: "...", content: "..." }
[ChatStore] Nouveau message reçu: { chatId: "...", authorId: "...", content: "..." }
[ChatStore] Mise à jour conversation existante: chat-id-123
```

### 4. **Vérifier les événements WebSocket**

Dans Network tab > WS (WebSocket) :
- Voir les connexions WebSocket actives
- Vérifier les messages envoyés/reçus
- Status: 101 Switching Protocols

### 5. **Diagnostiquer les problèmes**

#### ❌ Problème : Messages non reçus
**Symptômes :**
- Messages envoyés mais pas reçus par l'autre personne
- Faut refresh pour voir les nouveaux messages
- "Aucun message" dans la liste des conversations

**Debug :**
```javascript
// Forcer la reconnexion
window.chatStore.forceReconnect();

// Rafraîchir manuellement
window.chatStore.refreshConversations();
```

#### ❌ Problème : Contacts dupliqués
**Symptômes :**
- Chaque contact apparaît 2 fois dans la liste
- Duplicatas lors de la création d'une conversation

**Debug :**
```javascript
// Vérifier les contacts
console.log(window.chatStore.contacts);
```

#### ❌ Problème : Erreur de connexion
**Symptômes :**
```
[WebSocket] Erreur de connexion: xhr poll error
```

**Solutions :**
1. Vérifier la configuration Traefik WebSocket
2. Vérifier les CORS du backend
3. Tester en mode polling force

### 6. **Configuration Traefik WebSocket**

Labels nécessaires dans docker-compose.swarm.yml :
```yaml
- "traefik.http.routers.nest.middlewares=websocket-headers"
- "traefik.http.middlewares.websocket-headers.headers.customrequestheaders.Connection=Upgrade"
- "traefik.http.middlewares.websocket-headers.headers.customrequestheaders.Upgrade=websocket"
- "traefik.http.routers.nest-websocket.rule=Host(`api.educareschool.me`) && PathPrefix(`/socket.io/`)"
```

### 7. **Fallback en cas d'échec**

Le système a un fallback automatique :
- Si WebSocket échoue, fallback sur polling
- Si message temporaire non confirmé, refresh API
- Timer de 5 secondes pour cleanup

### 8. **Commandes utiles**

```bash
# Vérifier les logs du backend
docker service logs educare_nest --tail=50

# Vérifier les logs du frontend  
docker service logs educare_frontend --tail=50

# Redémarrer les services
docker service update --force educare_nest
docker service update --force educare_frontend

# Déployer avec le script
./deploy-websocket-fix.sh
```

### 9. **URLs de test**

- Frontend : https://educareschool.me
- Backend API : https://api.educareschool.me
- WebSocket : wss://api.educareschool.me/socket.io/

### 10. **Logs côté serveur**

Logs attendus côté backend :
```
[INFO] Connexion WebSocket établie pour user userId (1/3 connexions)
[INFO] User userId a rejoint chat chatId (1/10 rooms)
```

## 🚀 Déploiement des corrections

```bash
./deploy-websocket-fix.sh
```

## 📞 Support

Si les problèmes persistent :
1. Vérifier les logs complets
2. Tester en local pour comparaison
3. Vérifier la configuration réseau/firewall
4. Tester avec différents navigateurs 