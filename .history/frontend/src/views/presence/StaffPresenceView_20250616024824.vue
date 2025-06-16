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



