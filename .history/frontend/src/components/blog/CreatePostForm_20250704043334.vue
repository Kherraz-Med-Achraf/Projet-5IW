<template>
  <!-- Modal -->
  <transition name="modal">
    <div v-if="visible" class="modal-overlay" 
         @click="$emit('close')"
         role="dialog"
         aria-modal="true"
         aria-labelledby="modal-title"
         aria-describedby="modal-description">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 id="modal-title">
            <i class="material-icons" aria-hidden="true">add_circle</i>
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
          
          <form @submit.prevent="handleSubmit" class="create-post-form">
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
                  placeholder="Saisissez le titre de votre post..."
                  required
                  maxlength="200"
                  class="form-input"
                  ref="titleInput"
                />
                <div class="input-actions">
                  <button 
                    type="button" 
                    @click="form.improveTitleWithAI = !form.improveTitleWithAI"
                    :class="['ai-toggle', { active: form.improveTitleWithAI }]"
                    title="Améliorer avec l'IA"
                  >
                    <i class="material-icons" aria-hidden="true">psychology</i>
                  </button>
                </div>
              </div>
              <div v-if="form.improveTitleWithAI" class="ai-help">
                <i class="material-icons" aria-hidden="true">info</i>
                <span>L'IA suggérera des améliorations pour votre titre</span>
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
                <div class="input-actions">
                  <button 
                    type="button" 
                    @click="form.improveDescriptionWithAI = !form.improveDescriptionWithAI"
                    :class="['ai-toggle', { active: form.improveDescriptionWithAI }]"
                    title="Améliorer avec l'IA"
                  >
                    <i class="material-icons" aria-hidden="true">psychology</i>
                  </button>
                </div>
              </div>
              <div v-if="form.improveDescriptionWithAI" class="ai-help">
                <i class="material-icons" aria-hidden="true">info</i>
                <span>L'IA suggérera des améliorations pour votre description</span>
              </div>
            </div>

            <!-- Upload média -->
            <div class="form-group">
              <label for="media" class="form-label">
                <i class="material-icons" aria-hidden="true">attachment</i>
                Média (optionnel)
              </label>
              <div class="file-upload-container">
                <input
                  id="media"
                  type="file"
                  @change="handleFileChange"
                  accept="image/*,video/*"
                  ref="fileInput"
                  class="file-input"
                />
                <div class="file-upload-area" @click="fileInput?.click()">
                  <div v-if="!selectedFile" class="file-upload-prompt">
                    <i class="material-icons" aria-hidden="true">cloud_upload</i>
                    <span>Cliquez pour ajouter une image ou vidéo</span>
                    <small>JPG, PNG, GIF, MP4, WebM (max 50MB)</small>
                  </div>
                  <div v-else class="file-selected">
                    <i class="material-icons" aria-hidden="true">attachment</i>
                    <span>{{ selectedFile.name }}</span>
                    <button type="button" @click.stop="removeFile" class="remove-file-btn" aria-label="Supprimer le fichier">
                      <i class="material-icons" aria-hidden="true">close</i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Aperçu du média -->
            <div v-if="mediaPreview" class="media-preview">
              <div class="preview-header">
                <i class="material-icons" aria-hidden="true">visibility</i>
                <span>Aperçu</span>
              </div>
              <div class="preview-content">
                <img v-if="isImage" :src="mediaPreview" :alt="`Aperçu de ${selectedFile?.name}`" class="preview-image" />
                <video v-else-if="isVideo" :src="mediaPreview" controls class="preview-video" :aria-label="`Aperçu vidéo de ${selectedFile?.name}`"></video>
              </div>
            </div>

            <!-- Boutons -->
            <div class="form-actions">
              <button type="button" @click="$emit('close')" class="btn-secondary">
                <i class="material-icons" aria-hidden="true">close</i>
                Annuler
              </button>
              <button type="submit" :disabled="loading || !form.title || !form.description" class="btn-primary">
                <i class="material-icons" aria-hidden="true">{{ loading ? 'hourglass_empty' : 'send' }}</i>
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

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  overflow-y: auto;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  box-shadow: var(--card-shadow);
  width: 100%;
  max-width: 700px;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-2rem) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 2rem 1rem;
  border-bottom: 1px solid var(--border-color);

  h2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    color: var(--text-primary);
    font-size: 1.5rem;
    font-weight: 700;

    i {
      color: var(--primary-color);
      font-size: 1.75rem;
    }
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.5rem;
    color: var(--text-muted);
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--background-light);
      color: var(--text-secondary);
    }

    i {
      font-size: 1.5rem;
    }
  }
}

.modal-body {
  padding: 2rem;
}

/* Formulaire */
.create-post-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.875rem;

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
  padding: 0.875rem 3rem 0.875rem 1rem;
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
    color: var(--text-muted);
  }
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  padding-top: 1rem;
}

.input-actions {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  display: flex;
  gap: 0.5rem;
}

.ai-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  color: var(--text-muted);
  transition: all 0.2s ease;

  &:hover {
    background: var(--background-light);
    color: var(--primary-color);
  }

  &.active {
    background: var(--primary-color);
    color: white;
  }

  i {
    font-size: 1.25rem;
  }
}

.ai-help {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  border-radius: 0.75rem;
  color: #1e40af;
  font-size: 0.875rem;

  i {
    color: #3b82f6;
    font-size: 1.125rem;
  }
}

/* Upload de fichier */
.file-upload-container {
  position: relative;
}

.file-input {
  display: none;
}

.file-upload-area {
  border: 2px dashed var(--border-color);
  border-radius: 0.75rem;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary-color);
    background: var(--background-light);
  }
}

.file-upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);

  i {
    font-size: 3rem;
    color: var(--primary-color);
  }

  span {
    font-weight: 600;
    color: var(--text-primary);
  }

  small {
    font-size: 0.75rem;
  }
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--background-light);
  border-radius: 0.5rem;
  color: var(--text-primary);

  i {
    color: var(--primary-color);
  }

  span {
    flex: 1;
    text-align: left;
    font-weight: 500;
  }
}

.remove-file-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  color: var(--text-muted);
  transition: all 0.2s ease;

  &:hover {
    background: var(--error-color);
    color: white;
  }

  i {
    font-size: 1.125rem;
  }
}

/* Aperçu média */
.media-preview {
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--background-light);
  border-bottom: 1px solid var(--border-color);
  font-weight: 500;
  color: var(--text-primary);

  i {
    color: var(--primary-color);
  }
}

.preview-content {
  padding: 1rem;
  text-align: center;
}

.preview-image,
.preview-video {
  max-width: 100%;
  max-height: 250px;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Boutons d'action */
.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.btn-secondary,
.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  i {
    font-size: 1.125rem;
  }
}

.btn-secondary {
  background: var(--background-light);
  color: var(--text-secondary);

  &:hover {
    background: var(--border-color);
    color: var(--text-primary);
  }
}

.btn-primary {
  background: var(--primary-color);
  color: white;

  &:hover:not(:disabled) {
    background: var(--primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
  }

  &:disabled {
    background: var(--text-muted);
    cursor: not-allowed;
    transform: none;
  }
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 1rem;
  }

  .modal-header,
  .modal-body {
    padding: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
    gap: 0.75rem;
  }

  .btn-secondary,
  .btn-primary {
    justify-content: center;
    width: 100%;
  }
}
</style>
