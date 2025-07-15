<template>
  <div class="base-input">
    <label :for="inputId" class="base-input__label">{{ label }}</label>
    <input
      :id="inputId"
      class="base-input__field"
      :class="{ 'base-input__field--error': error }"
      :type="type"
      :value="modelValue"
      :disabled="disabled"
      :required="!disabled"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      @input="
        $emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
    />
    <div 
      v-if="error" 
      :id="`${inputId}-error`"
      class="base-input__error"
      role="alert"
      aria-live="polite"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue?: string;
  label: string;
  type?: string;
  disabled?: boolean;
  error?: string;
}

const props = defineProps<Props>();
defineEmits<{
  "update:modelValue": [value: string];
}>();

// Générer un ID unique pour chaque instance
const inputId = computed(() => {
  return `input-${Math.random().toString(36).substr(2, 9)}`;
});
</script>

<style scoped lang="scss">
.base-input {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 1rem;
  &__label {
    font-size: 1rem;
    color: #374151;
    font-weight: 500;
  }
  &__field {
    padding: 10px;
    border: 1px solid $border-color;
    border-radius: 4px;
    font-size: 1rem;
    background: #fff;
    color: #111827;
    transition: border-color 0.2s;
    &:focus {
      border-color: $border-color-focus;
      outline: none;
    }
    &:disabled {
      background: #f3f4f6;
      color: #9ca3af;
      cursor: not-allowed;
    }
  }
  &__field--error {
    border-color: #e53e3e !important;
  }
  &__error {
    font-family: $main-font-family;
    color: #e53e3e;
    font-size: 0.92rem;
    margin-top: 2px;
    font-weight: 400;
  }
}
</style>
