<template>
  <!-- Vue pour PARENT et CHILD : Affichage du blog comme page d'accueil -->
  <div v-if="isParentOrChild" class="profile-wrapper">
    <!-- Skip links pour navigation rapide -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#blog-posts" class="skip-link">Aller aux articles</a>
    </div>

    <main class="profile-container" role="main" lang="fr">
      <!-- Content -->
      <div class="profile-content" id="main-content">
        <div class="content-grid">
          <!-- Page Header -->
          <PageHeader 
            title="Bienvenue" 
            subtitle="Découvrez les dernières actualités et informations"
            icon="home"
          />

          <!-- Section des articles -->
          <div class="profile-section" id="blog-posts">
            <!-- États de chargement et erreur -->
            <div v-if="blogLoading" class="loading-indicator">
              <i class="material-icons spinning" aria-hidden="true">hourglass_empty</i>
              <span>Chargement des articles...</span>
            </div>

            <div v-else-if="blogError" class="error-state">
              <i class="material-icons" aria-hidden="true">error</i>
              <p>{{ blogError }}</p>
              <button @click="reloadBlogPosts" class="edit-btn">
                <i class="material-icons" aria-hidden="true">refresh</i>
                Réessayer
              </button>
            </div>

            <!-- Liste des posts -->
            <div v-else-if="blogPosts.length > 0" class="posts-grid">
              <BlogPost 
                v-for="post in blogPosts" 
                :key="post.id" 
                :post="post"
                class="blog-post-card"
              />
            </div>

            <!-- État vide -->
            <div v-else class="empty-state">
              <div class="empty-icon">
                <i class="material-icons" aria-hidden="true">article</i>
              </div>
              <h3>Aucun article pour le moment</h3>
              <p>Les articles apparaîtront ici dès qu'ils seront publiés.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- Vue pour les autres rôles : Page d'accueil classique -->
  <div v-else class="home-container">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="wave">👋</span>
          Bienvenue,
          {{
            auth.user?.email?.split("@")[0] ||
            "Utilisateur"
          }}
        </h1>
        <p class="hero-subtitle">
          Votre tableau de bord personnalisé vous attend
        </p>
      </div>
      <div class="hero-decoration">
        <div class="floating-shape shape-1"></div>
        <div class="floating-shape shape-2"></div>
        <div class="floating-shape shape-3"></div>
      </div>
    </div>

    <!-- User Info Card -->
    <div class="user-info-card">
      <div class="user-avatar">
        <i class="material-icons">person</i>
      </div>
      <div class="user-details">
        <h3>{{ auth.user?.email?.split("@")[0] || "Utilisateur" }}</h3>
        <p class="user-email">{{ auth.user?.email }}</p>
        <span class="user-role" :class="getRoleClass(auth.user?.role)">
          {{ getRoleLabel(auth.user?.role) }}
        </span>
      </div>
    </div>

    <!-- Journal Alert for Staff -->
    <div v-if="auth.user?.role === 'STAFF' && missingJournals.length > 0" class="journal-alert-block">
      <div class="alert-header">
        <i class="material-icons">warning</i>
        <h3>Journaux mensuels manquants</h3>
        <button class="close-alert-btn" @click="dismissAlert" aria-label="Masquer l'alerte">
          <i class="material-icons">close</i>
        </button>
      </div>
      <div class="alert-content">
        <p class="alert-description">
          Les journaux mensuels suivants ne sont pas encore soumis pour le mois en cours :
        </p>
        <div class="missing-journals-list">
          <div v-for="child in missingJournals" :key="child.id" class="missing-journal-item">
            <div class="child-info">
              <i class="material-icons">child_care</i>
              <span class="child-name">{{ child.firstName }} {{ child.lastName }}</span>
            </div>
            <button @click="goToJournal(child.id)" class="action-btn">
              <i class="material-icons">edit</i>
              Remplir le journal
            </button>
          </div>
        </div>
        <div class="alert-footer">
          <small>
            <i class="material-icons">schedule</i>
            Vérification automatique configurée pour le {{ alertDay }} de chaque mois
          </small>
        </div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="main-grid">

      <!-- Invitation Card -->
      <div v-if="canInvite" class="feature-card invitation-card">
        <div class="card-header">
          <i class="material-icons">person_add</i>
          <h3>Inviter un Parent</h3>
        </div>
        <div class="card-content">
          <p class="invitation-description">
            Envoyez un lien d'invitation à un nouveau parent
          </p>
          <div class="invitation-form">
            <div class="input-group">
              <label>Adresse e-mail</label>
              <input
                v-model="inviteEmail"
                type="email"
                placeholder="parent@example.com"
                class="email-input"
                required
              />
            </div>
            <button
              class="invite-btn"
              @click="sendInvitation"
              :disabled="inviteLoading"
            >
              <i class="material-icons">
                {{ inviteLoading ? "hourglass_empty" : "send" }}
              </i>
              {{ inviteLoading ? "Envoi…" : "Envoyer" }}
            </button>
          </div>
          <div
            v-if="inviteMessage"
            class="message"
            :class="{ error: inviteError }"
          >
            <i class="material-icons">
              {{ inviteError ? "error" : "check_circle" }}
            </i>
            {{ inviteMessage }}
          </div>
        </div>
      </div>

      <!-- Dashboard Access Card -->
      <div v-if="canAccessDashboard" class="feature-card dashboard-card">
        <div class="card-header">
          <i class="material-icons">dashboard</i>
          <h3>Administration</h3>
        </div>
        <div class="card-content">
          <p class="dashboard-description">
            Accédez au tableau de bord d'administration pour gérer les
            utilisateurs et les données
          </p>
          <button class="dashboard-btn" @click="goToDashboard">
            <i class="material-icons">launch</i>
            Ouvrir le Dashboard
          </button>
        </div>
      </div>

      <!-- Admin Debug Card -->
      <div v-if="auth.user?.role === 'ADMIN'" class="feature-card debug-card">
        <div class="card-header">
          <i class="material-icons">bug_report</i>
          <h3>Debug Zone</h3>
        </div>
        <div class="card-content">
          <button class="debug-btn" @click="wouf">
            <i class="material-icons">pets</i>
            Wouf Test
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useJournalStore } from "@/stores/journalStore";
import { useBlogStore } from "@/stores/blogStore";
import { useToast } from "vue-toastification";
import { useRouter, useRoute } from "vue-router";
import BlogPost from "@/components/blog/BlogPost.vue";
import PageHeader from "@/components/PageHeader.vue";

