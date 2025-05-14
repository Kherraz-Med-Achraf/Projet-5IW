import { defineStore } from 'pinia'
import { useNotificationStore } from '@/stores/notificationStore'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    token: null as string | null,
    tempToken: null as string | null,
    loading: false,
    error: null as string | null,
  }),

  actions: {
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
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de la connexion')
        }
        if (data.access_token) {
          this.token = data.access_token
          this.user = data.user
          localStorage.setItem('token', this.token)
          localStorage.setItem('user', JSON.stringify(this.user))
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
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de la vérification OTP')
        }
        this.token = data.access_token
        this.user = data.user
        localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
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
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de la connexion')
        }
        this.token = data.access_token
        this.user = data.user
        localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
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
        if (!response.ok) {
          throw new Error(resData.message || "Erreur lors de l'inscription")
        }
        return resData
      } catch (error: any) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },


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
      this.user = null
      this.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      notification.showNotification('Déconnexion réussie', 'success')
    },

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
        if (!response.ok) {
          throw new Error(resData.message || 'Erreur lors de la réinitialisation')
        }
        return { message: 'Votre mot de passe a été réinitialisé avec succès' }
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de la réinitialisation'
        throw error
      } finally {
        this.loading = false
      }
    },

    async refresh() {
      const notification = useNotificationStore()
      try {
        const response = await fetch('http://localhost:3000/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Impossible de rafraîchir le token')
        }
        this.token = data.access_token
        localStorage.setItem('token', this.token)
        notification.showNotification('Token rafraîchi', 'success')
        return true
      } catch (error: any) {
        console.error('Erreur refresh token:', error.message)
        this.logout()
        notification.showNotification('Session expirée, veuillez vous reconnecter.', 'error')
        return false
      }
    },

    async enableOtp() {
      const notification = useNotificationStore()
      this.loading = true
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('http://localhost:3000/auth/enable-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
          credentials: 'include',
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de l’activation OTP')
        }
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
      const notification = useNotificationStore()
      this.loading = true
      try {
        const token = this.token!      
        const response = await fetch('http://localhost:3000/auth/disable-otp', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        })
    
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de la désactivation OTP')
        }
    
        // maj user local
        if (this.user) {
          this.user.otpSecret = null
          localStorage.setItem('user', JSON.stringify(this.user))
        }
    
        // maj access_token stocké
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
    },    
    

    async hydrate() {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      if (token && user) {
        this.token = token
        this.user = JSON.parse(user)
        // On ne rafraîchit plus automatiquement
      }
    },
  },

  getters: {
    isAuthenticated: (state) => !!state.token,
  },
})
