import { createRouter, createWebHistory } from 'vue-router'
import Register from '../views/Register.vue'
import Login from '../views/Login.vue'
import Home from '@/views/Home.vue'
import ForgotPassword from '@/views/ForgotPassword.vue'
import ResetPassword from '@/views/ResetPassword.vue'
import OtpActivation from '@/views/OtpActivation.vue'
import VerifyEmail from '@/views/VerifyEmail.vue'


const routes = [
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/home',
    name: 'Home',
    component: Home
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: VerifyEmail,
  },
  {
    path: '/activate-otp',
    name: 'OtpActivation',
    component: OtpActivation
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
