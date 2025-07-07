<template>
  <!-- Skip links pour navigation rapide -->
  <div class="skip-links">
    <a href="#main-content" class="skip-link">Aller au contenu principal</a>
    <a href="#sidebar-navigation" class="skip-link">Aller à la navigation</a>
  </div>

  <div class="dashboard">
    <!-- Menu latéral -->
    <aside :class="['sidebar', { collapsed: sidebarCollapsed }]" role="complementary" aria-label="Menu de navigation du tableau de bord">
      <div class="sidebar-header">
        <h1 v-if="!sidebarCollapsed" class="logo" id="dashboard-title">APAJH</h1>
        <button 
          @click="toggleSidebar" 
          class="toggle-btn"
          :aria-label="sidebarCollapsed ? 'Développer la barre de navigation' : 'Réduire la barre de navigation'"
          :aria-expanded="!sidebarCollapsed"
          :aria-controls="'sidebar-navigation'"
          type="button"
        >
          <svg
            :class="{ rotated: sidebarCollapsed }"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav" role="navigation" aria-label="Menu principal du tableau de bord" id="sidebar-navigation">
        <ul role="list">
          <!-- Lien retour vers Home -->
          <li class="nav-back-home" role="listitem">
            <button 
              @click="goToHome" 
              class="nav-item nav-button"
              type="button"
              aria-label="Retourner à la page d'accueil principale"
            >
              <span class="nav-icon" aria-hidden="true">
                <i class="material-icons">arrow_back</i>
              </span>
              <span v-if="!sidebarCollapsed" class="nav-text">
                Retour à l'accueil
              </span>
            </button>
          </li>

          <!-- Séparateur -->
          <li class="nav-separator" v-if="!sidebarCollapsed" role="separator" aria-hidden="true"></li>

          <!-- Menu items existants -->
          <li
            v-for="item in menuItems"
            :key="item.name"
            role="listitem"
          >
            <button
              @click="setActiveMenu(item.name)"
              @keydown="handleMenuKeydown($event, item.name)"
              :class="['nav-item', 'nav-button', { active: activeMenu === item.name }]"
              :aria-current="activeMenu === item.name ? 'page' : false"
              :aria-label="`${item.label}${activeMenu === item.name ? ' - section actuelle' : ''}`"
              :tabindex="activeMenu === item.name ? 0 : -1"
              type="button"
            >
              <span class="nav-icon" aria-hidden="true">
                <i class="material-icons">{{ item.icon }}</i>
              </span>
              <span v-if="!sidebarCollapsed" class="nav-text">{{
                item.label
              }}</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- Contenu principal -->
    <main class="main-content" role="main" id="main-content">
      <div class="content-header">
        <h2 id="page-title">{{ currentPageTitle }}</h2>
      </div>

      <div class="content-body" :aria-labelledby="'page-title'">
        <transition name="slide-fade" mode="out-in">
          <component
            :is="currentComponent"
            :key="activeMenu"
            @navigateToMenu="setActiveMenu"
          />
        </transition>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";

import DashboardHome from "@/components/dashboard/DashboardHome.vue";
import DashboardChild from "@/components/dashboard/DashboardChild.vue";
import DashboardParent from "@/components/dashboard/DashboardParent.vue";
import DashboardSecretary from "@/components/dashboard/DashboardSecretary.vue";
import DashboardDirector from "@/components/dashboard/DashboardDirector.vue";
import DashboardStaff from "@/components/dashboard/DashboardStaff.vue";
import DashboardServiceManager from "@/components/dashboard/DashboardServiceManager.vue";

const sidebarCollapsed = ref(false);
const activeMenu = ref("home");
const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

const menuItems = [
  {
    name: "home",
    label: "Accueil",
    icon: "home",
  },
  {
    name: "children",
    label: "Enfants",
    icon: "child_care",
  },
  {
    name: "parents",
    label: "Parents",
    icon: "family_restroom",
  },
  {
    name: "directors",
    label: "Directeurs",
    icon: "admin_panel_settings",
  },
  {
    name: "secretaries",
    label: "Secrétaires",
    icon: "business_center",
  },
  {
    name: "service-managers",
    label: "Chefs de service",
    icon: "supervisor_account",
  },
  {
    name: "staff",
    label: "Personnel",
    icon: "groups",
  },
];

const currentPageTitle = computed(() => {
  const current = menuItems.find((item) => item.name === activeMenu.value);
  return current?.label || "Dashboard";
});

const currentComponent = computed(() => {
  const components = {
    home: DashboardHome,
    children: DashboardChild,
    parents: DashboardParent,
    secretaries: DashboardSecretary,
    directors: DashboardDirector,
    staff: DashboardStaff,
    "service-managers": DashboardServiceManager,
  };
  return (
    components[activeMenu.value as keyof typeof components] || DashboardHome
  );
});

