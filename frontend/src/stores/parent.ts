import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";
import { API_BASE_URL } from "@/utils/api";

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
      const response = await fetch(`${API_BASE}/parents`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      parents.value = data;
      return data;
    } catch (err: any) {
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
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/parents/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(parentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la modification");
      }

      const updatedParent = await response.json();
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
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/parents/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la suppression");
      }

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
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/parents/${id}`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
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
