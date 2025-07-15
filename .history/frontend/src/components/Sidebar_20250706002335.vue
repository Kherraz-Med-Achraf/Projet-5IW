<template>
  <!-- Skip links pour navigation rapide -->
  <div class="skip-links">
    <a href="#main-content" class="skip-link">Aller au contenu principal</a>
    <a href="#sidebar-nav" class="skip-link">Aller à la navigation</a>
  </div>

  <aside :class="['sidebar', { collapsed: sidebarCollapsed }]" role="complementary" aria-label="Navigation principale">
    <div class="sidebar-header">
      <h1 v-if="!sidebarCollapsed" class="logo" id="app-title">APAJH</h1>
      <button 
        @click="toggleSidebar" 
        class="toggle-btn"
        :aria-label="sidebarCollapsed ? 'Développer la barre de navigation' : 'Réduire la barre de navigation'"
        :aria-expanded="!sidebarCollapsed"
        :aria-controls="'sidebar-nav'"
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

    <nav class="sidebar-nav" role="navigation" aria-label="Menu principal" id="sidebar-nav">
      <ul role="list">
        <li v-for="item in filteredMenuItems" :key="item.routeName" role="listitem">
          <button
            @click="navigate(item.routeName)"
            @keydown="handleNavKeydown($event, item.routeName)"
            :class="['nav-item', { active: isActive(item.routeName) }]"
            :aria-current="isActive(item.routeName) ? 'page' : false"
            :aria-label="`${item.label}${isActive(item.routeName) ? ' - page actuelle' : ''}`"
            :tabindex="isActive(item.routeName) ? 0 : -1"
            type="button"
          >
            <span class="nav-icon" aria-hidden="true">
              <i class="material-icons">{{ item.icon }}</i>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-text">
              {{ item.label }}
              <span 
                v-if="item.hasNotification && totalUnreadMessages > 0" 
                class="notification-badge"
              >
                {{ totalUnreadMessages }}
              </span>
            </span>
          </button>
        </li>
        
        <!-- Séparateur avant le bouton de déconnexion -->
        <li class="nav-separator" role="separator" aria-hidden="true"></li>
        
        <!-- Bouton de déconnexion -->
        <li role="listitem">
          <button 
            @click="logout" 
            @keydown="handleLogoutKeydown($event)"
            :class="['nav-item', 'logout-nav-item', { disabled: auth.loading }]"
            :disabled="auth.loading"
            :aria-label="auth.loading ? 'Déconnexion en cours...' : 'Se déconnecter de l\'application'"
            :aria-describedby="'logout-desc'"
            type="button"
          >
            <div id="logout-desc" class="sr-only">
              {{ auth.loading ? 'Déconnexion en cours, veuillez patienter' : 'Fermer votre session et retourner à la page de connexion' }}
            </div>
            <span class="nav-icon" aria-hidden="true">
              <i class="material-icons">logout</i>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-text">
              Déconnexion
            </span>
          </button>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useChatStore } from "@/stores/chatStore";

const sidebarCollapsed = ref(false);

/* --------------------------------------------------
 * Auth & routing
 * -------------------------------------------------- */
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

/* --------------------------------------------------
 * Chat store pour les notifications
 * -------------------------------------------------- */
const chatStore = useChatStore();

// Calculer le nombre total de messages non lus
const totalUnreadMessages = computed(() => {
  return chatStore.chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
});

// Initialiser le chat store
onMounted(() => {
  chatStore.init();
});

/* --------------------------------------------------
 * Définition des entrées de menu (label, icône, routeName, rôles)
 *  – roles: tableau vide ⇒ accessible à tous les rôles
 * -------------------------------------------------- */
