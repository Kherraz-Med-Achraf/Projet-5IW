import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

const API = import.meta.env.VITE_NEST_API_URL ?? ''

export interface Event {
  id: string
  title: string
  description?: string
  date: string
  startTime: string
  endTime: string
  priceCt: number
  capacity?: number
  imageUrl?: string
  isLocked: boolean
}

export interface RegistrationResult {
  registrationId: string
  stripeUrl: string | null
}

export const useEventStore = defineStore('eventStore', {
  state: () => ({
    events: [] as Event[],
    myRegistrations: [] as { eventId:string; children:string[] }[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchEvents() {
      this.loading = true; this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(`${API}/events`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        this.events = await res.json()
      } catch (e:any) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },
    async register(eventId: string, childIds: number[], paymentMethod: 'CHEQUE' | 'STRIPE'): Promise<RegistrationResult|null> {
      this.loading = true; this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(`${API}/events/${eventId}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ childIds, paymentMethod }),
        })
        if (!res.ok) throw new Error(await res.text())
        return await res.json()
      } catch (e:any) {
        this.error = e.message
        return null
      } finally {
        this.loading = false
      }
    },
    /* Admin: créer un événement */
    async createEvent(payload: FormData) {
      this.loading = true; this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(`${API}/events`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}` },
          body: payload,
        })
        if (!res.ok) throw new Error(await res.text())
        await this.fetchEvents()
      } catch(e:any) {
        this.error = e.message
      } finally { this.loading = false }
    },

    async updateEvent(id: string, payload: FormData) {
      this.loading = true; this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(`${API}/events/${id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${auth.token}` },
          body: payload,
        })
        if (!res.ok) throw new Error(await res.text())
        await this.fetchEvents()
      } catch(e:any) { this.error = e.message } finally { this.loading = false }
    },

    async deleteEvent(id: string) {
      this.loading = true; this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(`${API}/events/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        await this.fetchEvents()
      } catch(e:any) { this.error = e.message } finally { this.loading = false }
    },

    async fetchMyEvents(){
      this.loading=true; this.error=null
      const auth=useAuthStore()
      try{
        const res=await fetch(`${API}/events/mine`,{ headers:{ Authorization:`Bearer ${auth.token}` }})
        if(!res.ok) throw new Error(await res.text())
        this.myRegistrations = await res.json()
      }catch(e:any){ this.error=e.message }finally{ this.loading=false }
    },

    /** Liste des inscriptions pour un événement (admin) */
    async fetchRegistrations(eventId: string){
      this.loading=true; this.error=null
      const auth=useAuthStore()
      try{
        const res=await fetch(`${API}/events/${eventId}/registrations`,{ headers:{ Authorization:`Bearer ${auth.token}` }})
        if(!res.ok) throw new Error(await res.text())
        return await res.json()
      }catch(e:any){ this.error=e.message; return [] }finally{ this.loading=false }
    },

    /** Valider un paiement chèque */
    async validateCheque(registrationId:string){
      this.loading=true; this.error=null
      const auth=useAuthStore()
      try{
        const res=await fetch(`${API}/events/registrations/${registrationId}/payment`,{
          method:'PATCH',
          headers:{ Authorization:`Bearer ${auth.token}` },
        })
        if(!res.ok) throw new Error(await res.text())
        return await res.json()
      }catch(e:any){ this.error=e.message; return null }finally{ this.loading=false }
    },

    async cancelRegistration(regId:string){
      this.loading=true; this.error=null
      const auth=useAuthStore()
      try{
        const res=await fetch(`${API}/events/registrations/${regId}`,{
          method:'DELETE', headers:{ Authorization:`Bearer ${auth.token}` }
        })
        if(!res.ok) throw new Error(await res.text())
        return await res.json()
      }catch(e:any){ this.error=e.message; return null }finally{ this.loading=false }
    },
  },
}) 