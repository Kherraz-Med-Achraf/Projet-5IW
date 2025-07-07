/**
 * Intercepteur HTTP pour gestion automatique des tokens
 */
import { API_ENDPOINTS } from '@/config/api'

interface QueuedRequest {
  resolve: (value: any) => void
  reject: (reason?: any) => void
  config: RequestInit & { url: string }
}

class HttpInterceptor {
  private isRefreshing = false
  private failedQueue: QueuedRequest[] = []

  /**
   * Traite la queue des requêtes en attente
   */
  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject, config }) => {
      if (error) {
        reject(error)
      } else {
        // Retry la requête avec le nouveau token
        if (token) {
          const headers = new Headers(config.headers)
          headers.set('Authorization', `Bearer ${token}`)
          config.headers = headers
        }
        resolve(fetch(config.url, config))
      }
    })
    
    this.failedQueue = []
  }

  /**
   * Refresh le token d'authentification
   */
  private async refreshToken(): Promise<string | null> {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Refresh failed')
      }

      const data = await response.json()
      const newToken = data.access_token
      
      // Mettre à jour le token dans le localStorage
      localStorage.setItem('auth_token', newToken)
      
      return newToken
    } catch (error) {
      // Redirect vers login si refresh échoue
      localStorage.clear()
      window.location.href = '/login'
      throw error
    }
  }

  /**
   * Intercepte les requêtes pour gérer l'authentification
   */
  async intercept(url: string, config: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('auth_token')
    
    // Ajouter le token d'authentification
    if (token) {
      const headers = new Headers(config.headers)
      headers.set('Authorization', `Bearer ${token}`)
      config.headers = headers
    }

    try {
      const response = await fetch(url, config)
      
      // Si erreur 401, tenter un refresh
      if (response.status === 401 && !url.includes('/auth/refresh')) {
        if (this.isRefreshing) {
          // Si refresh en cours, mettre en queue
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject, config: { ...config, url } })
          })
        }

        this.isRefreshing = true

        try {
          const newToken = await this.refreshToken()
          this.isRefreshing = false
          
          // Traiter la queue avec le nouveau token
          this.processQueue(null, newToken)
          
          // Retry la requête originale
          const headers = new Headers(config.headers)
          headers.set('Authorization', `Bearer ${newToken}`)
          return fetch(url, { ...config, headers })
          
        } catch (refreshError) {
          this.isRefreshing = false
          this.processQueue(refreshError)
          throw refreshError
        }
      }

      return response
    } catch (error) {
      throw error
    }
  }
}

// Instance singleton
export const httpInterceptor = new HttpInterceptor()

/**
 * Fetch wrapper avec intercepteur
 */
export async function interceptedFetch(url: string, config?: RequestInit): Promise<Response> {
  return httpInterceptor.intercept(url, config)
} 