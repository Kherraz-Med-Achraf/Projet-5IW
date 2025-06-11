export function initials(label?: string): string {
    if (!label) return '';
    const trimmed = label.trim();
    if (!trimmed) return '';
  
    // si c'est un email ET un seul segment, on prend avant '@'
    const base =
      trimmed.includes('@') && trimmed.split(/\s+/).length === 1
        ? trimmed.split('@')[0]
        : trimmed;
  
    const parts = base.split(/[.\s_-]+/).filter(Boolean);
  
    const letters =
      parts.length >= 2
        ? parts[0][0] + parts[1][0]     // ex. "Jean Dupont" → "JD"
        : base.substring(0, 2);         // ex. "Foo" → "Fo"
  
    return letters.toUpperCase();
  }
  
  /**
   * Attribue une couleur stable en fonction de l’ID (cuid/uuid) du user.
   */
  export function colorFromId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const palette = [
      '#CE93D8', // violet clair
      '#90CAF9', // bleu
      '#A5D6A7', // vert
      '#FFCC80', // orange
      '#EF9A9A', // rouge
      '#B0BEC5', // gris
    ];
    return palette[Math.abs(hash) % palette.length];
  }
  