// ===============================
// stores/documentStore.ts
// ===============================
import { defineStore } from 'pinia';

interface Consent {
  id: string;
  name: string;
  status: 'SECRETARY_PENDING' | 'PARENT_PENDING' | 'COMPLETED' | 'CANCELED';
  createdAt: string;
  signedPath?: string | null;
}

const API = import.meta.env.VITE_API_URL || '/api';

export const useDocumentStore = defineStore('document', {
  state: () => ({
    secretaryConsents: [] as Consent[],
    parentConsents: [] as Consent[],
    loading: false,
  }),
  actions: {
    async fetchSecretary(page = 1) {
      this.loading = true;
      try {
        const r = await fetch(`${API}/documents/consents/secretary?page=${page}`);
        this.secretaryConsents = await r.json();
      } finally {
        this.loading = false;
      }
    },
    async fetchParent(page = 1) {
      this.loading = true;
      try {
        const r = await fetch(`${API}/documents/consents/parent?page=${page}`);
        this.parentConsents = await r.json();
      } finally {
        this.loading = false;
      }
    },
    async uploadConsent(formData: FormData) {
      const r = await fetch(`${API}/documents/consents`, {
        method: 'POST',
        body: formData,
      });
      if (!r.ok) throw new Error('Upload failed');
      return r.json();
    },
    async getSignUrl(id: string) {
      const r = await fetch(`${API}/documents/consents/${id}/sign-url`);
      const { url } = await r.json();
      return url;
    },
  },
});

// ===============================
// components/ConsentUploadModal.vue
// ===============================
<template>
  <dialog ref="dialog" class="p-6 bg-white rounded-xl shadow-xl w-96">
    <form @submit.prevent="submit">
      <h2 class="text-xl font-semibold mb-4">Nouveau consentement</h2>
      <label class="block mb-2 text-sm">Nom du document</label>
      <input v-model="name" required class="input mb-4 w-full" />

      <label class="block mb-2 text-sm">Fichier PDF</label>
      <input type="file" ref="fileInput" accept="application/pdf" required class="mb-4" />

      <label class="block mb-2 text-sm">Parent cible (UUID)</label>
      <input v-model="parentId" required class="input mb-6 w-full" />

      <div class="flex justify-end gap-2">
        <button type="button" @click="close" class="btn">Annuler</button>
        <button type="submit" class="btn btn-primary">Envoyer</button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, defineExpose } from 'vue';
import { useDocumentStore } from '@/stores/documentStore';

const dialog = ref<HTMLDialogElement>();
const name = ref('');
const parentId = ref('');
const fileInput = ref<HTMLInputElement>();
const store = useDocumentStore();

function open() {
  dialog.value?.showModal();
}
function close() {
  dialog.value?.close();
  name.value = '';
  parentId.value = '';
  if (fileInput.value) fileInput.value.value = '';
}
async function submit() {
  const file = fileInput.value?.files?.[0];
  if (!file) return;
  const data = new FormData();
  data.append('file', file);
  data.append('data', JSON.stringify({ name: name.value, parentId: parentId.value }));
  await store.uploadConsent(data);
  await store.fetchSecretary();
  close();
}

defineExpose({ open });
</script>

<style scoped>
.input { @apply border rounded w-full p-2; }
.btn { @apply px-3 py-1 rounded; }
.btn-primary { @apply bg-blue-600 text-white; }
</style>

// ===============================
// views/SecretaryConsentsView.vue
// ===============================
<template>
  <section class="p-6">
    <h1 class="text-2xl font-bold mb-4">Consentements (Secrétaire)</h1>
    <button class="btn btn-primary mb-4" @click="modal.open()">+ Nouveau</button>

    <table class="w-full text-sm border">
      <thead>
        <tr class="bg-gray-100">
          <th class="p-2">Nom</th>
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
          <td>
            <button v-if="c.status === 'SECRETARY_PENDING'" @click="sign(c.id)" class="btn">Signer</button>
          </td>
        </tr>
      </tbody>
    </table>

    <ConsentUploadModal ref="modal" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useDocumentStore } from '@/stores/documentStore';
import ConsentUploadModal from '@/components/ConsentUploadModal.vue';

const store = useDocumentStore();
const modal = ref<InstanceType<typeof ConsentUploadModal>>();

onMounted(() => store.fetchSecretary());

async function sign(id: string) {
  const url = await store.getSignUrl(id);
  window.open(url, '_blank');
}
</script>

// ===============================
// views/ParentConsentsView.vue
// ===============================
<template>
  <section class="p-6">
    <h1 class="text-2xl font-bold mb-4">Mes consentements</h1>
    <table class="w-full text-sm border">
      <thead>
        <tr class="bg-gray-100">
          <th class="p-2">Nom</th>
          <th>Status</th>
          <th>Date</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in store.parentConsents" :key="c.id" class="border-t">
          <td class="p-2">{{ c.name }}</td>
          <td>{{ c.status }}</td>
          <td>{{ new Date(c.createdAt).toLocaleDateString() }}</td>
          <td>
            <button
              v-if="c.status === 'PARENT_PENDING'"
              @click="sign(c.id)"
              class="btn"
            >Signer</button>
            <a
              v-else-if="c.status === 'COMPLETED' && c.signedPath"
              :href="API + '/' + c.signedPath"
              class="text-blue-600 underline"
              target="_blank"
              >Télécharger</a
            >
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useDocumentStore } from '@/stores/documentStore';

const store = useDocumentStore();
const API = import.meta.env.VITE_API_URL || '/api';

onMounted(() => store.fetchParent());

async function sign(id: string) {
  const url = await store.getSignUrl(id);
  window.open(url, '_blank');
}
</script>
