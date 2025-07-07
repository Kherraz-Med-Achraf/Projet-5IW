import { defineStore } from 'pinia'
import { useNotificationStore } from '@/stores/notificationStore'

interface BlogPost {
  id: string
  title: string
  description: string
  mediaUrl?: string
  mediaType?: 'IMAGE' | 'VIDEO'
  createdAt: string
  updatedAt: string
  author: {
    id: string
    firstName: string
    lastName: string
  }
  reactions: {
    LIKE: number
    HEART: number
    SMILE: number
    CLAP: number
    PARTY: number
  }
  userReaction?: 'LIKE' | 'HEART' | 'SMILE' | 'CLAP' | 'PARTY'
}

interface CreatePostData {
  title: string
  description: string
  media?: File
}

export const useBlogStore = defineStore('blog', {
  state: () => ({
    posts: [] as BlogPost[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    sortedPosts: (state) => {
      return [...state.posts].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    },
  },

  actions: {
    /**
     * Récupérer tous les posts
     */
    async fetchPosts() {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch('http://localhost:3000/blog', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        })

        if (!response.ok) {
          throw new Error('Erreur lors du chargement des posts')
        }

        const posts = await response.json()
        this.posts = posts
      } catch (error: any) {
        this.error = error.message
        const notification = useNotificationStore()
        notification.showNotification('Erreur lors du chargement des posts', 'error')
      } finally {
        this.loading = false
      }
    },

    /**
     * Créer un nouveau post
     */
    async createPost(data: CreatePostData) {
      this.loading = true
      this.error = null
      const notification = useNotificationStore()

      try {
        const formData = new FormData()
        formData.append('title', data.title)
        formData.append('description', data.description)
        
        if (data.media) {
          formData.append('media', data.media)
        }

        const response = await fetch('http://localhost:3000/blog', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erreur lors de la création du post')
        }

        const newPost = await response.json()
        // Recharger tous les posts depuis le serveur pour garantir la cohérence
        await this.fetchPosts()
        
        notification.showNotification('Post créé avec succès !', 'success')
        return newPost
      } catch (error: any) {
        this.error = error.message
        notification.showNotification(this.error, 'error')
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Ajouter ou modifier une réaction
     */
    async toggleReaction(postId: string, reactionType: 'LIKE' | 'HEART' | 'SMILE' | 'CLAP' | 'PARTY') {
      try {
        const response = await fetch(`http://localhost:3000/blog/${postId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ type: reactionType }),
        })

        if (!response.ok) {
          throw new Error('Erreur lors de la réaction')
        }

        // Recharger les posts pour avoir les dernières données
        await this.fetchPosts()
      } catch (error: any) {
        const notification = useNotificationStore()
        notification.showNotification('Erreur lors de la réaction', 'error')
      }
    },

    /**
     * Supprimer un post
     */
    async deletePost(postId: string) {
      const notification = useNotificationStore()

      try {
        const response = await fetch(`http://localhost:3000/blog/${postId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        })

        if (!response.ok) {
          throw new Error('Erreur lors de la suppression')
        }

        // Supprimer le post de la liste locale
        this.posts = this.posts.filter(post => post.id !== postId)
        
        notification.showNotification('Post supprimé avec succès', 'success')
      } catch (error: any) {
        notification.showNotification('Erreur lors de la suppression', 'error')
      }
    },

    /**
     * Nettoyer l'état
     */
    clearError() {
      this.error = null
    },
  },
}) 