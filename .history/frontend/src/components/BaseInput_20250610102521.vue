<template>
  <div class="base-input">
    <label class="base-input__label">{{ label }}</label>
    <input
      class="base-input__field"
      :class="{ 'base-input__field--error': error }"
      :type="type"
      :value="modelValue"
      :disabled="disabled"
      :required="!disabled"
      @input="
        $emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
    />
    <div v-if="error" class="base-input__error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string;
  label: string;
  type?: string;
  disabled?: boolean;
  error?: string;
}

defineProps<Props>();
defineEmits<{
  "update:modelValue": [value: string];
}>();
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
