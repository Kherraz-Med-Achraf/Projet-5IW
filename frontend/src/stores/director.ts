import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";
import { API_BASE_URL } from "@/utils/api";

export interface Director {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  jobTitle: string;
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

export interface CreateDirectorDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  jobTitle: string;
  startDate: string;
  profileImage?: string;
}

export interface UpdateDirectorDto {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  phone?: string;
  jobTitle?: string;
  startDate?: string;
  profileImage?: string;
}

export const useDirectorStore = defineStore("director", () => {
  const directors = ref<Director[]>([]);
  const loading = ref(false);
  const error = ref("");

  const API_BASE = API_BASE_URL;

  async function fetchDirectors(): Promise<Director[]> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/directors`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      directors.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || "Erreur lors du chargement des directeurs";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createDirector(
    directorData: CreateDirectorDto
  ): Promise<Director> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/directors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(directorData),
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

      const newDirector = await response.json();
      directors.value.push(newDirector);
      return newDirector;
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la création du directeur";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateDirector(
    id: number,
    directorData: UpdateDirectorDto
  ): Promise<Director> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/directors/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(directorData),
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

      const updatedDirector = await response.json();
      const index = directors.value.findIndex((director) => director.id === id);
      if (index !== -1) {
        directors.value[index] = updatedDirector;
      }
      return updatedDirector;
    } catch (err: any) {
      error.value =
        err.message || "Erreur lors de la modification du directeur";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteDirector(id: number): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/directors/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la suppression");
      }

      directors.value = directors.value.filter(
        (director) => director.id !== id
      );
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la suppression du directeur";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getDirector(id: number): Promise<Director | null> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/directors/${id}`, {
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
      error.value = err.message || "Erreur lors du chargement du directeur";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    directors,
    loading,
    error,
    fetchDirectors,
    createDirector,
    updateDirector,
    deleteDirector,
    getDirector,
  };
});
