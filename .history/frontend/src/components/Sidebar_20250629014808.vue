<template>
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
          v-for="item in filteredMenuItems"
          :key="item.routeName"
          :class="{ active: isActive(item.routeName) }"
          @click="navigate(item.routeName)"
        >
          <div class="nav-item">
            <span class="nav-icon">
              <i class="material-icons">{{ item.icon }}</i>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-text">
              {{ item.label }}
            </span>
          </div>
        </li>
        
        <!-- Séparateur avant le bouton de déconnexion -->
        <li class="nav-separator"></li>
        
        <!-- Bouton de déconnexion -->
        <li class="logout-item" @click="logout" :class="{ disabled: auth.loading }">
          <div class="nav-item logout-nav-item">
            <span class="nav-icon">
              <i class="material-icons">logout</i>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-text">
              Déconnexion
            </span>
          </div>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const sidebarCollapsed = ref(false);

/* --------------------------------------------------
 * Auth & routing
 * -------------------------------------------------- */
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

/* --------------------------------------------------
 * Définition des entrées de menu (label, icône, routeName, rôles)
 *  – roles: tableau vide ⇒ accessible à tous les rôles
 * -------------------------------------------------- */
const allMenuItems = [
  { label: "Accueil", icon: "home", routeName: "Home", roles: [] },
  { label: "Blog", icon: "article", routeName: "Blog", roles: [] },
  {
    label: "Blog (admin)",
    icon: "post_add",
    routeName: "BlogAdmin",
    roles: ["SECRETARY", "DIRECTOR", "SERVICE_MANAGER"],
  },
  {
    label: "Planning (staff)",
    icon: "calendar_view_month",
    routeName: "StaffSchedule",
    roles: ["STAFF"],
  },
  {
    label: "Planning (parent)",
    icon: "schedule",
    routeName: "ChildSchedule",
    roles: ["PARENT"],
  },
  {
    label: "Planning (gestion)",
    icon: "edit_calendar",
    routeName: "PlanningManage",
    roles: ["DIRECTOR", "SERVICE_MANAGER"],
  },
  {
    label: "Planning (upload)",
    icon: "upload_file",
    routeName: "PlanningUpload",
    roles: ["DIRECTOR", "SERVICE_MANAGER"],
  },
  {
    label: "Présence", // staff
    icon: "event_available",
    routeName: "StaffPresence",
    roles: ["STAFF"],
  },
  {
    label: "Absences", // secretary
    icon: "calendar_month",
    routeName: "SecretaryAbsence",
    roles: ["SECRETARY"],
  },
  {
    label: "Rapport de présence",
    icon: "insert_chart",
    routeName: "PresenceReport",
    roles: ["DIRECTOR", "SERVICE_MANAGER"],
  },
  {
    label: "Journal",
    icon: "book",
    routeName: "JournalHome",
    roles: ["STAFF"],
  },
  {
    label: "Journal (parent)",
    icon: "book",
    routeName: "JournalHomeParent",
    roles: ["PARENT"],
  },
  {
    label: "Événements", // parent
    icon: "event",
    routeName: "EventList",
    roles: ["PARENT"],
  },
  {
    label: "Événements (admin)",
    icon: "event_note",
    routeName: "EventAdmin",
    roles: ["DIRECTOR", "SERVICE_MANAGER"],
  },
];

/* --------------------------------------------------
 * Filtrer selon le rôle courant
 * -------------------------------------------------- */
const filteredMenuItems = computed(() => {
  const role = auth.user?.role as string | undefined;
  return allMenuItems.filter((item) => {
    // accessible si aucun rôle requis OU si le rôle figure dans la liste
    return item.roles.length === 0 || (role && item.roles.includes(role));
  });
});

/* --------------------------------------------------
 * Navigation & active state
 * -------------------------------------------------- */
function navigate(routeName: string) {
  router.push({ name: routeName });
}

function isActive(routeName: string) {
  return route.name === routeName;
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

/* --------------------------------------------------
 * Fonction de déconnexion
 * -------------------------------------------------- */
async function logout() {
  if (auth.loading) return;
  await auth.logout();
  router.push({ name: "Login" });
}
</script>

<style scoped lang="scss">
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
    display: flex;
    flex-direction: column;
    height: calc(100vh - 88px); // Hauteur totale moins header

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    li {
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(.nav-separator):not(.disabled) {
        background-color: #f9fafb;
      }

      &.active {
        background-color: #eff6ff;
        border-right: 3px solid $primary-color;

        .nav-item {
          color: $primary-color;
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

      &.logout-item {
        margin-top: auto; // Pousse vers le bas
        border-top: 1px solid #e5e7eb;

        &:hover:not(.disabled) {
          background-color: #fef2f2;
        }

        &.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .logout-nav-item {
          color: #dc2626;
          font-weight: 600;

          &:hover:not(.disabled) {
            color: #991b1b;
          }
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
</style>
