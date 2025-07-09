<template>
  <div class="edit-post-form">
    <form @submit.prevent="handleSubmit" class="post-form">
      <!-- Titre -->
      <div class="form-group">
        <label for="title" class="form-label">
          <i class="material-icons" aria-hidden="true">title</i>
          Titre du post
          <span class="required" aria-label="obligatoire">*</span>
        </label>
        <div class="input-container">
          <input
            id="title"
            v-model="form.title"
            type="text"
            placeholder="Saisissez le titre du post..."
            required
            maxlength="200"
            class="form-input"
          />
        </div>

        <!-- AI Helper pour le titre -->
        <div class="ai-helper-modern" role="region" aria-labelledby="ai-title-title">
          <div class="ai-toggle">
            <h4 id="ai-title-title" class="sr-only">Assistant IA pour le titre</h4>
            <label class="ai-switch" for="title-ai">
              <input
                type="checkbox"
                id="title-ai"
                v-model="titlePropose"
                @change="onProposeTitle"
                class="switch-input"
                :aria-describedby="titleGenerating ? 'ai-title-generating' : 'ai-title-description'"
                :disabled="titleGenerating"
              />
              <span class="switch-slider" aria-hidden="true"></span>
              <span class="sr-only">Activer l'assistant IA pour améliorer le titre</span>
            </label>
            <div class="ai-label">
              <span class="material-icons" aria-hidden="true">psychology</span>
              <span>Assistant IA</span>
            </div>
          </div>
          <div id="ai-title-description" class="ai-help-text">
            L'IA peut vous proposer des améliorations pour rendre ce titre plus accrocheur
          </div>

          <div v-if="titleGenerating" class="ai-loading" role="status" aria-live="polite">
            <div class="ai-spinner" aria-hidden="true"></div>
            <span id="ai-title-generating">Génération en cours...</span>
          </div>
        </div>

        <!-- AI Proposal pour le titre -->
        <div
          v-if="titleProposal && !titleGenerating"
          class="ai-suggestion"
          role="region"
          aria-labelledby="ai-title-suggestion-title"
        >
          <header class="suggestion-header">
            <span class="material-icons" aria-hidden="true">lightbulb</span>
            <h4 id="ai-title-suggestion-title">Suggestion d'amélioration</h4>
          </header>
          <div class="suggestion-text" role="article">{{ titleProposal }}</div>
          
          <div class="suggestion-actions" role="group" aria-label="Actions pour la suggestion de titre">
            <button
              @click="acceptTitleProposal"
              class="edit-btn edit-btn-success edit-btn-sm"
              type="button"
              aria-describedby="accept-title-help"
            >
              <span class="material-icons" aria-hidden="true">check</span>
              Appliquer
            </button>
            <div id="accept-title-help" class="sr-only">
              Remplace le titre actuel par la suggestion IA
            </div>
            <button
              @click="titleProposal = null; titlePropose = false"
              class="edit-btn edit-btn-custom edit-btn-sm"
              type="button"
            >
              <span class="material-icons" aria-hidden="true">close</span>
              Ignorer
              <span class="sr-only">la suggestion</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="description" class="form-label">
          <i class="material-icons" aria-hidden="true">description</i>
          Description
          <span class="required" aria-label="obligatoire">*</span>
        </label>
        <div class="input-container">
          <textarea
            id="description"
            v-model="form.description"
            placeholder="Décrivez votre post..."
            required
            maxlength="2000"
            rows="4"
            class="form-textarea"
          ></textarea>
        </div>

        <!-- AI Helper pour la description -->
        <div class="ai-helper-modern" role="region" aria-labelledby="ai-desc-title">
          <div class="ai-toggle">
            <h4 id="ai-desc-title" class="sr-only">Assistant IA pour la description</h4>
            <label class="ai-switch" for="desc-ai">
              <input
                type="checkbox"
                id="desc-ai"
                v-model="descriptionPropose"
                @change="onProposeDescription"
                class="switch-input"
                :aria-describedby="descriptionGenerating ? 'ai-desc-generating' : 'ai-desc-description'"
                :disabled="descriptionGenerating"
              />
              <span class="switch-slider" aria-hidden="true"></span>
              <span class="sr-only">Activer l'assistant IA pour améliorer la description</span>
            </label>
            <div class="ai-label">
              <span class="material-icons" aria-hidden="true">psychology</span>
              <span>Assistant IA</span>
            </div>
          </div>
          <div id="ai-desc-description" class="ai-help-text">
            L'IA peut vous proposer des améliorations pour rendre cette description plus engageante
          </div>

          <div v-if="descriptionGenerating" class="ai-loading" role="status" aria-live="polite">
            <div class="ai-spinner" aria-hidden="true"></div>
            <span id="ai-desc-generating">Génération en cours...</span>
          </div>
        </div>

        <!-- AI Proposal pour la description -->
        <div
          v-if="descriptionProposal && !descriptionGenerating"
          class="ai-suggestion"
          role="region"
          aria-labelledby="ai-desc-suggestion-title"
        >
          <header class="suggestion-header">
            <span class="material-icons" aria-hidden="true">lightbulb</span>
            <h4 id="ai-desc-suggestion-title">Suggestion d'amélioration</h4>
          </header>
          <div class="suggestion-text" role="article">{{ descriptionProposal }}</div>
          
          <div class="suggestion-actions" role="group" aria-label="Actions pour la suggestion de description">
            <button
              @click="acceptDescriptionProposal"
              class="edit-btn edit-btn-success edit-btn-sm"
              type="button"
              aria-describedby="accept-desc-help"
            >
              <span class="material-icons" aria-hidden="true">check</span>
              Appliquer
            </button>
            <div id="accept-desc-help" class="sr-only">
              Remplace la description actuelle par la suggestion IA
            </div>
            <button
              @click="descriptionProposal = null; descriptionPropose = false"
              class="edit-btn edit-btn-custom edit-btn-sm"
              type="button"
            >
              <span class="material-icons" aria-hidden="true">close</span>
              Ignorer
              <span class="sr-only">la suggestion</span>
            </button>
          </div>
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
import { AuthService } from '@/utils/auth'
import { API_BASE_URL } from '@/config/api'
import { secureApiCall } from '@/utils/api'

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
const removeMedia = ref(false)
const loading = ref(false)
const fileInput = ref<HTMLInputElement>()