/* ───── Stores & helpers ───── */
const auth = useAuthStore();
const journalStore = useJournalStore();
const blogStore = useBlogStore();
const toast = useToast();
const router = useRouter();
const route = useRoute();

/* ───── Computed ───── */
const isParentOrChild = computed(() => {
  const role = auth.user?.role;
  return role === "PARENT" || role === "CHILD";
});

const canInvite = computed(() => {
  const role = auth.user?.role;
  return (
    role && ["SECRETARY", "SERVICE_MANAGER", "DIRECTOR", "ADMIN"].includes(role)
  );
});

const canAccessDashboard = computed(() => {
  const role = auth.user?.role;
  return (
    role && ["SECRETARY", "SERVICE_MANAGER", "DIRECTOR", "ADMIN"].includes(role)
  );
});

// Blog-related computed properties for PARENT/CHILD
const blogPosts = computed(() => {
  return blogStore.sortedPosts;
});

const blogLoading = computed(() => {
  return blogStore.loading;
});

const blogError = computed(() => {
  return blogStore.error;
});

/* ───── Reactive state ───── */
const inviteEmail = ref("");
const inviteLoading = ref(false);
const inviteMessage = ref("");
const inviteError = ref(false);

// Journal alert state for staff
const missingJournals = ref<any[]>([]);
const alertDismissed = ref(false);
const alertDay = ref<number>(25);

/* ───── Computed ───── */
const shouldShowJournalAlert = computed(() => {
  return auth.user?.role === 'STAFF' && 
         missingJournals.value.length > 0 && 
         !alertDismissed.value;
});

/* ───── Actions UI ───── */

function goToDashboard() {
  router.push("/dashboard");
}

function wouf() {
  console.log("wouf 🐶");
}

// Journal alert functions
function dismissAlert() {
  alertDismissed.value = true;
}

function goToJournal(childId: string) {
  router.push(`/journal?childId=${childId}`);
}

// Blog methods for PARENT/CHILD
const reloadBlogPosts = async () => {
  await blogStore.fetchPosts();
};

