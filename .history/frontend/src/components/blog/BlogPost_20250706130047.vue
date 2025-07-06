<template>
  <article class="blog-post">
    <!-- En-tête du post -->
    <header class="post-header">
      <div class="author-info">
        <div class="author-avatar">
          {{ authorInitials }}
        </div>
        <div class="author-details">
          <h4 class="author-name">{{ authorDisplayName }}</h4>
          <time class="post-date">{{ formattedDate }}</time>
        </div>
      </div>
      
      <!-- Bouton supprimer pour les utilisateurs autorisés -->
      <button
        v-if="canDelete"
        type="button"
        @click.prevent="handleDelete"
        class="delete-btn"
        aria-label="Supprimer l'article"
        :aria-describedby="`delete-help-${post.id}`"
      >
        <i class="material-icons" aria-hidden="true">delete</i>
        <span>Supprimer</span>
        <span :id="`delete-help-${post.id}`" class="sr-only">
          Supprimer définitivement cet article du blog
        </span>
      </button>
    </header>

    <!-- Contenu du post -->
    <div class="post-content">
      <h3 class="post-title" v-text="post.title"></h3>
      <p class="post-description" v-text="post.description"></p>
      
            <!-- Média (image ou vidéo) -->
      <div v-if="post.mediaUrl" class="post-media">
        <img
          v-if="post.mediaType === 'IMAGE'"
          :src="fullMediaUrl"
          alt="Image illustrant l'article"
          class="post-image"
          @click="openMediaModal"
          @keydown.enter="openMediaModal"
          @keydown.space="openMediaModal"
          tabindex="0"
          role="button"
          aria-label="Voir l'image en grand"
        />
        <video
          v-else-if="post.mediaType === 'VIDEO'"
          :src="fullMediaUrl"
          controls
          class="post-video"
          aria-label="Vidéo de l'article"
        ></video>
      </div>
    </div>

    <!-- Réactions -->
    <div class="reactions" role="group" aria-label="Réactions au post">
      <button 
        v-for="(reaction, key) in reactions" 
        :key="key"
        :aria-label="`${reaction.label} - ${post.reactions[key]} réactions${post.userReaction === key ? ' (votre réaction)' : ''}`"
        :class="['reaction-btn', { active: post.userReaction === key }]"
        @click="toggleReaction(key)"
        @keydown.enter="toggleReaction(key)"
        @keydown.space="toggleReaction(key)"
      >
        <span class="reaction-emoji" aria-hidden="true">{{ reaction.emoji }}</span>
        <span class="reaction-label">{{ reaction.label }}</span>
        <span class="reaction-count">{{ post.reactions[key] }}</span>
      </button>
    </div>



    <!-- Modal pour l'image en grand -->
    <div 
      v-if="showImageModal" 
      class="image-modal" 
      @click="closeImageModal"
      @keydown.escape="closeImageModal"
      role="dialog"
      aria-modal="true"
      aria-label="Image agrandie"
      tabindex="-1"
    >
      <div class="modal-content" @click.stop>
        <img 
          :src="fullMediaUrl" 
          alt="Image agrandie de l'article" 
          class="modal-image" 
        />
        <button 
          type="button" 
          @click.prevent="closeImageModal" 
          class="close-modal"
          aria-label="Fermer la vue agrandie"
          title="Fermer (Échap)"
        >
          <i class="material-icons" aria-hidden="true">close</i>
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBlogStore } from '@/stores/blogStore'
import { ReactionType } from '@/types/blog'

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
    userReaction?: ReactionType
  }
}

const props = defineProps<Props>()

// Stores
const authStore = useAuthStore()
const blogStore = useBlogStore()

// État local
const showImageModal = ref(false)
const showDeleteModal = ref(false)

// Réactions avec labels pour l'accessibilité
const reactions = {
  LIKE: { emoji: '👏', label: 'Bravo' },
  HEART: { emoji: '❤️', label: 'Touchant' },
  SMILE: { emoji: '😊', label: 'Joyeux' },
  CLAP: { emoji: '👍', label: 'Approuve' },
  PARTY: { emoji: '🌟', label: 'Excellent' }
}

// Computed
const shouldHideAuthorInfo = computed(() => {
  const userRole = authStore.user?.role
  return userRole === 'PARENT' || userRole === 'CHILD'
})

const authorDisplayName = computed(() => {
  if (shouldHideAuthorInfo.value) {
    return 'Apajh94'
  }
  return `${props.post.author.firstName} ${props.post.author.lastName}`
})

const authorInitials = computed(() => {
  if (shouldHideAuthorInfo.value) {
    return 'AP'
  }
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
  const userRole = authStore.user?.role
  const isAuthor = authStore.user?.id === props.post.author.id
  
  return userRole === 'ADMIN' || 
         userRole === 'DIRECTOR' || 
         (userRole === 'SERVICE_MANAGER' && isAuthor) ||
         (userRole === 'SECRETARY' && isAuthor)
})

// Méthodes
const toggleReaction = async (reactionType: ReactionType) => {
  try {
    await blogStore.toggleReaction(props.post.id, reactionType)
  } catch (error) {
    console.error('Erreur lors de la réaction:', error)
  }
}

