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
    meta: { requiresInvite: true }, // ← seule route /register a ce meta
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
  // ... vous pouvez ajouter d'autres routes ici
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const { requiresAuth, requiresGuest, requiredRole, requiresInvite } = to.meta as {
    requiresAuth?: boolean
    requiresGuest?: boolean
    requiredRole?: string
    requiresInvite?: boolean
  }

  // 1) Si la page requiert un invit’ (ex. /register), on vérifie la query "token"
  if (requiresInvite) {
    const token = (to.query.token as string) || ''
    if (!token) {
      // pas de token -> rediriger vers login
      return next({ name: 'Login' })
    }
    // sinon, on laisse passer, le composant Register validera le token
    return next()
  }

  // 2) Si la page requiert d'être non-authentifié (ex. /login, /forgot-password)
  if (requiresGuest && auth.isAuthenticated) {
    return next({ name: 'Home' })
  }

  // 3) Si la page requiert d'être authentifié (ex. /home, /activate-otp, etc.)
  if (requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'Login' })
  }

  // 4) Si la page requiert un rôle précis
  if (requiredRole && auth.user?.role !== requiredRole) {
    return next({ name: 'Home' })
  }

  // 5) Sinon, on autorise la navigation
  return next()
})

export default router
