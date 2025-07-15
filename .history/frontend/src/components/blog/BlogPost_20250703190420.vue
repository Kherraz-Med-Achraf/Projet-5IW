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

// Configuration des réactions
const reactionEmojis = {
  LIKE: '👍',
  HEART: '💖',
  SMILE: '😍',
  CLAP: '🔥',
  PARTY: '💯',
}

const reactionLabels = {
  LIKE: 'J\'aime',
  HEART: 'J\'adore',
  SMILE: 'Magnifique',
  CLAP: 'Fantastique',
  PARTY: 'Parfait',
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

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-shadow-hover);
  }
}

/* En-tête du post */
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
}

.author-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.author-avatar {
  width: 48px;
  height: 48px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(68, 68, 172, 0.2);
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.author-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.post-date {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.delete-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 1rem;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.05);
  }

  &:focus {
    outline: 2px solid var(--error-color);
    outline-offset: 2px;
  }
}

/* Contenu du post */
.post-content {
  padding: 1.5rem;
}

.post-title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  line-height: 1.3;
}

.post-description {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
}

/* Média */
.post-media {
  margin-top: 1.5rem;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.post-image {
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.3s ease;
  display: block;

  &:hover {
    transform: scale(1.02);
  }
}

.post-video {
  width: 100%;
  height: auto;
  max-height: 400px;
  border-radius: 0.75rem;
}

/* Réactions */
.post-reactions {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--background-light);
}

.reactions-list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.reaction-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: 2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  min-height: 36px;

  &:hover {
    background: var(--background-light);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  &.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(68, 68, 172, 0.3);
  }

  .emoji {
    font-size: 1.125rem;
    line-height: 1;
    display: flex;
    align-items: center;
  }

  .count {
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 1.25rem;
    text-align: center;
  }

  &.active .count {
    color: white;
  }
}

/* Modal pour l'image */
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  backdrop-filter: blur(4px);
}

.modal-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  background: white;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-image {
  width: 100%;
  height: auto;
  max-height: 80vh;
  object-fit: contain;
  display: block;
}

.close-modal {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

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