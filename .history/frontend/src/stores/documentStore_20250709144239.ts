import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useNotificationStore } from './notificationStore';
import { secureApiCall, secureJsonCall, API_BASE_URL } from '@/utils/api';

/* ─────────── Types Frontend ─────────── */
export interface DocumentCategory {
  INFORMATIONS_GENERALES: 'INFORMATIONS_GENERALES';
  SUPPORT_COURS: 'SUPPORT_COURS';
  DEMANDE_SIGNATURE: 'DEMANDE_SIGNATURE';
  AUTRES: 'AUTRES';
}

export interface DocumentStatus {
  DRAFT: 'DRAFT';
  PUBLISHED: 'PUBLISHED';
  ARCHIVED: 'ARCHIVED';
}

export interface SignatureStatus {
  PENDING: 'PENDING';
  SIGNED: 'SIGNED';
  CANCELLED: 'CANCELLED';
  EXPIRED: 'EXPIRED';
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  category: keyof DocumentCategory;
  status: keyof DocumentStatus;
  filename: string;
  filesize: number;
  mimetype: string;
  requiresSignature: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  uploadedBy: {
    id: string;
    email: string;
    secretaryProfile?: {
      firstName: string;
      lastName: string;
    };
  };
  // Données spécifiques au parent connecté
  access?: {
    viewedAt?: string;
    downloadedAt?: string;
  };
  signature?: {
    status: keyof SignatureStatus;
    signedAt?: string;
  };
  // Données pour secrétaire/directeur
  signatures?: Array<{
    status: keyof SignatureStatus;
    signedAt?: string;
    parent: {
      firstName: string;
      lastName: string;
    };
  }>;
  _count?: {
    accesses: number;
    signatures: number;
  };
}

export interface CreateDocumentPayload {
  title: string;
  description?: string;
  category: keyof DocumentCategory;
  requiresSignature: boolean;
  parentIds: number[];
  file: File;
}