// Fonction pour charger les données de la page d'accueil
const loadHomeData = async () => {
  // Attendre que l'utilisateur soit prêt
  if (!auth.user) {
    console.log('Home: User not ready yet, skipping data load');
    return;
  }
  
  console.log('Home: Loading home data...');
  try {
    // Charger la configuration d'alerte pour les éducateurs
    if (auth.user?.role === 'STAFF') {
      loadAlertConfig();
      // Vérifier les journaux manquants lors du chargement
      await checkJournalAlerts();
    }
    
    // Charger les posts de blog pour PARENT/CHILD
    if (isParentOrChild.value) {
      await blogStore.fetchPosts();
      console.log('Home: Blog data loaded for PARENT/CHILD');
    }
    
    console.log('Home: Home data loaded successfully');
  } catch (error) {
    console.error('Home: Error loading home data:', error);
  }
};

async function checkJournalAlerts() {
  if (auth.user?.role !== "STAFF") return;

  try {
    // 1) Récupérer les enfants référents
    await journalStore.fetchReferentChildren();

    // 2) Vérifier si on est au bon jour du mois
    const today = new Date();
    if (today.getDate() < alertDay.value) return;

    // 3) Récupérer les journaux du mois en cours
    const monthStr = today.toISOString().slice(0, 7); // "YYYY-MM"
    await journalStore.fetchEntries(monthStr);

    // 4) Identifier les enfants avec des journaux déjà soumis
    const submittedIds = new Set(
      journalStore.entries
        .filter((e) => e.isSubmitted)
        .map((e) => e.childId)
    );

    // 5) Identifier les enfants sans journal soumis
    const missing = journalStore.childrenRefered.filter(
      (c) => !submittedIds.has(c.id)
    );

    // 6) Mettre à jour l'état réactif au lieu d'afficher un toast
    missingJournals.value = missing;
  } catch (error) {
    console.error("Erreur lors de la vérification des journaux:", error);
  }
}

function loadAlertConfig() {
  const saved = localStorage.getItem("alertDay");
  if (saved) {
    const day = parseInt(saved);
    if (day >= 1 && day <= 31) {
      alertDay.value = day;
    }
  }
}

async function sendInvitation() {
  if (!inviteEmail.value.trim()) {
    inviteError.value = true;
    inviteMessage.value = "Veuillez saisir une adresse e-mail.";
    return;
  }
  inviteLoading.value = true;
  try {
    const token: string = localStorage.getItem("token") || "";
    const res = await fetch("http://localhost:3000/invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: inviteEmail.value.trim().toLowerCase(),
        roleToAssign: "PARENT",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    inviteMessage.value = "Invitation envoyée avec succès !";
    inviteEmail.value = "";
    toast.success(inviteMessage.value);
  } catch (e) {
    inviteError.value = true;
    inviteMessage.value = (e as Error).message;
    toast.error(inviteMessage.value);
  } finally {
    inviteLoading.value = false;
  }
}

function getRoleClass(role: string | undefined): string {
  const roleClasses: Record<string, string> = {
    ADMIN: "role-admin",
    DIRECTOR: "role-director",
    SERVICE_MANAGER: "role-manager",
    SECRETARY: "role-secretary",
    STAFF: "role-staff",
    PARENT: "role-parent",
  };
  return roleClasses[role || ""] || "role-default";
}

function getRoleLabel(role: string | undefined): string {
  const roleLabels: Record<string, string> = {
    ADMIN: "Administrateur",
    DIRECTOR: "Directeur",
    SERVICE_MANAGER: "Chef de service",
    SECRETARY: "Secrétaire",
    STAFF: "Personnel",
    PARENT: "Parent",
  };
  return roleLabels[role || ""] || "Utilisateur";
}

/* ───── Lifecycle ───── */
onMounted(async () => {
  console.log('Home: Component mounted');
  await loadHomeData();
});
</script>

<style scoped lang="scss">
/* Variables CSS pour cohérence avec les autres pages */
:root {
  --primary-color: #4444ac;
  --primary-hover: #3333a0;
  --primary-focus: #2222a5;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --danger-color: #dc2626;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --border-color: #e5e7eb;
  --background-light: #f9fafb;
  --card-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --card-shadow-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Skip links pour PARENT/CHILD */
.skip-links {
  position: absolute;
  top: -40px;
  left: 6px;
  z-index: 1000;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--primary-color);
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
  transition: top 0.3s;

  &:focus {
    top: 6px;
  }
}

/* Structure principale pour PARENT/CHILD (même que BlogView) */
.profile-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 2rem 0;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

/* Section identique aux autres pages */
.profile-section {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: var(--card-shadow-hover);
  }
}

