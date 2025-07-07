/**
 * Utilitaire pour les requêtes API sécurisées avec gestion automatique CSRF
 */

/**
 * URL de base de l'API
 */
export const API_BASE_URL = import.meta.env.VITE_NEST_API_URL || 'http://localhost:3000';

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
 * Récupère un token CSRF si nécessaire
 */
async function ensureCSRFToken(): Promise<string | null> {
  let csrfToken = getCSRFTokenFromCookie();
  
  // Si on a déjà un token valide, on l'utilise
  if (csrfToken) {
    return csrfToken;
  }
  
  // Seulement si on n'a pas de token, on en récupère un nouveau
  try {
    const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrf_token;
      return csrfToken;
    } else {
      console.error('[API] Erreur récupération CSRF:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('[API] Erreur récupération CSRF:', error);
  }
  
  return null;
}

/**
 * Configure automatiquement les headers de sécurité pour les requêtes
 */
export async function setupSecureHeaders(options: RequestInit = {}): Promise<RequestInit> {
  const headers = new Headers(options.headers);
  
  // Token d'authentification
  const token = localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Token CSRF pour les méthodes mutantes
  const method = options.method?.toUpperCase() || 'GET';
  
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = await ensureCSRFToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    } else {
      console.error('[API] setupSecureHeaders - Pas de token CSRF !');
    }
  }
  
  // Headers de sécurité standard
  headers.set('X-Requested-With', 'XMLHttpRequest');
  
  const finalOptions = {
    ...options,
    headers,
    credentials: 'include' as RequestCredentials, // Inclure les cookies
  };
  
  return finalOptions;
}

/**
 * Wrapper fetch sécurisé avec gestion automatique des headers
 */
export async function secureApiCall(url: string, options: RequestInit = {}): Promise<Response> {
  const secureOptions = await setupSecureHeaders(options);
  
  // Ajouter explicitement le mode CORS
  secureOptions.mode = 'cors';
  
  try {
    const response = await fetch(url, secureOptions);
    return response;
  } catch (error) {
    console.error('[API] secureApiCall FETCH_ERROR', { url, error });
    throw error;
  }
}

/**
 * Helper pour les requêtes JSON sécurisées
 */
export async function secureJsonCall(url: string, options: RequestInit = {}): Promise<any> {
  // Préparer les options avec Content-Type si nécessaire
  const requestOptions = { ...options };
  
  // Assurer que Content-Type est défini pour les requêtes avec body
  if (requestOptions.body && typeof requestOptions.body === 'string') {
    requestOptions.headers = {
      'Content-Type': 'application/json',
      ...requestOptions.headers,
    };
  }
  
  const response = await secureApiCall(url, requestOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || 'Erreur inconnue' };
    }
    
    throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
  }
  
  const data = await response.json();
  
  return data;
} 