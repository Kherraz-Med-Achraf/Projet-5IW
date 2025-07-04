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
        aria-label="Supprimer l'article"
      >
        <i class="material-icons" aria-hidden="true">delete</i>
        <span>Supprimer</span>
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
/* Variables CSS modernes inspirées Behance/Dribbble */
:root {
  --primary-color: #4444ac;
  --primary-hover: #3333a0;
  --success-color: #10b981;
  --error-color: #ef4444;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --background-light: #f8fafc;
  --card-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --card-shadow-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.blog-post {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.06),
    0 1px 0 rgba(255, 255, 255, 0.8) inset;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  font-family: 'Inter', 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  margin-bottom: 32px;
  max-width: 100%;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(99, 102, 241, 0.3) 20%, 
      rgba(139, 92, 246, 0.3) 80%, 
      transparent 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 
      0 32px 64px rgba(0, 0, 0, 0.12),
      0 0 0 1px rgba(99, 102, 241, 0.1);
    
    &::before {
      opacity: 1;
    }
  }
}

/* En-tête épuré style Dribbble */
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 32px 32px 0;
  background: transparent;
  position: relative;
}

.author-info {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
}

.author-avatar {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 
    0 8px 24px rgba(102, 126, 234, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  position: relative;
  transition: all 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 18px;
    z-index: -1;
    opacity: 0;
    filter: blur(8px);
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: scale(1.05) rotate(2deg);
    
    &::after {
      opacity: 0.4;
    }
  }
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}

.author-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.post-date {
  font-size: 14px;
  color: var(--text-muted);
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  
  &::before {
    content: '';
    width: 4px;
    height: 4px;
    background: var(--text-muted);
    border-radius: 50%;
    opacity: 0.5;
  }
}

.delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  font-size: 13px;
  font-weight: 500;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.25);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  i {
    font-size: 16px;
    opacity: 0.8;
  }

  span {
    font-family: inherit;
  }
}

/* Contenu style moderne */
.post-content {
  padding: 24px 32px 0;
}

.post-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  line-height: 1.3;
  letter-spacing: -0.025em;
}

.post-description {
  font-size: 16px;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 24px 0;
  white-space: pre-wrap;
  font-weight: 400;
  letter-spacing: -0.01em;
}

/* Média moderne avec overlay */
.post-media {
  margin: 24px 0 0;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.08),
    0 1px 0 rgba(255, 255, 255, 0.1) inset;
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0.02) 100%
    );
    pointer-events: none;
  }
}

.post-image {
  width: 100%;
  height: auto;
  max-height: 480px;
  object-fit: cover;
  cursor: pointer;
  transition: all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
  display: block;

  &:hover {
    transform: scale(1.05);
  }
}

.post-video {
  width: 100%;
  height: auto;
  max-height: 480px;
  border-radius: 16px;
}

/* Réactions style Behance/Dribbble */
.post-reactions {
  padding: 24px 32px 32px;
  background: transparent;
}

.reactions-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.reaction-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  font-size: 14px;
  font-weight: 500;
  min-height: 44px;
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    transition: left 0.6s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-2px);
    box-shadow: 
      0 8px 24px rgba(0, 0, 0, 0.12),
      0 0 0 1px rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.2);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(-1px);
  }

  &.active {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border-color: transparent;
    transform: translateY(-2px);
    box-shadow: 
      0 8px 24px rgba(99, 102, 241, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.2) inset;
    
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.2) 0%,
        transparent 50%,
        rgba(255, 255, 255, 0.1) 100%
      );
      border-radius: inherit;
      pointer-events: none;
    }
  }

  .emoji {
    font-size: 20px;
    line-height: 1;
    display: flex;
    align-items: center;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:hover .emoji {
    transform: scale(1.2) rotate(5deg);
  }

  .count {
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 20px;
    text-align: center;
    font-size: 14px;
    background: rgba(248, 250, 252, 0.8);
    padding: 4px 8px;
    border-radius: 8px;
    transition: all 0.3s ease;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(226, 232, 240, 0.5);
  }

  &.active .count {
    color: white;
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  &:hover .count {
    background: rgba(241, 245, 249, 0.9);
    border-color: rgba(203, 213, 225, 0.8);
  }

  &.active:hover .count {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.4);
  }
}

/* Modal premium */
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 32px;
  backdrop-filter: blur(20px);
  animation: modalFadeIn 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

@keyframes modalFadeIn {
  from { 
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to { 
    opacity: 1;
    backdrop-filter: blur(20px);
  }
}

.modal-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 
    0 32px 64px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  animation: modalSlideUp 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

@keyframes modalSlideUp {
  from { 
    opacity: 0;
    transform: translateY(32px) scale(0.96);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: rgba(15, 23, 42, 0.8);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.3s ease;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    background: rgba(15, 23, 42, 0.9);
    transform: scale(1.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:active {
    transform: scale(1.05);
  }
}

/* Responsive moderne */
@media (max-width: 768px) {
  .post-header {
    padding: 24px 24px 0;
  }

  .post-content {
    padding: 20px 24px 0;
  }

  .post-reactions {
    padding: 20px 24px 24px;
  }

  .post-title {
    font-size: 20px;
  }

  .post-description {
    font-size: 15px;
  }

  .author-avatar {
    width: 44px;
    height: 44px;
    font-size: 16px;
  }

  .reactions-list {
    gap: 8px;
  }

  .reaction-btn {
    padding: 10px 16px;
    font-size: 13px;
    gap: 6px;
  }

  .delete-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  .image-modal {
    padding: 20px;
  }

  .blog-post {
    border-radius: 20px;
    margin-bottom: 24px;
  }
}

/* Accessibilité et préférences utilisateur */
@media (prefers-contrast: high) {
  .blog-post {
    border: 2px solid var(--border-color);
    background: white;
  }

  .reaction-btn {
    border-width: 2px;
  }

  .reaction-btn.active {
    border: 2px solid white;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }

  .blog-post:hover {
    transform: none;
  }

  .reaction-btn:hover,
  .author-avatar:hover {
    transform: none;
  }
}

/* Focus states améliorés */
.blog-post:focus-visible,
.reaction-btn:focus-visible,
.delete-btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
</style> 