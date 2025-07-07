/**
 * Utilitaire pour les requêtes API sécurisées avec gestion automatique CSRF
 */

/**
 * Récupère le token CSRF depuis les cookies
 */
function getCSRFTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return value;
    }
  }
  return null;
}

/**
 * Configure automatiquement les headers de sécurité pour les requêtes
 */
export function setupSecureHeaders(options: RequestInit = {}): RequestInit {
  const headers = new Headers(options.headers);
  
  // Token d'authentification
  const token = localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Token CSRF pour les méthodes mutantes
  const method = options.method?.toUpperCase() || 'GET';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCSRFTokenFromCookie();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }
  
  // Headers de sécurité standard
  headers.set('X-Requested-With', 'XMLHttpRequest');
  
  return {
    ...options,
    headers,
    credentials: 'include', // Inclure les cookies
  };
}

/**
 * Wrapper fetch sécurisé avec gestion automatique des headers
 */
export async function secureApiCall(url: string, options: RequestInit = {}): Promise<Response> {
  const secureOptions = setupSecureHeaders(options);
  return fetch(url, secureOptions);
}

/**
 * URL de base de l'API
 */
export const API_BASE_URL = import.meta.env.VITE_NEST_API_URL || 'http://localhost:3000';

/**
 * Helper pour les requêtes JSON sécurisées
 */
export async function secureJsonCall(url: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && (options.body && typeof options.body === 'string')) {
    headers.set('Content-Type', 'application/json');
  }
  
  const response = await secureApiCall(url, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
    throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
  }
  
  return response.json();
} 