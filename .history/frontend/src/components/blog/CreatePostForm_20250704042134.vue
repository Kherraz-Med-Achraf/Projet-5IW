<template>
  <transition name="modal">
    <div 
      v-if="visible" 
      class="modal-overlay" 
      @click="$emit('close')"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 id="modal-title">
            <i class="material-icons" aria-hidden="true">add</i>
            Créer un nouveau post
          </h2>
          <button @click="$emit('close')" class="close-btn" type="button" aria-label="Fermer la fenêtre">
            <i class="material-icons" aria-hidden="true">close</i>
          </button>
        </div>
        <div class="modal-body">
          <p id="modal-description" class="sr-only">
            Formulaire de création d'un nouveau post de blog avec titre, description et média optionnel
          </p>
          <form @submit.prevent="handleSubmit" class="post-form">
            <!-- Titre -->
            <div class="form-group">
              <label for="title">Titre du post <span class="required" aria-label="obligatoire">*</span></label>
              <div class="input-with-ai">
                <input
                  id="title"
                  v-model="form.title"
                  type="text"
                  placeholder="Saisissez le titre..."
                  required
                  maxlength="200"
                  :aria-describedby="form.improveTitleWithAI ? 'title-ai-help' : undefined"
                  ref="titleInput"
                />
                <label class="ai-checkbox">
                  <input type="checkbox" v-model="form.improveTitleWithAI" />
                  <span class="ai-label">🤖 Améliorer avec l'IA</span>
                </label>
              </div>
              <div v-if="form.improveTitleWithAI" id="title-ai-help" class="help-text">
                L'IA suggérera des améliorations pour votre titre
              </div>
            </div>

            <!-- Description -->
            <div class="form-group">
              <label for="description">Description <span class="required" aria-label="obligatoire">*</span></label>
              <div class="input-with-ai">
                <textarea
                  id="description"
                  v-model="form.description"
                  placeholder="Décrivez votre post..."
                  required
                  maxlength="2000"
                  rows="5"
                  :aria-describedby="form.improveDescriptionWithAI ? 'description-ai-help' : undefined"
                ></textarea>
                <label class="ai-checkbox">
                  <input type="checkbox" v-model="form.improveDescriptionWithAI" />
                  <span class="ai-label">🤖 Améliorer avec l'IA</span>
                </label>
              </div>
              <div v-if="form.improveDescriptionWithAI" id="description-ai-help" class="help-text">
                L'IA suggérera des améliorations pour votre description
              </div>
            </div>

            <!-- Upload média -->
            <div class="form-group">
              <label for="media">Ajouter un média (optionnel)</label>
              <div class="file-upload">
                <input
                  id="media"
                  type="file"
                  @change="handleFileChange"
                  accept="image/*,video/*"
                  ref="fileInput"
                  :aria-describedby="selectedFile ? 'file-selected' : 'file-help'"
                />
                <div id="file-help" class="help-text">
                  Formats acceptés : JPG, PNG, GIF, MP4, WebM (max 50MB)
                </div>
                <div v-if="selectedFile" class="file-preview">
                  <span id="file-selected">{{ selectedFile.name }}</span>
                  <button type="button" @click="removeFile" class="remove-file" aria-label="Supprimer le fichier">❌</button>
                </div>
              </div>
            </div>

            <!-- Aperçu du média -->
            <div v-if="mediaPreview" class="media-preview">
              <img v-if="isImage" :src="mediaPreview" :alt="`Aperçu de ${selectedFile?.name}`" class="preview-image" />
              <video v-else-if="isVideo" :src="mediaPreview" controls class="preview-video" :aria-label="`Aperçu vidéo de ${selectedFile?.name}`"></video>
            </div>

            <!-- Boutons -->
            <div class="form-actions">
              <button type="button" @click="$emit('close')" class="btn-secondary">
                Annuler
              </button>
              <button type="submit" :disabled="loading || !form.title || !form.description" class="btn-primary">
                {{ loading ? 'Création...' : 'Créer le post' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useBlogStore } from '@/stores/blogStore'

// Props
interface Props {
  visible: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  postCreated: []
}>()

// Store
const blogStore = useBlogStore()

// Refs
const titleInput = ref<HTMLInputElement>()
const fileInput = ref<HTMLInputElement>()

// État local
const form = ref({
  title: '',
  description: '',
  improveTitleWithAI: false,
  improveDescriptionWithAI: false,
})

const selectedFile = ref<File | null>(null)
const mediaPreview = ref<string | null>(null)
const loading = ref(false)

// Computed
const isImage = computed(() => {
  return selectedFile.value?.type.startsWith('image/') ?? false
})

const isVideo = computed(() => {
  return selectedFile.value?.type.startsWith('video/') ?? false
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

// Gérer le focus pour l'accessibilité
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    nextTick(() => {
      titleInput.value?.focus()
    })
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

const handleSubmit = async () => {
  loading.value = true
  
  try {
    await blogStore.createPost({
      title: form.value.title,
      description: form.value.description,
      media: selectedFile.value || undefined,
      improveTitleWithAI: form.value.improveTitleWithAI,
      improveDescriptionWithAI: form.value.improveDescriptionWithAI,
    })
    
    // Réinitialiser le formulaire
    form.value = {
      title: '',
      description: '',
      improveTitleWithAI: false,
      improveDescriptionWithAI: false,
    }
    selectedFile.value = null
    
    emit('postCreated')
  } catch (error) {
    // L'erreur est gérée dans le store
  } finally {
    loading.value = false
  }
}

// Gérer les touches d'échappement
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close')
  }
}

// Écouter les touches quand le modal est ouvert
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped lang="scss">
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
  color: #dc2626;
  font-weight: bold;
}

.help-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
  line-height: 1.4;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  overflow-y: auto;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  position: relative;
  width: 100%;
  max-width: 650px;
  margin: 0 1rem;
  animation: modalFade 0.3s ease;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
}

@keyframes modalFade {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.post-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  .form-group {
    margin-bottom: 0;

    &.form-group-spaced {
      margin-top: 0;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      color: #2c3e50;
      font-weight: 500;
      font-size: 0.95rem;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
      font-family: inherit;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: #4444ac;
        box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
      }

      &::placeholder {
        color: #9ca3af;
      }
    }

    .form-textarea {
      resize: vertical;
      min-height: 100px;
    }

    input[type="file"] {
      width: 100%;
      padding: 0.75rem;
      border: 2px dashed #e1e5e9;
      border-radius: 8px;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        border-color: #4444ac;
        background-color: #f8fafc;
      }

      &:focus {
        outline: none;
        border-color: #4444ac;
        box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
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
    position: sticky;
    bottom: 0;
    background: transparent;
    padding-top: 1rem;

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
      background: #3498db;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.3s;

      &:hover:not(:disabled) {
        background: #2980b9;
      }

      &:disabled {
        background: #bdc3c7;
        cursor: not-allowed;
      }
    }
  }
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.ai-checkbox {
  position: relative;
  display: inline-block;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-left: 0.5rem;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .ai-label {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #f8fafc;
    border: 2px solid #e1e5e9;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background-color: #e1e5e9;
    }

    input:checked + .ai-label {
      background-color: #4444ac;
    }
  }
}
</style>
