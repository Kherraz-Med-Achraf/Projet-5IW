import "./assets/main.css";
import "./assets/styles/accessibility.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";

import * as Sentry from "@sentry/vue";
import { readSecret } from "./utils/secret";

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

Sentry.init({
  app,
  dsn: readSecret("/run/secrets/vite_sentry_dsn", "VITE_SENTRY_DSN"),
  sendDefaultPii: true,
});

// Configuration Pinia avec désactivation des logs en développement
const pinia = createPinia();

// Désactiver les logs Pinia en interceptant console.log temporairement
if (import.meta.env.DEV) {
  const originalLog = console.log;
  console.log = (...args) => {
    // Filtrer les logs d'installation de stores Pinia
    if (
      args.length > 0 &&
      typeof args[0] === "string" &&
      args[0].includes("🍍") &&
      args[0].includes("installed")
    ) {
      return; // Ne pas afficher ces logs
    }
    originalLog.apply(console, args);
  };
}

app.use(pinia);
app.use(router);
app.use(Toast, toastOptions);

app.mount("#app");