// États IA pour le titre
const titlePropose = ref(false)
const titleGenerating = ref(false)
const titleProposal = ref<string | null>(null)

// États IA pour la description
const descriptionPropose = ref(false)
const descriptionGenerating = ref(false)
const descriptionProposal = ref<string | null>(null)

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
  return `${API_BASE_URL}${props.post.mediaUrl}`
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

// Méthodes IA
const onProposeTitle = async () => {
  if (!titlePropose.value) {
    titleProposal.value = null
    titleGenerating.value = false
    return
  }

  if (!form.value.title.trim()) {
    alert("Veuillez d'abord saisir un titre avant de demander une amélioration.")
    titlePropose.value = false
    return
  }

  titleGenerating.value = true
  titleProposal.value = null

  try {
    const response = await secureApiCall(`${API_BASE_URL}/ai/mission-improve`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: form.value.title,
        type: 'blog',
        subType: 'title'
      }),
    })

    if (!response.ok) {
      throw new Error('Erreur lors de la génération de la suggestion')
    }

    const data = await response.json()
    titleProposal.value = data.suggestion
  } catch (error: any) {
    console.error('Erreur IA titre:', error)
    alert("Erreur lors de la génération de l'amélioration : " + error.message)
    titlePropose.value = false
  } finally {
    titleGenerating.value = false
  }
}

const onProposeDescription = async () => {
  if (!descriptionPropose.value) {
    descriptionProposal.value = null
    descriptionGenerating.value = false
    return
  }

  if (!form.value.description.trim()) {
    alert("Veuillez d'abord saisir une description avant de demander une amélioration.")
    descriptionPropose.value = false
    return
  }

  descriptionGenerating.value = true
  descriptionProposal.value = null

  try {
    const response = await secureApiCall(`${API_BASE_URL}/ai/mission-improve`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: form.value.description,
        type: 'blog',
        subType: 'description'
      }),
    })

    if (!response.ok) {
      throw new Error('Erreur lors de la génération de la suggestion')
    }

    const data = await response.json()
    descriptionProposal.value = data.suggestion
  } catch (error: any) {
    console.error('Erreur IA description:', error)
    alert("Erreur lors de la génération de l'amélioration : " + error.message)
    descriptionPropose.value = false
  } finally {
    descriptionGenerating.value = false
  }
}

const acceptTitleProposal = () => {
  if (titleProposal.value) {
    form.value.title = titleProposal.value
    titleProposal.value = null
    titlePropose.value = false
  }
}

const acceptDescriptionProposal = () => {
  if (descriptionProposal.value) {
    form.value.description = descriptionProposal.value
    descriptionProposal.value = null
    descriptionPropose.value = false
  }
}

