import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useNotificationStore } from './notificationStore'
import { secureApiCall } from '@/utils/api'
import { API_BASE_URL } from '@/config/api'

export interface Document {
  id: string
  title: string
  description?: string
  category: string
  status: 'DRAFT' | 'PUBLISHED'
  filename: string
  filesize: number
  mimetype: string
  requiresSignature: boolean
  createdAt: string
  updatedAt: string
  publishedAt?: string
  uploadedBy: {
    id: string
    email: string
    secretaryProfile?: {
      firstName: string
      lastName: string
    }
  }
  accesses?: {
    parent: {
      id: number
      firstName: string
      lastName: string
      user: {
        email: string
      }
    }
  }[]
  access?: {
    canView: boolean
    canDownload: boolean
    viewedAt?: string
    downloadedAt?: string
  }
  _count?: {
    accesses: number
  }
}

export interface CreateDocumentPayload {
  title: string
  description?: string
  category: string
  requiresSignature: boolean
  parentIds: number[]
  file: File
}

export interface ParentForDocument {
  id: number
  firstName: string
  lastName: string
  user: {
    id: string
    email: string
    role: string
  }
  children: {
    id: number
    firstName: string
    lastName: string
  }[]
}

export const useDocumentStore = defineStore('document', () => {
  const notify = useNotificationStore()
  
  // État
  const documents = ref<Document[]>([])
  const loading = ref(false)
  const uploading = ref(false)
  const filters = ref({
    category: '',
    status: '',
    search: '',
    requiresSignature: false,
  })
  const pagination = ref({
    total: 0,
    limit: 10,
    offset: 0,
    pages: 0,
  })

  // Computed
  const documentsByCategory = computed(() => {
    const grouped: Record<string, Document[]> = {}
    documents.value.forEach(doc => {
      if (!grouped[doc.category]) {
        grouped[doc.category] = []
      }
      grouped[doc.category].push(doc)
    })
    return grouped
  })

  const parentStats = computed(() => {
    const total = documents.value.length
    const viewed = documents.value.filter(doc => doc.access?.viewedAt).length
    const downloaded = documents.value.filter(doc => doc.access?.downloadedAt).length
    
    return {
      total,
      viewed,
      downloaded,
      signed: 0, // Plus utilisé mais conservé pour compatibilité
      pending: 0, // Plus utilisé mais conservé pour compatibilité
    }
  })

  // Actions
  const createDocument = async (payload: CreateDocumentPayload) => {
    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('title', payload.title)
      formData.append('category', payload.category)
      formData.append('requiresSignature', 'false') // Toujours false maintenant
      formData.append('parentIds', JSON.stringify(payload.parentIds))
      formData.append('file', payload.file)
      
      if (payload.description) {
        formData.append('description', payload.description)
      }

      const response = await secureApiCall(`${API_BASE_URL}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const newDocument = await response.json()
        documents.value.unshift(newDocument)
        notify.showNotification(`Document "${payload.title}" créé avec succès`, 'success')
        
        // Publier automatiquement le document
        await publishDocument(newDocument.id)
        
        return newDocument
      } else {
        throw new Error('Erreur lors de la création du document')
      }
    } catch (error) {
      notify.showNotification('Erreur lors de la création du document', 'error')
      throw error
    } finally {
      uploading.value = false
    }
  }

  const publishDocument = async (documentId: string) => {
    try {
      const response = await secureApiCall(`${API_BASE_URL}/documents/${documentId}/publish`, {
        method: 'PATCH',
      })

      if (response.ok) {
        const updatedDocument = await response.json()
        const index = documents.value.findIndex(doc => doc.id === documentId)
        if (index !== -1) {
          documents.value[index] = updatedDocument
        }
        notify.showNotification('Document publié avec succès', 'success')
        return updatedDocument
      } else {
        throw new Error('Erreur lors de la publication')
      }
    } catch (error) {
      notify.showNotification('Erreur lors de la publication du document', 'error')
      throw error
    }
  }

  const fetchDocuments = async () => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      
      if (filters.value.category) params.append('category', filters.value.category)
      if (filters.value.status) params.append('status', filters.value.status)
      if (filters.value.search) params.append('search', filters.value.search)
      if (filters.value.requiresSignature) params.append('requiresSignature', 'true')
      
      params.append('limit', pagination.value.limit.toString())
      params.append('offset', pagination.value.offset.toString())

      const response = await secureApiCall(`${API_BASE_URL}/documents?${params}`)

      if (response.ok) {
        const data = await response.json()
        documents.value = data.documents || []
        pagination.value = data.pagination || pagination.value
      } else {
        throw new Error('Erreur lors du chargement des documents')
      }
    } catch (error) {
      notify.showNotification('Erreur lors du chargement des documents', 'error')
    } finally {
      loading.value = false
    }
  }

  const getDocumentDetails = async (documentId: string) => {
    try {
      const response = await secureApiCall(`${API_BASE_URL}/documents/${documentId}`)

      if (response.ok) {
        const documentDetails = await response.json()
        return documentDetails
      } else {
        throw new Error('Erreur lors de la récupération des détails')
      }
    } catch (error) {
      notify.showNotification('Erreur lors de la récupération des détails du document', 'error')
      throw error
    }
  }

  const downloadDocument = async (documentId: string) => {
    try {
      const response = await secureApiCall(`${API_BASE_URL}/documents/${documentId}/download`)

      if (response.ok) {
        const blob = await response.blob()
        const documentData = documents.value.find(doc => doc.id === documentId)
        
        if (documentData) {
          const url = window.URL.createObjectURL(blob)
          const link = window.document.createElement('a')
          link.style.display = 'none'
          link.href = url
          link.download = documentData.filename
          window.document.body.appendChild(link)
          link.click()
          window.URL.revokeObjectURL(url)
          window.document.body.removeChild(link)
          
          notify.showNotification('Document téléchargé avec succès', 'success')
        }
      } else {
        throw new Error('Erreur lors du téléchargement')
      }
    } catch (error) {
      notify.showNotification('Erreur lors du téléchargement du document', 'error')
      throw error
    }
  }

  const deleteDocument = async (documentId: string) => {
    try {
      const response = await secureApiCall(`${API_BASE_URL}/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        documents.value = documents.value.filter(doc => doc.id !== documentId)
        notify.showNotification('Document supprimé avec succès', 'success')
      } else {
        throw new Error('Erreur lors de la suppression')
      }
    } catch (error) {
      notify.showNotification('Erreur lors de la suppression du document', 'error')
      throw error
    }
  }

  const getParentsForDocuments = async (): Promise<ParentForDocument[]> => {
    try {
      const response = await secureApiCall(`${API_BASE_URL}/documents/parents/available`)

      if (response.ok) {
        const parents = await response.json()
        return parents
      } else {
        throw new Error('Erreur lors du chargement des parents')
      }
    } catch (error) {
      notify.showNotification('Erreur lors du chargement des parents', 'error')
      throw error
    }
  }

  const addDocumentAccess = async (documentId: string, parentIds: number[]) => {
    try {
      const response = await secureApiCall(`${API_BASE_URL}/documents/${documentId}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parentIds }),
      })

      if (response.ok) {
        const result = await response.json()
        notify.showNotification(`Accès ajouté pour ${result.addedCount} parent(s)`, 'success')
        return result
      } else {
        throw new Error('Erreur lors de l\'ajout d\'accès')
      }
    } catch (error) {
      notify.showNotification('Erreur lors de l\'ajout d\'accès au document', 'error')
      throw error
    }
  }

  const removeDocumentAccess = async (documentId: string, parentIds: number[]) => {
    try {
      const response = await secureApiCall(`${API_BASE_URL}/documents/${documentId}/access`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parentIds }),
      })

      if (response.ok) {
        const result = await response.json()
        notify.showNotification(`Accès supprimé pour ${result.removedCount} parent(s)`, 'success')
        return result
      } else {
        throw new Error('Erreur lors de la suppression d\'accès')
      }
    } catch (error) {
      notify.showNotification('Erreur lors de la suppression d\'accès au document', 'error')
      throw error
    }
  }

  const setFilters = (newFilters: Partial<typeof filters.value>) => {
    Object.assign(filters.value, newFilters)
    pagination.value.offset = 0 // Reset pagination
  }

  const changePage = async (page: number) => {
    pagination.value.offset = (page - 1) * pagination.value.limit
    await fetchDocuments()
  }

  const resetState = () => {
    documents.value = []
    filters.value = {
      category: '',
      status: '',
      search: '',
      requiresSignature: false,
    }
    pagination.value = {
      total: 0,
      limit: 10,
      offset: 0,
      pages: 0,
    }
  }

  return {
    // État
    documents,
    loading,
    uploading,
    filters,
    pagination,
    
    // Computed
    documentsByCategory,
    parentStats,
    
    // Actions
    createDocument,
    publishDocument,
    fetchDocuments,
    getDocumentDetails,
    downloadDocument,
    deleteDocument,
    getParentsForDocuments,
    addDocumentAccess,
    removeDocumentAccess,
    setFilters,
    changePage,
    resetState,
  }
}) 