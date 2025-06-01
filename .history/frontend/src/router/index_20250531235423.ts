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
  { path: '/register', name: 'Register', component: Register },
  { path: '/login', name: 'Login', component: Login },
  { path: '/home', name: 'Home', component: Home },
  { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPassword },
  { path: '/reset-password', name: 'ResetPassword', component: ResetPassword },
  { path: '/verify-email', name: 'VerifyEmail', component: VerifyEmail },
  { path: '/activate-otp', name: 'OtpActivation', component: OtpActivation },
  {
    path: '/secretary/presence',
    name: 'SecretaryPresence',
    component: SecretaryPresence,
    meta: { requiresAuth: true, requiredRole: 'SECRETARY' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const { requiresAuth, requiredRole } = to.meta as {
    requiresAuth?: boolean
    requiredRole?: string
  }

  if (requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'Login' })
  }
  if (requiredRole && auth.user?.role !== requiredRole) {
    return next({ name: 'Home' })
  }
  next()
})

export default router
