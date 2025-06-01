<template>
  <div class="home-page max-w-3xl mx-auto p-6 space-y-8">
    <h1 class="text-2xl font-bold">Bienvenue {{ auth.user?.email }}</h1>

    <!-- Section “Inviter un parent” pour les rôles privilégiés -->
    <div
      v-if="['SECRETARY','SERVICE_MANAGER','DIRECTOR','ADMIN'].includes(auth.user?.role)"
      class="border p-4 rounded-lg"
    >
      <h3 class="text-xl font-semibold mb-4">Donner un lien d’invitation</h3>
      <div class="flex gap-4 items-end">
        <div class="flex-1">
          <label class="block mb-1 text-sm">Adresse e-mail du parent</label>
          <input
            v-model="inviteEmail"
            type="email"
            class="w-full border rounded px-3 py-2"
            placeholder="parent@example.com"
            required
          />
        </div>
        <button
          class="btn-primary px-6 py-2"
          @click="sendInvitation"
          :disabled="inviteLoading"
        >
          {{ inviteLoading ? 'Envoi…' : 'Envoyer' }}
        </button>
      </div>
      <p v-if="inviteMessage" :class="inviteError ? 'text-red-600' : 'text-green-600'" class="mt-2">
        {{ inviteMessage }}
      </p>
    </div>

    <!-- Message pour les autres rôles / invités -->
    <div v-else class="p-4">
      <p class="text-gray-700">
        Pour créer un compte parent, veuillez demander à un secrétaire, chef de service, directeur ou admin de vous envoyer un lien d’invitation.
      </p>
    </div>

    <!-- … autre contenu de votre Home … -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'
import { useToast } from 'vue-toastification'

const auth = useAuthStore()
const toast = useToast()

const inviteEmail = ref('')
const inviteLoading = ref(false)
const inviteMessage = ref('')
const inviteError = ref(false)

async function sendInvitation() {
  if (!inviteEmail.value.trim()) {
    inviteError.value = true
    inviteMessage.value = 'Veuillez saisir une adresse e-mail.'
    return
  }

  inviteLoading.value = true
  inviteMessage.value = ''
  inviteError.value = false

  try {
    await axios.post(
      '/invitations',
      {
        email: inviteEmail.value.trim(),
        roleToAssign: 'PARENT',
        // Par défaut, expiration dans 7 jours
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      }
    )
    inviteLoading.value = false
    inviteError.value = false
    inviteMessage.value = 'Invitation envoyée avec succès !'
    inviteEmail.value = ''
  } catch (e: any) {
    inviteLoading.value = false
    inviteError.value = true
    inviteMessage.value =
      e.response?.data?.message || 'Erreur lors de l’envoi de l’invitation.'
    toast.error(inviteMessage.value)
  }
}
</script>

<style scoped>
.home-page {
  /* styles existants */
}
.btn-primary {
  @apply bg-blue-600 text-white rounded;
}
</style>
