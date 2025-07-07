/**
 * Store d'authentification sécurisé pour projet étudiant
 * Utilise les meilleures pratiques de sécurité web
 */
import { defineStore } from 'pinia'
import { useNotificationStore } from '@/stores/notificationStore'
import { API_ENDPOINTS } from '@/config/api'

interface User {
  id: string
  email: string
  role: string
  otpEnabled?: boolean
}

interface AuthState {
  user: User | null
  tempToken: string | null
  loading: boolean
  error: string | null
  tokenExpiry: number | null
}

/**
 * Gestionnaire sécurisé des tokens
 * Combine le meilleur des cookies httpOnly et localStorage
 */
class SecureTokenManager {
  private static readonly USER_KEY = 'user_profile'
  private static readonly TOKEN_EXPIRY_KEY = 'token_expiry'
  private static readonly CSRF_KEY = 'csrf_temp'

  /**
   * Stocke les données utilisateur de manière sécurisée
   * Note : Le token JWT est dans un cookie httpOnly côté serveur
   */
  static setAuth(user: User, expiresIn: number = 3600) {
    const expiryTime = Date.now() + (expiresIn * 1000)
    
    // Stocker uniquement les données non-sensibles
    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      otpEnabled: user.otpEnabled
    }
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(safeUser))
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString())
  }

  static getUser(): User | null {
    try {
      const userStr = localStorage.getItem(this.USER_KEY)
      return userStr ? JSON.parse(userStr) : null
    } catch {
      return null
    }
  }

  static isTokenExpired(): boolean {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY)
    if (!expiry) return true
    return Date.now() >= parseInt(expiry)
  }

  static clearAuth() {
    localStorage.removeItem(this.USER_KEY)
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY)
    localStorage.removeItem(this.CSRF_KEY)
  }

  static isAuthenticated(): boolean {
    return this.getUser() !== null && !this.isTokenExpired()
  }

  /**
   * Stocke temporairement le token CSRF (non-sensible)
   */
  static setCSRFToken(token: string) {
    localStorage.setItem(this.CSRF_KEY, token)
  }

  static getCSRFToken(): string | null {
    return localStorage.getItem(this.CSRF_KEY)
  }
}

/**
 * Gestionnaire de requêtes sécurisées
 */
class SecureHttpClient {
  /**
   * Effectue une requête sécurisée avec gestion automatique des tokens
   */
  static async request(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers)
    
    // Headers de sécurité standard
    headers.set('Content-Type', 'application/json')
    headers.set('X-Requested-With', 'XMLHttpRequest')
    
    // Token CSRF pour les méthodes mutantes
    const method = options.method?.toUpperCase() || 'GET'
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = SecureTokenManager.getCSRFToken()
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken)
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // Inclure les cookies httpOnly
    }

    try {
      const response = await fetch(url, config)
      
      // Gestion automatique du refresh token (401)
      if (response.status === 401 && !url.includes('/auth/refresh')) {
        const refreshed = await this.tryRefreshToken()
        if (refreshed) {
          // Retry la requête originale
          return fetch(url, config)
        } else {
          // Redirect vers login
          window.location.href = '/login'
          throw new Error('Session expirée')
        }
      }

      // Gestion du rate limiting (429)
      if (response.status === 429) {
        console.warn('[HTTP] Rate limit atteint, attente recommandée')
        // Ne pas retry automatiquement pour éviter les boucles
      }

      return response
    } catch (error) {
      console.error('[HTTP] Erreur requête:', error)
      throw error
    }
  }

  /**
   * Tente de rafraîchir le token automatiquement
   */
  private static async tryRefreshToken(): Promise<boolean> {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        
        // Mettre à jour l'expiry côté client
        if (data.expires_in) {
          localStorage.setItem('token_expiry', (Date.now() + data.expires_in * 1000).toString())
        }
        
        // Mettre à jour le CSRF token si fourni
        if (data.csrf_token) {
          SecureTokenManager.setCSRFToken(data.csrf_token)
        }
        
        return true
      }
      
      return false
    } catch {
      return false
    }
  }

  /**
   * Helper pour les requêtes JSON
   */
  static async json(url: string, options: RequestInit = {}): Promise<any> {
    const response = await this.request(url, options)
    
    if (!response.ok) {
      const errorData = await response.text()
      let errorMessage
      
      try {
        const parsed = JSON.parse(errorData)
        errorMessage = parsed.message || `Erreur HTTP ${response.status}`
      } catch {
        errorMessage = errorData || `Erreur HTTP ${response.status}`
      }
      
      throw new Error(errorMessage)
    }
    
    return response.json()
  }
}

/**
 * Store Pinia sécurisé
 */
