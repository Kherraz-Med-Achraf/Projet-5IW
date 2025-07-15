<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" role="dialog" aria-labelledby="modal-title" aria-modal="true">
      <div class="modal-header">
        <h2 id="modal-title">Nouveau document</h2>
        <button
          @click="$emit('close')"
          class="close-button"
          type="button"
          aria-label="Fermer le modal"
        >
          <i class="material-icons" aria-hidden="true">close</i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-body">
        <!-- Titre -->
        <div class="form-group">
          <label for="title" class="form-label">
            Titre du document *
          </label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            class="form-input"
            :class="{ 'error': errors.title }"
            required
            aria-describedby="title-error"
            placeholder="Ex: Règlement intérieur 2024"
          />
          <span v-if="errors.title" id="title-error" class="error-message">
            {{ errors.title }}
          </span>
        </div>

        <!-- Description -->
        <div class="form-group">
          <label for="description" class="form-label">
            Description
          </label>
          <textarea
            id="description"
            v-model="form.description"
            class="form-textarea"
            rows="3"
            placeholder="Description optionnelle du document"
          ></textarea>
        </div>

        <!-- Catégorie -->
        <div class="form-group">
          <label for="category" class="form-label">
            Catégorie *
          </label>
          <select
            id="category"
            v-model="form.category"
            class="form-select"
            :class="{ 'error': errors.category }"
            required
            aria-describedby="category-error"
          >
            <option value="">Sélectionner une catégorie</option>
            <option value="INFORMATIONS_GENERALES">Informations générales</option>
            <option value="SUPPORT_COURS">Support de cours</option>
            <option value="DEMANDE_SIGNATURE">Demande de signature</option>
            <option value="AUTRES">Autres</option>
          </select>
          <span v-if="errors.category" id="category-error" class="error-message">
            {{ errors.category }}
          </span>
        </div>

        <!-- Signature requise -->
        <div class="form-group">
          <label class="checkbox-label">
            <input
              v-model="form.requiresSignature"
              type="checkbox"
              class="checkbox-input"
            />
            <span class="checkbox-text">
              Ce document nécessite une signature électronique
            </span>
          </label>
          <p class="help-text">
            Si cochée, les parents devront signer le document avant de pouvoir le télécharger
          </p>
        </div>

        <!-- Sélection des parents -->
        <div class="form-group">
          <label class="form-label">
            Parents ayant accès au document *
          </label>
          <div class="parents-selection">
            <div class="parents-controls">
              <button
                @click="selectAllParents"
                type="button"
                class="selection-btn"
                :disabled="allParentsSelected"
              >
                Tout sélectionner
              </button>
              <button
                @click="deselectAllParents"
                type="button"
                class="selection-btn"
                :disabled="!anyParentSelected"
              >
                Tout désélectionner
              </button>
            </div>
            
            <div class="parents-list" v-if="parents.length > 0">
              <label
                v-for="parent in parents"
                :key="parent.id"
                class="parent-item"
              >
                <input
                  v-model="form.parentIds"
                  :value="parent.id"
                  type="checkbox"
                  class="parent-checkbox"
                />
                <div class="parent-info">
                  <span class="parent-name">{{ parent.firstName }} {{ parent.lastName }}</span>
                  <span class="parent-email">{{ parent.user.email }}</span>
                  <span class="parent-children">
                    {{ parent.children.length }} enfant{{ parent.children.length > 1 ? 's' : '' }}
                  </span>
                </div>
              </label>
            </div>
            
            <div v-else-if="loadingParents" class="loading-parents">
              <i class="material-icons spinning">hourglass_empty</i>
              <span>Chargement des parents...</span>
            </div>
            
            <div v-else class="no-parents">
              <i class="material-icons">group_off</i>
              <span>Aucun parent trouvé</span>
            </div>
          </div>
          
          <span v-if="errors.parentIds" class="error-message">
            {{ errors.parentIds }}
          </span>
        </div>

        <!-- Upload de fichier -->
        <div class="form-group">
          <label for="file" class="form-label">
            Fichier PDF *
          </label>
          <div class="file-upload-container">
            <input
              id="file"
              ref="fileInput"
              type="file"
              accept=".pdf"
              class="file-input"
              :class="{ 'error': errors.file }"
              @change="handleFileChange"
              required
              aria-describedby="file-error file-help"
            />
            <div class="file-upload-area" @click="triggerFileInput">
              <div v-if="!selectedFile" class="upload-placeholder">
                <i class="material-icons" aria-hidden="true">cloud_upload</i>
                <span>Cliquez pour sélectionner un fichier PDF</span>
                <small>ou glissez-déposez un fichier ici</small>
              </div>
              <div v-else class="file-selected">
                <i class="material-icons" aria-hidden="true">description</i>
                <div class="file-info">
                  <span class="file-name">{{ selectedFile.name }}</span>
                  <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
                </div>
                <button
                  @click.stop="clearFile"
                  type="button"
                  class="remove-file"
                  aria-label="Supprimer le fichier"
                >
                  <i class="material-icons" aria-hidden="true">close</i>
                </button>
              </div>
            </div>
          </div>
          <p id="file-help" class="help-text">
            Seuls les fichiers PDF sont acceptés (max 10MB)
          </p>
          <span v-if="errors.file" id="file-error" class="error-message">
            {{ errors.file }}
          </span>
        </div>
      </form>

      <div class="modal-footer">
        <button
          @click="$emit('close')"
          type="button"
          class="btn btn-secondary"
          :disabled="uploading"
        >
          Annuler
        </button>
        <button
          @click="handleSubmit"
          type="submit"
          class="btn btn-primary"
          :disabled="uploading || !isFormValid"
        >
          <i class="material-icons" aria-hidden="true">
            {{ uploading ? 'hourglass_empty' : 'cloud_upload' }}
          </i>
          {{ uploading ? 'Upload en cours...' : 'Créer le document' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useParentStore } from '@/stores/parent'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notificationStore'
import type { CreateDocumentPayload } from '@/stores/documentStore'
import { API_BASE_URL } from '@/config/api'

const emit = defineEmits<{
  close: []
  uploaded: [document: any]
}>()

// Stores
const documentStore = useDocumentStore()
const parentStore = useParentStore()
const notify = useNotificationStore()

// Form state
const form = ref({
  title: '',
  description: '',
  category: '',
  requiresSignature: false,
  parentIds: [] as number[],
})

const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const loadingParents = ref(false)
const uploading = computed(() => documentStore.uploading)

// Validation
const errors = ref({
  title: '',
  category: '',
  parentIds: '',
  file: '',
})

// Parents data
const parents = ref<any[]>([])

// Computed properties
const isFormValid = computed(() => {
  return form.value.title && 
         form.value.category && 
         form.value.parentIds.length > 0 && 
         selectedFile.value
})

const allParentsSelected = computed(() => {
  return parents.value.length > 0 && form.value.parentIds.length === parents.value.length
})

const anyParentSelected = computed(() => {
  return form.value.parentIds.length > 0
})

// Methods
const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    // Validation du fichier
    if (file.type !== 'application/pdf') {
      errors.value.file = 'Seuls les fichiers PDF sont acceptés'
      return
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      errors.value.file = 'Le fichier est trop volumineux (max 10MB)'
      return
    }
    
    selectedFile.value = file
    errors.value.file = ''
  }
}

