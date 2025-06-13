import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import Register from '../views/Register.vue'
import Login from '@/views/Login.vue'
import Home from '@/views/Home.vue'
import ForgotPassword from '@/views/ForgotPassword.vue'
import ResetPassword from '@/views/ResetPassword.vue'
import OtpActivation from '@/views/OtpActivation.vue'
import VerifyEmail from '@/views/VerifyEmail.vue'

// Ajout des vues du journal pour le staff
import JournalHome from '@/views/journal/JournalHome.vue'
import JournalMonth from '@/views/journal/JournalMonth.vue'

// Nouvelle vue pour les parents
import JournalHomeParent from '@/views/journal/JournalHomeParent.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresInvite: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true },
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
    meta: { requiresGuest: true },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword,
    meta: { requiresGuest: true },
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: VerifyEmail,
    meta: { requiresGuest: true },
  },
  {
    path: '/activate-otp',
    name: 'OtpActivation',
    component: OtpActivation,
    meta: { requiresAuth: true },
  },
  // Route principale du journal (éducateur)
  {
    path: '/journal',
    name: 'JournalHome',
    component: JournalHome,
    meta: { requiresAuth: true, requiredRole: 'STAFF' },
  },
  // Détail/édition d’un mois pour un enfant et une année (éducateur)
  {
    path: '/journal/:childId/:yearId/:month',
    name: 'JournalMonth',
    component: JournalMonth,
    props: true,
    meta: { requiresAuth: true, requiredRole: 'STAFF' },
  },
  // Route principale du journal pour les parents
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
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const {
    requiresAuth,
    requiresGuest,
    requiredRole,
    requiresInvite,
  } = to.meta as {
    requiresAuth?: boolean
    requiresGuest?: boolean
    requiredRole?: string
    requiresInvite?: boolean
  }

  // 1) Si la page requiert un token d’invitation (ex. /register)
  if (requiresInvite) {
    const token = (to.query.token as string) || ''
    if (!token) {
      return next({ name: 'Login' })
    }
    return next()
  }

  // 2) Routes pour « guests »
  if (requiresGuest && auth.isAuthenticated) {
    return next({ name: 'Home' })
  }

  // 3) Routes nécessitant d’être authentifié
  if (requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'Login' })
  }

  // 4) Si un rôle précis est requis
  if (requiredRole && auth.user?.role !== requiredRole) {
    return next({ name: 'Home' })
  }

  // 5) Sinon, on autorise la navigation
  next()
})

export default router
