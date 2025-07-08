# 🚨 **CORRECTION CPU 100% + WEBHOOK STRIPE**

## 🔥 **Problème identifié**

1. **Webhook Stripe en échec** → 401 "Unauthorized" → Stripe retente toutes les heures → CPU à 100%
2. **Seed trop gourmand** → 30 000+ enregistrements → Ralentissement serveur

## 🛠️ **Solutions URGENTES**

### **1. Corriger le webhook Stripe (PRIORITÉ 1)**

**Sur le serveur de production :**

```bash
# Vérifier les secrets Docker
docker secret ls | grep stripe

# Si le secret webhook n'existe pas, le créer
docker secret create stripe_webhook_secret -
# Puis coller la vraie valeur du webhook secret depuis Stripe Dashboard

# Redémarrer le service
docker service update --force projet-5iw_nest
```

**Dans Stripe Dashboard :**
1. Aller dans `Developers > Webhooks`
2. Trouver le webhook `https://api.educareschool.me/stripe/webhooks`
3. Vérifier que l'URL est accessible (test ping)
4. Vérifier que le secret correspond à celui configuré dans Docker

### **2. Vérifier l'accessibilité du webhook**

```bash
# Tester depuis l'extérieur
curl -X POST https://api.educareschool.me/stripe/webhooks \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'

# Devrait retourner une erreur 400 (signature manquante) et non 401
```

### **3. Optimisations seed appliquées**

✅ **Boucle infinie prévenue** : Limite à 100 tentatives
✅ **Feuilles de présence réduites** : Depuis 2024 au lieu de 2023
✅ **Journaux optimisés** : Batch creation + période réduite
✅ **Logs détaillés** : Suivi des créations

## 🔧 **Commands de maintenance**

### **Redémarrer les services**
```bash
# Redémarrer Nest (webhook)
docker service update --force projet-5iw_nest

# Redémarrer tout le stack si nécessaire
docker stack deploy -c docker-compose.swarm.yml projet-5iw
```

### **Vérifier les logs**
```bash
# Logs du service Nest
docker service logs projet-5iw_nest --tail 50

# Logs en temps réel
docker service logs -f projet-5iw_nest
```

### **Monitoring CPU**
```bash
# Utilisation CPU des containers
docker stats

# Processus les plus gourmands
docker exec -it $(docker ps -q --filter "name=nest") top
```

## 🔍 **Diagnostic webhook**

### **Vérifier le secret**
```bash
# Depuis le container Nest
docker exec -it $(docker ps -q --filter "name=nest") cat /run/secrets/stripe_webhook_secret
```

### **Tester l'endpoint**
```bash
# Test local (dans le container)
curl -X POST http://localhost:3000/stripe/webhooks \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'
```

## 📊 **Monitoring post-correction**

### **Vérifier que le webhook fonctionne**
1. Faire un test de paiement
2. Vérifier dans Stripe Dashboard > Webhooks que le statut est "Succeeded"
3. Vérifier les logs Nest pour confirmation

### **Surveiller le CPU**
```bash
# CPU usage
docker stats --no-stream

# Load average
docker exec -it $(docker ps -q --filter "name=nest") cat /proc/loadavg
```

## 🚀 **Prochaines étapes**

1. **Corriger le webhook** (URGENT)
2. **Relancer le seed optimisé** 
3. **Surveiller les performances**
4. **Configurer des alertes CPU**

## 📞 **En cas de problème**

- Les logs sont dans `docker service logs projet-5iw_nest`
- Le webhook doit retourner 200 OK dans Stripe Dashboard
- Le CPU doit redescendre sous 50% après correction 