/* En-tête de section identique */
.section-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--background-light);

  h1, h2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.2;

    i {
      color: var(--primary-color);
      font-size: 2rem;
    }
  }

  .post-count {
    color: var(--text-muted);
    font-weight: 500;
    font-size: 1rem;
  }
}

/* Note d'information */
.info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  border-radius: 0.75rem;
  color: #1e40af;
  font-size: 0.875rem;
  font-weight: 500;

  i {
    color: #3b82f6;
    font-size: 1.25rem;
  }
}

/* Actions du blog */
.blog-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

/* Message d'information */
.info-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #7dd3fc;
  border-radius: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.875rem;

  i {
    color: #0284c7;
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  p {
    margin: 0;
    line-height: 1.4;
  }
}

/* Grille des posts */
.posts-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Bouton de réessayer */
.edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: #4444ac !important;
  color: white !important;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(68, 68, 172, 0.2);
  font-family: 'Satoshi', sans-serif;
  justify-content: center;

  &:hover {
    background: #3333a0 !important;
    color: white !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
  }

  i {
    font-size: 1.125rem;
    color: white !important;
  }
}

/* Indicateur de chargement */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;

  .spinning {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* État d'erreur */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: var(--error-color);

  i {
    font-size: 3rem;
    opacity: 0.7;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
}

/* État vide */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 2rem;
  text-align: center;
  color: var(--text-muted);

  .empty-icon {
    width: 4rem;
    height: 4rem;
    background: linear-gradient(135deg, var(--background-light) 0%, #e5e7eb 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem;

    i {
      font-size: 2rem;
      color: var(--text-muted);
    }
  }

  h3 {
    margin: 0;
    color: var(--text-secondary);
    font-size: 1.125rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    max-width: 20rem;
    line-height: 1.5;
  }
}

/* Styles pour les autres rôles - Page d'accueil classique */
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  position: relative;
  overflow-x: hidden;
}

/* ───── Hero Section ───── */
.hero-section {
  position: relative;
  text-align: center;
  margin-bottom: 3rem;
  z-index: 2;
}

.hero-content {
  position: relative;
  z-index: 3;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  animation: fadeInUp 1s ease-out;

  .wave {
    display: inline-block;
    animation: wave 2s infinite;
    margin-right: 1rem;
  }
}

.hero-subtitle {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0;
  animation: fadeInUp 1s ease-out 0.2s both;
}

.hero-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
}

.floating-shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;

  &.shape-1 {
    width: 80px;
    height: 80px;
    top: 20%;
    left: 10%;
    animation-delay: 0s;
  }

  &.shape-2 {
    width: 120px;
    height: 120px;
    top: 60%;
    right: 15%;
    animation-delay: 2s;
  }

  &.shape-3 {
    width: 60px;
    height: 60px;
    top: 10%;
    right: 25%;
    animation-delay: 4s;
  }
}

/* ───── Journal Alert Block ───── */
.journal-alert-block {
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);
  animation: slideInDown 0.6s ease-out;

  .alert-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;

    h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      color: #92400e;
      font-size: 1.25rem;
      font-weight: 600;

      .material-icons {
        color: #f59e0b;
        font-size: 1.5rem;
      }
    }

    .close-alert-btn {
      background: none;
      border: none;
      color: #92400e;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: background-color 0.2s ease;

      &:hover {
        background: rgba(146, 64, 14, 0.1);
      }

      .material-icons {
        font-size: 1.2rem;
      }
    }
  }

  .alert-content {
    .alert-description {
      color: #92400e;
      margin-bottom: 1rem;
      line-height: 1.6;
    }

    .missing-journals-list {
      margin-bottom: 1rem;
    }

    .missing-journal-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: white;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      margin-bottom: 0.5rem;

      .child-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #92400e;
        font-weight: 500;

        .material-icons {
          color: #f59e0b;
          font-size: 1.2rem;
        }
      }

      .action-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #f59e0b;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;

        &:hover {
          background: #d97706;
        }

        .material-icons {
          font-size: 1rem;
        }
      }
    }

    .alert-footer {
      padding-top: 1rem;
      border-top: 1px solid #fbbf24;

      small {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #92400e;
        font-size: 0.875rem;

        .material-icons {
          color: #f59e0b;
          font-size: 1rem;
        }
      }
    }
  }
}

