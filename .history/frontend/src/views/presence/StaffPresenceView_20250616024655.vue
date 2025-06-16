<template>
  <div class="presence-page">
    <div class="presence-card">
      <!-- Header -->
      <div class="presence-header">
        <h1 class="presence-title">
          Appels des présences – {{ todayLabel }}
        </h1>
        <button
          v-if="!sheet?.validatedAtStaff"
          class="presence-btn"
          :disabled="submitting || !sheet"
          @click="onValidate"
        >
          <svg
            v-if="submitting"
            class="spinner"
            xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          {{ submitting ? 'Validation en cours…' : 'Valider l’appel' }}
        </button>
      </div>

      <!-- Body -->
      <div class="presence-body">
        <!-- Loader -->
        <div v-if="loading" class="presence-loader">
          <!-- … loader svg … -->
        </div>

        <!-- Dès que validé, on affiche les onglets -->
        <div v-else-if="sheet?.validatedAtStaff">
          <!-- Onglets -->
          <div class="tabs">
            <button
              :class="{ active: activeTab === 'staff' }"
              @click="activeTab = 'staff'"
            >Staff</button>
            <button
              :class="{ active: activeTab === 'secretary' }"
              @click="activeTab = 'secretary'"
            >Secrétaire</button>
          </div>

          <!-- Onglet Staff : liste figée validée -->
          <div v-if="activeTab === 'staff'" class="tab-content">
            <div class="presence-alert">
              <p>
                L’appel a déjà été validé par :
                <strong>{{ staffName }}</strong>
              </p>
              <p>
                Validé le {{ formatDate(sheet.validatedAtStaff) }}
              </p>
            </div>
            <div class="table-wrapper">
              <table class="presence-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Présent</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rec in sheet.records" :key="rec.id">
                    <td>{{ rec.child.lastName }}</td>
                    <td>{{ rec.child.firstName }}</td>
                    <td>
                      <span
                        class="badge"
                        :class="rec.present ? 'badge-present' : 'badge-absent'"
                      >
                        {{ rec.present ? 'Oui' : 'Non' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Onglet Secrétaire : montre présent/absent/retard/justifié -->
          <div v-else class="tab-content">
            <div class="presence-alert">
              <p>Modifications de la secrétaire :</p>
            </div>
            <div class="table-wrapper">
              <table class="presence-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rec in sheet.records" :key="rec.id">
                    <td>{{ rec.child.lastName }}</td>
                    <td>{{ rec.child.firstName }}</td>
                    <td>
                      <span
                        class="badge"
                        :class="{
                          'badge-lateness': rec.justification?.type === 'LATENESS',
                          'badge-absence':  rec.justification?.type === 'ABSENCE',
                          'badge-present':  rec.present && !rec.justification,
                          'badge-absent':   !rec.present && !rec.justification
                        }"
                      >
                        {{
                          rec.justification?.type === 'LATENESS'
                            ? 'Retard'
                            : rec.justification?.type === 'ABSENCE'
                              ? 'Absence'
                              : rec.present
                                ? 'Présent'
                                : 'Absent'
                        }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Phase Staff avant validation -->
        <div v-else>
          <div class="table-wrapper" v-if="sheet && sheet.records.length">
            <table class="presence-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Présent</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rec in sheet.records" :key="rec.id">
                  <td>{{ rec.child.lastName }}</td>
                  <td>{{ rec.child.firstName }}</td>
                  <td>
                    <input
                      type="checkbox"
                      class="presence-checkbox"
                      :value="rec.childId"
                      v-model="store.presentChildIds"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { usePresenceStore } from '@/stores/presenceStore'
import { useNotificationStore } from '@/stores/notificationStore'

const store  = usePresenceStore()
const notify = useNotificationStore()

// Today’s ISO and formatted label
const todayIso   = new Date().toISOString().substring(0, 10)
const todayLabel = computed(() =>
  new Date(todayIso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day:     '2-digit',
    month:   'long',
    year:    'numeric',
  })
)

// Reactive state & store bindings
const sheet      = computed(() => store.sheet)
const loading    = computed(() => store.loading)
const submitting = ref(false)

// Which tab is active once validated: 'staff' | 'secretary'
const activeTab = ref<'staff' | 'secretary'>('staff')

// Display staff name from the sheet
const staffName = computed(() => {
  const user = sheet.value?.staff
  const prof = user?.staffProfile
  return prof
    ? `${prof.firstName} ${prof.lastName}`
    : user
      ? user.email
      : ''
})

// Date formatter for display
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// Validation handler
async function onValidate() {
  if (!sheet.value) return
  if (!confirm('Une fois validé, vous ne pourrez plus modifier la feuille. Continuer ?'))
    return

  submitting.value = true
  try {
    await store.validateSheet()
    notify.showNotification('Appel validé avec succès', 'success')
  } catch (err: any) {
    notify.showNotification(err?.message || 'Erreur lors de la validation', 'error')
  } finally {
    submitting.value = false
  }
}

// On mount, fetch today’s sheet
onMounted(async () => {
  store.setDate(todayIso)
  await store.fetchSheet()
})
</script>



<style scoped>
/* Container */
.presence-page {
  min-height: 100vh;
  background-color: #f9fafb;
  padding: 2rem 0;
  display: flex;
  justify-content: center;
}

/* Card */
.presence-card {
  max-width: 64rem;
  width: 100%;
  background-color: #ffffff;
  box-shadow:
    0 1px 2px rgba(0,0,0,0.05),
    0 1px 3px rgba(0,0,0,0.1);
  border-radius: 0.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Header */
.presence-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
.presence-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}
.presence-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #4f46e5;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color .2s;
}
.presence-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.presence-btn:hover:not(:disabled) {
  background-color: #4338ca;
}

/* Spinner */
.spinner {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.5rem;
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Body */
.presence-body {
  padding: 1rem 1.5rem;
  flex: 1;
}

/* Loader */
.presence-loader {
  text-align: center;
  padding: 2rem 0;
  color: #4f46e5;
}
.presence-loader svg {
  width: 2rem;
  height: 2rem;
  margin: 0 auto;
  animation: spin 1s linear infinite;
}

/* Alert */
.presence-alert {
  background-color: #dcfce7;
  border: 1px solid #bbf7d0;
  padding: 1rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  color: #166534;
}
.presence-alert p + p {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #6b7280;
}

/* Table wrapper */
.table-wrapper {
  overflow-x: auto;
  margin-bottom: 1rem;
}

/* Table */
.presence-table {
  width: 100%;
  border-collapse: collapse;
}
.presence-table thead {
  background-color: #f3f4f6;
}
.presence-table th {
  padding: 0.5rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.presence-table td {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  border-top: 1px solid #e5e7eb;
}
.presence-table tr:hover {
  background-color: #f9fafb;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}
.badge-present {
  background-color: #dcfce7;
  color: #166534;
}
.badge-absent {
  background-color: #fee2e2;
  color: #991b1b;
}

/* Checkbox */
.presence-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  color: #4f46e5;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
}
.presence-checkbox:focus {
  outline: 2px solid transparent;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.5);
}
</style>
