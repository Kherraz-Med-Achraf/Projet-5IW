import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import Register from "../views/Register.vue";
import TheRegister from "../views/register/TheRegister.vue";
import StepOne from "../views/register/steps/StepOne.vue";
import StepTwo from "../views/register/steps/StepTwo.vue";
import StepThree from "../views/register/steps/StepThree.vue";
import Login from "../views/Login.vue";
import Home from "@/views/Home.vue";
import ForgotPassword from "@/views/ForgotPassword.vue";
import ResetPassword from "@/views/ResetPassword.vue";
import OtpActivation from "@/views/OtpActivation.vue";
import VerifyEmail from "@/views/VerifyEmail.vue";
import ChatView from '@/views/chat/ChatView.vue'
import ChatListView from '@/views/chat/ChatListView.vue'

import StaffPresenceView from '@/views/presence/StaffPresenceView.vue'
import SecretaryAbsenceView from '@/views/presence/SecretaryAbsenceView.vue'
import PresenceReportView from '@/views/presence/PresenceReportView.vue'

import PlanningUploadView from '@/views/planning/PlanningUploadView.vue'

// Ajout des vues du journal (éducateur et parent)
import JournalHome from '@/views/journal/JournalHome.vue'
import JournalMonth from '@/views/journal/JournalMonth.vue'
import JournalHomeParent from '@/views/journal/JournalHomeParent.vue'
import JournalMissions from '@/views/journal/JournalMissions.vue'

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
    path: '/chat',
    name: 'ChatList',
    component: ChatListView,
    meta: { requiresAuth: true },
  },
  {
    path: '/chat/:id',
    name: 'Chat',
    component: ChatView,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: '/presence/staff',
    name: 'StaffPresence',
    component: StaffPresenceView,
    meta: { requiresAuth: true, requiredRole: 'STAFF' }, // ← chaîne
  },
  
     // Présence – gestion absences (secrétaire)
     {
       path: '/presence/secretary',
       name: 'SecretaryAbsence',
       component: SecretaryAbsenceView,
       props: true,
       meta: { requiresAuth: true, requiredRole: 'SECRETARY' },
     },
     // Présence – rapport (direction & chef de service)
     {
       path: '/presence/report',
       name: 'PresenceReport',
       component: PresenceReportView,
       props: true,
       meta: {
                requiresAuth: true,
                requiredRoles: ['DIRECTOR', 'SERVICE_MANAGER'],
             },
     },

     {
      path: '/planning/upload',
      name: 'PlanningUpload',
      component: PlanningUploadView,
      meta: {
        requiresAuth: true,
        requiredRoles: ['DIRECTOR', 'SERVICE_MANAGER'],
      },
    },
    
    {
      path: '/planning/staff',
      name: 'StaffSchedule',
      component: () => import('@/views/planning/StaffScheduleView.vue'),
      meta: {
        requiresAuth: true,
        requiredRole: 'STAFF',
      },
    },

    {
      path: '/planning/child',
      name: 'ChildSchedule',
      component: () => import('@/views/planning/ChildScheduleView.vue'),
      meta: {
        requiresAuth: true,
        requiredRole: 'PARENT',
      },
    },


  // Route principale du journal pour le staff
  {
    path: '/journal',
    name: 'JournalHome',
    component: JournalHome,
    meta: { requiresAuth: true, requiredRole: 'STAFF' },
  },
  // Écriture des missions annuelles (accessible au staff seulement)
  {
    path: '/journal/:childId/:yearId/missions',
    name: 'JournalMissions',
    component: JournalMissions,
    props: true,
    meta: { requiresAuth: true, requiredRole: 'STAFF' },
  },
  // Détail/édition d'un mois pour un enfant et une année (accessible au staff et au parent)
  {
    path: '/journal/:childId/:yearId/:month',
    name: 'JournalMonth',
    component: JournalMonth,
    props: true,
    meta: { requiresAuth: true },
  },

  // Vue principale du journal pour le parent
  {
    path: '/journal-parent',
    name: 'JournalHomeParent',
    component: JournalHomeParent,
    meta: { requiresAuth: true, requiredRole: 'PARENT' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  const { requiresAuth, requiresGuest, requiredRole, requiredRoles, requiresInvite } =
    to.meta as {
      requiresAuth?: boolean;
      requiresGuest?: boolean;
      requiredRole?: string;
      requiredRoles?: string[];
      requiresInvite?: boolean;
    };

  // 1) Si la page requiert un token d'invitation (ex. /register)
  if (requiresInvite) {
    const token = (to.query.token as string) || ''
    if (!token) {
      return next({ name: "Login" });
    }
    return next()
  }

  // 2) Routes pour « guests »
  if (requiresGuest && auth.isAuthenticated) {
    return next({ name: "Home" });
  }

  // 3) Routes nécessitant d'être authentifié
  if (requiresAuth && !auth.isAuthenticated) {
    return next({ name: "Login" });
  }

  // 4) Si un rôle précis est requis
  if (requiredRole && auth.user?.role !== requiredRole) {
    return next({ name: "Home" });
  }

  if (requiredRoles && !requiredRoles.includes(auth.user?.role || '')) {
    return next({ name: "Home" });
  }

  next()
})

export default router;
