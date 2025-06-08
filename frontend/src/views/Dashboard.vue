<template>
  <div class="dashboard">
    <!-- Menu latéral -->
    <div :class="['sidebar', { collapsed: sidebarCollapsed }]">
      <div class="sidebar-header">
        <h1 v-if="!sidebarCollapsed" class="logo">APAJH</h1>
        <button @click="toggleSidebar" class="toggle-btn">
          <svg
            :class="{ rotated: sidebarCollapsed }"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <ul>
          <li
            v-for="item in menuItems"
            :key="item.name"
            :class="{ active: activeMenu === item.name }"
            @click="setActiveMenu(item.name)"
          >
            <div class="nav-item">
              <span class="nav-icon" v-html="item.icon"></span>
              <span v-if="!sidebarCollapsed" class="nav-text">{{
                item.label
              }}</span>
            </div>
          </li>
        </ul>
      </nav>
    </div>

    <!-- Contenu principal -->
    <div class="main-content">
      <div class="content-header">
        <h2>{{ currentPageTitle }}</h2>
      </div>

      <div class="content-body">
        <transition name="slide-fade" mode="out-in">
          <component :is="currentComponent" :key="activeMenu" />
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

// Composants pour le contenu dynamique
import DashboardHome from "@/components/dashboard/DashboardHome.vue";
import DashboardUsers from "@/components/dashboard/DashboardUsers.vue";
import DashboardSettings from "@/components/dashboard/DashboardSettings.vue";
import DashboardReports from "@/components/dashboard/DashboardReports.vue";
import DashboardChild from "@/components/dashboard/DashboardChild.vue";

const sidebarCollapsed = ref(false);
const activeMenu = ref("home");
const auth = useAuthStore();
const router = useRouter();

const menuItems = [
  {
    name: "home",
    label: "Accueil",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
  },
  {
    name: "children",
    label: "Enfants",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>',
  },
  {
    name: "users",
    label: "Utilisateurs",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    name: "reports",
    label: "Rapports",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>',
  },
  {
    name: "settings",
    label: "Paramètres",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="m12 1v6m0 6v6m11-7h-6m-6 0H1m17-4a4 4 0 0 1-8 0 4 4 0 0 1 8 0zM7 21a4 4 0 0 1-8 0 4 4 0 0 1 8 0z"/></svg>',
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
    users: DashboardUsers,
    reports: DashboardReports,
    settings: DashboardSettings,
  };
  return (
    components[activeMenu.value as keyof typeof components] || DashboardHome
  );
});

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function setActiveMenu(menuName: string) {
  activeMenu.value = menuName;
}
</script>

<style scoped lang="scss">
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
        background-color: #f3f4f6;
        color: $primary-color;
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

      &:hover {
        background-color: #f9fafb;
      }

      &.active {
        background-color: #eff6ff;
        border-right: 3px solid $primary-color;

        .nav-item {
          color: $primary-color;
        }
      }

      .nav-item {
        display: flex;
        align-items: center;
        padding: 1rem 1.5rem;
        color: #6b7280;
        transition: color 0.2s ease;

        .nav-icon {
          min-width: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
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
