import * as fs from 'fs';

// si DATABASE_URL n’est pas déjà défini (mode docker-compose)
if (!process.env.DATABASE_URL) {
  const pgPw = fs.readFileSync('/run/secrets/pg_password', 'utf8').trim();

  // encode le mot de passe pour éviter ":" ou "@"
  const encPw = encodeURIComponent(pgPw);

  const host = process.env.POSTGRES_HOST || 'postgres';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER || 'myuser';
  const db   = process.env.POSTGRES_DB   || 'mydb';

  process.env.DATABASE_URL = `postgresql://${user}:${encPw}@${host}:${port}/${db}`;
  // console.error('→ DATABASE_URL set to', process.env.DATABASE_URL);
}
