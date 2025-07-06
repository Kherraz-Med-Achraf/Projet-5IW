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

  <!-- Toast notification -->
  <transition name="toast">
    <div v-if="toast.visible" class="toast-container">
      <div :class="['toast', `toast-${toast.type}`]" role="alert" aria-live="polite">
        <div class="toast-content">
          <div class="toast-icon">
            <i class="material-icons" aria-hidden="true">
              {{ toast.type === 'success' ? 'check_circle' : toast.type === 'warning' ? 'warning' : 'error' }}
            </i>
          </div>
          <div class="toast-message">{{ toast.message }}</div>
          <button @click="hideToast" class="toast-close" type="button" aria-label="Fermer la notification">
            <i class="material-icons" aria-hidden="true">close</i>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useBlogStore } from '@/stores/blogStore'
import { AuthService } from '@/utils/auth'
import { API_BASE_URL } from '@/config/api'

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
})

const selectedFile = ref<File | null>(null)
const mediaPreview = ref<string | null>(null)
const loading = ref(false)

// États IA pour le titre
const titlePropose = ref(false)
const titleGenerating = ref(false)
const titleProposal = ref<string | null>(null)

// États IA pour la description
const descriptionPropose = ref(false)
const descriptionGenerating = ref(false)
const descriptionProposal = ref<string | null>(null)

// États pour les notifications toast
const toast = ref({
  visible: false,
  message: '',
  type: 'error' as 'error' | 'success' | 'warning'
})

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

