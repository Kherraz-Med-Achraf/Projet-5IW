import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import Register from '../views/Register.vue'
import Login from '../views/Login.vue'
import Home from '@/views/Home.vue'
import ForgotPassword from '@/views/ForgotPassword.vue'
import ResetPassword from '@/views/ResetPassword.vue'
import OtpActivation from '@/views/OtpActivation.vue'
import VerifyEmail from '@/views/VerifyEmail.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresInvite: true }, // Seule cette route attend un ?token=…
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
  // … d’autres routes éventuelles
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

  // 1) Route « / register » : nécessite un token en query
  if (requiresInvite) {
    const token = (to.query.token as string) || ''
    if (!token) {
      // pas de token → rediriger vers Login
      return next({ name: 'Login' })
    }
    // On laisse passer la requête vers le composant Register.vue
    return next()
  }

  // 2) Routes pour « guests » (login, forgot-password, reset-password, verify-email)
  if (requiresGuest && auth.isAuthenticated) {
    return next({ name: 'Home' })
  }

  // 3) Routes nécessitant d’être authentifié (home, activate-otp, etc.)
  if (requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'Login' })
  }

  // 4) Si un rôle précis est requis (ex. sur d’autres routes)
  if (requiredRole && auth.user?.role !== requiredRole) {
    return next({ name: 'Home' })
  }

  // 5) Aucun verrou n’est levé : on autorise
  return next()
})

export default router
