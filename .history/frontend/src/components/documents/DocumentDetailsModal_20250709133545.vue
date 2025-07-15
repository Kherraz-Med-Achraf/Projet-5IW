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
        <!-- En-tête document -->
        <div class="document-overview">
          <div class="doc-icon">
            <i class="material-icons">{{ getDocumentIcon(document.category) }}</i>
          </div>
          <div class="doc-header">
            <h3>{{ document.title }}</h3>
            <div class="doc-meta">
              <span class="category">{{ getCategoryLabel(document.category) }}</span>
              <span class="status-badge" :class="`status-${document.status.toLowerCase()}`">
                {{ getStatusLabel(document.status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div v-if="document.description" class="detail-section">
          <h4>Description</h4>
          <p>{{ document.description }}</p>
        </div>

        <!-- Informations générales -->
        <div class="detail-section">
          <h4>Informations</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Nom du fichier :</span>
              <span class="value">{{ document.filename }}</span>
            </div>
            <div class="info-item">
              <span class="label">Taille :</span>
              <span class="value">{{ formatFileSize(document.filesize) }}</span>
            </div>
            <div class="info-item">
              <span class="label">Type :</span>
              <span class="value">{{ document.mimetype }}</span>
            </div>
            <div class="info-item">
              <span class="label">Version :</span>
              <span class="value">{{ document.version }}</span>
            </div>
            <div class="info-item">
              <span class="label">Créé le :</span>
              <span class="value">{{ formatDateTime(document.createdAt) }}</span>
            </div>
            <div v-if="document.publishedAt" class="info-item">
              <span class="label">Publié le :</span>
              <span class="value">{{ formatDateTime(document.publishedAt) }}</span>
            </div>
            <div class="info-item">
              <span class="label">Signature requise :</span>
              <span class="value">{{ document.requiresSignature ? 'Oui' : 'Non' }}</span>
            </div>
          </div>
        </div>

        <!-- Accès et signatures -->
        <div class="detail-section">
          <h4>Statistiques</h4>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">{{ document._count?.accesses || 0 }}</div>
              <div class="stat-label">Parents avec accès</div>
            </div>
            <div v-if="document.requiresSignature" class="stat-card">
              <div class="stat-number">{{ document._count?.signatures || 0 }}</div>
              <div class="stat-label">Signatures</div>
            </div>
          </div>
        </div>

        <!-- Liste des signatures (si applicable) -->
        <div v-if="document.requiresSignature && document.signatures?.length" class="detail-section">
          <h4>État des signatures</h4>
          <div class="signatures-list">
            <div
              v-for="signature in document.signatures"
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
import { useDocumentStore } from '@/stores/documentStore'
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

// Methods
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
  max-width: 700px;
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

.doc-icon .material-icons {
  font-size: 2rem;
}

.doc-header {
  flex: 1;
}

.doc-header h3 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 1.25rem;
}

.doc-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.category {
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
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item .label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.info-item .value {
  color: #1e293b;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #4444ac;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
}

.signatures-list {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.signature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.signature-item:last-child {
  border-bottom: none;
}

.signature-parent {
  font-weight: 600;
  color: #1e293b;
}

.signature-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.signature-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.signature-pending {
  background: #fef3c7;
  color: #92400e;
}

.signature-signed {
  background: #dcfce7;
  color: #166534;
}

.signature-cancelled {
  background: #fee2e2;
  color: #dc2626;
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

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-primary {
  background: #4444ac;
  color: white;
}

.btn-primary:hover {
  background: #3a3a9a;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    margin: 0;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .document-overview {
    flex-direction: column;
    text-align: center;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .signature-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .signature-status {
    align-items: flex-start;
  }
  
  .modal-footer {
    flex-direction: column;
  }
}
</style> 