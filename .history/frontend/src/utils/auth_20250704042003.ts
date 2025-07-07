/**
 * Service de sécurité pour la gestion des tokens
 */
export class AuthSecurity {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_KEY = 'refresh_token';
  private static readonly TOKEN_EXPIRY_KEY = 'token_expiry';

  /**
   * Stocker le token avec expiration
   */
  static setToken(token: string, expiresIn: number = 3600) {
    const expiryTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * Récupérer le token s'il est valide
   */
  static getToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return null;
    
    if (Date.now() > parseInt(expiry)) {
      this.clearTokens();
      return null;
    }
    
    return token;
  }

  /**
   * Vérifier si le token est valide
   */
  static isTokenValid(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Nettoyer tous les tokens
   */
  static clearTokens() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  /**
   * Sanitiser les données d'entrée
   */
  static sanitizeInput(input: string): string {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Valider les URLs d'images
   */
  static isValidImageUrl(url: string): boolean {
    const validDomains = ['localhost:3000', 'localhost:5173', 'localhost:5174', 'localhost:5175', 'localhost:5176', 'localhost:5177'];
    try {
      const urlObj = new URL(url);
      return validDomains.some(domain => urlObj.host === domain);
    } catch {
      return false;
    }
  }

  /**
   * Échapper les caractères HTML
   */
  static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
} 