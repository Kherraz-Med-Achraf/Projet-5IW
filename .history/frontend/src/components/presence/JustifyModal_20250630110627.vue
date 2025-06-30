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
              <label>Motif / Commentaire *</label>
              <input
                type="text"
                v-model="form.motif"
                placeholder="Ex. certificat médical"
                :required="form.type === 'ABSENCE'"
              />
              <small v-if="form.type === 'ABSENCE'" class="field-note">
                * Motif obligatoire pour les absences
              </small>
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
  
  <style scoped lang="scss">
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    overflow: hidden;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    animation: modalAppear 0.3s ease-out;
  }

  @keyframes modalAppear {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #4444ac;
    color: white;

    h4 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .material-icons {
        font-size: 1.4rem;
      }
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.8);
      padding: 0.25rem;
      border-radius: 4px;
      transition: all 0.2s ease;
      line-height: 1;

      &:hover {
        color: white;
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }

  .modal-body {
    padding: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;

    label {
      display: block;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    input, select {
      width: 100%;
      padding: 0.875rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.2s ease;
      background: white;

      &:focus {
        outline: none;
        border-color: #4444ac;
        box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
      }
    }

    input[type="file"] {
      padding: 0.5rem;
      border: 2px dashed #d1d5db;
      background: #f9fafb;
      
      &:hover {
        border-color: #4444ac;
        background: #f3f4f6;
      }
    }
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn-secondary, .btn-primary {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.925rem;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 2px solid #e5e7eb;

    &:hover:not(:disabled) {
      background: #e5e7eb;
      border-color: #d1d5db;
    }
  }

  .btn-primary {
    background: #4444ac;
    color: white;
    border: 2px solid transparent;

    &:hover:not(:disabled) {
      background: #3333a0;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
    }
  }

  /* ───── Responsive ───── */
  @media (max-width: 640px) {
    .modal-content {
      width: 95%;
      margin: 1rem;
    }

    .modal-header {
      padding: 1rem;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .form-actions {
      flex-direction: column;
    }
  }
  </style>
  