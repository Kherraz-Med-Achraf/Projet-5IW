<template>
  <main class="profile-container" lang="fr" role="main">
    <!-- Skip links pour navigation clavier -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#documents-list" class="skip-link">Aller à la liste des documents</a>
    </div>
    
    <!-- Content -->
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        <!-- En-tête -->
        <PageHeader 
          title="Gestion documentaire"
          subtitle="Upload et gestion des documents pour les parents"
          icon="folder"
        />

        <!-- Actions rapides -->
        <div class="profile-section">
          <div class="actions-container">
            <button
              @click="showUploadModal = true"
              class="action-btn action-btn-primary"
              type="button"
              :disabled="uploading"
            >
              <i class="material-icons" aria-hidden="true">
                {{ uploading ? 'hourglass_empty' : 'upload_file' }}
              </i>
              {{ uploading ? 'Upload en cours...' : 'Nouveau document' }}
            </button>
            
            <button
              @click="refreshDocuments"
              class="action-btn action-btn-secondary"
              type="button"
              :disabled="loading"
            >
              <i class="material-icons" aria-hidden="true">
                {{ loading ? 'hourglass_empty' : 'refresh' }}
              </i>
              Actualiser
            </button>
          </div>
        </div>

        <!-- Filtres et recherche -->
        <div class="profile-section">
          <div class="filters-container">
            <div class="search-box">
              <i class="material-icons search-icon" aria-hidden="true">search</i>
              <input
                v-model="searchTerm"
                @input="debounceSearch"
                type="text"
                placeholder="Rechercher un document..."
                class="search-input"
                aria-label="Rechercher dans les documents"
              />
              <button
                v-if="searchTerm"
                @click="clearSearch"
                class="clear-search"
                type="button"
                aria-label="Effacer la recherche"
              >
                <i class="material-icons" aria-hidden="true">close</i>
              </button>
            </div>

            <div class="filter-controls">
              <select
                v-model="selectedCategory"
                @change="applyFilters"
                class="filter-select"
                aria-label="Filtrer par catégorie"
              >
                <option value="">Toutes les catégories</option>
                <option value="INFORMATIONS_GENERALES">Informations générales</option>
                <option value="SUPPORT_COURS">Support de cours</option>
                <option value="DEMANDE_SIGNATURE">Demande de signature</option>
                <option value="AUTRES">Autres</option>
              </select>

              <select
                v-model="selectedStatus"
                @change="applyFilters"
                class="filter-select"
                aria-label="Filtrer par statut"
              >
                <option value="">Tous les statuts</option>
                <option value="DRAFT">Brouillons</option>
                <option value="PUBLISHED">Publiés</option>
                <option value="ARCHIVED">Archivés</option>
              </select>

              <label class="checkbox-filter">
                <input
                  v-model="signatureFilter"
                  @change="applyFilters"
                  type="checkbox"
                  class="filter-checkbox"
                />
                <span class="checkbox-label">Signature requise uniquement</span>
              </label>
            </div>
          </div>
        </div>

        <!-- État de chargement -->
        <div v-if="loading" class="profile-section loading-section">
          <div class="loading-content">
            <div class="loading-spinner" aria-hidden="true"></div>
            <h2>Chargement des documents...</h2>
            <p>Récupération de vos documents</p>
          </div>
        </div>

        <!-- Liste des documents -->
        <div v-else-if="documents.length > 0" class="profile-section documents-section" id="documents-list">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">description</i>
              Vos documents
              <span class="document-count">({{ pagination?.total || documents.length }})</span>
            </h2>
          </div>

          <div class="documents-grid">
            <article
              v-for="document in documents"
              :key="document.id"
              class="document-card"
              :class="{
                'is-draft': document.status === 'DRAFT',
                'is-published': document.status === 'PUBLISHED',
                'requires-signature': document.requiresSignature
              }"
            >
              <div class="document-header">
                <div class="document-icon">
                  <i class="material-icons" aria-hidden="true">
                    {{ getDocumentIcon(document.category) }}
                  </i>
                </div>
                <div class="document-meta">
                  <h3 class="document-title">{{ document.title }}</h3>
                  <p class="document-category">{{ getCategoryLabel(document.category) }}</p>
                </div>
                <div class="document-status">
                  <span 
                    class="status-badge" 
                    :class="`status-${document.status.toLowerCase()}`"
                  >
                    {{ getStatusLabel(document.status) }}
                  </span>
                </div>
              </div>

              <div v-if="document.description" class="document-description">
                <p>{{ document.description }}</p>
              </div>

              <div class="document-info">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Fichier :</span>
                    <span class="info-value">{{ document.filename }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Taille :</span>
                    <span class="info-value">{{ formatFileSize(document.filesize) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Créé :</span>
                    <span class="info-value">{{ formatDate(document.createdAt) }}</span>
                  </div>
                  <div v-if="document.requiresSignature" class="info-item">
                    <span class="info-label">Signatures :</span>
                    <span class="info-value">
                      {{ document._count?.signatures || 0 }} / {{ document._count?.accesses || 0 }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="document-actions">
                <button
                  @click="downloadDocument(document)"
                  class="doc-action-btn doc-action-download"
                  type="button"
                  :aria-label="`Télécharger ${document.title}`"
                >
                  <i class="material-icons" aria-hidden="true">download</i>
                  Télécharger
                </button>
                
                <button
                  v-if="document.status === 'DRAFT'"
                  @click="publishDocument(document)"
                  class="doc-action-btn doc-action-publish"
                  type="button"
                  :disabled="publishing === document.id"
                  :aria-label="`Publier ${document.title}`"
                >
                  <i class="material-icons" aria-hidden="true">
                    {{ publishing === document.id ? 'hourglass_empty' : 'publish' }}
                  </i>
                  {{ publishing === document.id ? 'Publication...' : 'Publier' }}
                </button>

                <button
                  @click="viewDocumentDetails(document)"
                  class="doc-action-btn doc-action-details"
                  type="button"
                  :aria-label="`Voir les détails de ${document.title}`"
                >
                  <i class="material-icons" aria-hidden="true">visibility</i>
                  Détails
                </button>

                <button
                  @click="deleteDocument(document)"
                  class="doc-action-btn doc-action-delete"
                  type="button"
                  :disabled="deleting === document.id"
                  :aria-label="`Supprimer ${document.title}`"
                >
                  <i class="material-icons" aria-hidden="true">
                    {{ deleting === document.id ? 'hourglass_empty' : 'delete' }}
                  </i>
                  {{ deleting === document.id ? 'Suppression...' : 'Supprimer' }}
                </button>
              </div>
            </article>
          </div>

          <!-- Pagination -->
          <div v-if="pagination && pagination.pages > 1" class="pagination-container">
            <nav aria-label="Navigation entre les pages de documents" role="navigation">
              <ul class="pagination">
                <li class="page-item">
                  <button
                    @click="changePage(currentPage - 1)"
                    :disabled="currentPage <= 1"
                    class="page-link"
                    type="button"
                    aria-label="Page précédente"
                  >
                    <i class="material-icons" aria-hidden="true">chevron_left</i>
                    Précédent
                  </button>
                </li>
                
                <li
                  v-for="page in visiblePages"
                  :key="page"
                  class="page-item"
                  :class="{ 'active': page === currentPage }"
                >
                  <button
                    @click="changePage(page)"
                    class="page-link"
                    type="button"
                    :aria-label="`Aller à la page ${page}`"
                    :aria-current="page === currentPage ? 'page' : undefined"
                  >
                    {{ page }}
                  </button>
                </li>
                
                <li class="page-item">
                  <button
                    @click="changePage(currentPage + 1)"
                    :disabled="currentPage >= pagination.pages"
                    class="page-link"
                    type="button"
                    aria-label="Page suivante"
                  >
                    Suivant
                    <i class="material-icons" aria-hidden="true">chevron_right</i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <!-- État vide -->
        <div v-else class="profile-section empty-section">
          <div class="empty-content">
            <div class="empty-icon" aria-hidden="true">
              <i class="material-icons">folder_open</i>
            </div>
            <h2>Aucun document trouvé</h2>
            <p v-if="hasActiveFilters">
              Aucun document ne correspond à vos critères de recherche.
              <button @click="clearAllFilters" class="link-button">
                Effacer les filtres
              </button>
            </p>
            <p v-else>
              Vous n'avez pas encore uploadé de documents.
              <button @click="showUploadModal = true" class="link-button">
                Créer votre premier document
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'upload -->
    <UploadDocumentModal
      v-if="showUploadModal"
      @close="showUploadModal = false"
      @uploaded="handleDocumentUploaded"
    />

    <!-- Modal de détails -->
    <DocumentDetailsModal
      v-if="selectedDocument"
      :document="selectedDocument"
      @close="selectedDocument = null"
      @updated="handleDocumentUpdated"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useNotificationStore } from '@/stores/notificationStore'
import type { Document } from '@/stores/documentStore'
import PageHeader from '@/components/PageHeader.vue'
import UploadDocumentModal from '@/components/documents/UploadDocumentModal.vue'
import DocumentDetailsModal from '@/components/documents/DocumentDetailsModal.vue'

// Stores
const documentStore = useDocumentStore()
const notify = useNotificationStore()

// État local
const showUploadModal = ref(false)
const selectedDocument = ref<Document | null>(null)
const publishing = ref<string | null>(null)
const deleting = ref<string | null>(null)
const searchTerm = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const signatureFilter = ref(false)

// Computed properties
const documents = computed(() => documentStore.documents)
const loading = computed(() => documentStore.loading)
const uploading = computed(() => documentStore.uploading)
const pagination = computed(() => documentStore.pagination)
const currentPage = computed(() => 
  pagination.value ? Math.floor(pagination.value.offset / pagination.value.limit) + 1 : 1
)

const hasActiveFilters = computed(() => 
  searchTerm.value || selectedCategory.value || selectedStatus.value || signatureFilter.value
)

const visiblePages = computed(() => {
  if (!pagination.value) return []
  
  const totalPages = pagination.value.pages
  const current = currentPage.value
  const delta = 2
  
  const range = []
  const rangeWithDots = []
  
  for (let i = Math.max(2, current - delta); i <= Math.min(totalPages - 1, current + delta); i++) {
    range.push(i)
  }
  
  if (current - delta > 2) {
    rangeWithDots.push(1, '...')
  } else {
    rangeWithDots.push(1)
  }
  
  rangeWithDots.push(...range)
  
  if (current + delta < totalPages - 1) {
    rangeWithDots.push('...', totalPages)
  } else {
    rangeWithDots.push(totalPages)
  }
  
  return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index)
})

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const debounceSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    applyFilters()
  }, 300)
}

