import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";
import { adminApi, API_BASE_URL } from "@/utils/api";

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

  const API_BASE = API_BASE_URL;

  async function fetchStaff(): Promise<Staff[]> {
    loading.value = true;
    error.value = "";
    try {
      const data = await adminApi.get(`${API_BASE}/staff`);
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
      const newStaff = await adminApi.post(`${API_BASE}/staff`, staffData);
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
      const updatedStaff = await adminApi.patch(`${API_BASE}/staff/${id}`, staffData);
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
      await adminApi.delete(`${API_BASE}/staff/${id}`);
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
      return await adminApi.get(`${API_BASE}/staff/${id}`);
    } catch (err: any) {
      if (err.message.includes('404')) {
        return null;
      }
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
