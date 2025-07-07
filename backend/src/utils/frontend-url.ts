export function getFrontendBaseUrl(): string {
    // 1. Variable d'environnement prioritaire (FRONT_URL ou FRONTEND_URL)
    const envUrl = process.env.FRONT_URL || process.env.FRONTEND_URL;
    if (envUrl) return envUrl;
  
    // 2. En local / développement
    if (process.env.NODE_ENV !== 'production') {
      return 'http://localhost:5173';
    }
  
    // 3. Par défaut en production
    return 'https://educareschool.me';
  }
  
  // Valeur unique à ré-utiliser dans l'app si besoin
  export const FRONTEND_BASE_URL = getFrontendBaseUrl(); 