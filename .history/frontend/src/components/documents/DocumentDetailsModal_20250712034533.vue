<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" role="dialog" aria-labelledby="modal-title" aria-modal="true">
      <div class="modal-header">
        <h2 id="modal-title">Détails du document</h2>
        <button
          @click="$emit('close')"
          class="close-button"
          type="button"
          aria-label="Fermer le modal"
        >
          <i class="material-icons" aria-hidden="true">close</i>
        </button>
      </div>

      <div class="modal-body">
        <div v-if="loading" class="loading-spinner">
          <div class="spinner"></div>
          <p>Chargement des détails...</p>
        </div>

        <div v-else-if="documentDetails">
          <!-- En-tête document -->
          <div class="document-overview">
            <div class="doc-icon">
              <i class="material-icons">{{ getDocumentIcon(documentDetails.category) }}</i>
            </div>
            <div class="doc-header">
              <h3>{{ documentDetails.title }}</h3>
              <div class="doc-meta">
                <span class="category">{{ getCategoryLabel(documentDetails.category) }}</span>
                <span class="status-badge" :class="`status-${documentDetails.status.toLowerCase()}`">
                  {{ getStatusLabel(documentDetails.status) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div v-if="documentDetails.description" class="detail-section">
            <h4>Description</h4>
            <p>{{ documentDetails.description }}</p>
          </div>

          <!-- Informations générales -->
          <div class="detail-section">
            <h4>Informations</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Nom du fichier :</span>
                <span class="value">{{ documentDetails.filename }}</span>
              </div>
              <div class="info-item">
                <span class="label">Taille :</span>
                <span class="value">{{ formatFileSize(documentDetails.filesize) }}</span>
              </div>
              <div class="info-item">
                <span class="label">Type :</span>
                <span class="value">{{ documentDetails.mimetype }}</span>
              </div>
              <div class="info-item">
                <span class="label">Version :</span>
                <span class="value">{{ documentDetails.version }}</span>
              </div>
              <div class="info-item">
                <span class="label">Créé le :</span>
                <span class="value">{{ formatDateTime(documentDetails.createdAt) }}</span>
              </div>
              <div v-if="documentDetails.publishedAt" class="info-item">
                <span class="label">Publié le :</span>
                <span class="value">{{ formatDateTime(documentDetails.publishedAt) }}</span>
              </div>
              <div class="info-item">
                <span class="label">Signature requise :</span>
                <span class="value">{{ documentDetails.requiresSignature ? 'Oui' : 'Non' }}</span>
              </div>
            </div>
          </div>

          <!-- Accès et statistiques -->
          <div class="detail-section">
            <div class="section-header">
              <h4>Accès au document</h4>
              <div class="stats-summary">
                <span class="stat-badge">{{ documentDetails.accesses?.length || 0 }} parents</span>
                <span v-if="documentDetails.requiresSignature" class="stat-badge">
                  {{ documentDetails.signatures?.length || 0 }} signatures
                </span>
              </div>
            </div>

            <!-- Liste des parents avec accès (pour secrétaire) -->
            <div v-if="isSecretary && documentDetails.accesses?.length" class="accesses-section">
              <div class="accesses-header">
                <h5>Parents avec accès</h5>
                <button
                  @click="showManageAccess = !showManageAccess"
                  class="btn btn-secondary btn-sm"
                  type="button"
                >
                  <i class="material-icons">{{ showManageAccess ? 'close' : 'edit' }}</i>
                  {{ showManageAccess ? 'Annuler' : 'Gérer les accès' }}
                </button>
              </div>

              <div v-if="!showManageAccess" class="accesses-list">
                <div
                  v-for="access in documentDetails.accesses"
                  :key="access.parent.id"
                  class="access-item"
                >
                  <div class="access-parent">
                    <div class="parent-info">
                      <strong>{{ access.parent.firstName }} {{ access.parent.lastName }}</strong>
                      <span class="parent-email">{{ access.parent.user.email }}</span>
                    </div>
                    <div class="access-status">
                      <span v-if="access.viewedAt" class="status-viewed">
                        <i class="material-icons">visibility</i>
                        Consulté le {{ formatDateTime(access.viewedAt) }}
                      </span>
                    </div>
                  </div>
                  <div class="access-actions">
                    <button
                      @click="removeAccess(access.parent.id)"
                      class="btn-remove-access"
                      type="button"
                      title="Retirer l'accès"
                    >
                      <i class="material-icons">remove_circle</i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Gestion des accès -->
              <div v-if="showManageAccess" class="manage-access-section">
                <div class="add-access-form">
                  <h5>Ajouter des parents</h5>
                  <div class="parent-selection">
                    <select v-model="selectedParentIds" multiple class="parent-select">
                      <option
                        v-for="parent in availableParents"
                        :key="parent.id"
                        :value="parent.id"
                      >
                        {{ parent.firstName }} {{ parent.lastName }} ({{ parent.user.email }})
                      </option>
                    </select>
                    <button
                      @click="addAccess"
                      :disabled="selectedParentIds.length === 0 || addingAccess"
                      class="btn btn-primary"
                      type="button"
                    >
                      <i class="material-icons">add</i>
                      {{ addingAccess ? 'Ajout...' : 'Ajouter l\'accès' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Message si pas d'accès -->
            <div v-else-if="isSecretary && !documentDetails.accesses?.length" class="no-access-message">
              <p>Aucun parent n'a accès à ce document.</p>
              <button
                @click="showManageAccess = true"
                class="btn btn-primary"
                type="button"
              >
                <i class="material-icons">add</i>
                Ajouter des accès
              </button>
            </div>
          </div>

          <!-- Liste des signatures (si applicable) -->
          <div v-if="documentDetails.requiresSignature && documentDetails.signatures?.length" class="detail-section">
            <h4>État des signatures</h4>
            <div class="signatures-list">
              <div
                v-for="signature in documentDetails.signatures"
                :key="`${signature.parent.firstName}-${signature.parent.lastName}`"
                class="signature-item"
              >
                <div class="signature-parent">
                  {{ signature.parent.firstName }} {{ signature.parent.lastName }}
                </div>
                <div class="signature-status">
                  <span class="signature-badge" :class="`signature-${signature.status.toLowerCase()}`">
                    {{ getSignatureStatusLabel(signature.status) }}
                  </span>
                  <span v-if="signature.signedAt" class="signature-date">
                    le {{ formatDateTime(signature.signedAt) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          @click="downloadDocument"
          type="button"
          class="btn btn-secondary"
        >
          <i class="material-icons" aria-hidden="true">download</i>
          Télécharger
        </button>
        <button
          @click="$emit('close')"
          type="button"
          class="btn btn-primary"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notificationStore'
import type { Document } from '@/stores/documentStore'

interface Props {
  document: Document
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  updated: [document: Document]
}>()

const documentStore = useDocumentStore()
const authStore = useAuthStore()
const notify = useNotificationStore()

// État local
const loading = ref(false)
const documentDetails = ref<any>(null)
const showManageAccess = ref(false)
const selectedParentIds = ref<number[]>([])
const addingAccess = ref(false)
const availableParents = ref<any[]>([])

// Computed
const isSecretary = computed(() => authStore.user?.role === 'SECRETARY')

// Méthodes
const fetchDocumentDetails = async () => {
  loading.value = true
  try {
    documentDetails.value = await documentStore.getDocumentDetails(props.document.id)
    
    // Récupérer la liste des parents disponibles pour un secrétaire
    if (isSecretary.value) {
      await fetchAvailableParents()
    }
  } catch (error) {
    console.error('Erreur récupération détails:', error)
    notify.showNotification('Erreur lors de la récupération des détails', 'error')
  } finally {
    loading.value = false
  }
}

const fetchAvailableParents = async () => {
  try {
    const response = await documentStore.getParentsForDocuments()
    
    // Vérification de sécurité
    if (!documentDetails.value || !documentDetails.value.accesses) {
      availableParents.value = response
      return
    }
    
    availableParents.value = response.filter(parent => 
      !documentDetails.value.accesses.some((access: any) => access.parent.id === parent.id)
    )
  } catch (error) {
    console.error('Erreur récupération parents:', error)
  }
}

const addAccess = async () => {
  if (selectedParentIds.value.length === 0) return
  
  addingAccess.value = true
  try {
    // 🔧 FIX: S'assurer que les IDs sont des numbers
    const parentIds = selectedParentIds.value.map(id => typeof id === 'string' ? parseInt(id, 10) : id)
    await documentStore.addDocumentAccess(props.document.id, parentIds)
    notify.showNotification('Accès ajoutés avec succès', 'success')
    
    // Rafraîchir les détails
    await fetchDocumentDetails()
    selectedParentIds.value = []
    showManageAccess.value = false
    
    emit('updated', documentDetails.value)
  } catch (error) {
    console.error('Erreur ajout accès:', error)
    notify.showNotification('Erreur lors de l\'ajout des accès', 'error')
  } finally {
    addingAccess.value = false
  }
}

const removeAccess = async (parentId: number) => {
  if (!confirm('Êtes-vous sûr de vouloir retirer l\'accès à ce parent ?')) return
  
  try {
    // 🔧 FIX: S'assurer que l'ID est un number
    const parentIdNum = typeof parentId === 'string' ? parseInt(parentId, 10) : parentId
    await documentStore.removeDocumentAccess(props.document.id, [parentIdNum])
    notify.showNotification('Accès retiré avec succès', 'success')
    
    // Rafraîchir les détails
    await fetchDocumentDetails()
    
    emit('updated', documentDetails.value)
  } catch (error) {
    console.error('Erreur retrait accès:', error)
    notify.showNotification('Erreur lors du retrait de l\'accès', 'error')
  }
}

const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

const downloadDocument = async () => {
  try {
    await documentStore.downloadDocument(props.document.id)
  } catch (error) {
    console.error('Erreur téléchargement:', error)
  }
}

// Utility functions
const getDocumentIcon = (category: string) => {
  const icons = {
    INFORMATIONS_GENERALES: 'info',
    SUPPORT_COURS: 'school',
    DEMANDE_SIGNATURE: 'draw',
    AUTRES: 'description',
  }
  return icons[category as keyof typeof icons] || 'description'
}

const getCategoryLabel = (category: string) => {
  const labels = {
    INFORMATIONS_GENERALES: 'Informations générales',
    SUPPORT_COURS: 'Support de cours',
    DEMANDE_SIGNATURE: 'Demande de signature',
    AUTRES: 'Autres',
  }
  return labels[category as keyof typeof labels] || category
}

const getStatusLabel = (status: string) => {
  const labels = {
    DRAFT: 'Brouillon',
    PUBLISHED: 'Publié',
    ARCHIVED: 'Archivé',
  }
  return labels[status as keyof typeof labels] || status
}

const getSignatureStatusLabel = (status: string) => {
  const labels = {
    PENDING: 'En attente',
    SIGNED: 'Signé',
    CANCELLED: 'Annulé',
    EXPIRED: 'Expiré',
  }
  return labels[status as keyof typeof labels] || status
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Initialisation
onMounted(() => {
  fetchDocumentDetails()
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4444ac;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.stats-summary {
  display: flex;
  gap: 0.5rem;
}

.stat-badge {
  background: #e2e8f0;
  color: #475569;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.accesses-section {
  margin-top: 1rem;
}

.accesses-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.accesses-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.access-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.access-parent {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.parent-info {
  display: flex;
  flex-direction: column;
}

.parent-email {
  font-size: 0.875rem;
  color: #64748b;
}

.access-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.status-viewed {
  color: #059669;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.status-not-viewed {
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.access-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-remove-access {
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-remove-access:hover {
  background: #fee2e2;
  color: #991b1b;
}

.manage-access-section {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.parent-selection {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.parent-select {
  flex: 1;
  min-height: 120px;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
}

.parent-select option {
  padding: 0.5rem;
}

.no-access-message {
  text-align: center;
  padding: 2rem;
  color: #64748b;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

/* Existing styles remain unchanged */
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
  max-width: 800px;
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

.document-overview {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
}

.doc-icon {
  background: #4444ac;
  color: white;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doc-header h3 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
}

.doc-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.category {
  color: #64748b;
  font-size: 0.875rem;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-draft {
  background: #fef3c7;
  color: #92400e;
}

.status-published {
  background: #d1fae5;
  color: #065f46;
}

.status-archived {
  background: #f3f4f6;
  color: #374151;
}

.detail-section {
  margin-bottom: 2rem;
}

.detail-section h4 {
  margin: 0 0 1rem 0;
  color: #1e293b;
  font-size: 1.125rem;
}

.detail-section h5 {
  margin: 0 0 0.5rem 0;
  color: #374151;
  font-size: 1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item .label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.info-item .value {
  color: #1e293b;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 600;
  color: #4444ac;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.signatures-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.signature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.signature-parent {
  font-weight: 500;
  color: #1e293b;
}

.signature-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.signature-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.signature-pending {
  background: #fef3c7;
  color: #92400e;
}

.signature-signed {
  background: #d1fae5;
  color: #065f46;
}

.signature-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.signature-expired {
  background: #f3f4f6;
  color: #374151;
}

.signature-date {
  font-size: 0.75rem;
  color: #64748b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #4444ac;
  color: white;
}

.btn-primary:hover {
  background: #3333aa;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f8fafc;
  color: #374151;
  border-color: #d1d5db;
}

.btn-secondary:hover {
  background: #f1f5f9;
  border-color: #9ca3af;
}
</style> 