<template>
  <main class="profile-container" lang="fr" role="main">
    <!-- Content -->
    <div class="profile-content">
      <div class="content-grid">
        <!-- En-tête -->
        <PageHeader 
          title="Mes documents"
          subtitle="Consultez et téléchargez vos documents"
          icon="folder_shared"
        />

        <!-- Badge de notifications signatures en attente -->
        <PendingSignaturesBadge
          @view="handleViewPendingSignatures"
          @click="handleSignatureBadgeClick"
        />

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

              <label class="checkbox-filter">
                <input
                  v-model="signatureFilter"
                  @change="applyFilters"
                  type="checkbox"
                  class="filter-checkbox"
                />
                <span class="checkbox-label">Documents à signer uniquement</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Statistiques rapides -->
        <div class="profile-section stats-section">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">
                <i class="material-icons">description</i>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ parentStats.total }}</div>
                <div class="stat-label">Documents disponibles</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">
                <i class="material-icons">visibility</i>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ parentStats.viewed }}</div>
                <div class="stat-label">Documents consultés</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">
                <i class="material-icons">draw</i>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ parentStats.signed }}</div>
                <div class="stat-label">Documents signés</div>
              </div>
            </div>
            
            <div class="stat-card pending-card">
              <div class="stat-icon">
                <i class="material-icons">pending_actions</i>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ parentStats.pending }}</div>
                <div class="stat-label">Signatures en attente</div>
              </div>
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

        <!-- Documents par catégorie -->
        <div v-else-if="documents.length > 0" class="documents-container">
          <div
            v-for="(categoryDocs, category) in documentsByCategory"
            :key="category"
            v-show="categoryDocs.length > 0"
            class="profile-section category-section"
          >
            <div class="section-header">
              <h2>
                <i class="material-icons" aria-hidden="true">{{ getCategoryIcon(category) }}</i>
                {{ getCategoryLabel(category) }}
                <span class="document-count">({{ categoryDocs.length }})</span>
              </h2>
            </div>

            <div class="documents-grid">
              <article
                v-for="document in categoryDocs"
                :key="document.id"
                class="document-card"
                :class="{
                  'requires-signature': document.requiresSignature,
                  'is-viewed': document.access?.viewedAt,
                  'is-downloaded': document.access?.downloadedAt,
                  'is-signed': document.signature?.status === 'SIGNED',
                  'pending-signature': document.signature?.status === 'PENDING'
                }"
                @click="viewDocument(document)"
              >
                <div class="document-header">
                  <div class="document-icon">
                    <i class="material-icons" aria-hidden="true">
                      {{ getDocumentIcon(document) }}
                    </i>
                  </div>
                  <div class="document-meta">
                    <h3 class="document-title">{{ document.title }}</h3>
                    <p class="document-uploader">
                      Par {{ document.uploadedBy.secretaryProfile?.firstName }} 
                      {{ document.uploadedBy.secretaryProfile?.lastName }}
                    </p>
                  </div>
                  <div class="document-badges">
                    <span v-if="document.requiresSignature" class="signature-badge">
                      <i class="material-icons" aria-hidden="true">draw</i>
                      Signature requise
                    </span>
                    <span v-if="document.access?.viewedAt" class="viewed-badge">
                      <i class="material-icons" aria-hidden="true">visibility</i>
                      Consulté
                    </span>
                  </div>
                </div>

                <div v-if="document.description" class="document-description">
                  <p>{{ document.description }}</p>
                </div>

                <div class="document-info">
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Publié :</span>
                      <span class="info-value">{{ formatDate(document.publishedAt || document.createdAt) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Taille :</span>
                      <span class="info-value">{{ formatFileSize(document.filesize) }}</span>
                    </div>
                    <div v-if="document.signature" class="info-item signature-info">
                      <span class="info-label">Signature :</span>
                      <span class="info-value" :class="`signature-${document.signature.status.toLowerCase()}`">
                        {{ getSignatureStatusLabel(document.signature.status) }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="document-actions">
                  <button
                    @click.stop="downloadDocument(document)"
                    class="doc-action-btn doc-action-download"
                    type="button"
                    :disabled="document.requiresSignature && document.signature?.status !== 'SIGNED'"
                    :aria-label="`Télécharger ${document.title}`"
                  >
                    <i class="material-icons" aria-hidden="true">download</i>
                    Télécharger
                  </button>
                  
                  <button
                    v-if="document.requiresSignature && document.signature?.status === 'PENDING'"
                    @click.stop="signDocument(document)"
                    class="doc-action-btn doc-action-sign"
                    type="button"
                    :aria-label="`Signer ${document.title}`"
                  >
                    <i class="material-icons" aria-hidden="true">draw</i>
                    Signer
                  </button>
                </div>
              </article>
            </div>
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
              Aucun document n'est disponible pour le moment.
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useNotificationStore } from '@/stores/notificationStore'
import type { Document } from '@/stores/documentStore'
import PageHeader from '@/components/PageHeader.vue'
import PendingSignaturesBadge from '@/components/documents/PendingSignaturesBadge.vue'

// Stores
const documentStore = useDocumentStore()
const notify = useNotificationStore()

// État local
const searchTerm = ref('')
const selectedCategory = ref('')
const signatureFilter = ref(false)

// Computed properties
const documents = computed(() => documentStore.documents)
const loading = computed(() => documentStore.loading)
const documentsByCategory = computed(() => documentStore.documentsByCategory)
const parentStats = computed(() => documentStore.parentStats)

const hasActiveFilters = computed(() => 
  searchTerm.value || selectedCategory.value || signatureFilter.value
)

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const debounceSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    applyFilters()
  }, 300)
}

