// src/stores/planning.ts
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

/** URL racine de l’API Nest */
const API = import.meta.env.VITE_NEST_API_URL ?? ''

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

export interface StaffMember {
  id: number
  firstName: string
  lastName: string
  userId: string
}

export const usePlanningStore = defineStore('planning', {
  state: () => ({
    semesters: [] as Semester[],
    staffList: [] as StaffMember[],
    selectedSemester: null as Semester | null,
    previewEntries: [] as ScheduleEntry[],
    scheduleEntries: [] as ScheduleEntry[],

    loading: false,
    error: null as string | null,
  }),

  actions: {
    /** Charge la liste des semestres */
    async fetchSemesters() {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(`${API}/planning/semesters`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        this.semesters = await res.json()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /** Charge la liste des membres du staff */
    async fetchStaffList() {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(`${API}/staff`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as any[]
        this.staffList = data.map(s => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          userId: s.userId,
        }))
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /** Sélectionne un semestre en mémoire */
    selectSemester(id: string) {
      this.selectedSemester = this.semesters.find(s => s.id === id) || null
    },

    /**
     * Upload + preview
     * @param file    Fichier Excel
     * @param staffId ID du staff sélectionné
     */
    async previewUpload(file: File, staffId: string) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      this.previewEntries = []
      const auth = useAuthStore()
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(
          `${API}/planning/semesters/${this.selectedSemester.id}/upload/${staffId}`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.token}` },
            body: form,
          }
        )
        if (!res.ok) throw new Error(await res.text())
        this.previewEntries = await res.json()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Génère (persiste) le planning pour un staff
     * @param file    Fichier Excel
     * @param staffId ID du staff sélectionné
     */
    async generateSchedule(file: File, staffId: string) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(
          `${API}/planning/semesters/${this.selectedSemester.id}/generate/${staffId}`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.token}` },
            body: form,
          }
        )
        if (!res.ok) throw new Error(await res.text())
        this.previewEntries = []
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Charge le planning du staff connecté
     * @param staffId ID du staff connecté
     */
    async fetchMySchedule(staffId: string) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      this.scheduleEntries = []
      const auth = useAuthStore()
      try {
        const res = await fetch(
          `${API}/planning/semesters/${this.selectedSemester.id}/staff/${staffId}`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        )
        if (!res.ok) throw new Error(await res.text())
        this.scheduleEntries = await res.json()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Charge le planning d’un enfant (parent)
     * @param childId ID de l’enfant sélectionné
     */
    async fetchChildSchedule(childId: number) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      this.scheduleEntries = []
      const auth = useAuthStore()
      try {
        const res = await fetch(
          `${API}/planning/semesters/${this.selectedSemester.id}/child/${childId}`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        )
        if (!res.ok) throw new Error(await res.text())
        this.scheduleEntries = await res.json()
      } catch (err: any) {
        this.error = err.message
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
