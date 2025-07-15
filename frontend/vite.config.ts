import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Désactiver les devtools en production pour éviter les logs de développement
    vueDevTools({
      enabled: process.env.NODE_ENV === "development",
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/assets/styles/_variables.scss" as *;`,
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["educareschool.me"],
  },
});
