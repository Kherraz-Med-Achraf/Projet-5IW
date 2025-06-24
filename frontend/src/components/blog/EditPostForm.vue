<template>
  <div class="edit-post-form">
    <form @submit.prevent="handleSubmit" class="post-form">
      <!-- Titre -->
      <div class="form-group">
        <label for="title">Titre du post</label>
        <div class="input-with-ai">
          <input
            id="title"
            v-model="form.title"
            type="text"
            placeholder="Saisissez le titre..."
            required
            maxlength="200"
          />
          <label class="ai-checkbox">
            <input type="checkbox" v-model="form.improveTitleWithAI" />
            <span class="ai-label">🤖 Améliorer avec l'IA</span>
          </label>
        </div>
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="description">Description</label>
        <div class="input-with-ai">
          <textarea
            id="description"
            v-model="form.description"
            placeholder="Décrivez votre post..."
            required
            maxlength="2000"
            rows="5"
          ></textarea>
          <label class="ai-checkbox">
            <input type="checkbox" v-model="form.improveDescriptionWithAI" />
            <span class="ai-label">🤖 Améliorer avec l'IA</span>
          </label>
        </div>
      </div>

      <!-- Média actuel -->
      <div v-if="post.mediaUrl" class="current-media">
        <label>Média actuel</label>
        <div class="media-preview">
          <img 
            v-if="post.mediaType === 'IMAGE'" 
            :src="fullMediaUrl" 
            alt="Média actuel" 
            class="preview-image"
          />
          <video 
            v-else-if="post.mediaType === 'VIDEO'" 
            :src="fullMediaUrl" 
            controls 
            class="preview-video"
          ></video>
        </div>
        <button type="button" @click="removeCurrentMedia" class="btn-remove-media">
          🗑️ Supprimer le média
        </button>
      </div>

      <!-- Upload nouveau média -->
      <div class="form-group">
        <label for="media">{{ post.mediaUrl ? 'Remplacer le média' : 'Ajouter un média' }} (optionnel)</label>
        <div class="file-upload">
          <input
            id="media"
            type="file"
            @change="handleFileChange"
            accept="image/*,video/*"
            ref="fileInput"
          />
          <div v-if="selectedFile" class="file-preview">
            <span>{{ selectedFile.name }}</span>
            <button type="button" @click="removeFile" class="remove-file">❌</button>
          </div>
        </div>
      </div>

      <!-- Aperçu du nouveau média -->
      <div v-if="mediaPreview" class="media-preview">
        <img v-if="isImage" :src="mediaPreview" alt="Aperçu" class="preview-image" />
        <video v-else-if="isVideo" :src="mediaPreview" controls class="preview-video"></video>
      </div>

      <!-- Boutons -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn-secondary">
          Annuler
        </button>
        <button type="submit" :disabled="loading || !form.title || !form.description" class="btn-primary">
          {{ loading ? 'Modification...' : 'Modifier le post' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useBlogStore } from '@/stores/blogStore'

// Props
interface Props {
  post: {
    id: string
    title: string
    description: string
    mediaUrl?: string
    mediaType?: 'IMAGE' | 'VIDEO'
  }
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  postUpdated: []
  cancel: []
}>()

// Store
const blogStore = useBlogStore()

// État local
const form = ref({
  title: '',
  description: '',
  improveTitleWithAI: false,
  improveDescriptionWithAI: false,
})

const selectedFile = ref<File | null>(null)
const mediaPreview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()
const loading = ref(false)
const removeMedia = ref(false)

// Computed
const isImage = computed(() => {
  return selectedFile.value?.type.startsWith('image/') ?? false
})

const isVideo = computed(() => {
  return selectedFile.value?.type.startsWith('video/') ?? false
})

const fullMediaUrl = computed(() => {
  if (!props.post.mediaUrl) return ''
  if (props.post.mediaUrl.startsWith('http')) return props.post.mediaUrl
  return `http://localhost:3000${props.post.mediaUrl}`
})

// Watchers
watch(selectedFile, (newFile) => {
  if (newFile) {
    const reader = new FileReader()
    reader.onload = (e) => {
      mediaPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(newFile)
  } else {
    mediaPreview.value = null
  }
})

// Méthodes
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    
    // Vérifier la taille (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      alert('Le fichier ne peut pas dépasser 50MB')
      return
    }
    
    selectedFile.value = file
  }
}