export interface DocumentFilters {
  category?: keyof DocumentCategory;
  status?: keyof DocumentStatus;
  requiresSignature?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DocumentKPIs {
  totalDocuments: number;
  publishedDocuments: number;
  documentsRequiringSignature: number;
  pendingSignatures: number;
  completedSignatures: number;
  signatureRate: number;
  averageSignatureTime: number;
  documentsByCategory: Record<keyof DocumentCategory, number>;
  recentActivity: {
    documentsUploadedThisWeek: number;
    signaturesCompletedThisWeek: number;
    activeReminders: number;
  };
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

/* URL racine de l'API */
const API = API_BASE_URL;

export const useDocumentStore = defineStore('document', {
  state: () => ({
    documents: [] as Document[],
    currentDocument: null as Document | null,
    kpis: null as DocumentKPIs | null,
    pendingSignaturesCount: 0,
    pagination: null as PaginationInfo | null,
    loading: false,
    uploading: false,
    error: null as string | null,
    
    // Filtres actuels
    filters: {
      category: undefined,
      status: undefined,
      requiresSignature: undefined,
      search: '',
      limit: 10,
      offset: 0,
    } as DocumentFilters,
  }),

  getters: {
    // Documents par catégorie pour l'affichage organisé
    documentsByCategory: (state) => {
      const categories = {
        INFORMATIONS_GENERALES: [] as Document[],
        SUPPORT_COURS: [] as Document[],
        DEMANDE_SIGNATURE: [] as Document[],
        AUTRES: [] as Document[],
      };
      
      state.documents.forEach(doc => {
        if (categories[doc.category]) {
          categories[doc.category].push(doc);
        }
      });
      
      return categories;
    },

    // Documents en attente de signature pour le parent connecté
    pendingSignatureDocuments: (state) => {
      return state.documents.filter(doc => 
        doc.requiresSignature && 
        doc.signature?.status === 'PENDING'
      );
    },

    // Documents récemment consultés
    recentDocuments: (state) => {
      return state.documents
        .filter(doc => doc.access?.viewedAt)
        .sort((a, b) => new Date(b.access!.viewedAt!).getTime() - new Date(a.access!.viewedAt!).getTime())
        .slice(0, 5);
    },

    // Statistiques rapides pour dashboard parent
    parentStats: (state) => {
      const total = state.documents.length;
      const signed = state.documents.filter(doc => doc.signature?.status === 'SIGNED').length;
      const pending = state.documents.filter(doc => doc.signature?.status === 'PENDING').length;
      const viewed = state.documents.filter(doc => doc.access?.viewedAt).length;
      
      return { total, signed, pending, viewed };
    },
  },

  actions: {
    /** Réinitialiser l'état **/
    resetState() {
      this.documents = [];
      this.currentDocument = null;
      this.kpis = null;
      this.pagination = null;
      this.error = null;
    },

    /** Définir les filtres **/
    setFilters(newFilters: Partial<DocumentFilters>) {
      this.filters = { ...this.filters, ...newFilters };
      // Réinitialiser l'offset si on change autre chose que la pagination
      if ('offset' in newFilters === false) {
        this.filters.offset = 0;
      }
    },

    /** Récupérer la liste des documents **/
    async fetchDocuments() {
      this.loading = true;
      this.error = null;
      const notify = useNotificationStore();

      try {
        const queryParams = new URLSearchParams();
        
        // Ajouter les filtres actifs
        Object.entries(this.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && value !== null) {
            queryParams.append(key, String(value));
          }
        });

        const url = `${API}/documents?${queryParams.toString()}`;
        const response = await secureJsonCall(url);
        
        this.documents = response.documents || [];
        this.pagination = response.pagination || null;
        
        console.log(`📄 ${this.documents.length} documents récupérés`);
        
             } catch (err: any) {
         this.error = err.message;
         notify.showNotification(this.error || 'Erreur lors du chargement des documents', 'error');
         console.error('❌ Erreur fetch documents:', err);
       } finally {
        this.loading = false;
      }
    },

    /** Créer un nouveau document (SECRETARY) **/
    async createDocument(payload: CreateDocumentPayload) {
      this.uploading = true;
      this.error = null;
      const notify = useNotificationStore();

      try {
        const formData = new FormData();
        formData.append('title', payload.title);
        formData.append('category', payload.category);
        formData.append('requiresSignature', String(payload.requiresSignature));
        formData.append('parentIds', JSON.stringify(payload.parentIds));
        formData.append('file', payload.file);
        
        if (payload.description) {
          formData.append('description', payload.description);
        }

        // Debug: Log the payload being sent
        console.log('🔍 Debug createDocument payload:');
        console.log('- title:', payload.title);
        console.log('- category:', payload.category);
        console.log('- requiresSignature:', payload.requiresSignature, typeof payload.requiresSignature);
        console.log('- parentIds:', payload.parentIds, Array.isArray(payload.parentIds));
        console.log('- file:', payload.file?.name, payload.file?.size);
        console.log('- description:', payload.description);
        
        // Debug: Log FormData contents
        console.log('📦 FormData contents:');
        for (const [key, value] of formData.entries()) {
          console.log(`- ${key}:`, value, typeof value);
        }

        const response = await secureApiCall(`${API}/documents`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
        }

        const newDocument = await response.json();
        
        // Ajouter le document à la liste
        this.documents.unshift(newDocument);
        
        notify.showNotification('Document créé avec succès', 'success');
        console.log(`📄 Document créé: ${newDocument.title}`);
        
        return newDocument;
        
             } catch (err: any) {
         this.error = err.message;
         notify.showNotification(this.error || 'Erreur lors de la création du document', 'error');
         console.error('❌ Erreur création document:', err);
         throw err;
       } finally {
        this.uploading = false;
      }
    },

    /** Publier un document (SECRETARY) **/
    async publishDocument(documentId: string) {
      this.loading = true;
      this.error = null;
      const notify = useNotificationStore();

      try {
        const response = await secureApiCall(`${API}/documents/${documentId}/publish`, {
          method: 'POST',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
        }

        const updatedDocument = await response.json();
        
        // Mettre à jour dans la liste
        const index = this.documents.findIndex(d => d.id === documentId);
        if (index !== -1) {
          this.documents[index] = updatedDocument;
        }
        
        notify.showNotification('Document publié avec succès', 'success');
        console.log(`📢 Document publié: ${updatedDocument.title}`);
        
        return updatedDocument;
        
             } catch (err: any) {
         this.error = err.message;
         notify.showNotification(this.error || 'Erreur lors de la publication du document', 'error');
         console.error('❌ Erreur publication document:', err);
         throw err;
       } finally {
        this.loading = false;
      }
    },

    /** Télécharger un document **/
    async downloadDocument(documentId: string) {
      this.loading = true;
      this.error = null;
      const notify = useNotificationStore();

      try {
        const response = await secureApiCall(`${API}/documents/${documentId}/download`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
        }

        // Récupérer le blob du fichier
        const blob = await response.blob();
        
        // Extraire le nom de fichier depuis les headers
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'document.pdf';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        // Créer le lien de téléchargement
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

                 // Marquer comme téléchargé en mettant à jour localement
         const doc = this.documents.find(d => d.id === documentId);
         if (doc && doc.access) {
           doc.access.downloadedAt = new Date().toISOString();
         }

        notify.showNotification('Document téléchargé avec succès', 'success');
        console.log(`📥 Document téléchargé: ${filename}`);
        
             } catch (err: any) {
         this.error = err.message;
         notify.showNotification(this.error || 'Erreur lors du téléchargement du document', 'error');
         console.error('❌ Erreur téléchargement document:', err);
         throw err;
       } finally {
        this.loading = false;
      }
    },

    /** Marquer un document comme consulté (PARENT) **/
    async markDocumentAsViewed(documentId: string) {
      try {
        await secureApiCall(`${API}/documents/${documentId}/mark-viewed`, {
          method: 'POST',
        });

        // Mettre à jour localement
        const document = this.documents.find(d => d.id === documentId);
        if (document && document.access) {
          document.access.viewedAt = new Date().toISOString();
        }

        console.log(`👁️ Document marqué comme consulté: ${documentId}`);
        
      } catch (err: any) {
        console.error('❌ Erreur marquer comme consulté:', err);
        // Ne pas afficher d'erreur à l'utilisateur, c'est non-bloquant
      }
    },

    /** Récupérer le nombre de signatures en attente (PARENT) **/
    async fetchPendingSignaturesCount() {
      try {
        const response = await secureJsonCall(`${API}/documents/pending-signatures/count`);
        this.pendingSignaturesCount = response.pendingCount || 0;
        
        console.log(`🔏 ${this.pendingSignaturesCount} signatures en attente`);
        
      } catch (err: any) {
        console.error('❌ Erreur fetch signatures en attente:', err);
        this.pendingSignaturesCount = 0;
      }
    },

    /** Supprimer un document (SECRETARY) **/
    async deleteDocument(documentId: string) {
      this.loading = true;
      this.error = null;
      const notify = useNotificationStore();

      try {
        const response = await secureApiCall(`${API}/documents/${documentId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
        }

        const result = await response.json();
        
        // Retirer le document de la liste
        const index = this.documents.findIndex(d => d.id === documentId);
        if (index !== -1) {
          this.documents.splice(index, 1);
        }
        
        notify.showNotification('Document supprimé avec succès', 'success');
        console.log(`🗑️ Document supprimé: ${result.deletedDocument?.title || documentId}`);
        
        return result;
        
      } catch (err: any) {
        this.error = err.message;
        notify.showNotification(this.error || 'Erreur lors de la suppression du document', 'error');
        console.error('❌ Erreur suppression document:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /** Récupérer les KPIs (DIRECTOR/SERVICE_MANAGER) **/
    async fetchKPIs() {
      this.loading = true;
      this.error = null;

      try {
        const response = await secureJsonCall(`${API}/documents/dashboard/kpis`);
        this.kpis = response;
        
        console.log('📊 KPIs documents récupérés');
        
      } catch (err: any) {
        this.error = err.message;
        console.error('❌ Erreur fetch KPIs:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /** Rechercher des documents **/
    async searchDocuments(searchTerm: string) {
      this.setFilters({ search: searchTerm, offset: 0 });
      await this.fetchDocuments();
    },

    /** Changer de page **/
    async changePage(page: number) {
      if (this.pagination) {
        const offset = (page - 1) * this.filters.limit!;
        this.setFilters({ offset });
        await this.fetchDocuments();
      }
    },

    /** Rafraîchir les données **/
    async refresh() {
      await this.fetchDocuments();
      
      const auth = useAuthStore();
      if (auth.user?.role === 'PARENT') {
        await this.fetchPendingSignaturesCount();
      } else if (['DIRECTOR', 'SERVICE_MANAGER'].includes(auth.user?.role || '')) {
        await this.fetchKPIs();
      }
    },
  },
}); 