export const useAuthSecureStore = defineStore('authSecure', {
  state: (): AuthState => ({
    user: SecureTokenManager.getUser(),
    tempToken: null,
    loading: false,
    error: null,
    tokenExpiry: null,
  }),

  getters: {
    isAuthenticated: (state) => {
      return state.user !== null && !SecureTokenManager.isTokenExpired();
    },
    userRole: (state) => state.user?.role || null,
    isOtpEnabled: (state) => state.user?.otpEnabled || false,
  },

  actions: {
    /**
     * Connexion sécurisée (méthode principale)
     */
    async login(credentials: { email: string; password: string; otpCode?: string }) {
      this.loading = true
      this.error = null
      const notification = useNotificationStore()

      try {
        // Première étape : initiate-login
        const data = await SecureHttpClient.json(API_ENDPOINTS.AUTH.INITIATE_LOGIN, {
          method: 'POST',
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password
          }),
        })

        // Si OTP requis
        if (data.tempToken && !data.user) {
          this.tempToken = data.tempToken
          return { 
            requiresOtp: true, 
            tempToken: data.tempToken,
            success: false 
          }
        }

        // Si connexion directe réussie (pas d'OTP)
        if (data.user) {
          SecureTokenManager.setAuth(data.user, data.expires_in)
          this.user = data.user
          
          if (data.csrf_token) {
            SecureTokenManager.setCSRFToken(data.csrf_token)
          }

          return { 
            success: true, 
            access_token: data.access_token || 'dummy-token',
            user: data.user 
          }
        }

        throw new Error('Réponse invalide du serveur')
      } catch (error: any) {
        this.error = error.message
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    /**
     * Méthode de compatibilité pour l'ancien store - initiateLogin
     */
    async initiateLogin(credentials: { email: string; password: string }) {
      return await this.login(credentials)
    },

    /**
     * Vérification OTP
     */
    async verifyOtp(otpCodeOrObject: string | { tempToken: string; otpCode: string }) {
      // Support pour les deux formats d'appel
      let otpCode: string
      if (typeof otpCodeOrObject === 'string') {
        otpCode = otpCodeOrObject
      } else {
        otpCode = otpCodeOrObject.otpCode
      }

      if (!this.tempToken) {
        throw new Error('Aucun token temporaire disponible')
      }

      this.loading = true
      const notification = useNotificationStore()

      try {
        const data = await SecureHttpClient.json(API_ENDPOINTS.AUTH.VERIFY_OTP, {
          method: 'POST',
          body: JSON.stringify({
            tempToken: this.tempToken,
            otpCode
          }),
        })

        SecureTokenManager.setAuth(data.user, data.expires_in)
        this.user = data.user
        this.tempToken = null
        
        if (data.csrf_token) {
          SecureTokenManager.setCSRFToken(data.csrf_token)
        }

        notification.showNotification('Connexion réussie', 'success')
        return { 
          success: true, 
          access_token: 'dummy-token', // Pour compatibilité
          user: data.user 
        }
      } catch (error: any) {
        this.error = error.message
        notification.showNotification(this.error, 'error')
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    /**
     * Déconnexion sécurisée
     */
    async logout() {
      const notification = useNotificationStore()

      try {
        // Notifier le serveur (invalider le refresh token)
        await SecureHttpClient.request(API_ENDPOINTS.AUTH.LOGOUT, {
          method: 'POST',
        })
      } catch (error) {
        console.warn('Erreur lors de la déconnexion serveur:', error)
      }

      // Nettoyer côté client
      SecureTokenManager.clearAuth()
      this.user = null
      this.tempToken = null
      this.error = null

      notification.showNotification('Déconnexion réussie', 'success')
    },

    /**
     * Récupération du token CSRF
     */
    async ensureCSRFToken() {
      try {
        const data = await SecureHttpClient.json(API_ENDPOINTS.AUTH.CSRF)
        if (data.csrf_token) {
          SecureTokenManager.setCSRFToken(data.csrf_token)
        }
      } catch (error) {
        console.warn('Impossible de récupérer le token CSRF:', error)
      }
    },

    /**
     * Vérification périodique de l'authentification
     */
    setupAuthCheck() {
      // Vérifier toutes les 5 minutes
      setInterval(() => {
        if (SecureTokenManager.isTokenExpired() && this.user) {
          this.logout()
        }
      }, 5 * 60 * 1000)

      // Vérifier lors du focus de la fenêtre
      window.addEventListener('focus', () => {
        if (SecureTokenManager.isTokenExpired() && this.user) {
          this.logout()
        }
      })
    }
  },
})

/**
 * Export du client HTTP pour utilisation dans d'autres stores
 */
export { SecureHttpClient } 