import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useAuthStore } from "@/stores/auth";

import Register from "../views/Register.vue";
import TheRegister from "../views/register/TheRegister.vue";
import StepOne from "../views/register/steps/StepOne.vue";
import StepTwo from "../views/register/steps/StepTwo.vue";
import StepThree from "../views/register/steps/StepThree.vue";
import Login from "../views/Login.vue";
import Home from "@/views/Home.vue";
import Dashboard from "@/views/Dashboard.vue";
import ForgotPassword from "@/views/ForgotPassword.vue";
import ResetPassword from "@/views/ResetPassword.vue";
import OtpActivation from "@/views/otpActivation.vue";
import VerifyEmail from "@/views/VerifyEmail.vue";
import ChatView from "@/views/chat/ChatView.vue";

import StaffPresenceView from "@/views/presence/StaffPresenceView.vue";
import SecretaryAbsenceView from "@/views/presence/SecretaryAbsenceView.vue";
import PresenceReportView from "@/views/presence/PresenceReportView.vue";

import PlanningUploadView from "@/views/planning/PlanningUploadView.vue";

// Ajout des vues du journal (éducateur et parent)
import JournalHome from "@/views/journal/JournalHome.vue";
import JournalMonth from "@/views/journal/JournalMonth.vue";
import JournalHomeParent from "@/views/journal/JournalHomeParent.vue";
import JournalMissions from "@/views/journal/JournalMissions.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/register-old",
    name: "RegisterOld",
    component: Register,
    meta: { requiresInvite: true },
  },
  {
    path: "/register",
    component: TheRegister,
    children: [
      {
        path: "",
        redirect: "/register/step-one",
      },
      {
        path: "step-one",
        name: "RegisterStepOne",
        component: StepOne,
      },
      {
        path: "step-two",
        name: "RegisterStepTwo",
        component: StepTwo,
      },
      {
        path: "step-three",
        name: "RegisterStepThree",
        component: StepThree,
      },
    ],
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { requiresGuest: true },
  },
  {
    path: "/home",
    name: "Home",
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: "/profile",
    name: "Profile",
    component: () => import("@/views/ProfileView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: ForgotPassword,
    meta: { requiresGuest: true },
  },
  {
    path: "/reset-password",
    name: "ResetPassword",
    component: ResetPassword,
    meta: { requiresGuest: true },
  },
  {
    path: "/verify-email",
    name: "VerifyEmail",
    component: VerifyEmail,
    meta: { requiresGuest: true },
  },
  {
    path: "/activate-otp",
    name: "OtpActivation",
    component: OtpActivation,
    meta: { requiresAuth: true },
  },
  {
    path: "/chat/:id?",
    name: "Chat",
    component: ChatView,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: "/presence/staff",
    name: "StaffPresence",
    component: StaffPresenceView,
    meta: { requiresAuth: true, requiredRole: "STAFF" }, // ← chaîne
  },

  // Présence – gestion absences (secrétaire)
  {
    path: "/presence/secretary",
    name: "SecretaryAbsence",
    component: SecretaryAbsenceView,
    props: true,
    meta: { requiresAuth: true, requiredRole: "SECRETARY" },
  },
  // Présence – rapport (direction & chef de service)
  {
    path: "/presence/report",
    name: "PresenceReport",
    component: PresenceReportView,
    props: true,
    meta: {
      requiresAuth: true,
      requiredRoles: ["DIRECTOR", "SERVICE_MANAGER"],
    },
  },

  {
    path: "/planning/upload",
    name: "PlanningUpload",
    component: PlanningUploadView,
    meta: {
      requiresAuth: true,
      requiredRoles: ["DIRECTOR", "SERVICE_MANAGER"],
    },
  },

  {
    path: "/planning/staff",
    name: "StaffSchedule",
    component: () => import("@/views/planning/StaffScheduleView.vue"),
    meta: {
      requiresAuth: true,
      requiredRole: "STAFF",
    },
  },

  {
    path: "/planning/child",
    name: "ChildSchedule",
    component: () => import("@/views/planning/ChildScheduleView.vue"),
    meta: {
      requiresAuth: true,
      requiredRole: "PARENT",
    },
  },

  {
    path: "/planning/manage",
    name: "PlanningManage",
    component: () => import("@/views/planning/PlanningManageView.vue"),
    meta: {
      requiresAuth: true,
      requiredRoles: ["DIRECTOR", "SERVICE_MANAGER"],
    },
  },

  // Route principale du journal pour le staff
  {
    path: "/journal",
    name: "JournalHome",
    component: JournalHome,
    meta: { requiresAuth: true, requiredRole: "STAFF" },
  },
  // Écriture des missions annuelles (accessible au staff seulement)
  {
    path: "/journal/:childId/:yearId/missions",
    name: "JournalMissions",
    component: JournalMissions,
    props: true,
    meta: { requiresAuth: true, requiredRole: "STAFF" },
  },
  // Détail/édition d'un mois pour un enfant et une année (SÉCURITÉ: interdire aux enfants)
  {
    path: "/journal/:childId/:yearId/:month",
    name: "JournalMonth",
    component: JournalMonth,
    props: true,
    meta: { 
      requiresAuth: true, 
      requiredRoles: ["STAFF", "DIRECTOR", "ADMIN", "SERVICE_MANAGER", "PARENT"],
      // Explicitement interdire aux enfants (rôle CHILD)
      forbiddenRoles: ["CHILD"]
    },
  },

  // Vue principale du journal pour le parent
  {
    path: "/journal-parent",
    name: "JournalHomeParent",
    component: JournalHomeParent,
    meta: { requiresAuth: true, requiredRole: "PARENT" },
  },

  {
    path: "/events/admin",
    name: "EventAdmin",
    component: () => import("@/views/events/EventAdminView.vue"),
    meta: {
      requiresAuth: true,
      requiredRoles: ["DIRECTOR", "SERVICE_MANAGER"],
    },
  },
  {
    path: "/events",
    name: "EventList",
    component: () => import("@/views/events/EventListView.vue"),
    meta: { requiresAuth: true, requiredRole: "PARENT" },
  },
  {
    path: "/events/success",
    name: "EventStripeSuccess",
    component: () => import("@/views/events/EventStripeSuccess.vue"),
    meta: { requiresAuth: true, requiredRole: "PARENT" },
  },
  {
    path: "/events/cancel",
    name: "EventStripeCancel",
    component: () => import("@/views/events/EventStripeCancel.vue"),
    meta: { requiresAuth: true, requiredRole: "PARENT" },
  },
  {
    path: "/events/mine",
    name: "MyEventRegistrations",
    component: () => import("@/views/events/MyEventRegistrations.vue"),
    meta: { requiresAuth: true, requiredRole: "PARENT" },
  },
  {
    path: "/events/:eventId/registrations",
    name: "EventRegistrationsAdmin",
    component: () => import("@/views/events/EventRegistrationsAdmin.vue"),
    meta: {
      requiresAuth: true,
      requiredRoles: ["DIRECTOR", "SERVICE_MANAGER", "SECRETARY"],
    },
  },
  // Politique de confidentialité - accessible à tous
  {
    path: "/privacy",
    name: "Privacy",
    component: () => import("@/views/PrivacyPolicy.vue"),
  },
  
  // Page d'accès refusé
  {
    path: "/access-denied",
    name: "AccessDenied",
    component: () => import("@/views/AccessDenied.vue"),
    meta: { requiresAuth: true },
  },
  
  // Route 404 (catch-all)
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFound.vue"),
  },
  
  // Blog - accessible à tous les utilisateurs connectés
  {
    path: '/blog',
    name: 'Blog',
    component: () => import('@/views/BlogView.vue'),
    meta: { requiresAuth: true },
  },
  
  // Blog Admin - accessible aux secrétaires, directeurs et service managers
  {
    path: '/blog/admin',
    name: 'BlogAdmin',
    component: () => import('@/views/blog/BlogAdminView.vue'),
    meta: { requiresAuth: true, requiredRoles: ['SECRETARY', 'DIRECTOR', 'SERVICE_MANAGER'] },
  },

  // Routes CRUD pour ADMIN
  {
    path: '/admin/directors',
    name: 'DirectorAdmin',
    component: () => import('@/views/admin/DirectorAdminView.vue'),
    meta: { requiresAuth: true, requiredRole: 'ADMIN' },
  },
  {
    path: '/admin/service-managers',
    name: 'ServiceManagerAdmin',
    component: () => import('@/views/admin/ServiceManagerAdminView.vue'),
    meta: { requiresAuth: true, requiredRole: 'ADMIN' },
  },
  {
    path: '/admin/staff',
    name: 'StaffAdmin',
    component: () => import('@/views/admin/StaffAdminView.vue'),
    meta: { requiresAuth: true, requiredRole: 'ADMIN' },
  },
  {
    path: '/admin/secretaries',
    name: 'SecretaryAdmin',
    component: () => import('@/views/admin/SecretaryAdminView.vue'),
    meta: { requiresAuth: true, requiredRole: 'ADMIN' },
  },
  {
    path: '/admin/parents',
    name: 'ParentAdmin',
    component: () => import('@/views/admin/ParentAdminView.vue'),
    meta: { requiresAuth: true, requiredRole: 'ADMIN' },
  },
  {
    path: '/admin/children',
    name: 'ChildAdmin',
    component: () => import('@/views/admin/ChildAdminView.vue'),
    meta: { requiresAuth: true, requiredRole: 'ADMIN' },
  },
  
  // Documents
  {
    path: '/documents/parent',
    name: 'DocumentsParent',
    component: () => import('@/views/DocumentsParentView.vue'),
    meta: { requiresAuth: true, requiredRole: 'PARENT' },
  },
  {
    path: '/documents/secretary',
    name: 'DocumentsSecretary',
    component: () => import('@/views/DocumentsSecretaryView.vue'),
    meta: { requiresAuth: true, requiredRole: 'SECRETARY' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();
  
  const {
    requiresAuth,
    requiresGuest,
    requiredRole,
    requiredRoles,
    requiresInvite,
    forbiddenRoles,
  } = to.meta as {
    requiresAuth?: boolean;
    requiresGuest?: boolean;
    requiredRole?: string;
    requiredRoles?: string[];
    requiresInvite?: boolean;
    forbiddenRoles?: string[];
  };

  // Special handling for /register route
  if (to.path.startsWith('/register')) {
    const inviteToken = (to.query.token as string) || "";
    
    // 🔧 FIX: Permettre l'accès aux étapes si l'utilisateur a déjà un token validé
    // Vérifier si l'utilisateur a déjà un token dans le store register
    const { useRegisterStore } = await import("@/stores/register");
    const registerStore = useRegisterStore();
    
    // Si pas de token dans l'URL mais token validé dans le store, permettre l'accès
    if (!inviteToken && registerStore.inviteToken) {
      console.log('🔄 Accès autorisé avec token validé dans le store');
      return next();
    }
    
    // Si pas de token d'invitation du tout, rediriger vers login
    if (!inviteToken) {
      return next({ name: "Login" });
    }
    
    // Si token d'invitation présent, permettre l'accès même si l'utilisateur semble authentifié
    // (peut être un ancien token invalide ou l'utilisateur veut créer un nouveau compte)
    if (auth.isAuthenticated) {
      console.log('🔄 Utilisateur semble authentifié mais a un token d\'invitation - permettre l\'accès');
      // Optionnel : nettoyer l'ancien token pour éviter les conflits
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      auth.clearAuth();
    }
    
    return next();
  }

  // 1) Si la page requiert un token d'invitation (ex. /register-old)
  if (requiresInvite) {
    const token = (to.query.token as string) || "";
    if (!token) {
      return next({ name: "Login" });
    }
    return next();
  }

  // 2) Routes pour « guests »
  if (requiresGuest && auth.isAuthenticated) {
    return next({ name: "Home" });
  }

  // 3) Routes nécessitant d'être authentifié
  if (requiresAuth && !auth.isAuthenticated) {
    return next({ name: "Login" });
  }

  // 4) SÉCURITÉ CRITIQUE: Vérifier les rôles interdits (ex: empêcher les enfants d'accéder au journal)
  if (forbiddenRoles && forbiddenRoles.includes(auth.user?.role || "")) {
    console.warn(`🚫 Accès bloqué: le rôle ${auth.user?.role} est interdit sur cette route`);
    return next({ name: "AccessDenied" });
  }

  // 5) Si un rôle précis est requis
  if (requiredRole && auth.user?.role !== requiredRole) {
    return next({ name: "AccessDenied" });
  }

  if (requiredRoles && !requiredRoles.includes(auth.user?.role || "")) {
    return next({ name: "AccessDenied" });
  }

  next();
});

export default router;
