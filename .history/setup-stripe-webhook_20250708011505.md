# 🔧 Configuration des Webhooks Stripe

## 📋 **Étapes de configuration**

### **1. Sur le Dashboard Stripe**

1. Va sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Dans le menu de gauche, clique sur **"Developers" > "Webhooks"**
3. Clique sur **"Add endpoint"**

### **2. Configuration de l'endpoint**

**URL de l'endpoint :**
```
https://api.educareschool.me/stripe/webhooks
```

**Événements à écouter :**
- `checkout.session.completed` ✅ (Principal - confirmation de paiement)
- `checkout.session.expired` ✅ (Nettoyage des sessions expirées)
- `payment_intent.succeeded` ⚠️ (Optionnel - pour logs supplémentaires)
- `payment_intent.payment_failed` ⚠️ (Optionnel - pour logs d'échecs)

### **3. Récupération du secret webhook**

1. Une fois l'endpoint créé, clique dessus
2. Dans la section **"Signing secret"**, clique sur **"Reveal"**
3. Copie la valeur qui commence par `whsec_...`

### **4. Configuration sur le serveur**

Sur ton serveur (`root@p5iw-droplet`), crée le secret Docker :

```bash
# Créer le secret webhook Stripe
echo "whsec_TON_SECRET_ICI" | docker secret create stripe_webhook_secret -

# Vérifier que le secret a été créé
docker secret ls | grep stripe_webhook_secret
```

### **5. Redéploiement**

```bash
# Redéployer le service pour prendre en compte le nouveau secret
docker service update --force projet5iw-deploy_nest
```

## 🧪 **Test du webhook**

### **Test depuis Stripe Dashboard**
1. Dans ton endpoint webhook, onglet **"Test"**
2. Envoie un événement `checkout.session.completed`
3. Vérifie les logs du conteneur :
```bash
docker service logs projet5iw-deploy_nest -f
```

### **Test en conditions réelles**
1. Crée un événement payant sur ton site
2. Fais une inscription avec paiement Stripe
3. Vérifie que le statut passe automatiquement à `PAID`

## 🔍 **Vérification du bon fonctionnement**

### **Logs à surveiller**
```bash
# Logs du service backend
docker service logs projet5iw-deploy_nest -f

# Tu devrais voir :
# 🔔 Received Stripe event: checkout.session.completed
# ✅ Checkout completed for session: cs_test_...
# ✅ Payment confirmed for registration: reg-...
```

### **En cas de problème**

**Erreur de signature :**
```
⚠️  Webhook signature verification failed
```
→ Vérifier que le secret webhook est correct

**Registration not found :**
```
❌ Failed to confirm payment for registration
```
→ Vérifier que les métadonnées de la session contiennent bien `registrationId`

## 📊 **Surveillance**

### **Événements importants à monitorer**
- ✅ Confirmations automatiques réussies
- ❌ Échecs de traitement des webhooks
- ⏰ Sessions expirées nettoyées
- 🔔 Volume d'événements reçus

### **Métriques utiles**
- Temps de traitement des webhooks
- Taux de succès des confirmations automatiques
- Nombre de sessions expirées

## 🚀 **Avantages après configuration**

1. **Confirmation automatique** des paiements (plus besoin du retour utilisateur)
2. **Places restantes** mises à jour en temps réel
3. **Nettoyage automatique** des sessions expirées
4. **Robustesse** : fonctionne même si l'utilisateur ferme son navigateur
5. **Notifications email** automatiques après paiement

## ⚠️ **Sécurité**

- Le webhook vérifie la signature Stripe pour s'assurer de l'authenticité
- La route est publique mais protégée par la vérification de signature
- Tous les événements sont loggés pour traçabilité 