<template>
  <div class="home-container">
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

    <!-- Main Grid -->
    <div class="main-grid">


      <!-- Staff Alert Card -->
      <div v-if="auth.user?.role === 'STAFF'" class="feature-card alert-card">
        <div class="card-header">
          <i class="material-icons">notifications</i>
          <h3>Alerte Journal</h3>
        </div>
        <div class="card-content">
          <p class="alert-description">
            Configurez le jour du mois pour recevoir une alerte si un journal
            manque
          </p>
          <div class="alert-input-group">
            <div class="input-container">
              <label>Jour d'alerte</label>
              <input
                type="number"
                v-model.number="alertDay"
                min="1"
                max="31"
                class="alert-input"
              />
            </div>
            <button class="save-btn" @click="saveAlertDay">
              <i class="material-icons">save</i>
              Valider
            </button>
          </div>
        </div>
      </div>

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
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";

/* ───── Stores & helpers ───── */
const auth = useAuthStore();
const journalStore = useJournalStore();
const toast = useToast();
const router = useRouter();

/* ───── Computed ───── */
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

/* ───── Reactive state ───── */


const alertDay = ref<number>(25);

const inviteEmail = ref("");
const inviteLoading = ref(false);
const inviteMessage = ref("");
const inviteError = ref(false);

/* ───── Init OTP & alertDay ───── */
onMounted(() => {
  // Sync initial selon le store
  otpEnabled.value = !!auth.user?.otpEnabled;
});

// Tient à jour otpEnabled lorsqu'on reçoit une nouvelle user depuis le store
watch(
  () => auth.user?.otpEnabled,
  (v) => {
    otpEnabled.value = !!v;
  },
  { immediate: false }
);

/* ───── Alerte STAFF déclenchée dès que auth.user est dispo ───── */
watch(
  () => auth.user,
  async (user) => {
    if (user?.role !== "STAFF") return; // seul le STAFF est concerné

    /* 1) enfants référents ------------------------------------------------ */
    await journalStore.fetchReferentChildren();

    /* 2) on ne vérifie qu'à partir du jour paramétré ---------------------- */
    const today = new Date();
    if (today.getDate() < alertDay.value) return;

    /* 3) récupération des journaux du mois en cours ----------------------- */
    const monthStr = today.toISOString().slice(0, 7); // "YYYY-MM"
    await journalStore.fetchEntries(monthStr);

    /* 4) on dresse la liste des childId qui SONT déjà soumis -------------- */
    const submittedIds = new Set(
      journalStore.entries
        .filter((e) => e.isSubmitted) // on ne garde que les validés
        .map((e) => e.childId) // puis on récupère l'id de l'enfant
    );

    /* 5) il manque un journal si le childId n'est pas dans le Set ---------- */
    const missing = journalStore.childrenRefered.filter(
      (c) => !submittedIds.has(c.id)
    );

    /* 6) toast si besoin --------------------------------------------------- */
    if (missing.length) {
      const names = missing
        .map((c) => `${c.firstName} ${c.lastName}`)
        .join(", ");
      toast.warning(`Journaux manquants pour : ${names}`);
    }
  },
  { immediate: true }
);

/* ───── Actions UI ───── */
function saveAlertDay() {
  if (alertDay.value < 1 || alertDay.value > 31) {
    return toast.error("Jour invalide (1-31)");
  }
  localStorage.setItem("alertDay", alertDay.value.toString());
  toast.success(`Alerte configurée pour le ${alertDay.value} de chaque mois`);
}

function goToDashboard() {
  router.push("/dashboard");
}

function wouf() {
  console.log("wouf 🐶");
}

async function toggleOtp(evt: Event) {
  const checked = (evt.target as HTMLInputElement).checked;

  loading.value = true;
  try {
    const endpoint = checked ? "enable-otp" : "disable-otp";
    const token: string = localStorage.getItem("token") || "";

    const res = await fetch(`http://localhost:3000/auth/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    otpEnabled.value = checked;
    if (checked) {
      secret.value = data.secret;
      qrCodeDataUrl.value = data.qrCodeDataUrl;
      toast.success(data.message || "OTP activé");
    } else {
      secret.value = "";
      qrCodeDataUrl.value = "";
      toast.info(data.message || "OTP désactivé");
    }
  } catch (e) {
    toast.error((e as Error).message);
    // on rétablit l'état visuel précédent en cas d'erreur
    otpEnabled.value = !checked;
  } finally {
    loading.value = false;
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
        email: inviteEmail.value.trim(),
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
</script>

<style scoped lang="scss">
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

  &.security-card::before {
    background: #10b981;
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

/* ───── Security Card ───── */
.toggle-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 30px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e0;
  transition: 0.4s;
  border-radius: 30px;

  &::before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  input:checked + & {
    background-color: #10b981;
  }

  input:checked + &::before {
    transform: translateX(30px);
  }
}

.toggle-label {
  font-weight: 500;
  color: #2d3748;
}

.qr-section {
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 12px;
  text-align: center;
}

.qr-container {
  margin-bottom: 1rem;
}

.qr-code {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.qr-info {
  .qr-secret {
    font-family: "Courier New", monospace;
    background: white;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    word-break: break-all;
  }

  .qr-instruction {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #64748b;
    font-size: 0.875rem;

    i {
      color: #3b82f6;
    }
  }
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
}
</style>
