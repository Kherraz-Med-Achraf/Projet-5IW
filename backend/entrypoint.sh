#!/bin/sh
set -e

# 1. URL Prisma (lecture du secret monté par Swarm)
export DATABASE_URL="postgresql://myuser:$(cat /run/secrets/pg_password)@postgres:5432/mydb"

# 2. On s’assure que Postgres est prêt
until pg_isready -h postgres -p 5432 -U myuser >/dev/null 2>&1; do
  echo "⏳  Attente de Postgres..."
  sleep 2
done

# 3. Schéma + données
npx prisma migrate deploy

node prisma/seed.js

# 4. Application Nest compilée
exec node dist/src/main.js