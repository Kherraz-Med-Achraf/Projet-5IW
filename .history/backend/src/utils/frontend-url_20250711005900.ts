/**
 * Obtenir l'URL de base du frontend
 */
export function getFrontendBaseUrl(): string {
  return process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
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