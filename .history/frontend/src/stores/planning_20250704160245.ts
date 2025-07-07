// src/stores/planning.ts
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { secureApiCall, secureJsonCall, API_BASE_URL } from '@/utils/api'

/** URL racine de l'API Nest */
const API = import.meta.env.VITE_NEST_API_URL ?? ''

// Validation de l'URL API obligatoire
if (!API) {
  throw new Error('VITE_NEST_API_URL doit être définie dans les variables d\'environnement')
}

// Timeout par défaut pour toutes les requêtes
const DEFAULT_TIMEOUT = 30000 // 30 secondes
const UPLOAD_TIMEOUT = 120000 // 2 minutes pour les uploads

export interface Child {
  id: number
  firstName: string
  lastName: string
}

export interface ScheduleEntry {
  id: string
  staffId: string
  semesterId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  activity: string
  children: Child[]
}

export interface Semester {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface StaffMember {
  id: number
  firstName: string
  lastName: string
  userId: string
}

/**
 * Utilitaires de validation côté client
 */
class PlanningValidator {
  static validateSemester(semester: any): Semester {
    if (!semester || typeof semester !== 'object') {
      throw new Error('Données de semestre invalides')
    }
    
    if (!semester.id || typeof semester.id !== 'string') {
      throw new Error('ID de semestre invalide')
    }
    
    if (!semester.name || typeof semester.name !== 'string') {
      throw new Error('Nom de semestre invalide')
    }
    
    return semester as Semester
  }
  
  static validateScheduleEntry(entry: any): ScheduleEntry {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Données de planning invalides')
    }
    
    if (!entry.id || typeof entry.id !== 'string') {
      throw new Error('ID de créneau invalide')
    }
    
    if (typeof entry.dayOfWeek !== 'number' || entry.dayOfWeek < 1 || entry.dayOfWeek > 7) {
      throw new Error('Jour de la semaine invalide')
    }
    
    return entry as ScheduleEntry
  }
  
  static validateFile(file: File): void {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    if (!file) {
      throw new Error('Fichier manquant')
    }
    
    if (file.size > maxSize) {
      throw new Error(`Fichier trop volumineux (max ${maxSize / 1024 / 1024}MB)`)
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Type de fichier non autorisé (seuls .xlsx et .xls sont acceptés)')
    }
    
    // Validation du nom de fichier
    if (file.name.length > 255) {
      throw new Error('Nom de fichier trop long')
    }
    
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/
    if (dangerousChars.test(file.name)) {
      throw new Error('Nom de fichier contient des caractères interdits')
    }
  }
}

/**
 * Utilitaires pour les requêtes sécurisées
 */
class ApiClient {
  static async fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = DEFAULT_TIMEOUT): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout de la requête dépassé')
      }
      throw error
    }
  }
  
  static sanitizeError(error: any): string {
    if (typeof error === 'string') {
      return error
    }
    
    if (error?.message) {
      // Filtrer les informations sensibles
      const message = error.message
      
      // Masquer les détails techniques
      if (message.includes('fetch')) {
        return 'Erreur de connexion au serveur'
      }
      
      if (message.includes('JSON')) {
        return 'Erreur de format de données'
      }
      
      if (message.includes('Unauthorized')) {
        return 'Session expirée, veuillez vous reconnecter'
      }
      
      if (message.includes('Forbidden')) {
        return 'Accès non autorisé'
      }
      
      return message
    }
    
    return 'Une erreur inattendue s\'est produite'
  }
}

