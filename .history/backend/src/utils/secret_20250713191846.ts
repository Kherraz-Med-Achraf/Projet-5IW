import * as fs from 'fs';

/**
 * Reads a secret value securely.
 * En production, force l'utilisation des Docker secrets.
 * En développement, permet le fallback sur variables d'environnement.
 *
 * @param filePath Absolute path to the secret file (e.g. /run/secrets/access_token_secret)
 * @param envVar   Name of the environment variable to look for (dev only)
 * @returns The secret value as a string
 * @throws  If the secret cannot be read securely
 */
export function readSecret(filePath: string, envVar: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 🔒 SÉCURITÉ: En production, forcer l'utilisation des Docker secrets UNIQUEMENT
  if (isProduction) {
    try {
      const secretValue = fs.readFileSync(filePath, 'utf8').trim();
      if (!secretValue) {
        throw new Error(`Secret file '${filePath}' is empty`);
      }
      
      // Log sécurisé (sans exposer la valeur)
      console.log(`[SECURITY] Secret '${envVar}' loaded from Docker secret file`);
      return secretValue;
    } catch (err) {
      console.error(`[SECURITY CRITICAL] Failed to read secret '${envVar}' from Docker secret file '${filePath}'`);
      throw new Error(
        `PRODUCTION SECURITY: Secret '${envVar}' must be provided via Docker secret file '${filePath}'. Environment variables are disabled in production for security.`
      );
    }
  }
  
  // 🔧 DÉVELOPPEMENT: Permettre le fallback sur variables d'environnement
  console.warn(`[DEV MODE] Attempting to read secret '${envVar}' with fallback support`);
  
  // Essayer d'abord Docker secret même en dev
  try {
    const secretValue = fs.readFileSync(filePath, 'utf8').trim();
    if (secretValue) {
      console.log(`[DEV] Secret '${envVar}' loaded from Docker secret file`);
      return secretValue;
    }
  } catch {
    // Ignore l'erreur en dev et essaye l'env var
  }
  
  // Fallback sur variable d'environnement (dev uniquement)
  const envValue = process.env[envVar];
  if (envValue && envValue.length > 0) {
    console.warn(`[DEV WARNING] Secret '${envVar}' loaded from environment variable. Use Docker secrets for production!`);
    return envValue;
  }
  
  throw new Error(
    `Unable to read secret '${envVar}'. In development: checked Docker secret '${filePath}' and env var '${envVar}'. In production: only Docker secrets are allowed.`
  );
}