// Méthodes
const applyFilters = () => {
  documentStore.setFilters({
    search: searchTerm.value || undefined,
    category: selectedCategory.value || undefined,
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
  signatureFilter.value = false
  applyFilters()
}

const viewDocument = async (document: Document) => {
  // Marquer comme consulté
  await documentStore.markDocumentAsViewed(document.id)
  
  // Si c'est un document avec signature en attente, rediriger vers Yousign
  if (document.requiresSignature && document.signature?.status === 'PENDING') {
    signDocument(document)
  } else {
    // Sinon, télécharger directement
    downloadDocument(document)
  }
}

const downloadDocument = async (document: Document) => {
  try {
    await documentStore.downloadDocument(document.id)
  } catch (error) {
    console.error('Erreur téléchargement:', error)
  }
}

const signDocument = (document: Document) => {
  // TODO: Rediriger vers Yousign ou ouvrir le document dans une nouvelle fenêtre
  notify.showNotification(
    `Redirection vers la signature de "${document.title}" - À implémenter`,
    'info'
  )
}

const handleViewPendingSignatures = () => {
  // Filtrer pour afficher uniquement les documents en attente de signature
  signatureFilter.value = true
  applyFilters()
}

const handleSignatureBadgeClick = (count: number) => {
  console.log(`Badge signatures cliqué: ${count} documents`)
}

// Utilitaires
const getCategoryIcon = (category: string) => {
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

const getDocumentIcon = (document: Document) => {
  if (document.requiresSignature) {
    return document.signature?.status === 'SIGNED' ? 'check_circle' : 'pending_actions'
  }
  return 'description'
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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
/* Styles similaires à la page secrétaire avec adaptations pour les parents */
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

/* Statistiques */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: #4444ac;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.1);
}

.pending-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f59e0b;
}

.stat-icon {
  background: #4444ac;
  color: white;
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pending-card .stat-icon {
  background: #f59e0b;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
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

/* Documents */
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
  cursor: pointer;
  transition: all 0.2s ease;
}

.document-card:hover {
  border-color: #4444ac;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.document-card.requires-signature {
  border-left: 4px solid #f59e0b;
}

.document-card.is-signed {
  border-left: 4px solid #22c55e;
}

.document-card.pending-signature {
  border-left: 4px solid #ef4444;
  background: linear-gradient(135deg, #fef7f7 0%, #fef2f2 100%);
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

.pending-signature .document-icon {
  background: #fef2f2;
  color: #ef4444;
}

.is-signed .document-icon {
  background: #f0fdf4;
  color: #22c55e;
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

.document-uploader {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

.document-badges {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.signature-badge,
.viewed-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.signature-badge {
  background: #fef3c7;
  color: #92400e;
}

.viewed-badge {
  background: #eff6ff;
  color: #1e40af;
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

.signature-info .info-value.signature-pending {
  color: #ef4444;
  font-weight: 600;
}

.signature-info .info-value.signature-signed {
  color: #22c55e;
  font-weight: 600;
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

.doc-action-download:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.doc-action-sign {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.doc-action-sign:hover {
  background: #dc2626;
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

.link-button {
  background: none;
  border: none;
  color: #4444ac;
  text-decoration: underline;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 768px) {
  .profile-container {
    padding: 0.5rem;
  }
  
  .documents-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filter-controls {
    flex-direction: column;
    align-items: stretch;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 