export const usePlanningStore = defineStore('planning', {
  state: () => ({
    semesters: [] as Semester[],
    staffList: [] as StaffMember[],
    selectedSemester: null as Semester | null,

    /** Aperçu des créneaux (preview global) */
    previewEntries: [] as ScheduleEntry[],

    /** Événements d'un staff particulier */
    events: [] as ScheduleEntry[],

    /** URL blob pour télécharger l'Excel importé */
    downloadUrl: '' as string,

    loading: false,
    error: null as string | null,
  }),

  actions: {
    /** 1. Charger la liste des semestres */
    async fetchSemesters() {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const res = await ApiClient.fetchWithTimeout(`${API}/planning/semesters`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        const data = await res.json()
        this.semesters = data.map((semester: any) => PlanningValidator.validateSemester(semester))
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
      } finally {
        this.loading = false
      }
    },

    /** 2. Charger la liste des éducateurs */
    async fetchStaffList() {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const res = await ApiClient.fetchWithTimeout(`${API}/staff`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        const data = (await res.json()) as any[]
        this.staffList = data.map(s => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          userId: s.userId,
        }))
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
      } finally {
        this.loading = false
      }
    },

    /** 2.5. Sélectionner un semestre */
    selectSemester(semesterId: string) {
      const semester = this.semesters.find(s => s.id === semesterId)
      if (semester) {
        this.selectedSemester = semester
        // Reset des autres données quand on change de semestre
        this.previewEntries = []
        this.downloadUrl = ''
        this.error = null
      } else if (semesterId) {
        console.warn(`Semestre non trouvé: ${semesterId}`)
        this.error = `Semestre non trouvé: ${semesterId}`
      } else {
        // Si semesterId est vide, on reset la sélection
        this.selectedSemester = null
        this.previewEntries = []
        this.downloadUrl = ''
        this.error = null
      }
    },

    /** 3. Créer un nouveau semestre */
    async createSemester(name: string, startDate: string, endDate: string) {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      
      // Validation côté client
      if (!name.trim()) {
        this.error = 'Le nom du semestre est requis'
        this.loading = false
        return
      }
      
      if (new Date(startDate) >= new Date(endDate)) {
        this.error = 'La date de début doit être antérieure à la date de fin'
        this.loading = false
        return
      }
      
      try {
        const res = await ApiClient.fetchWithTimeout(`${API}/planning/semesters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ name: name.trim(), startDate, endDate }),
        })
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        const newSemester = await res.json()
        this.semesters.push(PlanningValidator.validateSemester(newSemester))
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
      } finally {
        this.loading = false
      }
    },

    /** 4. Prévisualiser l'Excel */
    async previewExcel(file: File) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return []
      }
      
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      
      try {
        // Validation côté client
        PlanningValidator.validateFile(file)
        
        const form = new FormData()
        form.append('file', file)
        
        const res = await ApiClient.fetchWithTimeout(
          `${API}/planning/semesters/${this.selectedSemester.id}/upload`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.token}` },
            body: form,
          },
          UPLOAD_TIMEOUT
        )
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        const data = await res.json()
        return data.map((entry: any) => PlanningValidator.validateScheduleEntry(entry))
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
        return []
      } finally {
        this.loading = false
      }
    },

    /** 5. Import définitif global */
    async importAll(file: File) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      
      try {
        // Validation côté client
        PlanningValidator.validateFile(file)
        
        const form = new FormData()
        form.append('file', file)
        
        const res = await ApiClient.fetchWithTimeout(
          `${API}/planning/semesters/${this.selectedSemester.id}/import`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.token}` },
            body: form,
          },
          UPLOAD_TIMEOUT
        )
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        // Recharge l'aperçu global après import
        await this.fetchOverview()
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
      } finally {
        this.loading = false
      }
    },

    /** 6. Récupérer l'aperçu agrégé existant */
    async fetchOverview() {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      
      this.loading = true
      this.error = null
      this.previewEntries = []
      const auth = useAuthStore()
      
      try {
        const res = await ApiClient.fetchWithTimeout(
          `${API}/planning/semesters/${this.selectedSemester.id}/overview`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        )
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        const data = await res.json()
        this.previewEntries = data.map((entry: any) => PlanningValidator.validateScheduleEntry(entry))
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
      } finally {
        this.loading = false
      }
    },

    /** 7. Télécharger l'Excel importé global */
    async downloadAll() {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      
      try {
        const res = await ApiClient.fetchWithTimeout(
          `${API}/planning/semesters/${this.selectedSemester.id}/download`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        )
        
        if (res.status === 404) {
          this.downloadUrl = ''
          return
        }
        
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        const blob = await res.blob()
        this.downloadUrl = URL.createObjectURL(blob)
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
      } finally {
        this.loading = false
      }
    },

    /** 8. Valider (soumettre) le planning final */
    async submitPlanning() {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      
      try {
        const res = await ApiClient.fetchWithTimeout(
          `${API}/planning/semesters/${this.selectedSemester.id}/submit`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        )
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        // On vide l'aperçu et l'URL de téléchargement
        this.previewEntries = []
        this.downloadUrl = ''
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
      } finally {
        this.loading = false
      }
    },

    /** 10. Annuler / réactiver un créneau */
    async cancelEntry(entryId: string, cancel = true) {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      
      try {
        const res = await ApiClient.fetchWithTimeout(`${API}/planning/entries/${entryId}/cancel`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ cancel }),
        })
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        // Mettre à jour local previewEntries si présent
        const updated = await res.json()
        const idx = this.previewEntries.findIndex(e => e.id === entryId)
        if (idx !== -1) this.previewEntries[idx].activity = updated.activity
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
      } finally {
        this.loading = false
      }
    },

    /** 11. Réaffecter enfants d'un créneau vers un autre */
    async reassignChildren(sourceId: string, targetId: string) {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      
      try {
        const res = await ApiClient.fetchWithTimeout(`${API}/planning/entries/${sourceId}/reassign`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ targetEntryId: targetId }),
        })
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        await res.json()
        // Rafraîchit overview
        await this.fetchOverview()
        window.dispatchEvent(new Event('planning-updated'))
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
      } finally {
        this.loading = false
      }
    },

    /** 12. Réaffecter un enfant */
    async reassignOneChild(sourceId: string, childId: number, targetId: string) {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      
      try {
        const res = await ApiClient.fetchWithTimeout(`${API}/planning/entries/${sourceId}/reassign-child/${childId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ targetEntryId: targetId }),
        })
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`Erreur serveur: ${res.status} - ${errorText}`)
        }
        
        await res.json()
        if (this.selectedSemester) {
          await this.fetchOverview()
          window.dispatchEvent(new Event('planning-updated'))
        }
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
      } finally {
        this.loading = false
      }
    },

    /** 13. Récupérer les cours alternatifs pour un transfert automatique */
    async getAlternativeCourses(entryId: string): Promise<ScheduleEntry[]> {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      
      try {
        const res = await ApiClient.fetchWithTimeout(`${API}/planning/entries/${entryId}/alternatives`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        const data = await res.json()
        return data.map((entry: any) => PlanningValidator.validateScheduleEntry(entry))
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
        return []
      } finally {
        this.loading = false
      }
    },

    // Alias pour compatibilité avec les anciens noms de méthodes
    async loadSemesters() {
      return this.fetchSemesters()
    },

    async loadStaff() {
      return this.fetchStaffList()
    },

    async loadStaffSchedule(semesterId: string, staffId: string) {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      
      try {
        const res = await ApiClient.fetchWithTimeout(`${API}/planning/semesters/${semesterId}/staff/${staffId}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
        
        const data = await res.json()
        // Stocker les événements dans une propriété dédiée
        this.events = data.map((entry: any) => PlanningValidator.validateScheduleEntry(entry))
        return this.events
      } catch (err: any) {
        this.error = ApiClient.sanitizeError(err)
        return []
      } finally {
        this.loading = false
      }
    },

    async findAlternatives(entryId: string) {
      return this.getAlternativeCourses(entryId)
    },

    async cancelCourse(entryId: string) {
      return this.cancelEntry(entryId, true)
    },

    async reactivateCourse(entryId: string) {
      return this.cancelEntry(entryId, false)
    },

    async transferChild(sourceEntryId: string, childId: number, targetEntryId: string) {
      return this.reassignOneChild(sourceEntryId, childId, targetEntryId)
    }
  },
})
