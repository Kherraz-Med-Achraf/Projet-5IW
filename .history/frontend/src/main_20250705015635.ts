import "./assets/main.css";
import "./assets/styles/accessibility.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { useAuthSecureStore } from "@/stores/authSecure";

import Toast, { POSITION } from "vue-toastification";
import "vue-toastification/dist/index.css";

// Socket.io client
import "./plugins/socket";

const toastOptions = {
  position: POSITION.TOP_RIGHT,
  timeout: 3000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
  rtl: false,
};

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(Toast, toastOptions);

// Initialiser le store d'authentification
const authStore = useAuthSecureStore();
authStore.initialize();

app.mount("#app");
