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
  HEART: '❤️',
  SMILE: '😊',
  CLAP: '👏',
  PARTY: '🎉',
}

const reactionLabels = {
  LIKE: 'J\'aime',
  HEART: 'Cœur',
  SMILE: 'Sourire',
  CLAP: 'Applaudissement',
  PARTY: 'Fête',
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
.blog-post {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .author-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .author-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3498db, #2c3e50);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .author-details {
      .author-name {
        margin: 0;
        font-size: 16px;
        color: #2c3e50;
        font-weight: 600;
      }

      .post-date {
        font-size: 13px;
        color: #7f8c8d;
      }
    }
  }

  .delete-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background-color 0.2s;

    &:hover {
      background: #ff6b6b;
      color: white;
    }
  }
}

.post-content {
  .post-title {
    margin: 0 0 12px 0;
    font-size: 20px;
    color: #2c3e50;
    line-height: 1.3;
  }

  .post-description {
    margin: 0 0 16px 0;
    color: #34495e;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .post-media {
    margin-top: 16px;
    text-align: center;

    .post-image {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: scale(1.02);
      }
    }

    .post-video {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
  }
}

.post-reactions {
  border-top: 1px solid #ecf0f1;
  padding-top: 16px;
  margin-top: 16px;

  .reactions-list {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    .reaction-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border: 2px solid #e1e8ed;
      border-radius: 20px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;

      .emoji {
        font-size: 16px;
      }

      .count {
        color: #7f8c8d;
        font-weight: 600;
        min-width: 14px;
      }

      &:hover {
        border-color: #3498db;
        background: #f8f9fa;
      }

      &.active {
        border-color: #3498db;
        background: #3498db;
        color: white;

        .count {
          color: white;
        }
      }
    }
  }
}

// Modal pour l'image
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

  .modal-content {
    position: relative;
    max-width: 90%;
    max-height: 90%;

    .modal-image {
      max-width: 100%;
      max-height: 100%;
      border-radius: 8px;
    }

    .close-modal {
      position: absolute;
      top: -40px;
      right: 0;
      background: white;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

// Responsive
@media (max-width: 768px) {
  .blog-post {
    padding: 16px;
    margin-bottom: 16px;
  }

  .post-content .post-title {
    font-size: 18px;
  }

  .post-reactions .reactions-list {
    gap: 6px;

    .reaction-btn {
      padding: 6px 10px;
      font-size: 13px;

      .emoji {
        font-size: 14px;
      }
    }
  }
}
</style> 