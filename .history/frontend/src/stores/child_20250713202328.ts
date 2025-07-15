import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";
import { adminApi, API_BASE_URL } from "@/utils/api";

export interface Child {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentProfileId: number;
  userId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  parent?: {
    id: number;
    firstName: string;
    lastName: string;
    user?: {
      email: string;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateChildDto {
  firstName: string;
  lastName: string;
  birthDate: string;
  parentProfileId: number;
}

export interface UpdateChildDto {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
}

export const useChildStore = defineStore("child", () => {
  const children = ref<Child[]>([]);
  const loading = ref(false);
  const error = ref("");

  const API_BASE = API_BASE_URL;

  async function fetchChildren(): Promise<Child[]> {
    loading.value = true;
    error.value = "";
    try {
      const data = await adminApi.get(`${API_BASE}/children`);
      children.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || "Erreur lors du chargement des enfants";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createChild(childData: CreateChildDto): Promise<Child> {
    loading.value = true;
    error.value = "";
    try {
      const newChild = await adminApi.post(`${API_BASE}/children/${childData.parentProfileId}`, childData);
      children.value.push(newChild);
      return newChild;
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la création de l'enfant";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateChild(id: number, childData: UpdateChildDto): Promise<Child> {
    loading.value = true;
    error.value = "";
    try {
      const updatedChild = await adminApi.patch(`${API_BASE}/children/${id}`, childData);
      const index = children.value.findIndex((child) => child.id === id);
      if (index !== -1) {
        children.value[index] = updatedChild;
      }
      return updatedChild;
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la mise à jour de l'enfant";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteChild(id: number): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      await adminApi.delete(`${API_BASE}/children/${id}`);
      children.value = children.value.filter((child) => child.id !== id);
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la suppression de l'enfant";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getChild(id: number): Promise<Child | null> {
    loading.value = true;
    error.value = "";
    try {
      return await adminApi.get(`${API_BASE}/children/${id}`);
    } catch (err: any) {
      if (err.message.includes('404')) {
        return null;
      }
      error.value = err.message || "Erreur lors du chargement de l'enfant";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    children,
    loading,
    error,
    fetchChildren,
    createChild,
    updateChild,
    deleteChild,
    getChild,
  };
});
