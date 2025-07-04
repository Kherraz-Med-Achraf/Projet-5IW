<template>
  <article class="blog-post">
    <!-- En-tête du post -->
    <header class="post-header">
      <div class="author-info">
        <div class="author-avatar">
          {{ authorInitials }}
        </div>
        <div class="author-details">
          <h4 class="author-name">{{ post.author.firstName }} {{ post.author.lastName }}</h4>
          <time class="post-date">{{ formattedDate }}</time>
        </div>
      </div>
      
      <!-- Bouton supprimer pour les utilisateurs autorisés -->
      <button
        v-if="canDelete"
        @click="handleDelete"
        class="delete-btn"
        title="Supprimer le post"
      >
        🗑️
      </button>
    </header>

    <!-- Contenu du post -->
    <div class="post-content">
      <h3 class="post-title">{{ post.title }}</h3>
      <p class="post-description">{{ post.description }}</p>
      
      <!-- Média (image ou vidéo) -->
      <div v-if="post.mediaUrl" class="post-media">
        <img
          v-if="post.mediaType === 'IMAGE'"
          :src="fullMediaUrl"
          :alt="post.title"
          class="post-image"
          @click="openMediaModal"
        />
        <video
          v-else-if="post.mediaType === 'VIDEO'"
          :src="fullMediaUrl"
          controls
          class="post-video"
        ></video>
      </div>
    </div>

    <!-- Réactions -->
    <footer class="post-reactions">
      <div class="reactions-list">
        <button
          v-for="(emoji, reactionType) in reactionEmojis"
          :key="reactionType"
          @click="toggleReaction(reactionType)"
          :class="[
            'reaction-btn',
            { active: post.userReaction === reactionType }
          ]"
          :title="`${getReactionLabel(reactionType)} (${post.reactions[reactionType]})`"
        >
          <span class="emoji">{{ emoji }}</span>
          <span class="count">{{ post.reactions[reactionType] }}</span>
        </button>
      </div>
    </footer>

    <!-- Modal pour l'image en grand -->
    <div v-if="showImageModal" class="image-modal" @click="closeImageModal">
      <div class="modal-content" @click.stop>
        <img :src="fullMediaUrl" :alt="post.title" class="modal-image" />
        <button @click="closeImageModal" class="close-modal">✕</button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBlogStore } from '@/stores/blogStore'

// Props
interface Props {
  post: {
    id: string
    title: string
    description: string
    mediaUrl?: string
    mediaType?: 'IMAGE' | 'VIDEO'
    createdAt: string
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
}

const props = defineProps<Props>()

// Stores
const authStore = useAuthStore()
const blogStore = useBlogStore()

// État local
const showImageModal = ref(false)

// Configuration des réactions - adaptées pour IME et parents
const reactionEmojis = {
  LIKE: '👏',
  HEART: '❤️',
  SMILE: '😊',
  CLAP: '👍',
  PARTY: '🌟',
}

const reactionLabels = {
  LIKE: 'Bravo',
  HEART: 'Touchant',
  SMILE: 'Joyeux',
  CLAP: 'Approuve',
  PARTY: 'Excellent',
}

// Computed
const authorInitials = computed(() => {
  const first = props.post.author.firstName?.[0] || ''
  const last = props.post.author.lastName?.[0] || ''
  return (first + last).toUpperCase()
})

const formattedDate = computed(() => {
  const date = new Date(props.post.createdAt)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const fullMediaUrl = computed(() => {
  if (!props.post.mediaUrl) return ''
  // Si c'est déjà une URL complète, on la retourne
  if (props.post.mediaUrl.startsWith('http')) return props.post.mediaUrl
  // Sinon on ajoute l'URL du serveur
  return `http://localhost:3000${props.post.mediaUrl}`
})

const canDelete = computed(() => {
  const user = authStore.user
  if (!user) return false
  
  // Secrétaire auteur, Directeur ou Service Manager peuvent supprimer
  return (
    user.role === 'DIRECTOR' ||
    user.role === 'SERVICE_MANAGER' ||
    (user.role === 'SECRETARY' && props.post.author.id === user.id)
  )
})

// Méthodes
const toggleReaction = async (reactionType: keyof typeof reactionEmojis) => {
  await blogStore.toggleReaction(props.post.id, reactionType)
}

const getReactionLabel = (reactionType: keyof typeof reactionLabels) => {
  return reactionLabels[reactionType]
}

const handleDelete = async () => {
  const confirmed = confirm('Êtes-vous sûr de vouloir supprimer ce post ?')
  if (confirmed) {
    await blogStore.deletePost(props.post.id)
  }
}

const openMediaModal = () => {
  if (props.post.mediaType === 'IMAGE') {
    showImageModal.value = true
  }
}

const closeImageModal = () => {
  showImageModal.value = false
}
</script>

<style scoped lang="scss">
/* Variables CSS pour cohérence */
:root {
  --primary-color: #4444ac;
  --primary-hover: #3333a0;
  --success-color: #10b981;
  --error-color: #ef4444;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --border-color: #e5e7eb;
  --background-light: #f9fafb;
  --card-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --card-shadow-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.blog-post {
  background: white;
  border-radius: 1rem;
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: all 0.3s ease;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  position: relative;

  &:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    border-color: rgba(68, 68, 172, 0.2);
  }
}

/* En-tête du post - style réseau social */
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: white;
  position: relative;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.author-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--primary-color), #6366f1);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
  border: 2px solid white;
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.author-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.post-date {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.delete-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 1.125rem;
  opacity: 0.7;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.1);
    opacity: 1;
  }