// Méthodes existantes
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

  // Ne pas envoyer removeMedia car il n'est pas défini dans le DTO backend
  // Si on veut supprimer le média, on n'envoie simplement pas de nouveau fichier
  // et on met mediaUrl à null côté backend si nécessaire

  // Convertir les booléens en strings pour FormData
  if (form.value.improveTitleWithAI) {
    formData.append('improveTitleWithAI', 'true')
  }

  if (form.value.improveDescriptionWithAI) {
    formData.append('improveDescriptionWithAI', 'true')
  }

  // Utiliser secureApiCall pour inclure automatiquement le token CSRF
  const response = await secureApiCall(`${API_BASE_URL}/blog/${props.post.id}`, {
    method: 'PUT',
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
/* Variables CSS cohérentes */
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
  --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Classes utilitaires */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.required {
  color: var(--error-color);
  font-weight: 600;
  margin-left: 0.25rem;
}

.edit-post-form {
  .post-form {
    .form-group {
      margin-bottom: 2rem;
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-primary);
      font-weight: 600;
      font-size: 1.1rem;
      margin-bottom: 0.75rem;

      i {
        color: var(--primary-color);
        font-size: 1.25rem;
      }
    }

    .input-container {
      position: relative;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 2px solid var(--border-color);
      border-radius: 0.75rem;
      font-size: 1rem;
      transition: all 0.2s ease;
      background: white;
      color: var(--text-primary);
      font-family: inherit;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
      }

      &::placeholder {
        color: var(--text-primary);
      }
    }

    .form-textarea {
      resize: vertical;
      min-height: 120px;
    }

    /* Assistant IA - Même design que CreatePostForm */
    .ai-helper-modern {
      background: #f8fafc;
      border-radius: 8px;
      padding: 1rem;
      margin-top: 0.5rem;
      border: 1px solid #e2e8f0;
    }

    .ai-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .ai-switch {
      position: relative;
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      
      .switch-input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
      }
      
      .switch-slider {
        position: relative;
        width: 44px;
        height: 24px;
        background: #cbd5e1;
        border-radius: 12px;
        transition: all 0.3s ease;
        
        &::before {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      }
      
      .switch-input:checked + .switch-slider {
        background: var(--primary-color);
        
        &::before {
          transform: translateX(20px);
        }
      }
      
      .switch-input:disabled + .switch-slider {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .ai-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-primary);
      font-weight: 500;
      font-size: 0.9rem;
      
      .material-icons {
        font-size: 18px;
        color: var(--primary-color);
      }
    }

    .ai-help-text {
      color: var(--text-secondary);
      font-size: 0.85rem;
      line-height: 1.4;
    }

    .ai-loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }

    .ai-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e2e8f0;
      border-top: 2px solid var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .ai-suggestion {
      background: white;
      border: 1px solid var(--primary-color);
      border-left: 4px solid var(--primary-color);
      border-radius: 6px;
      padding: 1rem;
      margin-top: 1rem;

      .suggestion-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        color: var(--primary-color);
        font-weight: 600;

        .material-icons {
          font-size: 16px;
        }

        h4 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
        }
      }

      .suggestion-text {
        margin-bottom: 1rem;
        line-height: 1.6;
        color: var(--text-primary);
        font-size: 0.9rem;
      }

      .suggestion-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
    }

    .edit-btn {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      transition: all 0.2s ease;

      .material-icons {
        font-size: 14px;
      }

      &.edit-btn-success {
        background: var(--success-color);
        color: white;
        border-color: var(--success-color);

        &:hover {
          background: #059669;
          border-color: #059669;
        }
      }

      &.edit-btn-custom {
        background: #6b7280;
        color: white;
        border-color: #6b7280;

        &:hover {
          background: #4b5563;
          border-color: #4b5563;
        }
      }

      &.edit-btn-sm {
        padding: 0.5rem 0.75rem;
        font-size: 0.8rem;
      }
    }

    .current-media {
      margin-bottom: 20px;

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .btn-remove-media {
        padding: 8px 16px;
        background: var(--error-color);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 8px;
        transition: background-color 0.3s;

        &:hover {
          background: #dc2626;
        }
      }
    }

    .file-upload {
      input[type="file"] {
        width: 100%;
        padding: 12px;
        border: 2px dashed var(--border-color);
        border-radius: 8px;
        background: var(--background-light);
        cursor: pointer;

        &:hover {
          border-color: var(--primary-color);
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
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s;

        &:hover:not(:disabled) {
          background: var(--primary-hover);
          transform: translateY(-1px);
        }

        &:disabled {
          background: var(--text-muted);
          cursor: not-allowed;
        }
      }
    }
  }
}
</style> 