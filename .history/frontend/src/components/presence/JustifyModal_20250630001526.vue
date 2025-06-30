<template>
    <div class="modal-overlay" @click.self="onClose">
      <div class="modal-content">
        <!-- En-tête -->
        <div class="modal-header">
          <h4>
            <i class="material-icons">edit</i>
            Justifier {{ record.child.firstName }} {{ record.child.lastName }}
          </h4>
          <button class="close-btn" @click="onClose">×</button>
        </div>
  
        <!-- Contenu -->
        <div class="modal-body">
          <form @submit.prevent="onSubmit">
            <div class="form-group">
              <label>Type</label>
              <select v-model="form.type" required>
                <option value="ABSENCE">Absence</option>
                <option value="LATENESS">Retard</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Date de justificatif</label>
              <input
                type="date"
                v-model="form.justificationDate"
                :max="today"
                required
              />
            </div>
            
            <div class="form-group">
              <label>Motif / Commentaire</label>
              <input
                type="text"
                v-model="form.motif"
                placeholder="Ex. certificat médical"
              />
            </div>
            
            <div class="form-group">
              <label>Justificatif (facultatif)</label>
              <input
                type="file"
                @change="onFileChange"
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="onClose">
                Annuler
              </button>
              <button type="submit" class="btn-primary" :disabled="submitting">
                {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </form>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { defineProps, defineEmits } from 'vue';
  
  interface RecordProp {
    id: number;
    child: { firstName: string; lastName: string };
  }
  
  const props = defineProps<{ record: RecordProp }>();
  const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'submit', payload: {
      recordId: number;
      type: 'ABSENCE' | 'LATENESS';
      justificationDate: string;
      motif: string;
      file?: File;
    }): void;
  }>();
  
  const today = new Date().toISOString().substr(0, 10);
  const form = ref({
    type: 'ABSENCE' as 'ABSENCE' | 'LATENESS',
    justificationDate: today,
    motif: '',
  });
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
      type: form.value.type,
      justificationDate: form.value.justificationDate,
      motif: form.value.motif,
      file: file.value ?? undefined,
    });
    submitting.value = false;
  }
  </script>
  
  <style scoped>
  /* Force le positionnement correct de la modale */
  .fixed {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    z-index: 9999 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  
  /* Assure que la modale reste centrée */
  .fixed > div {
    position: relative !important;
    max-height: 90vh !important;
    overflow-y: auto !important;
  }
  </style>
  