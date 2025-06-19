// src/stores/planning.ts
import { defineStore } from 'pinia'

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
  startTime: string  // ISO
  endTime: string    // ISO
  activity: string
  children: Child[]
}

export interface Semester {
  id: string
  name: string
  startDate: string  // ISO
  endDate: string    // ISO
}

export const usePlanningStore = defineStore('planning', {
  state: () => ({
    semesters: [] as Semester[],
    selectedSemester: null as Semester | null,
    // Pour le directeur / service manager
    previewEntries: [] as ScheduleEntry[],
    // Pour staff et parents
    scheduleEntries: [] as ScheduleEntry[],

    loading: false,
    error: '' as string | null,
  }),

  actions: {
    /** Charge la liste des semestres depuis l’API */
    async fetchSemesters() {
      this.loading = true
      this.error = null
      try {
        const res = await fetch(`/planning/semesters`)
        if (!res.ok) throw new Error(await res.text())
        this.semesters = await res.json()
      } catch (err: any) {
        this.error = err.message || 'Erreur au chargement des semestres'
      } finally {
        this.loading = false
      }
    },

    /** Sélectionne un semestre en mémoire */
    selectSemester(id: string) {
      this.selectedSemester = this.semesters.find(s => s.id === id) || null
    },

    /**
     * Upload + preview : renvoie les créneaux parsés (sans persistance)
     * @param file fichier Excel à uploader
     * @param staffId id du staff (depuis le store user ou props)
     */
    async previewUpload(file: File, staffId: string) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      this.previewEntries = []
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(
          `/planning/semesters/${this.selectedSemester.id}/upload`,
          { method: 'POST', body: form }
        )
        if (!res.ok) throw new Error(await res.text())
        this.previewEntries = await res.json()
      } catch (err: any) {
        this.error = err.message || 'Erreur lors de la prévisualisation'
      } finally {
        this.loading = false
      }
    },

    /**
     * Génère (persiste) le planning pour un staff
     * @param file même fichier Excel
     * @param staffId id du staff
     */
    async generateSchedule(file: File, staffId: string) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(
          `/planning/semesters/${this.selectedSemester.id}/generate/${staffId}`,
          { method: 'POST', body: form }
        )
        if (!res.ok) throw new Error(await res.text())
        // pas de payload attendu, on vide la preview
        this.previewEntries = []
      } catch (err: any) {
        this.error = err.message || 'Erreur lors de la génération'
      } finally {
        this.loading = false
      }
    },

    /**
     * Charge le planning du staff connecté
     * @param staffId id du staff (depuis le store user)
     */
    async fetchMySchedule(staffId: string) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      this.scheduleEntries = []
      try {
        const res = await fetch(
          `/planning/semesters/${this.selectedSemester.id}/staff/${staffId}`
        )
        if (!res.ok) throw new Error(await res.text())
        this.scheduleEntries = await res.json()
      } catch (err: any) {
        this.error = err.message || 'Erreur au chargement du planning'
      } finally {
        this.loading = false
      }
    },

    /**
     * Charge le planning d’un enfant (pour un parent)
     * @param childId id de l’enfant sélectionné
     */
    async fetchChildSchedule(childId: number) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      this.scheduleEntries = []
      try {
        const res = await fetch(
          `/planning/semesters/${this.selectedSemester.id}/child/${childId}`
        )
        if (!res.ok) throw new Error(await res.text())
        this.scheduleEntries = await res.json()
      } catch (err: any) {
        this.error = err.message || 'Erreur au chargement du planning enfant'
      } finally {
        this.loading = false
      }
    },

    /** Remise à zéro des erreurs */
    clearError() {
      this.error = null
    },
  },
})
