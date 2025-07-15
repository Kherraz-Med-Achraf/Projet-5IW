/**
 * Obtenir l'URL de base du frontend
 */
export function getFrontendBaseUrl(): string {
  // 🔧 FIX: Utiliser l'URL de production au lieu de localhost
  return process.env.FRONTEND_BASE_URL || 'https://educareschool.me';
}

/**
 * Obtenir l'URL de base du backend
 */
export function getBackendBaseUrl(): string {
  return process.env.BACKEND_BASE_URL || 'http://localhost:8080';
}

/**
 * Constante pour compatibilité avec les imports existants
 */
export const FRONTEND_BASE_URL = getFrontendBaseUrl(); 