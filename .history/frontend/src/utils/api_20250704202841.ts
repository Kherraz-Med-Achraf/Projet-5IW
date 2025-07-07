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
  
  // FORCE: Toujours récupérer un nouveau token CSRF pour éviter les problèmes
  try {
    console.log('[API] Récupération forcée du token CSRF...');
    const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrf_token;
      console.log('[API] Token CSRF récupéré:', csrfToken);
    } else {
      console.error('[API] Erreur récupération CSRF:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('[API] Erreur récupération CSRF:', error);
    // Fallback vers le token en cookie si disponible
    if (!csrfToken) {
      csrfToken = getCSRFTokenFromCookie();
    }
  }
  
  return csrfToken;
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
  const secureOptions = await setupSecureHeaders(options);
  return fetch(url, secureOptions);
}

/**
 * Helper pour les requêtes JSON sécurisées
 */
export async function secureJsonCall(url: string, options: RequestInit = {}): Promise<any> {
  console.log('[API] secureJsonCall START', { url, method: options.method });
  
  // Préparer les options avec Content-Type si nécessaire
  const requestOptions = { ...options };
  
  // Assurer que Content-Type est défini pour les requêtes avec body
  if (requestOptions.body && typeof requestOptions.body === 'string') {
    requestOptions.headers = {
      'Content-Type': 'application/json',
      ...requestOptions.headers,
    };
  }
  
  console.log('[API] secureJsonCall OPTIONS', { url, options: requestOptions });
  
  const response = await secureApiCall(url, requestOptions);
  
  console.log('[API] secureJsonCall RESPONSE', { 
    url, 
    status: response.status, 
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[API] secureJsonCall ERROR', { url, status: response.status, errorText });
    
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || 'Erreur inconnue' };
    }
    
    throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
  }
  
  const data = await response.json();
  console.log('[API] secureJsonCall SUCCESS', { url, data });
  
  return data;
} 