const handleDelete = async () => {
  const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer le post "${props.post.title}" ?`)
  if (!confirmed) return

  try {
    await blogStore.deletePost(props.post.id)
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
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
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  position: relative;
  margin-bottom: 2rem;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #4444ac 0%, #6366f1 50%, #8b5cf6 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    border-color: rgba(68, 68, 172, 0.3);
    
    &::before {
      opacity: 1;
    }
  }
}

/* En-tête du post - design moderne */
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  position: relative;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex: 1;
}

.author-avatar {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #4444ac 0%, #6366f1 50%, #8b5cf6 100%);
  color: white;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
  flex-shrink: 0;
  box-shadow: 0 8px 16px rgba(68, 68, 172, 0.3);
  border: 3px solid white;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, #4444ac, #6366f1, #8b5cf6);
    border-radius: 1.2rem;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover::before {
    opacity: 0.7;
  }
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.author-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  background: linear-gradient(135deg, #1f2937 0%, #4444ac 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.post-date {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '📅';
    font-size: 0.75rem;
  }
}

.delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);

  &:hover {
    background: linear-gradient(135deg, #fecaca 0%, #f87171 100%);
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }

  &:focus {
    outline: 2px solid #dc2626;
    outline-offset: 2px;
  }

  i {
    font-size: 1rem;
  }

  span {
    font-family: 'Satoshi', sans-serif;
  }
}

/* Contenu du post - design moderne */
.post-content {
  padding: 0 2rem 2rem;
}

.post-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  line-height: 1.3;
  background: linear-gradient(135deg, #1f2937 0%, #4444ac 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.post-description {
  font-size: 1.125rem;
  color: #374151;
  line-height: 1.7;
  margin: 0 0 1.5rem 0;
  white-space: pre-wrap;
  font-weight: 400;
}

/* Média - design moderne */
.post-media {
  margin: 1.5rem 0;
  border-radius: 1rem;
  overflow: hidden;
  background: #f1f5f9;
  position: relative;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.post-image {
  width: 100%;
  height: auto;
  max-height: 500px;
  object-fit: cover;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;

  &:hover {
    transform: scale(1.02);
  }
}

.post-video {
  width: 100%;
  height: auto;
  max-height: 500px;
  border-radius: 1rem;
}

/* Réactions - design moderne adapté IME */
.reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1.5rem 2rem 2rem;
  border-top: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.reaction-btn {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1.25rem;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 2rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
  font-weight: 600;
  min-height: 44px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.6s ease;
  }

  &:hover {
    background: #f8fafc;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-color: #cbd5e1;

    &::before {
      left: 100%;
    }
  }

  &:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  &.active {
    background: linear-gradient(135deg, #4444ac 0%, #6366f1 100%);
    color: white;
    border-color: #4444ac;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(68, 68, 172, 0.4);
    
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
      border-radius: inherit;
      pointer-events: none;
    }
  }

  .reaction-emoji {
    font-size: 1.375rem;
    line-height: 1;
    display: flex;
    align-items: center;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    transition: transform 0.3s ease;
  }

  &:hover .reaction-emoji {
    transform: scale(1.1);
  }

  .reaction-label {
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin: 0 0.25rem;
    transition: all 0.3s ease;
  }

  .reaction-count {
    font-weight: 700;
    color: var(--text-secondary);
    min-width: 1.5rem;
    text-align: center;
    font-size: 0.875rem;
    background: #f1f5f9;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    transition: all 0.3s ease;
  }

  &.active .reaction-label {
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  &.active .reaction-count {
    color: white;
    background: rgba(255, 255, 255, 0.2);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  &:hover .reaction-label {
    color: var(--text-primary);
  }

  &:hover .reaction-count {
    background: #e2e8f0;
  }

  &.active:hover .reaction-label {
    color: white;
  }

  &.active:hover .reaction-count {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Amélioration du focus pour l'accessibilité */
  &:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(68, 68, 172, 0.2);
  }
}

/* Modal pour l'image - design moderne */
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  backdrop-filter: blur(12px);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  position: relative;
  max-width: 95%;
  max-height: 95%;
  background: white;
  border-radius: 1.5rem;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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
  top: 1.5rem;
  right: 1.5rem;
  width: 48px;
  height: 48px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: all 0.3s ease;
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
    padding: 1.5rem;
  }

  .post-content {
    padding: 0 1.5rem 1.5rem;
  }

  .post-reactions {
    padding: 1.25rem 1.5rem 1.5rem;
  }

  .post-title {
    font-size: 1.25rem;
  }

  .author-avatar {
    width: 48px;
    height: 48px;
    font-size: 1.1rem;
  }

  .reactions-list {
    gap: 0.5rem;
    justify-content: center;
  }

  .reaction-btn {
    padding: 0.625rem 1rem;
    font-size: 0.8rem;
    gap: 0.5rem;
  }

  .delete-btn {
    padding: 0.375rem 0.75rem;
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
    border-width: 3px;
  }

  .reaction-btn.active {
    border-width: 3px;
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

  .image-modal,
  .modal-content {
    animation: none;
  }
}

/* Focus visible pour l'accessibilité */
.blog-post:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
</style> 