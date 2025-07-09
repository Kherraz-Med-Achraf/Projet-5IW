// src/stores/childStore.ts
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { secureApiCall, secureJsonCall, API_BASE_URL } from '@/utils/api'

interface Child {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentProfileId: number;
  // … tout autre champ que renvoie votre back
}

export const useChildStore = defineStore("child", {
  state: () => ({
    referentChildren: [] as Child[],
    loading: false as boolean,
    error: "" as string,
  }),

  actions: {
    /**
     * Lit le token et construit l'en-tête Authorization
     */
    getAuthHeaders() {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      return headers;
    },

    /**
     * Récupère la liste des enfants selon le rôle de l'utilisateur connecté.
     * - PARENT: ses propres enfants via GET /children
     * - STAFF/ADMIN/etc: enfants référents via GET /children/referents  
     * - CHILD: ses propres données via GET /children/me (liste avec un seul élément)
     */
    async fetchReferentChildren() {
      this.loading = true;
      this.error = "";
      // Vider les données existantes pour éviter les doublons
      this.referentChildren = [];
      console.log('🔍 [CHILDSTORE] Token utilisé:', localStorage.getItem('token')?.substring(0, 20) + '...');
      try {
        const authStore = useAuthStore()
        const userRole = authStore.user?.role
        
        let url = `${API_BASE_URL}/children`
        
        // SÉCURITÉ CRITIQUE: Différentes routes selon le rôle
        if (userRole === 'CHILD') {
          // Les enfants ne peuvent voir que leurs propres données
          url = `${API_BASE_URL}/children/me`
        } else if (userRole === 'PARENT') {
          // Les parents voient leurs enfants
          url = `${API_BASE_URL}/children`
        } else if (['STAFF', 'TEACHER', 'SERVICE_MANAGER', 'SECRETARY', 'DIRECTOR', 'ADMIN'].includes(userRole || '')) {
          // Le personnel voit les enfants référents
          url = `${API_BASE_URL}/children/referents`
        } else {
          // Rôle non autorisé
          throw new Error('Accès non autorisé : rôle inconnu ou non autorisé')
        }

        const data = await secureJsonCall(url)
        
        // Pour les enfants, la route /children/me retourne un objet, pas un tableau
        if (userRole === 'CHILD') {
          this.referentChildren = [data] // Transformer en tableau avec un seul élément
        } else {
          // S'assurer qu'il n'y a pas de doublons côté client
          const uniqueData = data.filter((child: any, index: number, self: any[]) => 
            index === self.findIndex(c => c.id === child.id)
          );
          this.referentChildren = uniqueData
        }
        
      } catch (err: any) {
        this.error = err.message
        // En cas d'erreur, vider la liste pour éviter l'affichage de données non autorisées
        this.referentChildren = []
      } finally {
        this.loading = false;
      }
    },
  },
});
