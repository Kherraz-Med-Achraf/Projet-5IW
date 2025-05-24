import { createRouter, createWebHistory } from "vue-router";
import Register from "../views/Register.vue";
import Login from "../views/Login.vue";
import Home from "@/views/Home.vue";
import ForgotPassword from "@/views/ForgotPassword.vue";
import ResetPassword from "@/views/ResetPassword.vue";
import OtpActivation from "@/views/OtpActivation.vue";
import VerifyEmail from "@/views/VerifyEmail.vue";
import Dev from "@/views/TheDev.vue";
import TheRegister from "@/views/register/TheRegister.vue";
import StepOne from "@/views/register/steps/StepOne.vue";
import StepTwo from "@/views/register/steps/StepTwo.vue";
import StepThree from "@/views/register/steps/StepThree.vue";

const routes = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
  },
  {
    path: "/dev",
    name: "TheRegister",
    component: TheRegister,
    children: [
      {
        path: "step-one",
        name: "StepOne",
        component: StepOne,
      },
      {
        path: "step-two",
        name: "StepTwo",
        component: StepTwo,
      },
      {
        path: "step-three",
        name: "StepThree",
        component: StepThree,
      },
    ],
  },
  {
    path: "/home",
    name: "Home",
    component: Home,
  },
  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: ForgotPassword,
  },
  {
    path: "/reset-password",
    name: "ResetPassword",
    component: ResetPassword,
  },
  {
    path: "/verify-email",
    name: "verify-email",
    component: VerifyEmail,
  },
  {
    path: "/activate-otp",
    name: "OtpActivation",
    component: OtpActivation,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