// Méthodes
const refreshDocuments = async () => {
  await documentStore.fetchDocuments()
}

const applyFilters = () => {
  documentStore.setFilters({
    search: searchTerm.value || undefined,
    category: selectedCategory.value || undefined,
    status: selectedStatus.value || undefined,
    requiresSignature: signatureFilter.value || undefined,
  })
  documentStore.fetchDocuments()
}

const clearSearch = () => {
  searchTerm.value = ''
  applyFilters()
}

const clearAllFilters = () => {
  searchTerm.value = ''
  selectedCategory.value = ''
  selectedStatus.value = ''
  signatureFilter.value = false
  applyFilters()
}

const changePage = async (page: number) => {
  await documentStore.changePage(page)
}

const downloadDocument = async (document: Document) => {
  try {
    await documentStore.downloadDocument(document.id)
  } catch (error) {
    console.error('Erreur téléchargement:', error)
  }
}

const publishDocument = async (document: Document) => {
  if (publishing.value) return
  
  publishing.value = document.id
  try {
    await documentStore.publishDocument(document.id)
    notify.showNotification(`Document "${document.title}" publié avec succès`, 'success')
  } catch (error) {
    console.error('Erreur publication:', error)
  } finally {
    publishing.value = null
  }
}

const viewDocumentDetails = (document: Document) => {
  selectedDocument.value = document
}

