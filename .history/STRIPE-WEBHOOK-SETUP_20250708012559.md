# 🎯 Configuration Webhooks Stripe - Guide Complet

## 📋 **Événements à configurer dans Stripe Dashboard**

### **URL du webhook :**
```
https://api.educareschool.me/stripe/webhooks
```

### **Événements obligatoires à sélectionner :**

#### 🎯 **Critiques (obligatoires)**
- ✅ `checkout.session.completed` - Confirmation de paiement
- ✅ `checkout.session.expired` - Sessions expirées
- ✅ `payment_intent.payment_failed` - Échecs de paiement

#### ⚠️ **Recommandés (fortement conseillés)**  
- ✅ `payment_intent.canceled` - Paiements annulés
- ✅ `payment_intent.requires_action` - Actions requises (3D Secure)
- ✅ `charge.dispute.created` - Contestations/chargebacks

#### 📊 **Optionnels (pour monitoring)**
- ✅ `payment_intent.succeeded` - Logs de succès

## 🔧 **Étapes de configuration**

### **1. Dans Stripe Dashboard**
1. Connecte-toi à [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Developers** → **Webhooks** → **Add endpoint**
3. **URL :** `https://api.educareschool.me/stripe/webhooks`
4. **Événements :** Sélectionne tous les événements listés ci-dessus
5. **Créer l'endpoint**
6. **Récupérer le secret :** Clique sur l'endpoint → **Signing secret** → **Reveal**
7. **Copie** la valeur qui commence par `whsec_...`

### **2. Sur ton serveur**
```bash
# Se connecter au serveur
ssh root@p5iw-droplet

# Créer le secret webhook
echo "whsec_TON_SECRET_WEBHOOK" | docker secret create stripe_webhook_secret -

# Vérifier
docker secret ls | grep stripe_webhook_secret

# Redéployer le service pour prendre en compte le secret
docker service update --force projet5iw-deploy_nest
```

### **3. Vérification**
```bash
# Surveiller les logs
docker service logs projet5iw-deploy_nest -f

# Tu devrais voir au démarrage :
# "STRIPE_WEBHOOK_SECRET found, webhook signature verification enabled"
# Ou si pas trouvé :
# "STRIPE_WEBHOOK_SECRET not found, webhook signature verification disabled"
```

## 🧪 **Tests**

### **Test 1: Depuis Stripe Dashboard**
1. **Webhook** → **Ton endpoint** → **Test**
2. **Envoie** un événement `checkout.session.completed`
3. **Vérifie** les logs : `docker service logs projet5iw-deploy_nest -f`
4. **Recherche** : `🔔 Received Stripe event: checkout.session.completed`

### **Test 2: Paiement réel**
1. **Crée** un événement payant sur ton site
2. **Procède** à une inscription avec paiement Stripe
3. **Vérifie** dans les logs :
```
🔔 Received Stripe event: checkout.session.completed
✅ Checkout completed for session: cs_...
✅ Payment confirmed for registration: reg-...
```

### **Test 3: Paiement échoué** 
1. **Utilise** une carte de test qui échoue : `4000000000000002`
2. **Vérifie** dans les logs :
```
🔔 Received Stripe event: payment_intent.payment_failed
❌ Payment failed: pi_... - Your card was declined.
❌ Payment failure handled for registration: reg-...
```

## 📊 **Monitoring des webhooks**

### **Logs importants à surveiller**
```bash
# Événements reçus
🔔 Received Stripe event: [TYPE]

# Succès
✅ Checkout completed for session: cs_...
✅ Payment confirmed for registration: reg-...

# Échecs
❌ Payment failed: pi_... - [RAISON]
❌ Payment failure handled for registration: reg-...

# Actions requises  
⚠️  Payment requires action: pi_...
⚠️  Payment action required handled for registration: reg-...

# Contestations
⚖️  Charge dispute created: ch_...
⚖️  Chargeback handled for registration: reg-...

# Nettoyage automatique
🧹 Starting cleanup of expired Stripe sessions...
🗑️ Found X expired Stripe sessions to cleanup
✅ Cleanup completed: X/Y registrations cleaned
```

### **Erreurs à surveiller**
```bash
# Problème de signature
⚠️  Webhook signature verification failed

# Registration introuvable
❌ Failed to confirm payment for registration: reg-...

# Problème de base de données
❌ Failed to handle payment failure for registration: reg-...
```

## 🎯 **Cas d'usage couverts**

### **✅ Paiement réussi**
- **Événement :** `checkout.session.completed`
- **Action :** Confirmation automatique + email
- **Résultat :** Statut `PAID`, place réservée

### **❌ Paiement échoué**
- **Événement :** `payment_intent.payment_failed`  
- **Action :** Statut `FAILED` + email avec raison
- **Résultat :** Place libérée après 24h

### **🚫 Paiement annulé**
- **Événement :** `payment_intent.canceled`
- **Action :** Suppression inscription + email
- **Résultat :** Place libérée immédiatement

### **⚠️ Action requise (3D Secure)**
- **Événement :** `payment_intent.requires_action`
- **Action :** Email demandant d'agir
- **Résultat :** Place reste réservée temporairement

### **⏰ Session expirée**
- **Événement :** `checkout.session.expired`
- **Action :** Suppression inscription + email
- **Résultat :** Place libérée

### **⚖️ Contestation**
- **Événement :** `charge.dispute.created`
- **Action :** Notification admin + statut `FAILED`
- **Résultat :** Investigation manuelle nécessaire

## 🔒 **Sécurité**

### **Vérification de signature**
- Le webhook vérifie la signature Stripe avec le secret `stripe_webhook_secret`
- Protection contre les requêtes malveillantes
- Si le secret n'est pas configuré, mode développement sans vérification

### **Métadonnées utilisées**
- `registrationId` dans les sessions Stripe checkout
- `registrationId` dans les PaymentIntent metadata
- Permet de lier les événements Stripe aux inscriptions

## 🚨 **Dépannage**

### **Problème : Webhook ne reçoit rien**
```bash
# Vérifier que l'URL est accessible
curl -X POST https://api.educareschool.me/stripe/webhooks

# Vérifier les logs de Traefik
docker service logs projet5iw-deploy_traefik
```

### **Problème : Erreur de signature**
```bash
# Vérifier le secret
docker secret inspect stripe_webhook_secret

# Recréer le secret si nécessaire
docker secret rm stripe_webhook_secret
echo "NOUVEAU_SECRET" | docker secret create stripe_webhook_secret -
docker service update --force projet5iw-deploy_nest
```

### **Problème : Registration not found**
- Vérifier que les métadonnées sont bien ajoutées lors de la création de session
- Vérifier que l'ID de registration existe en base
- Vérifier les logs de création de session Stripe

## 🎉 **Résultat attendu après configuration**

1. **Confirmation automatique** des paiements sans intervention
2. **Places restantes exactes** en temps réel  
3. **Gestion complète des échecs** avec notifications appropriées
4. **Nettoyage automatique** des sessions expirées
5. **Robustesse maximale** même en cas de problème réseau/navigateur
6. **Traçabilité complète** via logs détaillés
7. **Gestion des cas complexes** (3D Secure, contestations, etc.)

Ton système d'événements est maintenant **100% automatisé** ! 🚀 