  &:focus {
    outline: 2px solid var(--error-color);
    outline-offset: 2px;
  }
}

/* Contenu du post - style réseau social */
.post-content {
  padding: 0 1.5rem 1.5rem;
}

.post-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.post-description {
  font-size: 1rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0 0 1rem 0;
  white-space: pre-wrap;
}

/* Média - style réseau social */
.post-media {
  margin: 1rem 0;
  border-radius: 0.75rem;
  overflow: hidden;
  background: #f8fafc;
  position: relative;
}

.post-image {
  width: 100%;
  height: auto;
  max-height: 500px;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.3s ease;
  display: block;

  &:hover {
    transform: scale(1.01);
  }
}

.post-video {
  width: 100%;
  height: auto;
  max-height: 500px;
  border-radius: 0.75rem;
}

/* Réactions - style réseau social moderne */
.post-reactions {
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
}

.reactions-list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.reaction-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  min-height: 40px;
  position: relative;
  overflow: hidden;

  &:hover {
    background: #f8fafc;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e1;
  }

  &:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  &.active {
    background: linear-gradient(135deg, var(--primary-color), #6366f1);
    color: white;
    border-color: var(--primary-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(68, 68, 172, 0.4);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s ease;
    }
    
    &:hover::before {
      left: 100%;
    }
  }

  .emoji {
    font-size: 1.25rem;
    line-height: 1;
    display: flex;
    align-items: center;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }

  .count {
    font-weight: 700;
    color: var(--text-secondary);
    min-width: 1.5rem;
    text-align: center;
    font-size: 0.875rem;
  }

  &.active .count {
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
}

/* Modal pour l'image - style moderne */
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  backdrop-filter: blur(8px);
}

.modal-content {
  position: relative;
  max-width: 95%;
  max-height: 95%;
  background: white;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-image {
  width: 100%;
  height: auto;
  max-height: 85vh;
  object-fit: contain;
  display: block;
}

.close-modal {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 44px;
  height: 44px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  font-weight: 400;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.1);
  }

  &:focus {
    outline: 2px solid white;
    outline-offset: 2px;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .post-header {
    padding: 1rem;
  }

  .post-content {
    padding: 1rem;
  }

  .post-reactions {
    padding: 1rem;
  }

  .post-title {
    font-size: 1.25rem;
  }

  .author-avatar {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .reactions-list {
    gap: 0.375rem;
  }

  .reaction-btn {
    padding: 0.375rem 0.625rem;
    font-size: 0.8rem;
  }

  .image-modal {
    padding: 1rem;
  }
}

/* Support du mode contraste élevé */
@media (prefers-contrast: high) {
  .blog-post {
    border-width: 2px;
  }

  .reaction-btn {
    border-width: 2px;
  }

  .reaction-btn.active {
    border-width: 2px;
    border-color: white;
  }
}

/* Support pour les animations réduites */
@media (prefers-reduced-motion: reduce) {
  .blog-post,
  .reaction-btn,
  .post-image,
  .delete-btn,
  .close-modal {
    transition: none;
  }

  .blog-post:hover,
  .reaction-btn:hover,
  .post-image:hover,
  .delete-btn:hover,
  .close-modal:hover {
    transform: none;
  }
}

/* Focus visible pour l'accessibilité */
.blog-post:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
</style> 