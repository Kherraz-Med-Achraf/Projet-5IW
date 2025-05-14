
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    token: null as string | null,
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async login(credentials: { email: string; password: string }) {
      this.loading = true
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Erreur de connexion')
        }

        this.token = data.token
        this.user = data.user
        localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
      } catch (error: any) {
        this.error = error.message || 'Erreur de connexion'
      } finally {
        this.loading = false
      }
    },

    async register(data: { email: string; password: string; username?: string }) {
      this.loading = true
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        const resData = await response.json()

        if (!response.ok) {
          throw new Error(resData.message || "Erreur lors de l'inscription")
        }

        // Optionnel : connecter automatiquement l'utilisateur ou le rediriger après inscription
      } catch (error: any) {
        this.error = error.message || "Erreur lors de l'inscription"
      } finally {
        this.loading = false
      }
    },

    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    async resetPassword(data: { email: string }) {
      this.loading = true
      try {
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        const resData = await response.json()

        if (!response.ok) {
          throw new Error(resData.message || 'Erreur lors de la réinitialisation')
        }

        // Ici, tu peux traiter la réponse de la réinitialisation si nécessaire
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de la réinitialisation'
      } finally {
        this.loading = false
      }
    },

    hydrate() {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      if (token && user) {
        this.token = token
        this.user = JSON.parse(user)
      }
    },
  },
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
})
