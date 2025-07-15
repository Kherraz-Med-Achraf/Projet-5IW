import { defineStore } from "pinia";
import { useNotificationStore } from "@/stores/notificationStore";
import { API_BASE_URL } from "@/utils/api";

console.log("API_BASE_URL", API_BASE_URL);

interface User {
  id: string;
  email: string;
  role: string;
  otpEnabled?: boolean;
  otpSecret?: string | null;
  // ... autres champs si nécessaire
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    // Initialisation : lecture depuis localStorage
    user: JSON.parse(localStorage.getItem("user") || "null") as User | null,
    token: (localStorage.getItem("token") as string) || null,
    tempToken: null as string | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    // Persistance centralisée
    async setAuth(token: string, user: User) {
      this.token = token;
      this.user = user;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Notifier le journal store du changement d'utilisateur
      const { useJournalStore } = await import("./journalStore");
      const journalStore = useJournalStore();
      journalStore.checkUserChange();

      // Initialiser le chat store après la connexion
      try {
        const { useChatStore } = await import("./chatStore");
        const chatStore = useChatStore();
        await chatStore.init();
      } catch (error) {
        console.warn("Erreur initialisation chat après connexion:", error);
      }
    },
    clearAuth() {
      this.token = null;
      this.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },

    // Vérifier si le token actuel est valide
    async checkTokenValidity() {
      if (!this.token) return false;
      
      try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          timeout: 10000, // 10 secondes de timeout
        });
        
        if (response.ok) {
          // Token valide, vérifier que les données utilisateur sont cohérentes
          const data = await response.json();
          if (data.id && data.email) {
            // Optionnel : mettre à jour les données utilisateur si elles ont changé
            if (this.user?.id !== data.id || this.user?.email !== data.email) {
              this.user = data;
              localStorage.setItem("user", JSON.stringify(data));
            }
            return true;
          } else {
            console.warn('Réponse profile invalide:', data);
            this.clearAuth();
            return false;
          }
        } else if (response.status === 401) {
          // Token expiré ou invalide
          console.log('Token expiré (401), nettoyage automatique');
          this.clearAuth();
          return false;
        } else {
          // Autre erreur HTTP
          console.warn(`Erreur HTTP ${response.status} lors de la vérification du token`);
          this.clearAuth();
          return false;
        }
      } catch (error) {
        // Erreur réseau - ne pas nettoyer automatiquement car ça peut être temporaire
        console.warn('Erreur réseau lors de la vérification du token:', error);
        
        // Si c'est une erreur de timeout ou de réseau, garder le token pour le moment
        if (error.name === 'AbortError' || error.message?.includes('network')) {
          return true; // Considérer comme valide temporairement
        }
        
        // Pour les autres erreurs, nettoyer
        this.clearAuth();
        return false;
      }
    },

    /* ─────────────────────────── PARENT REGISTER ─────────────────────────── */
    async registerParent(payload: any) {
      this.loading = true;
      const notification = useNotificationStore();
      try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        console.log("API_BASE_URL", API_BASE_URL);
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data.message || "Erreur lors de l'inscription parent"
          );

        await this.setAuth(data.access_token, data.user);
        notification.showNotification("Inscription réussie", "success");
        return data;
      } catch (err: any) {
        this.error = err.message || "Erreur lors de l'inscription parent";
        notification.showNotification(this.error, "error");
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /* ─────────────────────────── OTP FLOW ─────────────────────────── */
    async initiateLogin(credentials: { email: string; password: string }) {
      this.loading = true;
      const notification = useNotificationStore();
      try {
        // Obtenir le token CSRF des cookies
        const getCsrfTokenFromCookies = () => {
          const cookies = document.cookie.split(";");
          for (let cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (name === "csrf_token") {
              return value;
            }
          }
          return null;
        };

        const csrfToken = getCsrfTokenFromCookies();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken;
        }

        const response = await fetch(`${API_BASE_URL}/auth/initiate-login`, {
          method: "POST",
          headers,
          body: JSON.stringify(credentials),
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Erreur lors de la connexion");

        if (data.access_token) {
          this.setAuth(data.access_token, data.user);
        } else if (data.tempToken) {
          this.tempToken = data.tempToken;
          notification.showNotification(
            "Identifiants validés. Veuillez saisir votre code OTP.",
            "info"
          );
        }
        return data;
      } catch (error: any) {
        this.error = error.message || "Erreur lors de la connexion";
        notification.showNotification(this.error, "error");
        return {};
      } finally {
        this.loading = false;
      }
    },

    async verifyOtp(payload: { tempToken: string; otpCode: string }) {
      this.loading = true;
      const notification = useNotificationStore();
      try {
        // Obtenir le token CSRF des cookies
        const getCsrfTokenFromCookies = () => {
          const cookies = document.cookie.split(";");
          for (let cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (name === "csrf_token") {
              return value;
            }
          }
          return null;
        };

        const csrfToken = getCsrfTokenFromCookies();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken;
        }

        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Erreur lors de la vérification OTP");

        this.setAuth(data.access_token, data.user);
        notification.showNotification("Connexion réussie", "success");
        return data;
      } catch (error: any) {
        this.error = error.message || "Erreur lors de la vérification OTP";
        notification.showNotification(this.error, "error");
        return {};
      } finally {
        this.loading = false;
      }
    },

    /* ─────────────────────────── LOGIN (avec ou sans OTP) ─────────────────────────── */
    async login(credentials: {
      email: string;
      password: string;
      otpCode?: string;
    }) {
      this.loading = true;
      const notification = useNotificationStore();
      try {
        // Obtenir le token CSRF des cookies
        const getCsrfTokenFromCookies = () => {
          const cookies = document.cookie.split(";");
          for (let cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (name === "csrf_token") {
              return value;
            }
          }
          return null;
        };

        // Si pas de token CSRF, on le récupère d'abord
        let csrfToken = getCsrfTokenFromCookies();
        if (!csrfToken) {
          try {
            const csrfResponse = await fetch(`${API_BASE_URL}/auth/csrf`, {
              method: "GET",
              credentials: "include",
            });
            const csrfData = await csrfResponse.json();
            csrfToken = csrfData.csrf_token;
          } catch (error) {
            console.warn("Impossible de récupérer le token CSRF:", error);
          }
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken;
        }

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers,
          body: JSON.stringify(credentials),
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Erreur lors de la connexion");

        this.setAuth(data.access_token, data.user);
        notification.showNotification("Connexion réussie", "success");
        return data;
      } catch (error: any) {
        this.error = error.message || "Erreur lors de la connexion";
        notification.showNotification(this.error, "error");
        return {};
      } finally {
        this.loading = false;
      }
    },

    /* ─────────────────────────── SIMPLE REGISTER (staff) ─────────────────────────── */
    async register(data: {
      email: string;
      password: string;
      username?: string;
    }) {
      this.loading = true;
      const notification = useNotificationStore();
      try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        });
        const resData = await response.json();
        if (!response.ok)
          throw new Error(resData.message || "Erreur lors de l'inscription");
        notification.showNotification("Inscription réussie", "success");
        return resData;
      } catch (error: any) {
        this.error = error.message || "Erreur lors de l'inscription";
        notification.showNotification(this.error, "error");
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /* ─────────────────────────── LOGOUT ─────────────────────────── */
    async logout() {
      const notification = useNotificationStore();
      try {
        // Obtenir le token CSRF des cookies
        const getCsrfTokenFromCookies = () => {
          const cookies = document.cookie.split(";");
          for (let cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (name === "csrf_token") {
              return value;
            }
          }
          return null;
        };

        const csrfToken = getCsrfTokenFromCookies();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken;
        }

        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers,
          credentials: "include",
        });
      } catch (error) {
        console.error("Erreur lors de la déconnexion", error);
      }

      // Vider le cache du journal lors de la déconnexion
      const { useJournalStore } = await import("./journalStore");
      const journalStore = useJournalStore();
      journalStore.resetStore();

      this.clearAuth();
      notification.showNotification("Déconnexion réussie", "success");
    },

    /* ─────────────────────────── PASSWORD FLOWS ─────────────────────────── */
    async forgotPassword(email: string) {
      this.loading = true;
      try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
          credentials: "include",
        });
        let resData = {};
        try {
          resData = await response.json();
        } catch {}
        if (!response.ok) {
          const errorMessage =
            (resData as any).message ||
            response.statusText ||
            "Erreur lors de la réinitialisation";
          throw new Error(errorMessage);
        }
        return {
          message:
            "Si cet email est enregistré, un lien de réinitialisation vous a été envoyé.",
        };
      } catch (error: any) {
        this.error = error.message || "Erreur lors de la réinitialisation";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async resetPassword(prid: number, token: string, newPassword: string) {
      this.loading = true;
      try {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prid, token, newPassword }),
          credentials: "include",
        });
        const resData = await response.json();
        if (!response.ok)
          throw new Error(
            resData.message || "Erreur lors de la réinitialisation"
          );
        return { message: "Votre mot de passe a été réinitialisé avec succès" };
      } catch (error: any) {
        this.error = error.message || "Erreur lors de la réinitialisation";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /* ─────────────────────────── TOKEN REFRESH ─────────────────────────── */
    async refresh() {
      const notification = useNotificationStore();
      try {
        // Obtenir le token CSRF des cookies
        const getCsrfTokenFromCookies = () => {
          const cookies = document.cookie.split(";");
          for (let cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (name === "csrf_token") {
              return value;
            }
          }
          return null;
        };

        const csrfToken = getCsrfTokenFromCookies();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken;
        }

        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers,
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Impossible de rafraîchir le token");

        this.token = data.access_token;
        localStorage.setItem("token", this.token || "");
        notification.showNotification("Token rafraîchi", "success");
        return true;
      } catch (error: any) {
        console.error("Erreur refresh token:", error.message);
        await this.logout();
        notification.showNotification(
          "Session expirée, veuillez vous reconnecter.",
          "error"
        );
        return false;
      }
    },

    /* ─────────────────────────── OTP ENABLE / DISABLE ─────────────────────────── */
    async enableOtp() {
      this.loading = true;
      const notification = useNotificationStore();
      try {
        const response = await fetch(`${API_BASE_URL}/auth/enable-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: this.token ? `Bearer ${this.token}` : "",
          },
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Erreur lors de l'activation OTP");

        if (this.user) {
          this.user.otpEnabled = true;
          this.user.otpSecret = data.secret;
          localStorage.setItem("user", JSON.stringify(this.user));
        }
        notification.showNotification(
          data.message || "OTP activé avec succès",
          "success"
        );
        return data;
      } catch (error: any) {
        this.error = error.message || "Erreur lors de l'activation OTP";
        notification.showNotification(this.error, "error");
        return {};
      } finally {
        this.loading = false;
      }
    },

    async disableOtp() {
      this.loading = true;
      const notification = useNotificationStore();
      try {
        const response = await fetch(`${API_BASE_URL}/auth/disable-otp`, {
          method: "POST",
          headers: { Authorization: this.token ? `Bearer ${this.token}` : "" },
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.message || "Erreur lors de la désactivation OTP"
          );

        if (this.user) {
          this.user.otpEnabled = false;
          this.user.otpSecret = null;
          localStorage.setItem("user", JSON.stringify(this.user));
        }
        this.token = data.access_token;
        localStorage.setItem("token", data.access_token || "");
        notification.showNotification(
          data.message || "OTP désactivé avec succès",
          "success"
        );
        return data;
      } catch (err: any) {
        this.error = err.message || "Erreur lors de la désactivation OTP";
        notification.showNotification(this.error, "error");
        return {};
      } finally {
        this.loading = false;
      }
    },
  },
});
