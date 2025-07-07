import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";

export interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  jobTitle: string;
  startDate: string;
  profileImage?: string;
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
  jobTitle: string;
  startDate: string;
  profileImage?: string;
  specialty?: string;
}

export interface UpdateStaffDto {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  phone?: string;
  jobTitle?: string;
  startDate?: string;
  profileImage?: string;
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
  const staffList = ref<Staff[]>([]);
  const loading = ref(false);
  const error = ref("");

  const API_BASE =
    (import.meta.env.VITE_NEST_API_URL as string) || "http://localhost:3000";

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
      staffList.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || "Erreur lors du chargement du personnel";
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
        throw new Error(errorData.message || "Erreur lors de la création");
      }

      const newStaff = await response.json();
      staffList.value.push(newStaff);
      return newStaff;
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la création du personnel";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateStaff(id: number, staffData: UpdateStaffDto): Promise<Staff> {
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
        throw new Error(errorData.message || "Erreur lors de la mise à jour");
      }

      const updatedStaff = await response.json();
      const index = staffList.value.findIndex((staff) => staff.id === id);
      if (index !== -1) {
        staffList.value[index] = updatedStaff;
      }
      return updatedStaff;
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la mise à jour du personnel";
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

      staffList.value = staffList.value.filter((staff) => staff.id !== id);
    } catch (err: any) {
      error.value = err.message || "Erreur lors de la suppression du personnel";
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
      error.value = err.message || "Erreur lors du chargement du personnel";
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
    staffList,
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
