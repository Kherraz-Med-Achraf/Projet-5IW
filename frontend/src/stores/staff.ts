import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";
import { API_BASE_URL } from "@/utils/api";

export interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  discipline: string;
  specialty?: string;
  userId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStaffDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  discipline: string;
  specialty?: string;
}

export interface UpdateStaffDto {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  phone?: string;
  discipline?: string;
  specialty?: string;
}

// Options pour les disciplines
export const DISCIPLINE_OPTIONS = [
  { value: "EDUCATOR", label: "Éducateur" },
  { value: "TECH_EDUCATOR", label: "Éducateur technique" },
  { value: "PSYCHOLOGIST", label: "Psychologue" },
  { value: "PSYCHIATRIST", label: "Psychiatre" },
  { value: "ORTHOPEDIST", label: "Orthopédiste" },
];

export const useStaffStore = defineStore("staff", () => {
  const staff = ref<Staff[]>([]);
  const loading = ref(false);
  const error = ref("");

  const API_BASE = API_BASE_URL;

  async function fetchStaff(): Promise<Staff[]> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/staff`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      staff.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || "Erreur lors du chargement du staff";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createStaff(staffData: CreateStaffDto): Promise<Staff> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(staffData),
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

      const newStaff = await response.json();
      staff.value.push(newStaff);
      return newStaff;
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la création du staff";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateStaff(
    id: number,
    staffData: UpdateStaffDto
  ): Promise<Staff> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/staff/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(staffData),
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

      const updatedStaff = await response.json();
      const index = staff.value.findIndex((s) => s.id === id);
      if (index !== -1) {
        staff.value[index] = updatedStaff;
      }
      return updatedStaff;
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la modification du staff";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteStaff(id: number): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/staff/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la suppression");
      }

      staff.value = staff.value.filter((s) => s.id !== id);
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la suppression du staff";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getStaff(id: number): Promise<Staff | null> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/staff/${id}`, {
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
      error.value = err.message || "Erreur lors du chargement du staff";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Fonction utilitaire pour obtenir le label d'une discipline
  function getDisciplineLabel(discipline: string): string {
    const option = DISCIPLINE_OPTIONS.find((opt) => opt.value === discipline);
    return option?.label || discipline;
  }

  return {
    staff,
    loading,
    error,
    fetchStaff,
    createStaff,
    updateStaff,
    deleteStaff,
    getStaff,
    getDisciplineLabel,
  };
});
