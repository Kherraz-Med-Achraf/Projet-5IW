/**
 * Formate une date ISO en format français lisible
 * @param dateString - Date au format ISO (ex: "2025-07-06T22:56:14.797Z")
 * @returns Date formatée (ex: "06/07/2025 à 22:56")
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return 'Non renseigné';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    return 'Date invalide';
  }
}

/**
 * Formate une date ISO en format français simple (jour/mois/année)
 * @param dateString - Date au format ISO
 * @returns Date formatée (ex: "06/07/2025")
 */
export function formatDateSimple(dateString: string | undefined | null): string {
  if (!dateString) return 'Non renseigné';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    return 'Date invalide';
  }
} 