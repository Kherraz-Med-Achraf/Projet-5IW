import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";
import { adminApi, API_BASE_URL } from "@/utils/api";

export interface Parent {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  legalResponsibility?: string;
  notificationPrefs?: any;
  userId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  emergencyContacts?: any[];
  children?: any[];
}

export interface CreateParentDto {
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  legalResponsibility?: string;
  notificationPrefs?: any;
}

export interface UpdateParentDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  legalResponsibility?: string;
  notificationPrefs?: any;
}

export const useParentStore = defineStore("parent", () => {
  const parents = ref<Parent[]>([]);
  const loading = ref(false);
  const error = ref("");

  const API_BASE = API_BASE_URL;

  async function fetchParents(): Promise<Parent[]> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      
      console.log('🔍 Debug fetchParents:');
      console.log('- User:', auth.user);
      console.log('- Token exists:', !!auth.token);
      console.log('- User role:', auth.user?.role);
      console.log('- Is authenticated:', auth.isAuthenticated);
      
      if (!auth.token) {
        throw new Error('Token d\'authentification manquant');
      }
      
      const data = await adminApi.get(`${API_BASE}/parents`);
      parents.value = data;
      console.log('- Parents loaded:', data.length);
      return data;
    } catch (err: any) {
      console.error('❌ Error in fetchParents:', err);
      error.value = err.message || "Erreur lors du chargement des parents";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateParent(
    id: number,
    parentData: UpdateParentDto
  ): Promise<Parent> {
    loading.value = true;
    error.value = "";
    try {
      const updatedParent = await adminApi.patch(`${API_BASE}/parents/${id}`, parentData);
      const index = parents.value.findIndex((parent) => parent.id === id);
      if (index !== -1) {
        parents.value[index] = updatedParent;
      }
      return updatedParent;
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la modification du parent";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteParent(id: number): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      await adminApi.delete(`${API_BASE}/parents/${id}`);
      parents.value = parents.value.filter((parent) => parent.id !== id);
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la suppression du parent";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getParent(id: number): Promise<Parent | null> {
    loading.value = true;
    error.value = "";
    try {
      return await adminApi.get(`${API_BASE}/parents/${id}`);
    } catch (err: any) {
      if (err.message.includes('404')) {
        return null;
      }
      error.value = err.message || "Erreur lors du chargement du parent";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    parents,
    loading,
    error,
    fetchParents,
    updateParent,
    deleteParent,
    getParent,
  };
});