/* ───── User Info Card ───── */
.user-info-card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 2rem;
  animation: slideInLeft 0.8s ease-out;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea, #764ba2);
  }
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  flex-shrink: 0;
}

.user-details {
  flex: 1;

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #2d3748;
  }

  .user-email {
    margin: 0 0 0.75rem 0;
    color: #64748b;
    font-size: 1rem;
  }
}

.user-role {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 25px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &.role-admin {
    background: #fee2e2;
    color: #dc2626;
  }
  &.role-director {
    background: #fef3c7;
    color: #d97706;
  }
  &.role-manager {
    background: #ddd6fe;
    color: #7c3aed;
  }
  &.role-secretary {
    background: #dcfce7;
    color: #16a34a;
  }
  &.role-staff {
    background: #dbeafe;
    color: #2563eb;
  }
  &.role-parent {
    background: #fce7f3;
    color: #db2777;
  }
  &.role-default {
    background: #f1f5f9;
    color: #475569;
  }
}

/* ───── Main Grid ───── */
.main-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  animation: fadeIn 1s ease-out 0.4s both;
}

/* ───── Feature Cards ───── */
.feature-card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15);
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
  }

  &.alert-card::before {
    background: #f59e0b;
  }
  &.invitation-card::before {
    background: #3b82f6;
  }
  &.dashboard-card::before {
    background: #6366f1;
  }
  &.debug-card::before {
    background: #8b5cf6;
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;

  i {
    font-size: 2rem;
    color: #667eea;
  }

  h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #2d3748;
  }
}

.card-content {
  color: #4a5568;
}

/* ───── Alert Card ───── */
.alert-description {
  margin-bottom: 1.5rem;
  color: #64748b;
}

.alert-input-group {
  display: flex;
  gap: 1rem;
  align-items: end;
}

.input-container {
  flex: 1;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }
}

.alert-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #059669;
    transform: translateY(-2px);
  }
}

/* ───── Invitation Card ───── */
.invitation-description {
  margin-bottom: 1.5rem;
  color: #64748b;
}

.invitation-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-group {
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }
}

.email-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

.invite-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  margin-top: 1rem;
  background: #dcfce7;
  color: #16a34a;

  &.error {
    background: #fee2e2;
    color: #dc2626;
  }

  i {
    font-size: 1.25rem;
  }
}

/* ───── Dashboard Card ───── */
.dashboard-description {
  margin-bottom: 1.5rem;
  color: #64748b;
}

.dashboard-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #4f46e5;
    transform: translateY(-2px);
  }
}

/* ───── Debug Card ───── */
.debug-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #7c3aed;
    transform: translateY(-2px);
  }
}

/* ───── Styles pour PARENT/CHILD (posts dans profile-section) ───── */
.posts-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.blog-post-card {
  animation: fadeInUp 0.6s ease-out;
}

/* ───── Animations ───── */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes wave {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(20deg);
  }
  75% {
    transform: rotate(-20deg);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

/* ───── Responsive ───── */
@media (max-width: 768px) {
  /* Responsive pour PARENT/CHILD (vue blog) */
  .profile-container {
    padding: 1rem 0;
  }

  .profile-content {
    padding: 0 0.5rem;
  }

  .posts-grid {
    gap: 1.5rem;
  }

  .profile-section {
    padding: 1.5rem;
    border-radius: 0.75rem;
  }

  .section-header {
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;

    h1, h2 {
      font-size: 1.5rem;
      gap: 0.5rem;

      i {
        font-size: 1.75rem;
      }
    }
  }

  .content-grid {
    gap: 1.5rem;
  }

  .empty-state {
    padding: 2rem 1rem;
  }

  /* Responsive pour les autres rôles (vue classique) */
  .home-container {
    padding: 1rem;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .main-grid {
    grid-template-columns: 1fr;
  }

  .user-info-card {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .alert-input-group,
  .invitation-form {
    flex-direction: column;
  }

  .journal-alert-block {
    .missing-journal-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;

      .action-btn {
        align-self: stretch;
        justify-content: center;
      }
    }
  }
}
</style>
