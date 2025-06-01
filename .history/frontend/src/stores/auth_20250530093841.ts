import { defineStore } from 'pinia'
import { useNotificationStore } from '@/stores/notificationStore'

interface User {
  id: string
  email: string
  role: string
  // ... autres champs si nécessaire
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // Initialisation : lecture depuis localStorage
    user: JSON.parse(localStorage.getItem('user') || 'null') as User | null,
    token: (localStorage.getItem('token') as string) || null,
    tempToken: null as string | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    // Persistance centralisée
    setAuth(token: string, user: User) {
      this.token = token
      this.user = user
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    clearAuth() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    /* ─────────────────────────── PARENT REGISTER ─────────────────────────── */
    async registerParent(payload: any) {
      this.loading = true
      const notification = useNotificationStore()
      try {
        const res = await fetch('http://localhost:3000/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Erreur inscription parent')

        this.setAuth(data.access_token, data.user)
        notification.showNotification('Inscription réussie', 'success')
        return data
      } catch (err: any) {
        this.error = err.message || 'Erreur inscription parent'
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
        const response = await fetch('http://localhost:3000/auth/initiate-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
          credentials: 'include',
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Erreur lors de la connexion')

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
        const response = await fetch('http://localhost:3000/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Erreur lors de la vérification OTP')

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
        const response = await fetch('http://localhost:3000/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
          credentials: 'include',
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Erreur lors de la connexion')

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
        const response = await fetch('http://localhost:3000/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include',
        })
        const resData = await response.json()
        if (!response.ok) throw new Error(resData.message || "Erreur lors de l'inscription")
        notification.showNotification('Inscription réussie', 'success')
        return resData
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de l'inscription'
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
        await fetch('http://localhost:3000/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
      } catch (error) {
        console.error('Erreur lors de la déconnexion', error)
      }
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

    /* ─────────────────────────── TOKEN REFRESH ─────────────────────────── */
    async refresh() {
      const notification = useNotificationStore()
      try {
        const response = await fetch('http://localhost:3000/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Impossible de rafraîchir le token')

        this.token = data.access_token
        localStorage.setItem('token', this.token)
        notification.showNotification('Token rafraîchi', 'success')
        return true
      } catch (error: any) {
        console.error('Erreur refresh token:', error.message)
        await this.logout()
        notification.showNotification('Session expirée, veuillez vous reconnecter.', 'error')
        return false
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
        if (!response.ok) throw new Error(data.message || 'Erreur lors de l’activation OTP')

        if (this.user) {
          this.user.otpSecret = data.secret
          localStorage.setItem('user', JSON.stringify(this.user))
        }
        notification.showNotification(data.message || 'OTP activé avec succès', 'success')
        return data
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de l’activation OTP'
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
