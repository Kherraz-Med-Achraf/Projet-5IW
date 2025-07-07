import { defineStore } from 'pinia'
import { useNotificationStore } from '@/stores/notificationStore'
import { secureApiCall, secureJsonCall, API_BASE_URL } from '@/utils/api'

interface User {
  id: string
  email: string
  role: string
  otpEnabled?: boolean
  otpSecret?: string | null
  // ... autres champs si nécessaire
}

// Classe centralisée pour la gestion des tokens
class TokenManager {
  private static readonly TOKEN_KEY = 'auth_token'
  private static readonly USER_KEY = 'auth_user'
  private static readonly TOKEN_EXPIRY_KEY = 'auth_token_expiry'

  static setAuth(token: string, user: User, expiresIn: number = 3600) {
    const expiryTime = Date.now() + (expiresIn * 1000)
    
    localStorage.setItem(this.TOKEN_KEY, token)
    localStorage.setItem(this.USER_KEY, JSON.stringify(user))
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString())
  }

  static getToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY)
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY)
    
    if (!token || !expiry) return null
    
    if (Date.now() >= parseInt(expiry)) {
      this.clearAuth()
      return null
    }
    
    return token
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  }

  static clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY)
  }

  static isAuthenticated(): boolean {
    return !!this.getToken()
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: TokenManager.getUser(),
    tempToken: null as string | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: () => TokenManager.isAuthenticated(),
    token: () => TokenManager.getToken(),
  },

  actions: {
    // Centralisation de la gestion auth
    async setAuth(token: string, user: User) {
      TokenManager.setAuth(token, user)
      this.user = user
      
      // Notifier le journal store du changement d'utilisateur
      const { useJournalStore } = await import('./journalStore')
      const journalStore = useJournalStore()
      journalStore.checkUserChange()
    },

    clearAuth() {
      TokenManager.clearAuth()
      this.user = null
      this.tempToken = null
    },

    // Refresh automatique des tokens
    async refreshToken() {
      try {
        const data = await secureJsonCall(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
        })
        
                 if (this.user) {
           TokenManager.setAuth(data.access_token, this.user)
         }
        return true
      } catch (error) {
        console.error('Refresh token failed:', error)
        await this.logout()
        return false
      }
    },

    // Setup refresh automatique
    setupAutoRefresh() {
      const checkAndRefresh = async () => {
        const token = TokenManager.getToken()
        if (!token) return

        // Refresh si le token expire dans moins de 5 minutes
        const expiry = localStorage.getItem('auth_token_expiry')
        if (expiry && Date.now() >= parseInt(expiry) - 5 * 60 * 1000) {
          await this.refreshToken()
        }
      }

      // Vérifier toutes les 2 minutes
      setInterval(checkAndRefresh, 2 * 60 * 1000)
    },

    /* ─────────────────────────── PARENT REGISTER ─────────────────────────── */
    async registerParent(payload: any) {
      this.loading = true
      const notification = useNotificationStore()
      try {
        const data = await secureJsonCall(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        await this.setAuth(data.access_token, data.user)
        notification.showNotification('Inscription réussie', 'success')
        return data
      } catch (err: any) {
        this.error = err.message || 'Erreur lors de l\'inscription parent'
        notification.showNotification(this.error, 'error')
        throw err
      } finally {
        this.loading = false
      }
    },

    /* ─────────────────────────── OTP FLOW ─────────────────────────── */
    async initiateLogin(credentials: { email: string; password: string }) {
      this.loading = true
      const notification = useNotificationStore()
      try {
        console.log('[AUTH STORE] initiateLogin START', { credentials: { email: credentials.email, password: '***' }, API_BASE_URL })
        
        const data = await secureJsonCall(`${API_BASE_URL}/auth/initiate-login`, {
          method: 'POST',
          body: JSON.stringify(credentials),
        })

        console.log('[AUTH STORE] initiateLogin SUCCESS', { data })

        if (data.access_token) {
          this.setAuth(data.access_token, data.user)
        } else if (data.tempToken) {
          this.tempToken = data.tempToken
          notification.showNotification(
            'Identifiants validés. Veuillez saisir votre code OTP.',
            'info',
          )
        }
        return data
      } catch (error: any) {
        console.error('[AUTH STORE] initiateLogin ERROR', { error, message: error.message })
        this.error = error.message || 'Erreur lors de la connexion'
        notification.showNotification(this.error, 'error')
        return {}
      } finally {
        this.loading = false
      }
    },

    async verifyOtp(payload: { tempToken: string; otpCode: string }) {
      this.loading = true
      const notification = useNotificationStore()
      try {
        const data = await secureJsonCall(`${API_BASE_URL}/auth/verify-otp`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        this.setAuth(data.access_token, data.user)
        notification.showNotification('Connexion réussie', 'success')
        return data
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de la vérification OTP'
        notification.showNotification(this.error, 'error')
        return {}
      } finally {
        this.loading = false
      }
    },

    /* ─────────────────────────── LOGIN (avec ou sans OTP) ─────────────────────────── */
    async login(credentials: { email: string; password: string; otpCode?: string }) {
      this.loading = true
      const notification = useNotificationStore()
      try {
        const data = await secureJsonCall(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          body: JSON.stringify(credentials),
        })

        this.setAuth(data.access_token, data.user)
        notification.showNotification('Connexion réussie', 'success')
        return data
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de la connexion'
        notification.showNotification(this.error, 'error')
        return {}
      } finally {
        this.loading = false
      }
    },

    /* ─────────────────────────── SIMPLE REGISTER (staff) ─────────────────────────── */
    async register(data: { email: string; password: string; username?: string }) {
      this.loading = true
      const notification = useNotificationStore()
      try {
        const resData = await secureJsonCall(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          body: JSON.stringify(data),
        })
        notification.showNotification('Inscription réussie', 'success')
        return resData
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de l\'inscription'
        notification.showNotification(this.error, 'error')
        throw error
      } finally {
        this.loading = false
      }
    },

    /* ─────────────────────────── LOGOUT ─────────────────────────── */
    async logout() {
      const notification = useNotificationStore()
      try {
        await secureApiCall(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
        })
      } catch (error) {
        console.error('Erreur lors de la déconnexion', error)
      }
      
      // Vider le cache du journal lors de la déconnexion
      const { useJournalStore } = await import('./journalStore')
      const journalStore = useJournalStore()
      journalStore.resetStore()
      
      this.clearAuth()
      notification.showNotification('Déconnexion réussie', 'success')
    },

    /* ─────────────────────────── PASSWORD FLOWS ─────────────────────────── */
    async forgotPassword(email: string) {
      this.loading = true
      try {
        const response = await fetch('http://localhost:3000/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
          credentials: 'include',
        })
        let resData = {}
        try { resData = await response.json() } catch {}
        if (!response.ok) {
          const errorMessage = (resData as any).message || response.statusText || 'Erreur lors de la réinitialisation'
          throw new Error(errorMessage)
        }
        return { message: 'Si cet email est enregistré, un lien de réinitialisation vous a été envoyé.' }
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de la réinitialisation'
        throw error
      } finally {
        this.loading = false
      }
    },

    async resetPassword(prid: number, token: string, newPassword: string) {
      this.loading = true
      try {
        const response = await fetch('http://localhost:3000/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prid, token, newPassword }),
          credentials: 'include',
        })
        const resData = await response.json()
        if (!response.ok) throw new Error(resData.message || 'Erreur lors de la réinitialisation')
        return { message: 'Votre mot de passe a été réinitialisé avec succès' }
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de la réinitialisation'
        throw error
      } finally {
        this.loading = false
      }
    },

    /* ─────────────────────────── OTP ENABLE / DISABLE ─────────────────────────── */
    async enableOtp() {
      this.loading = true
      const notification = useNotificationStore()
      try {
        const response = await fetch('http://localhost:3000/auth/enable-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': this.token ? `Bearer ${this.token}` : '' },
          credentials: 'include',
        })
        const data = await response.json()
                  if (!response.ok) throw new Error(data.message || 'Erreur lors de l\'activation OTP')

        if (this.user) {
          this.user.otpEnabled = true
          this.user.otpSecret = data.secret
          localStorage.setItem('user', JSON.stringify(this.user))
        }
        notification.showNotification(data.message || 'OTP activé avec succès', 'success')
        return data
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de l'activation OTP'
        notification.showNotification(this.error, 'error')
        return {}
      } finally {
        this.loading = false
      }
    },

    async disableOtp() {
      this.loading = true
      const notification = useNotificationStore()
      try {
        const response = await fetch('http://localhost:3000/auth/disable-otp', {
          method: 'POST',
          headers: { 'Authorization': this.token ? `Bearer ${this.token}` : '' },
          credentials: 'include',
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Erreur lors de la désactivation OTP')

        if (this.user) {
          this.user.otpEnabled = false
          this.user.otpSecret = null
          localStorage.setItem('user', JSON.stringify(this.user))
        }
        this.token = data.access_token
        localStorage.setItem('token', data.access_token)
        notification.showNotification(data.message || 'OTP désactivé avec succès', 'success')
        return data
      } catch (err: any) {
        this.error = err.message || 'Erreur lors de la désactivation OTP'
        notification.showNotification(this.error, 'error')
        return {}
      } finally {
        this.loading = false
      }
    }
  },
})