const clearFile = () => {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const selectAllParents = () => {
  form.value.parentIds = parents.value.map(p => p.id)
}

const deselectAllParents = () => {
  form.value.parentIds = []
}

const validateForm = () => {
  errors.value = {
    title: '',
    category: '',
    parentIds: '',
    file: '',
  }

  if (!form.value.title.trim()) {
    errors.value.title = 'Le titre est requis'
  }

  if (!form.value.category) {
    errors.value.category = 'La catégorie est requise'
  }

  if (form.value.parentIds.length === 0) {
    errors.value.parentIds = 'Vous devez sélectionner au moins un parent'
  }

  if (!selectedFile.value) {
    errors.value.file = 'Le fichier PDF est requis'
  }

  return Object.values(errors.value).every(error => !error)
}

const handleSubmit = async () => {
  if (!validateForm() || uploading.value) return

  try {
    const payload: CreateDocumentPayload = {
      title: form.value.title.trim(),
      description: form.value.description.trim() || undefined,
      category: form.value.category as any,
      requiresSignature: form.value.requiresSignature,
      parentIds: form.value.parentIds,
      file: selectedFile.value!,
    }

    const document = await documentStore.createDocument(payload)
    emit('uploaded', document)
  } catch (error) {
    console.error('Erreur création document:', error)
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Load parents on mount
onMounted(async () => {
  loadingParents.value = true
  try {
    // Utiliser le nouvel endpoint spécifique aux documents
    const authStore = useAuthStore()
    const response = await fetch(`${API_BASE_URL}/documents/parents`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'Erreur serveur'}`)
    }
    
    const fetchedParents = await response.json()
    parents.value = fetchedParents
  } catch (error) {
    console.error('Erreur lors du chargement des parents:', error)
    notify.showNotification('Erreur lors du chargement des parents', 'error')
  } finally {
    loadingParents.value = false
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  color: #1e293b;
  font-size: 1.5rem;
}

.close-button {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #4444ac;
}

.form-input.error,
.form-textarea.error,
.form-select.error {
  border-color: #ef4444;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
}

.checkbox-input {
  margin-top: 0.25rem;
}

.checkbox-text {
  font-weight: 500;
  color: #374151;
}

.help-text {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.5rem;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  display: block;
}

.parents-selection {
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
}

.parents-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.selection-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.selection-btn:hover:not(:disabled) {
  background: #f1f5f9;
}

.selection-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.parents-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.parent-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.parent-item:hover {
  background: #f8fafc;
}

.parent-item:last-child {
  border-bottom: none;
}

.parent-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.parent-name {
  font-weight: 600;
  color: #1e293b;
}

.parent-email {
  font-size: 0.875rem;
  color: #64748b;
}

.parent-children {
  font-size: 0.75rem;
  color: #9ca3af;
}

.file-upload-container {
  position: relative;
}

.file-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.file-upload-area {
  border: 2px dashed #e2e8f0;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-upload-area:hover {
  border-color: #4444ac;
  background: #f8fafc;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
}

.upload-placeholder .material-icons {
  font-size: 3rem;
  color: #cbd5e1;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #1e293b;
}

.file-selected .material-icons {
  font-size: 2rem;
  color: #4444ac;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-name {
  font-weight: 600;
}

.file-size {
  font-size: 0.875rem;
  color: #64748b;
}

.remove-file {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.remove-file:hover {
  background: #fef2f2;
}

.modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-primary {
  background: #4444ac;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3a3a9a;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-parents,
.no-parents {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #64748b;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    margin: 0;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .parents-controls {
    flex-direction: column;
  }
}
</style> 