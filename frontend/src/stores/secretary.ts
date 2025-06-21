import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";

export interface Secretary {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  specialty: string;
  startDate: string;
  profileImage?: string;
  userId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSecretaryDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  specialty: string;
  startDate: string;
  profileImage?: string;
}

export interface UpdateSecretaryDto {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  phone?: string;
  specialty?: string;
  startDate?: string;
  profileImage?: string;
}

export const useSecretaryStore = defineStore("secretary", () => {
  const secretaries = ref<Secretary[]>([]);
  const loading = ref(false);
  const error = ref("");

  const API_BASE =
    (import.meta.env.VITE_NEST_API_URL as string) || "http://localhost:3000";

  async function fetchSecretaries(): Promise<Secretary[]> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/secretaries`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      secretaries.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || "Erreur lors du chargement des secrétaires";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createSecretary(
    secretaryData: CreateSecretaryDto
  ): Promise<Secretary> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/secretaries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(secretaryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Si c'est une erreur de validation, afficher le message détaillé
        if (response.status === 400 && errorData.message) {
          if (Array.isArray(errorData.message)) {
            throw new Error(errorData.message.join(", "));
          } else {
            throw new Error(errorData.message);
          }
        }
        throw new Error(errorData.message || "Erreur lors de la création");
      }

      const newSecretary = await response.json();
      secretaries.value.push(newSecretary);
      return newSecretary;
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la création du secrétaire";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateSecretary(
    id: number,
    secretaryData: UpdateSecretaryDto
  ): Promise<Secretary> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/secretaries/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(secretaryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Si c'est une erreur de validation, afficher le message détaillé
        if (response.status === 400 && errorData.message) {
          if (Array.isArray(errorData.message)) {
            throw new Error(errorData.message.join(", "));
          } else {
            throw new Error(errorData.message);
          }
        }
        throw new Error(errorData.message || "Erreur lors de la modification");
      }

      const updatedSecretary = await response.json();
      const index = secretaries.value.findIndex(
        (secretary) => secretary.id === id
      );
      if (index !== -1) {
        secretaries.value[index] = updatedSecretary;
      }
      return updatedSecretary;
    } catch (err: any) {
      error.value =
        err.message || "Erreur lors de la modification du secrétaire";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteSecretary(id: number): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/secretaries/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la suppression");
      }

      secretaries.value = secretaries.value.filter(
        (secretary) => secretary.id !== id
      );
    } catch (err: any) {
      error.value =
        err.message || "Erreur lors de la suppression du secrétaire";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getSecretary(id: number): Promise<Secretary | null> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/secretaries/${id}`, {
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
      error.value = err.message || "Erreur lors du chargement du secrétaire";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    secretaries,
    loading,
    error,
    fetchSecretaries,
    createSecretary,
    updateSecretary,
    deleteSecretary,
    getSecretary,
  };
});
