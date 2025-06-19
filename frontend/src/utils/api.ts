export function getApiBaseUrl(): string {
    // Détermination dynamique de l'URL de base de l'API selon l'environnement
    if (
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      // Production sur le domaine educareschool.me
      if (window.location.hostname.indexOf("educareschool.me") !== -1) {
        return "http://api.educareschool.me";
      }
      // Autres environnements (ex. dev/staging) sur le même host
      return `http://${window.location.hostname}:3000`;
    }
  
    // En développement local
    return "http://localhost:3000";
  }
  
  export const API_BASE_URL = getApiBaseUrl();
  