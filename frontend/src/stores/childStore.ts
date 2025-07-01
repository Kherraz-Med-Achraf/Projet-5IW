// src/stores/childStore.ts
import { defineStore } from "pinia";
import { useAuthStore } from "./auth";
import { API_BASE_URL } from "@/utils/api";

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
     * Récupère la liste des enfants pour le parent connecté.
     * GET http://localhost:3000/children
     */
    async fetchReferentChildren() {
      this.loading = true;
      this.error = "";
      try {
        const headers = {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        };
        // Pour un parent, on appelle simplement /children
        const response = await fetch(`${API_BASE_URL}/children`, {
          method: "GET",
          headers,
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || response.statusText);
        }
        this.referentChildren = await response.json();
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  },
});
