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
 * Wrapper fetch sécurisé avec gestion automatique des headers
 */
export async function secureApiCall(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const secureOptions = await setupSecureHeaders(options);

  // Ajouter explicitement le mode CORS
  secureOptions.mode = "cors";

  try {
    const response = await fetch(url, secureOptions);
    return response;
  } catch (error) {
    console.error("[API] secureApiCall FETCH_ERROR", { url, error });
    throw error;
  }
}

/**
 * Helper pour les requêtes JSON sécurisées
 */
export async function secureJsonCall(
  url: string,
  options: RequestInit & { data?: any } = {}
): Promise<any> {
  // Préparer les options avec Content-Type si nécessaire
  const requestOptions: RequestInit = { ...options };

  // 🔧 FIX: Transformer data en body JSON si fourni
  if (options.data !== undefined) {
    requestOptions.body = JSON.stringify(options.data);
    requestOptions.headers = {
      "Content-Type": "application/json",
      ...requestOptions.headers,
    };
    // Supprimer data des options finales car fetch ne le comprend pas
    delete (requestOptions as any).data;
  }
  // Assurer que Content-Type est défini pour les requêtes avec body string
  else if (requestOptions.body && typeof requestOptions.body === "string") {
    requestOptions.headers = {
      "Content-Type": "application/json",
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
      errorData = { message: errorText || "Erreur inconnue" };
    }

    throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
  }

  const data = await response.json();

  return data;
}