const allMenuItems = [
  { label: "Accueil", icon: "home", routeName: "Home", roles: [] },
  { label: "Mon profil", icon: "person", routeName: "Profile", roles: [] },
  { label: "Mes messages", icon: "chat", routeName: "Chat", roles: [], hasNotification: true },
  { label: "Blog", icon: "article", routeName: "Blog", roles: ["STAFF", "SECRETARY", "DIRECTOR", "SERVICE_MANAGER", "ADMIN"] }, // Masqué pour PARENT et CHILD
  {
    label: "Blog (admin)",
    icon: "post_add",
    routeName: "BlogAdmin",
    roles: ["ADMIN", "SECRETARY", "DIRECTOR", "SERVICE_MANAGER"],
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
function isActive(routeName: string) {
  return route.name === routeName;
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

/* --------------------------------------------------
 * Navigation au clavier
 * -------------------------------------------------- */
function handleNavKeydown(event: KeyboardEvent, routeName: string) {
  const availableItems = filteredMenuItems.value
  const currentIndex = availableItems.findIndex(item => item.routeName === routeName)
  let nextIndex = currentIndex

  switch(event.key) {
    case 'ArrowUp':
      event.preventDefault()
      nextIndex = currentIndex > 0 ? currentIndex - 1 : availableItems.length - 1
      break
    case 'ArrowDown':
      event.preventDefault()
      nextIndex = currentIndex < availableItems.length - 1 ? currentIndex + 1 : 0
      break
    case 'Home':
      event.preventDefault()
      nextIndex = 0
      break
    case 'End':
      event.preventDefault()
      nextIndex = availableItems.length - 1
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      // Navigation handled by router-link
      return
    default:
      return
  }
  
  const nextItem = availableItems[nextIndex]
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

function handleLogoutKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    logout()
  }
}

/* --------------------------------------------------
 * Fonction de déconnexion
 * -------------------------------------------------- */
async function logout() {
  if (auth.loading) return;
  await auth.logout();
  router.push({ name: "Login" });
}

function navigate(routeName: string) {
  // Ne pas naviguer si on est déjà sur la route
  if (route.name === routeName) {
    return;
  }
  
  // Navigation avec nextTick pour s'assurer que le DOM est mis à jour
  router.push({ name: routeName }).catch((error) => {
    console.error(`Sidebar: Navigation error:`, error);
  });
}
</script>

<style scoped lang="scss">
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

/* Classe pour lecteurs d'écran uniquement */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: white;
    min-height: 70px;

    .logo {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .toggle-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 8px;
      padding: 0.5rem;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        transition: transform 0.3s ease;

        &.rotated {
          transform: rotate(180deg);
        }
      }

      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      &:focus {
        outline: 3px solid #0ea5e9;
        outline-offset: 2px;
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
      }
    }
  }

  &-nav {
    padding: 1rem 0;
    height: calc(100vh - 70px);
    overflow-y: auto;

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      margin: 0.25rem 0;
      position: relative;

      &:has(.nav-item.active) {
        &::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 0 4px 4px 0;
        }
      }

      &.nav-separator {
        height: 1px;
        background: #e5e7eb;
        margin: 1rem 1.5rem;
        cursor: default;
      }
    }

    .nav-item {
      display: flex;
      align-items: center;
      padding: 0.75rem 1.5rem;
      color: #374151;
      background: transparent;
      border: none;
      text-decoration: none;
      transition: all 0.3s ease;
      border-radius: 12px;
      margin: 0 0.75rem;
      width: calc(100% - 1.5rem);
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;

      &:focus {
        outline: 3px solid #0ea5e9;
        outline-offset: 2px;
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
      }

      &:hover:not(.logout-nav-item):not(:disabled):not(.active) {
        background: rgba(79, 70, 229, 0.15);
        transform: translateX(4px);
        box-shadow: 0 2px 8px rgba(79, 70, 229, 0.12);
      }

      &.active {
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: white;

        .nav-icon .material-icons {
          color: white;
        }
      }

      &.logout-nav-item {
        color: #dc2626;
        font-weight: 500;

        .nav-icon .material-icons {
          color: #dc2626;
        }

        &:hover:not(:disabled) {
          background: #fef2f2;
          color: #b91c1c;

          .nav-icon .material-icons {
            color: #b91c1c;
          }
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .nav-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        margin-right: 12px;

        .material-icons {
          font-size: 1.25rem;
          color: #4b5563;
          transition: color 0.3s ease;
        }
      }

      .nav-text {
        font-weight: 500;
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .notification-badge {
        background: #dc3545;
        color: white;
        padding: 2px 6px;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 600;
        min-width: 18px;
        text-align: center;
        line-height: 1;
        box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
      }
    }
  }
}

// Sidebar collapsed state adjustments
.sidebar.collapsed {
  .sidebar-header {
    padding: 1rem 0.75rem;
    justify-content: center;
  }

  .sidebar-nav {
    .nav-item {
      justify-content: center;
      padding: 0.75rem;
      margin: 0 0.5rem;
      width: calc(100% - 1rem);

      .nav-icon {
        margin-right: 0;
      }
    }
  }
}
</style>
