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
          // On reste en mode localStorage (pas de credentials: 'include')
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de la connexion')
        }
        // Si un access_token est renvoyé, l'OTP est désactivé : on stocke le token, l'utilisateur et le refresh_token
        if (data.access_token) {
          this.token = data.access_token
          this.user = data.user
          localStorage.setItem('token', this.token)
          localStorage.setItem('user', JSON.stringify(this.user))
          localStorage.setItem('refresh_token', data.refresh_token)
        } else if (data.tempToken) {
          // Sinon, c'est que l'OTP est activé et on reçoit un tempToken pour la vérification OTP
          this.tempToken = data.tempToken
          notification.showNotification('Identifiants validés. Veuillez saisir votre code OTP.', 'info')
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
          // Pas de credentials: 'include' ici
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de la vérification OTP')
        }
        this.token = data.access_token
        this.user = data.user
        localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('refresh_token', data.refresh_token)
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
          // Utilise le mode sans credentials pour se baser uniquement sur le localStorage
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de la connexion')
        }
        this.token = data.access_token
        this.user = data.user
        localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('refresh_token', data.refresh_token)
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
          // Pour l'inscription, on peut garder credentials: 'include' si nécessaire
          credentials: 'include',
        })
        const resData = await response.json()
        if (!response.ok) {
          throw new Error(resData.message || "Erreur lors de l'inscription")
        }
        notification.showNotification('Inscription réussie', 'success')
      } catch (error: any) {
        this.error = error.message || "Erreur lors de l'inscription"
        notification.showNotification(this.error, 'error')
      } finally {
        this.loading = false
      }
    },

    async logout() {
      const notification = useNotificationStore()
      const token = localStorage.getItem('token')
      try {
        await fetch('http://localhost:3000/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        })
      } catch (error) {
        console.error('Erreur lors de la déconnexion', error)
      }
    
      this.user  = null
      this.token = null
    
      // on enlève TOUT ce qui touche à la session
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      localStorage.removeItem('jwt')
      localStorage.removeItem('role')
      localStorage.removeItem('sessionId')
      localStorage.removeItem('userId')
    
      notification.showNotification('Déconnexion réussie', 'success')
    }
    
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
        try {
          resData = await response.json()
        } catch (e) {}
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
        // Récupère le refresh token depuis le localStorage
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('Refresh token manquant')
        }
        const response = await fetch('http://localhost:3000/auth/refresh', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-refresh-token': refreshToken,
          },
          // Pas de credentials: 'include'
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Impossible de rafraîchir le token')
        }
        this.token = data.access_token
        localStorage.setItem('token', this.token)
        // Met à jour le refresh token aussi
        localStorage.setItem('refresh_token', data.refresh_token)
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          // Pas de credentials: 'include'
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
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('http://localhost:3000/auth/disable-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          // Pas de credentials: 'include'
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de la désactivation OTP')
        }
        if (this.user) {
          this.user.otpSecret = null
          localStorage.setItem('user', JSON.stringify(this.user))
        }
        notification.showNotification(data.message || 'OTP désactivé avec succès', 'success')
        return data
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de la désactivation OTP'
        notification.showNotification(this.error, 'error')
        return {}
      }
    },

    async hydrate() {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      if (token && user) {
        this.token = token
        this.user = JSON.parse(user)
        await this.refresh()
      }
    },
  },

  getters: {
    isAuthenticated: (state) => !!state.token,
  },
})
