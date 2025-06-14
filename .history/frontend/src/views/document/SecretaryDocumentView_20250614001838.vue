<template>
    <section class="p-6 space-y-4">
      <header class="flex justify-between items-center">
        <h1 class="text-2xl font-bold">Consentements (Secrétaire)</h1>
        <button class="btn btn-primary" @click="modal.open()">+ Nouveau</button>
      </header>
  
      <table
        v-if="store.secretaryConsents.length"
        class="w-full text-sm border"
      >
        <thead class="bg-gray-100">
          <tr>
            <th class="p-2 text-left">Nom</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in store.secretaryConsents"
            :key="c.id"
            class="border-t"
          >
            <td class="p-2">{{ c.name }}</td>
            <td>{{ c.status }}</td>
            <td>{{ new Date(c.createdAt).toLocaleDateString() }}</td>
            <td>
              <button
                v-if="c.status === 'SECRETARY_PENDING'"
                @click="sign(c.id)"
                class="btn"
              >
                Signer
              </button>
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
  import ConsentUploadModal from '@/components/ConsentUploadModal.vue';
  
  const store = useDocumentStore();
  const modal = ref<InstanceType<typeof ConsentUploadModal>>();
  
  onMounted(() => {
    store.fetchSecretary();
  });
  
  async function sign(id: string) {
    const url = await store.getSignUrl(id);
    window.open(url, '_blank');
  }
  </script>
  