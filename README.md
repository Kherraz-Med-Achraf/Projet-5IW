# EducareSchool – Intranet containerisé (Vue 3 + NestJS + PostgreSQL + MongoDB)

## 1 – Présentation générale

EducareSchool est un intranet destiné à une école accueillant des enfants en situation de handicap.  
L’objectif principal du projet est de fournir une plateforme moderne et fiable pour gérer la vie scolaire (planning, journal de bord, suivi des présences, blog, etc.).

Nous avons entièrement migré l’application vers une **architecture conteneurisée et orchestrée avec Docker Swarm** afin de garantir :

- **Haute disponibilité :** réplicas, rolling-update, rollback.
- **Sécurité :** secrets Docker, HTTPS automatique via **Traefik** & **Let’s Encrypt**.
- **Persistance des données :** volumes pour **PostgreSQL** & **MongoDB**.
- **Observabilité :** Uptime Kuma, Sentry (SaaS) et Umami (analytics).

---

## 2 – Stack technique

| Couche                        | Technologie          | Image Docker                                     |
| ----------------------------- | -------------------- | ------------------------------------------------ |
| Front-end                     | Vue 3 (Vite)         | `achraf97/projet5iw-frontend:prod`               |
| Back-end                      | NestJS               | `achraf97/projet5iw-nest:prod`                   |
| Base de données relationnelle | PostgreSQL 15-alpine | `postgres:15-alpine`                             |
| Base de données documentaire  | MongoDB 7            | `mongo:7-jammy`                                  |
| Reverse-proxy / Load-balancer | Traefik 2.9          | `traefik:v2.9`                                   |
| Observabilité                 | Uptime Kuma 1.x      | `louislam/uptime-kuma:1`                         |
| Observabilité                 | Sentry               | SaaS                                             |
| Observabilité                 | Umami 2.x            | `ghcr.io/umami-software/umami:postgresql-latest` |
| Outils DBA                    | PgAdmin 8            | `dpage/pgadmin4:8`                               |
| Outils DBA                    | MongoClient 4        | `mongoclient/mongoclient:4.0.1`                  |

---

## 3 – Accès aux services (production)

| URL                                | Description                       |
| ---------------------------------- | --------------------------------- |
| <https://educareschool.me>         | Application principale (frontend) |
| <https://api.educareschool.me>     | API REST/NestJS (backend)         |
| <https://kuma.educareschool.me>    | Uptime Kuma (monitoring)          |
| <https://traefik.educareschool.me> | Dashboard Traefik                 |
| <https://pgadmin.educareschool.me> | PgAdmin 4                         |
| <https://mongo.educareschool.me>   | MongoClient (UI MongoDB)          |

> 💡 **Astuce** : toutes les routes HTTP sont automatiquement redirigées en HTTPS par Traefik.

---

## 4 – Authentification sur les outils d’administration

### 4.1 – Basic-Auth (Traefik)

Les interfaces PgAdmin, MongoClient et Traefik Dashboard sont protégées par une _Basic-Auth_ supplémentaire :

```text
Nom d’utilisateur : admin
Mot de passe    : (hash stocké dans Traefik – voir `docker-compose.swarm.yml`)
```

### 4.2 – Identifiants internes PgAdmin

```
Login    : admin@educareschool.me
Password : <mot-de-passe défini dans Docker Secrets>
```

Une fois connecté, ajoutez un serveur PostgreSQL :

```
Hôte     : postgres
Port     : 5432
Base     : mydb
Utilisateur : myuser
Mot de passe : <mot-de-passe>
```

### 4.3 – Connexion MongoClient

Dans _MongoClient_ → **Add connection** → **URL** :

```
mongodb://myuser:<mot-de-passe>@mongodb:27017/mydb?authSource=admin
```

---

## 5 – Environnements de développement & de production

### 5.1 – Développement local

1. Installez **Docker Desktop** (compose v2).
2. Clonez le dépôt :

   ```bash
   git clone https://github.com/votre-projet/votre-repo.git
   cd votre-repo
   ```

3. Lancez la stack de développement :

   ```bash
   docker compose -f docker-compose.dev.yml up --build -d
   ```

4. Accédez à :
   - Frontend : <http://localhost:5173>
   - Backend : <http://localhost:3000>
   - PostgreSQL : `localhost:5433`
   - MongoDB : `localhost:27017`

> 📝 Les fichiers sont montés en _bind-mount_ : chaque modification est rechargée à chaud côté Vue/Nest.

Pour arrêter et supprimer les conteneurs :

```bash
docker compose -f docker-compose.dev.yml down -v
```

### 5.2 – Déploiement en production (Docker Swarm)

#### a) Automatique (CI/CD)

Un workflow **GitHub Actions** se déclenche à chaque _push_ ou _merge request_ vers la branche `deploy` :

1. Construction des images Docker (frontend + backend).
2. Push vers Docker Hub.
3. Déploiement sur le Swarm (via `docker stack deploy`).

Aucune intervention manuelle n’est requise.

#### b) Manuel (VM SSH)

Connectez-vous à la VM managère du Swarm puis :

```bash
./build-deploy.sh
```

Ce script :

1. Nettoie les images/container obsolètes (`cleanup.sh`).
2. Construit les images en mode _production_.
3. Pousse les images sur Docker Hub.
4. Déploie (ou met à jour) la stack `projet5iw` via `docker-compose.swarm.yml`.

---


## 6 – Structure du dépôt

```
.
├── frontend/               # Vue 3 + Vite
│   └── Dockerfile.frontend
├── backend/                # NestJS
│   └── Dockerfile.nest
├── docker-compose.dev.yml  # Stack de développement
├── docker-compose.swarm.yml# Stack de production (Swarm)
├── build-deploy.sh         # Build & deploy complet
└── cleanup.sh              # Nettoyage des images & volumes
```