const removeFile = () => {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const removeCurrentMedia = () => {
  removeMedia.value = true
}

const handleSubmit = async () => {
  loading.value = true
  
  try {
    // Simuler la mise à jour (vous devrez implémenter updatePost dans le store)
    await updatePost()
    
    emit('postUpdated')
  } catch (error) {
    // L'erreur est gérée dans le store
  } finally {
    loading.value = false
  }
}

// Fonction temporaire pour simuler la mise à jour
// Vous devrez l'implémenter dans le store BlogStore
const updatePost = async () => {
  const formData = new FormData()
  formData.append('title', form.value.title)
  formData.append('description', form.value.description)
  
  if (selectedFile.value) {
    formData.append('media', selectedFile.value)
  }
  
  if (removeMedia.value) {
    formData.append('removeMedia', 'true')
  }

  if (form.value.improveTitleWithAI) {
    formData.append('improveTitleWithAI', 'true')
  }

  if (form.value.improveDescriptionWithAI) {
    formData.append('improveDescriptionWithAI', 'true')
  }

  const response = await fetch(`http://localhost:3000/blog/${props.post.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Erreur lors de la modification du post')
  }

  // Recharger les posts
  await blogStore.fetchPosts()
}

// Lifecycle
onMounted(() => {
  // Initialiser le formulaire avec les données du post
  form.value.title = props.post.title
  form.value.description = props.post.description
})
</script>

<style scoped lang="scss">
.edit-post-form {
  .post-form {
    .form-group {
      margin-bottom: 20px;

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #34495e;
      }
    }

    .input-with-ai {
      position: relative;

      input, textarea {
        width: 100%;
        padding: 12px;
        border: 2px solid #e1e8ed;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.3s;

        &:focus {
          outline: none;
          border-color: #3498db;
        }
      }

      textarea {
        resize: vertical;
        min-height: 120px;
      }

      .ai-checkbox {
        position: absolute;
        top: -30px;
        right: 0;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        cursor: pointer;

        input[type="checkbox"] {
          width: auto;
          margin: 0;
        }

        .ai-label {
          color: #7f8c8d;
          font-weight: normal;
        }
      }
    }

    .current-media {
      margin-bottom: 20px;

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #34495e;
      }

      .btn-remove-media {
        padding: 8px 16px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 8px;
        transition: background-color 0.3s;

        &:hover {
          background: #c0392b;
        }
      }
    }

    .file-upload {
      input[type="file"] {
        width: 100%;
        padding: 12px;
        border: 2px dashed #bdc3c7;
        border-radius: 8px;
        background: #f8f9fa;
        cursor: pointer;

        &:hover {
          border-color: #3498db;
        }
      }

      .file-preview {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #ecf0f1;
        padding: 8px 12px;
        border-radius: 6px;
        margin-top: 8px;

        .remove-file {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
        }
      }
    }

    .media-preview {
      margin-top: 16px;
      text-align: center;

      .preview-image {
        max-width: 100%;
        max-height: 300px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .preview-video {
        max-width: 100%;
        max-height: 300px;
        border-radius: 8px;
      }
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;

      .btn-secondary {
        padding: 12px 20px;
        background: #95a5a6;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.3s;

        &:hover {
          background: #7f8c8d;
        }
      }

      .btn-primary {
        padding: 12px 20px;
        background: #f39c12;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.3s;

        &:hover:not(:disabled) {
          background: #e67e22;
        }

        &:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
      }
    }
  }
}
</style> 