const handleDocumentUploaded = (document: Document) => {
  showUploadModal.value = false
  notify.showNotification(`Document "${document.title}" créé avec succès`, 'success')
  refreshDocuments()
}

const handleDocumentUpdated = (document: Document) => {
  selectedDocument.value = null
  notify.showNotification(`Document "${document.title}" mis à jour`, 'success')
  refreshDocuments()
}

// Utilitaires
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

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Lifecycle
onMounted(async () => {
  await documentStore.fetchDocuments()
})

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
  documentStore.resetState()
})
</script>

<style scoped>
/* Style similaire aux autres pages avec adaptations pour les documents */
.profile-container {
  background: #f8fafc;
  padding: 1rem;
  min-height: 100vh;
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* Actions */
.actions-container {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.action-btn-primary {
  background: #4444ac;
  color: white;
}

.action-btn-primary:hover:not(:disabled) {
  background: #3a3a9a;
}

.action-btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.action-btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Filtres */
.filters-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-box {
  position: relative;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.clear-search {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
}

.filter-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.filter-select {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
}

.checkbox-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Documents grid */
.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.document-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.document-card:hover {
  border-color: #4444ac;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.document-card.requires-signature {
  border-left: 4px solid #f59e0b;
}

.document-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.document-icon {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 0.75rem;
  color: #4444ac;
}

.document-meta {
  flex: 1;
  min-width: 0;
}

.document-title {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.document-category {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-draft {
  background: #fef3c7;
  color: #92400e;
}

.status-published {
  background: #dcfce7;
  color: #166534;
}

.document-description {
  margin-bottom: 1rem;
  color: #64748b;
  font-size: 0.875rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.info-value {
  font-size: 0.875rem;
  color: #1e293b;
}

.document-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.doc-action-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s ease;
}

.doc-action-download {
  background: #f1f5f9;
  color: #475569;
  border-color: #e2e8f0;
}

.doc-action-publish {
  background: #22c55e;
  color: white;
  border-color: #22c55e;
}

.doc-action-details {
  background: white;
  color: #4444ac;
  border-color: #4444ac;
}

/* États vides et de chargement */
.loading-section, .empty-section {
  text-align: center;
  padding: 3rem 1.5rem;
}

.loading-content, .empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #4444ac;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.empty-icon .material-icons {
  font-size: 4rem;
  color: #cbd5e1;
}

/* Pagination */
.pagination-container {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
}

.pagination {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0.5rem;
}

.page-link {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
  text-decoration: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-link:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #4444ac;
}

.page-item.active .page-link {
  background: #4444ac;
  color: white;
  border-color: #4444ac;
}

.page-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .profile-container {
    padding: 0.5rem;
  }
  
  .documents-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .actions-container {
    flex-direction: column;
  }
}

/* Accessibilité */
.skip-links {
  display: none;
}

@media (max-width: 768px) {
  .skip-links {
    display: block;
  }
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #4444ac;
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 