async function verifyToken(): Promise<boolean> {
  try {
    if (!auth.token) {
      return false;
    }

    const response = await fetch(
      `${
        import.meta.env.VITE_NEST_API_URL || "http://localhost:3000"
      }/auth/verify-token`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Erreur lors de la vérification du token:", error);
    return false;
  }
}

async function handleInvalidToken() {
  toast.error("Session expirée. Veuillez vous reconnecter.");
  await auth.logout();
  router.push("/login");
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function goToHome() {
  router.push("/home");
}

async function setActiveMenu(menuName: string) {
  activeMenu.value = menuName;
}

// Navigation au clavier pour le menu
function handleMenuKeydown(event: KeyboardEvent, menuName: string) {
  const currentIndex = menuItems.findIndex(item => item.name === menuName)
  let nextIndex = currentIndex

  switch(event.key) {
    case 'ArrowUp':
      event.preventDefault()
      nextIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1
      break
    case 'ArrowDown':
      event.preventDefault()
      nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0
      break
    case 'Home':
      event.preventDefault()
      nextIndex = 0
      break
    case 'End':
      event.preventDefault()
      nextIndex = menuItems.length - 1
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      setActiveMenu(menuName)
      return
    default:
      return
  }
  
  const nextItem = menuItems[nextIndex]
  if (nextItem) {
    // Focus sur le prochain élément
    setTimeout(() => {
      const nextElement = document.querySelector(`[aria-label*="${nextItem.label}"]`) as HTMLElement
      if (nextElement) {
        nextElement.focus()
      }
    }, 0)
  }
}

async function checkInitialAuth() {
  if (!auth.isAuthenticated) {
    router.push("/login");
    return;
  }

  const isTokenValid = await verifyToken();
  if (!isTokenValid) {
    await handleInvalidToken();
  }
}

let tokenCheckInterval: number | null = null;

function stopTokenCheck() {
  if (tokenCheckInterval) {
    clearInterval(tokenCheckInterval);
    tokenCheckInterval = null;
  }
}

onUnmounted(() => {
  stopTokenCheck();
});
</script>

<style scoped lang="scss">
/* ===== AMÉLIORATIONS D'ACCESSIBILITÉ ===== */

/* Skip links pour navigation rapide */
.skip-links {
  position: absolute;
  top: -100px;
  left: 0;
  z-index: 1000;
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 10px;
  padding: 0.75rem 1rem;
  background: #4338ca;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: top 0.2s ease;

  &:focus {
    top: 10px;
    outline: 3px solid #0ea5e9;
    outline-offset: 2px;
  }
}

.dashboard {
  display: flex;
  height: 100vh;
  background-color: #f8fafc;
}

.sidebar {
  width: 280px;
  background-color: #fff;
  border-right: 1px solid #e5e7eb;
  transition: width 0.3s ease;
  overflow: hidden;

  &.collapsed {
    width: 80px;
  }

  &-header {
    padding: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e5e7eb;

    .logo {
      font-family: "Archivo Black", sans-serif;
      font-size: 1.8rem;
      color: $primary-color;
      margin: 0;
    }

    .toggle-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 4px;
      color: #6b7280;
      transition: all 0.2s ease;

      &:hover {
        background-color: rgba(68, 68, 172, 0.15);
        color: $primary-color;
      }

      &:focus {
        outline: 3px solid #0ea5e9;
        outline-offset: 2px;
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
      }

      svg {
        transition: transform 0.3s ease;

        &.rotated {
          transform: rotate(180deg);
        }
      }
    }
  }

  &-nav {
    padding: 1rem 0;

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(.active) {
        background-color: rgba(68, 68, 172, 0.12);
      }

      &.active {
        background-color: #eff6ff;
        border-right: 3px solid $primary-color;

        .nav-item {
          color: $primary-color;
        }
      }

      &.nav-back-home {
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 0.5rem;

        &:hover {
          background-color: #f0f9ff;
        }

        .nav-item {
          color: #3b82f6;
          font-weight: 600;
        }
      }

      &.nav-separator {
        height: 1px;
        background-color: #e5e7eb;
        margin: 0.5rem 1rem;
        cursor: default;

        &:hover {
          background-color: #e5e7eb;
        }
      }

      .nav-item {
        display: flex;
        align-items: center;
        padding: 1rem 1.5rem;
        color: #6b7280;
        transition: color 0.2s ease;

        .nav-icon {
          min-width: 24px;
          display: flex;
          align-items: center;
          justify-content: center;

          .material-icons {
            font-size: 20px;
            line-height: 1;
          }
        }

        .nav-text {
          margin-left: 1rem;
          font-weight: 500;
          white-space: nowrap;
        }
      }
    }
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .content-header {
    height: 88px;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #e5e7eb;
    background-color: #fff;

    h2 {
      margin: 0;
      color: #111827;
      font-size: 1.875rem;
      font-weight: 600;
    }
  }

  .content-body {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }
}

// Animations pour le contenu
.slide-fade-enter-active {
  transition: all 0.4s ease;
}

.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}
</style>
