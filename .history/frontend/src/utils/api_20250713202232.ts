import { API_BASE_URL } from '@/config/api'

export function getApiBaseUrl(): string {
  // Détermination dynamique de l'URL de base de l'API selon l'environnement
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    // Production sur le domaine educareschool.me
    if (window.location.hostname.indexOf("educareschool.me") !== -1) {
      return "https://api.educareschool.me";
    }
    // Autres environnements (ex. dev/staging) sur le même host
    return `http://${window.location.hostname}:3000`;
  }

  // En développement local
  return "http://localhost:3000";
}

export const API_BASE_URL = getApiBaseUrl();
/**
 * Utilitaire pour les requêtes API sécurisées avec gestion automatique CSRF
 */

/**
 * Récupère le token CSRF depuis les cookies
 */
function getCSRFTokenFromCookie(): string | null {
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "csrf_token") {
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
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrf_token;
      return csrfToken;
    } else {
      console.error(
        "[API] Erreur récupération CSRF:",
        response.status,
        response.statusText
      );
    }
  } catch (error) {
    console.error("[API] Erreur récupération CSRF:", error);
  }

  return null;
}

/**
 * Configure automatiquement les headers de sécurité pour les requêtes
 */
export async function setupSecureHeaders(
  options: RequestInit = {}
): Promise<RequestInit> {
  const headers = new Headers(options.headers);

  // Token d'authentification
  const token = localStorage.getItem("token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Token CSRF pour les méthodes mutantes
  const method = options.method?.toUpperCase() || "GET";

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = await ensureCSRFToken();
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    } else {
      console.error("[API] setupSecureHeaders - Pas de token CSRF !");
    }
  }

  // Headers de sécurité standard
  headers.set("X-Requested-With", "XMLHttpRequest");

  const finalOptions = {
    ...options,
    headers,
    credentials: "include" as RequestCredentials, // Inclure les cookies
  };

  return finalOptions;
}

/**
 * Wrapper sécurisé pour les requêtes admin qui gère automatiquement CSRF et auth
 */
export async function secureApiCall(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const secureOptions = await setupSecureHeaders(options);
  return fetch(url, secureOptions);
}

/**
 * Wrapper JSON sécurisé pour les requêtes admin
 */
export async function secureJsonCall(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await secureApiCall(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * Helpers pour les opérations CRUD admin
 */
export const adminApi = {
  /**
   * GET sécurisé
   */
  async get(url: string): Promise<any> {
    return secureJsonCall(url, { method: 'GET' });
  },

  /**
   * POST sécurisé
   */
  async post(url: string, data: any): Promise<any> {
    return secureJsonCall(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT sécurisé
   */
  async put(url: string, data: any): Promise<any> {
    return secureJsonCall(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * PATCH sécurisé
   */
  async patch(url: string, data: any): Promise<any> {
    return secureJsonCall(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE sécurisé
   */
  async delete(url: string): Promise<any> {
    return secureJsonCall(url, { method: 'DELETE' });
  },

  /**
   * POST avec FormData (pour uploads)
   */
  async postFormData(url: string, formData: FormData): Promise<any> {
    // Ne pas définir Content-Type pour FormData
    const options = await setupSecureHeaders({
      method: 'POST',
      body: formData,
    });
    
    // Retirer Content-Type pour FormData
    const headers = new Headers(options.headers);
    headers.delete('Content-Type');
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
};
