import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";
import { API_BASE_URL } from "@/utils/api";

export interface ServiceManager {
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

export interface CreateServiceManagerDto {
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

export interface UpdateServiceManagerDto {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  phone?: string;
  jobTitle?: string;
  startDate?: string;
  profileImage?: string;
}

export const useServiceManagerStore = defineStore("serviceManager", () => {
  const serviceManagers = ref<ServiceManager[]>([]);
  const loading = ref(false);
  const error = ref("");

  const API_BASE = API_BASE_URL;

  async function fetchServiceManagers(): Promise<ServiceManager[]> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/service-managers`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      serviceManagers.value = data;
      return data;
    } catch (err: any) {
      error.value =
        err.message || "Erreur lors du chargement des chefs de service";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createServiceManager(
    serviceManagerData: CreateServiceManagerDto
  ): Promise<ServiceManager> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/service-managers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(serviceManagerData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.message) {
          if (Array.isArray(errorData.message)) {
            throw new Error(errorData.message.join(", "));
          } else {
            throw new Error(errorData.message);
          }
        }
        throw new Error(errorData.message || "Erreur lors de la création");
      }

      const newServiceManager = await response.json();
      serviceManagers.value.push(newServiceManager);
      return newServiceManager;
    } catch (err: any) {
      error.value =
        err.message || "Erreur lors de la création du chef de service";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateServiceManager(
    id: number,
    serviceManagerData: UpdateServiceManagerDto
  ): Promise<ServiceManager> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/service-managers/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(serviceManagerData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.message) {
          if (Array.isArray(errorData.message)) {
            throw new Error(errorData.message.join(", "));
          } else {
            throw new Error(errorData.message);
          }
        }
        throw new Error(errorData.message || "Erreur lors de la modification");
      }

      const updatedServiceManager = await response.json();
      const index = serviceManagers.value.findIndex((sm) => sm.id === id);
      if (index !== -1) {
        serviceManagers.value[index] = updatedServiceManager;
      }
      return updatedServiceManager;
    } catch (err: any) {
      error.value =
        err.message || "Erreur lors de la modification du chef de service";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteServiceManager(id: number): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/service-managers/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la suppression");
      }

      serviceManagers.value = serviceManagers.value.filter(
        (sm) => sm.id !== id
      );
    } catch (err: any) {
      error.value =
        err.message || "Erreur lors de la suppression du chef de service";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getServiceManager(id: number): Promise<ServiceManager | null> {
    loading.value = true;
    error.value = "";
    try {
      const auth = useAuthStore();
      const response = await fetch(`${API_BASE}/service-managers/${id}`, {
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
      error.value =
        err.message || "Erreur lors du chargement du chef de service";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    serviceManagers,
    loading,
    error,
    fetchServiceManagers,
    createServiceManager,
    updateServiceManager,
    deleteServiceManager,
    getServiceManager,
  };
});
