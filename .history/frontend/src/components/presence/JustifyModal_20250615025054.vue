<template>
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="onClose"
    >
      <div class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 overflow-hidden">
        <!-- En-tête -->
        <header class="px-6 py-4 border-b">
          <h2 class="text-lg font-semibold">
            Justifier {{ record.child.firstName }} {{ record.child.lastName }}
          </h2>
        </header>
  
        <!-- Contenu -->
        <section class="px-6 py-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Date de justificatif
            </label>
            <input
              type="date"
              v-model="form.justificationDate"
              :max="today"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Motif / Commentaire
            </label>
            <input
              type="text"
              v-model="form.motif"
              placeholder="Ex. certificat médical"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Justificatif (facultatif)
            </label>
            <input
              type="file"
              @change="onFileChange"
              class="mt-1 block w-full"
            />
          </div>
        </section>
  
        <!-- Pied de page -->
        <footer class="px-6 py-4 border-t flex justify-end space-x-2">
          <button
            type="button"
            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            @click="onClose"
          >
            Annuler
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            :disabled="submitting"
            @click="onSubmit"
          >
            {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </footer>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { defineProps, defineEmits } from 'vue';
  
  const props = defineProps<{ record: { id: number; child: { firstName: string; lastName: string } } }>();
  const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'submit', payload: { recordId: number; justificationDate: string; motif: string; file?: File }): void;
  }>();
  
  const today = new Date().toISOString().substr(0, 10);
  const form = ref({ justificationDate: today, motif: '' });
  const file = ref<File | null>(null);
  const submitting = ref(false);
  
  function onFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    file.value = target.files?.[0] ?? null;
  }
  
  function onClose() {
    emit('close');
  }
  
  async function onSubmit() {
    submitting.value = true;
    await emit('submit', {
      recordId: props.record.id,
      justificationDate: form.value.justificationDate,
      motif: form.value.motif,
      file: file.value ?? undefined,
    });
    submitting.value = false;
  }
  </script>
  
  <style scoped>
  /* Tout est en Tailwind CSS, pas de styles personnalisés nécessaires */
  </style>
  