// Méthodes IA
const onProposeTitle = async () => {
  if (!titlePropose.value) {
    titleProposal.value = null
    titleGenerating.value = false
    return
  }

  if (!form.value.title.trim()) {
    showToast("Veuillez d'abord saisir un titre avant de demander une amélioration.", 'warning')
    titlePropose.value = false
    return
  }

  titleGenerating.value = true
  titleProposal.value = null

  try {
    const token = await AuthService.getToken()
    const response = await fetch(`${API_BASE_URL}/ai/mission-improve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt: form.value.title,
        type: 'blog',
        subType: 'title'
      }),
    })

    if (!response.ok) {
      throw new Error("Erreur lors de la génération de l'amélioration")
    }

    const data = await response.json()
    titleProposal.value = data.suggestion
  } catch (error: any) {
    showToast("Erreur lors de la génération de l'amélioration : " + error.message, 'error')
    titlePropose.value = false
  } finally {
    titleGenerating.value = false
  }
}

const acceptTitleProposal = () => {
  if (titleProposal.value) {
    // Supprimer les guillemets au début et à la fin si présents
    let cleanTitle = titleProposal.value.trim()
    if (cleanTitle.startsWith('"') && cleanTitle.endsWith('"')) {
      cleanTitle = cleanTitle.slice(1, -1)
    }
    if (cleanTitle.startsWith("'") && cleanTitle.endsWith("'")) {
      cleanTitle = cleanTitle.slice(1, -1)
    }
    
    form.value.title = cleanTitle
    titlePropose.value = false
    titleProposal.value = null
  }
}

const onProposeDescription = async () => {
  if (!descriptionPropose.value) {
    descriptionProposal.value = null
    descriptionGenerating.value = false
    return
  }

  if (!form.value.description.trim()) {
    showToast("Veuillez d'abord saisir une description avant de demander une amélioration.", 'warning')
    descriptionPropose.value = false
    return
  }

  descriptionGenerating.value = true
  descriptionProposal.value = null

  try {
    const response = await fetch("http://localhost:3000/ai/mission-improve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        prompt: form.value.description,
        type: 'blog',
        subType: 'description'
      }),
    })

    if (!response.ok) {
      throw new Error("Erreur lors de la génération de l'amélioration")
    }

    const data = await response.json()
    descriptionProposal.value = data.suggestion
  } catch (error: any) {
    showToast("Erreur lors de la génération de l'amélioration : " + error.message, 'error')
    descriptionPropose.value = false
  } finally {
    descriptionGenerating.value = false
  }
}

const acceptDescriptionProposal = () => {
  if (descriptionProposal.value) {
    // Supprimer les guillemets au début et à la fin si présents
    let cleanDescription = descriptionProposal.value.trim()
    if (cleanDescription.startsWith('"') && cleanDescription.endsWith('"')) {
      cleanDescription = cleanDescription.slice(1, -1)
    }
    if (cleanDescription.startsWith("'") && cleanDescription.endsWith("'")) {
      cleanDescription = cleanDescription.slice(1, -1)
    }
    
    form.value.description = cleanDescription
    descriptionPropose.value = false
    descriptionProposal.value = null
  }
}

// Méthodes
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    
    // Vérifier la taille (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      showToast('Le fichier ne peut pas dépasser 50MB', 'warning')
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

// Fonctions pour les toasts
const showToast = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
  toast.value = {
    visible: true,
    message,
    type
  }
  
  // Masquer automatiquement après 5 secondes
  setTimeout(() => {
    toast.value.visible = false
  }, 5000)
}

const hideToast = () => {
  toast.value.visible = false
}

const handleSubmit = async () => {
  loading.value = true
  
  try {
    await blogStore.createPost({
      title: form.value.title,
      description: form.value.description,
      media: selectedFile.value || undefined,
    })
    
    // Réinitialiser le formulaire
    resetForm()
    
    showToast('Post créé avec succès !', 'success')
    
    setTimeout(() => {
      emit('postCreated')
    }, 1000)
  } catch (error: any) {
    // Afficher l'erreur dans le toast
    let errorMessage = 'Une erreur est survenue lors de la création du post'
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    showToast(errorMessage, 'error')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value = {
    title: '',
    description: '',
  }
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }

  // Reset IA states
  titlePropose.value = false
  titleGenerating.value = false
  titleProposal.value = null
  descriptionPropose.value = false
  descriptionGenerating.value = false
  descriptionProposal.value = null
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
    color: var(--text-muted);
  }
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

/* Assistant IA - Même design que JournalMissions */
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
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;

  .switch-input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .switch-slider {
      background-color: #4444ac;

      &:before {
        transform: translateX(20px);
      }
    }

    &:focus + .switch-slider {
      box-shadow: 0 0 1px #4444ac;
    }

    &:disabled + .switch-slider {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .switch-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    transition: 0.4s;
    border-radius: 34px;

    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }
  }
}

.ai-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #374151;
  font-size: 0.9rem;
  font-weight: 500;

  .material-icons {
    font-size: 18px;
    color: #8b5cf6;
  }
}

.ai-help-text {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
}

.ai-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  color: #6d28d9;
  font-size: 0.85rem;
}

.ai-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #c4b5fd;
  border-top: 2px solid #6d28d9;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.ai-suggestion {
  background: white;
  border: 1px solid #4444ac;
  border-left: 4px solid #4444ac;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;

  .suggestion-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    color: #4444ac;
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
    color: #1f2937;
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
    background: #10b981;
    color: white;
    border-color: #10b981;

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
    background: #2d2d85;
    transform: translateY(-1px) scale(1.05);
    box-shadow: 0 6px 16px rgba(45, 45, 133, 0.4);
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

/* Styles pour les toasts */
.toast-container {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 1100;
  max-width: 400px;
}

.toast {
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: toastSlideIn 0.3s ease-out;
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast-content {
  display: flex;
  align-items: center;
  padding: 1rem;
  gap: 0.75rem;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  
  i {
    font-size: 1.25rem;
  }
}

.toast-message {
  flex: 1;
  font-weight: 500;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
  
  i {
    font-size: 1.125rem;
  }
}

/* Types de toast */
.toast-error {
  background: #fef2f2;
  border-left: 4px solid var(--error-color);
  color: #991b1b;
  
  .toast-icon {
    background: rgba(239, 68, 68, 0.1);
    color: var(--error-color);
  }
  
  .toast-close:hover {
    background: rgba(239, 68, 68, 0.1);
    color: var(--error-color);
  }
}

.toast-success {
  background: #f0fdf4;
  border-left: 4px solid var(--success-color);
  color: #166534;
  
  .toast-icon {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success-color);
  }
  
  .toast-close:hover {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success-color);
  }
}

.toast-warning {
  background: #fffbeb;
  border-left: 4px solid #f59e0b;
  color: #92400e;
  
  .toast-icon {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }
  
  .toast-close:hover {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }
}

/* Transitions pour les toasts */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Responsive pour les toasts */
@media (max-width: 768px) {
  .toast-container {
    top: 1rem;
    right: 1rem;
    left: 1rem;
    max-width: none;
  }
  
  .toast-content {
    padding: 0.875rem;
  }
}
</style>
