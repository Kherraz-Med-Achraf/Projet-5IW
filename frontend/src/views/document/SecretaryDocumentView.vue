<!-- src/views/SecretaryDocumentView.vue -->
<template>
  <section class="p-6 space-y-4">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Consentements (Secrétaire)</h1>

      <!-- bouton d’upload -->
      <button class="btn btn-primary" @click="modal.open()">+ Nouveau</button>
    </header>

    <table v-if="store.secretaryConsents.length" class="w-full text-sm border">
      <thead class="bg-gray-100">
        <tr>
          <th class="p-2 text-left">Nom</th>
          <th>Status</th>
          <th>Date</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="c in store.secretaryConsents" :key="c.id" class="border-t">
          <td class="p-2">{{ c.name }}</td>
          <td>{{ c.status }}</td>
          <td>{{ new Date(c.createdAt).toLocaleDateString() }}</td>

          <!-- Action : on n’affiche plus “Signer”, uniquement info / PDF -->
          <td class="p-2">
            <!-- ✅ consentement terminé : lien vers le PDF signé -->
            <a
              v-if="c.status === 'COMPLETED' && c.signedPath"
              :href="`${API}/${c.signedPath}`"
              target="_blank"
              class="btn"
            >
              Voir le PDF
            </a>

            <!-- ⏳ en attente de la propre signature du secrétaire -->
            <span v-else-if="c.status === 'SECRETARY_PENDING'">
              Lien envoyé par e-mail
            </span>

            <!-- ⏳ en attente de la signature du parent -->
            <span v-else>
              En attente du parent
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>Aucun consentement pour l’instant.</p>

    <ConsentUploadModal ref="modal" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useDocumentStore } from '@/stores/documentStore';
import ConsentUploadModal   from '@/components/ConsentUploadModal.vue';

const store = useDocumentStore();
const modal = ref<InstanceType<typeof ConsentUploadModal>>();
const API   = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'; // pour le href PDF

/* recharge la liste après (re)chargement de la page */
onMounted(() => {
  store.fetchSecretary();
});
</script>
