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
  console.log('[API] setupSecureHeaders START', { options });
  
  const headers = new Headers(options.headers);
  
  // Token d'authentification
  const token = localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('[API] setupSecureHeaders - Token JWT ajouté');
  }
  
  // Token CSRF pour les méthodes mutantes
  const method = options.method?.toUpperCase() || 'GET';
  console.log('[API] setupSecureHeaders - Méthode:', method);
  
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    console.log('[API] setupSecureHeaders - Récupération du token CSRF...');
    const csrfToken = await ensureCSRFToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
      console.log('[API] setupSecureHeaders - Token CSRF ajouté:', csrfToken);
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
  
  console.log('[API] setupSecureHeaders FINAL', { finalOptions });
  
  return finalOptions;
}

/**
 * Wrapper fetch sécurisé avec gestion automatique des headers
 */
export async function secureApiCall(url: string, options: RequestInit = {}): Promise<Response> {
  console.log('[API] secureApiCall START', { url, options });
  
  const secureOptions = await setupSecureHeaders(options);
  
  // Ajouter explicitement le mode CORS
  secureOptions.mode = 'cors';
  
  // Log détaillé des headers
  const headersObj: Record<string, string> = {};
  if (secureOptions.headers instanceof Headers) {
    secureOptions.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
  }
  console.log('[API] secureApiCall HEADERS_CONTENT', { url, headersObj });
  console.log('[API] secureApiCall SECURE_OPTIONS', { url, secureOptions });
  
  try {
    console.log('[API] secureApiCall AVANT FETCH', { url, options: secureOptions });
    const response = await fetch(url, secureOptions);
    console.log('[API] secureApiCall SUCCESS', { url, status: response.status });
    return response;
  } catch (error) {
    console.error('[API] secureApiCall FETCH_ERROR', { url, error });
    console.error('[API] secureApiCall ERROR_TYPE', { 
      url, 
      errorName: error.name, 
      errorMessage: error.message,
      errorStack: error.stack 
    });
    throw error;
  }
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