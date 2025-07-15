/**
 * Service de gestion de l'authentification avec chiffrement sécurisé
 */

interface TokenInfo {
  value: string;
  expiresAt: number;
}

interface EncryptedData {
  data: string;
  iv: string;
}

class CryptoService {
  private static async getKey(): Promise<CryptoKey> {
    // Utilise une clé dérivée du domaine et de l'agent utilisateur pour plus de sécurité
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(window.location.hostname + navigator.userAgent.substring(0, 50)),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('planning-ime-salt-v1'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(data: string): Promise<EncryptedData> {
    const key = await this.getKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    return {
      data: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  }

  static async decrypt(encryptedData: EncryptedData): Promise<string> {
    try {
      const key = await this.getKey();
      const iv = new Uint8Array(encryptedData.iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
      const data = new Uint8Array(encryptedData.data.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Erreur de déchiffrement:', error);
      throw new Error('Impossible de déchiffrer les données');
    }
  }
}

export class AuthService {
  private static readonly TOKEN_KEY = 'auth_token_encrypted';
  private static readonly TOKEN_EXPIRY_KEY = 'auth_token_expiry';
  private static readonly USER_KEY = 'user_data_encrypted';
  private static readonly CSRF_TOKEN_KEY = 'csrf_token';

  /**
   * Stocke un token JWT de manière sécurisée avec chiffrement
   */
  static async setToken(token: string, expiresIn: number = 3600): Promise<void> {
    const expiryTime = Date.now() + (expiresIn * 1000);
    
    try {
      const encryptedToken = await CryptoService.encrypt(token);
      localStorage.setItem(this.TOKEN_KEY, JSON.stringify(encryptedToken));
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error('Erreur lors du chiffrement du token');
      // Fallback : stockage non chiffré (à éviter en production)
      sessionStorage.setItem('temp_token', token);
      sessionStorage.setItem('temp_token_expiry', expiryTime.toString());
    }
  }

  /**
   * Récupère le token JWT déchiffré
   */
  static async getToken(): Promise<string | null> {
    try {
      const encryptedData = localStorage.getItem(this.TOKEN_KEY);
      const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

      if (!encryptedData || !expiry) {
        // Vérifier le fallback
        const tempToken = sessionStorage.getItem('temp_token');
        const tempExpiry = sessionStorage.getItem('temp_token_expiry');
        
        if (tempToken && tempExpiry && Date.now() < parseInt(tempExpiry)) {
          return tempToken;
        }
        return null;
      }

      if (Date.now() >= parseInt(expiry)) {
        this.clearAuth();
        return null;
      }

      const encryptedToken: EncryptedData = JSON.parse(encryptedData);
      return await CryptoService.decrypt(encryptedToken);
    } catch (error) {
      console.error('Erreur lors du déchiffrement du token:', error);
      this.clearAuth();
      return null;
    }
  }

  /**
   * Vérifie si l'utilisateur est authentifié avec un token valide
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Stocke les données utilisateur de manière sécurisée
   */
  static async setUserData(userData: any): Promise<void> {
    try {
      // Filtrer les données sensibles avant stockage
      const safeUserData = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        // Ne pas stocker de données sensibles comme les mots de passe ou tokens
      };

      const encryptedData = await CryptoService.encrypt(JSON.stringify(safeUserData));
      localStorage.setItem(this.USER_KEY, JSON.stringify(encryptedData));
    } catch (error) {
      console.error('Erreur lors du chiffrement des données utilisateur:', error);
    }
  }

  /**
   * Récupère les données utilisateur déchiffrées
   */
  static async getUserData(): Promise<any | null> {
    try {
      const encryptedData = localStorage.getItem(this.USER_KEY);
      if (!encryptedData) return null;

      const encryptedUser: EncryptedData = JSON.parse(encryptedData);
      const decryptedData = await CryptoService.decrypt(encryptedUser);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Erreur lors du déchiffrement des données utilisateur:', error);
      return null;
    }
  }

  /**
   * Génère et stocke un token CSRF
   */
  static generateCSRFToken(): string {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    sessionStorage.setItem(this.CSRF_TOKEN_KEY, token);
    return token;
  }

  /**
   * Récupère le token CSRF
   */
  static getCSRFToken(): string | null {
    return sessionStorage.getItem(this.CSRF_TOKEN_KEY);
  }

  /**
   * Nettoie toutes les données d'authentification
   */
  static clearAuth(): void {
    // Nettoyage localStorage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    // Nettoyage sessionStorage
    sessionStorage.removeItem('temp_token');
    sessionStorage.removeItem('temp_token_expiry');
    sessionStorage.removeItem(this.CSRF_TOKEN_KEY);
    
    // Nettoyer les cookies côté client (si applicable)
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.startsWith('auth_') || name.startsWith('csrf_')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure;samesite=strict`;
      }
    });
  }

  /**
   * Valide le format d'un token JWT
   */
  static validateTokenFormat(token: string): boolean {
    if (!token) return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    try {
      // Vérifier que chaque partie peut être décodée en base64
      parts.forEach(part => {
        const decoded = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
        if (!decoded) throw new Error('Invalid base64');
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extrait la date d'expiration d'un token JWT
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      if (!this.validateTokenFormat(token)) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return null;
      
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Configure un timeout automatique de déconnexion
   */
  static setupAutoLogout(callback: () => void): void {
    const checkToken = async () => {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        callback();
      }
    };

    // Vérifier toutes les 60 secondes
    setInterval(checkToken, 60000);

    // Vérifier lors du focus de la fenêtre
    window.addEventListener('focus', checkToken);

    // Vérifier lors du changement de visibilité
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkToken();
      }
    });
  }

  /**
   * Sécurise une requête avec les headers d'authentification appropriés
   */
  static async secureRequest(url: string, options: RequestInit = {}): Promise<RequestInit> {
    const token = await this.getToken();
    const csrfToken = this.getCSRFToken();

    const headers = new Headers(options.headers);
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || 'GET')) {
      headers.set('X-CSRF-Token', csrfToken);
    }

    // Ajouter des headers de sécurité
    headers.set('X-Requested-With', 'XMLHttpRequest');
    headers.set('X-Content-Type-Options', 'nosniff');

    return {
      ...options,
      headers,
      credentials: 'include', // Inclure les cookies
    };
  }
} 