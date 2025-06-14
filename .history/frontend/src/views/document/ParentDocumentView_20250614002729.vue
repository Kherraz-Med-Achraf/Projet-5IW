<template>
    <section class="p-6 space-y-4">
      <h1 class="text-2xl font-bold mb-2">Mes consentements</h1>
  
      <table
        v-if="store.parentConsents.length"
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
            v-for="c in store.parentConsents"
            :key="c.id"
            class="border-t"
          >
            <td class="p-2">{{ c.name }}</td>
            <td>{{ c.status }}</td>
            <td>{{ new Date(c.createdAt).toLocaleDateString() }}</td>
            <td>
              <button
                v-if="c.status === 'PARENT_PENDING'"
                @click="sign(c.id)"
                class="btn"
              >
                Signer
              </button>
  
              <a
                v-else-if="c.status === 'COMPLETED' && c.signedPath"
                :href="`${API}/${c.signedPath}`"
                class="text-blue-600 underline"
                target="_blank"
              >
                Télécharger
              </a>
            </td>
          </tr>
        </tbody>
      </table>
  
      <p v-else>Aucun consentement disponible.</p>
    </section>
  </template>
  
  <script setup lang="ts">
  import { onMounted } from 'vue';
  import { useDocumentStore } from '@/stores/documentStore';
  
  const store = useDocumentStore();
  
  onMounted(() => {
    store.fetchParent();
  });
  
  async function sign(id: string) {
    const url = await store.getSignUrl(id);
    window.open(url, '_blank');
  }
  </script>
  