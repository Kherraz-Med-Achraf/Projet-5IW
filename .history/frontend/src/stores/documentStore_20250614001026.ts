// ============================================================
// stores/documentStore.ts (corrigé)
// ============================================================
import { defineStore } from 'pinia';

export interface Consent {
  id: string;
  name: string;
  status: 'SECRETARY_PENDING' | 'PARENT_PENDING' | 'COMPLETED' | 'CANCELED';
  createdAt: string;
  signedPath?: string | null;
}

const API = import.meta.env.VITE_API_URL ?? '/api';

export const useDocumentStore = defineStore('document', {
  state: () => ({
    secretaryConsents: [] as Consent[],
    parentConsents: [] as Consent[],
    loading: false,
  }),
  getters: {
    isLoading: (s) => s.loading,
  },
  actions: {
    async fetchSecretary(page = 1) {
      this.loading = true;
      try {
        const res = await fetch(`${API}/documents/consents/secretary?page=${page}`);
        if (!res.ok) throw new Error(await res.text());
        this.secretaryConsents = (await res.json()) as Consent[];
      } finally {
        this.loading = false;
      }
    },
    async fetchParent(page = 1) {
      this.loading = true;
      try {
        const res = await fetch(`${API}/documents/consents/parent?page=${page}`);
        if (!res.ok) throw new Error(await res.text());
        this.parentConsents = (await res.json()) as Consent[];
      } finally {
        this.loading = false;
      }
    },
    async uploadConsent(formData: FormData) {
      const res = await fetch(`${API}/documents/consents`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ consentId: string; signUrl: string }>;
    },
    async getSignUrl(id: string) {
      const res = await fetch(`${API}/documents/consents/${id}/sign-url`);
      if (!res.ok) throw new Error(await res.text());
      const { signUrl } = (await res.json()) as { signUrl: string };
      return signUrl;
    },
  },
});

// ============================================================
// components/ConsentUploadModal.vue (corrigé)
// ============================================================
<template>
  <dialog ref="dialog" class="p-6 bg-white rounded-xl shadow-xl w-96">
    <form @submit.prevent="submit" class="space-y-4">
      <h2 class="text-xl font-semibold">Nouveau consentement</h2>

      <div>
        <label class="block mb-1 text-sm font-medium">Nom du document</label>
        <input v-model="name" required class="input w-full" />
      </div>

      <div>
        <label class="block mb-1 text-sm font-medium">Fichier PDF</label>
        <input type="file" ref="fileInput" accept="application/pdf" required />
      </div>

      <div>
        <label class="block mb-1 text-sm font-medium">ID du parent (UUID)</label>
        <input v-model="parentId" required class="input w-full" />
      </div>

      <div class="flex justify-end gap-2 pt-4">
        <button type="button" @click="close" class="btn">Annuler</button>
        <button type="submit" class="btn btn-primary">Envoyer</button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, defineExpose } from 'vue';
import { useDocumentStore } from '@/stores/documentStore';

const dialog = ref<HTMLDialogElement | null>(null);
const name = ref('');
const parentId = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
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
  const form = new FormData();
  form.append('file', file);
  form.append('data', JSON.stringify({ name: name.value, parentId: parentId.value }));
  await store.uploadConsent(form);
  await store.fetchSecretary();
  close();
}

defineExpose({ open });
</script>

<style scoped>
.input {
  @apply border rounded w-full px-2 py-1 shadow-sm;
}
.btn {
  @apply px-3 py-1 rounded border;
}
.btn-primary {
  @apply bg-blue-600 text-white;
}
</style>

// ============================================================
// views/SecretaryConsentsView.vue (corrigé)
// ============================================================
<template>
  <section class="p-6 space-y-4">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Consentements (Secrétaire)</h1>
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
          <td>
            <button
              v-if="c.status === 'SECRETARY_PENDING'"
              @click="sign(c.id)"
              class="btn"
            >Signer</button>
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

onMounted(() => store.fetchSecretary());

async function sign(id: string) {
  const url = await store.getSignUrl(id);
  window.open(url, '_blank');
}
</script>

// ============================================================
// views/ParentConsentsView.vue (corrigé)
// ============================================================
<template>
  <section class="p-6 space-y-4">
    <h1 class="text-2xl font-bold mb-2">Mes consentements</h1>

    <table v-if="store.parentConsents.length" class="w-full text-sm border">
      <thead class="bg-gray-100">
        <tr>
          <th class="p-2 text-left">Nom</th>
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
              :href="`${API}/${c.signedPath}`"
              class="text-blue-600 underline"
              target="_blank"
            >Télécharger</a>
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
const API = import.meta.env.VITE_API_URL ?? '/api';

onMounted(() => store.fetchParent());

async function sign(id: string) {
  const url = await store.getSignUrl(id);
  window.open(url, '_blank');
}
</script>
