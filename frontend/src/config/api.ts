/**
 * Configuration centralisée des API endpoints
 */

// URL de base de l'API (source unique)
import { API_BASE_URL as UTIL_API_BASE_URL } from "@/utils/api";
export const API_BASE_URL = UTIL_API_BASE_URL;

// Configuration des timeouts
export const API_CONFIG = {
  timeout: 10000, // 10 secondes
  retries: 3,
  retryDelay: 1000, // 1 seconde
} as const;

// Endpoints API
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
    CSRF: `${API_BASE_URL}/auth/csrf`,
    INITIATE_LOGIN: `${API_BASE_URL}/auth/initiate-login`,
    VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
    ENABLE_OTP: `${API_BASE_URL}/auth/enable-otp`,
    DISABLE_OTP: `${API_BASE_URL}/auth/disable-otp`,
    PROFILE: `${API_BASE_URL}/auth/profile`,
    PROFILE_EDIT: `${API_BASE_URL}/auth/profile/edit`,
  },
  USERS: {
    PROFILE: `${API_BASE_URL}/users/profile`,
  },
  BLOG: {
    POSTS: `${API_BASE_URL}/blog`,
  },
  EVENTS: {
    LIST: `${API_BASE_URL}/events`,
  },
  JOURNAL: {
    BASE: `${API_BASE_URL}/journal`,
  },
  PLANNING: {
    BASE: `${API_BASE_URL}/planning`,
  },
  PRESENCE: {
    BASE: `${API_BASE_URL}/presence`,
  },
  CHAT: {
    BASE: `${API_BASE_URL}/chat`,
  },
} as const;

// Configuration des headers par défaut
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "X-Requested-With": "XMLHttpRequest",
  "X-Content-Type-Options": "nosniff",
} as const;

// Configuration des cookies
export const COOKIE_CONFIG = {
  sameSite: "strict" as const,
  secure: import.meta.env.PROD,
  maxAge: 2 * 24 * 60 * 60, // 2 jours
} as const;

// Configuration de développement
export const DEV_CONFIG = {
  enableLogs: import.meta.env.DEV,
  enableVerboseLogs: false, // Désactivé par défaut même en dev
} as const;
