import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";

export interface Child {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentProfileId?: number;
}

export interface CreateChildDto {
  firstName: string;
  lastName: string;
  birthDate: string;
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

  const API_BASE =
    (import.meta.env.VITE_NEST_API_URL as string) || "http://localhost:3000";

  async function fetchChildren(): Promise<Child[]> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/children`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
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
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/children`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(childData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la création");
      }

      const newChild = await response.json();
      children.value.push(newChild);
      return newChild;
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la création de l'enfant";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateChild(
    id: number,
    childData: UpdateChildDto
  ): Promise<Child> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/children/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(childData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la modification");
      }

      const updatedChild = await response.json();
      const index = children.value.findIndex((child) => child.id === id);
      if (index !== -1) {
        children.value[index] = updatedChild;
      }
      return updatedChild;
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la modification de l'enfant";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteChild(id: number): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/children/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la suppression");
      }

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
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/children/${id}`, {
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
