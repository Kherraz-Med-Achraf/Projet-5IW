<template>
  <div class="stepper">
    <div class="stepper-header">
      <template v-for="(step, index) in steps" :key="index">
        <!-- Show separator BEFORE the step, except the first -->
        <span
          v-if="index > 0"
          class="material-symbols-outlined step-separator"
          :class="{
            completed: currentStep > index,
          }"
        >
          arrow_forward_ios
        </span>
        <div
          class="step"
          :class="{
            active: currentStep === index + 1,
            completed: currentStep > index + 1,
            disabled: !canAccessStep(index + 1),
          }"
          @click="() => handleStepClick(index + 1)"
        >
          <div class="step-number">
            <span v-if="currentStep > index + 1">✓</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div class="step-title">{{ step.title }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useRegisterStore } from "@/stores/register";

const registerStore = useRegisterStore();

const props = defineProps({
  currentStep: {
    type: Number,
    default: 1,
    validator: (value) => value >= 1 && value <= 3,
  },
  steps: {
    type: Array,
    default: () => [
      { title: "Étape 1" },
      { title: "Étape 2" },
      { title: "Étape 3" },
    ],
  },
});

const emit = defineEmits(["update:currentStep"]);

const canAccessStep = (step) => {
  return registerStore.canAccessStep(step);
};

const handleStepClick = (step) => {
  if (canAccessStep(step)) {
    emit("update:currentStep", step);
  }
};
</script>

<style lang="scss" scoped>
.stepper {
  width: 100%;
  max-width: 850px;
  height: fit-content;
  margin: 32px auto;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  &-header {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 100%;
    padding: 0px 8px;
  }
  .material-symbols-outlined {
    font-variation-settings: "FILL" 0, "wght" 100, "GRAD" 0, "opsz" 24;
    color: #e0e0e0;
  }
  .step-separator {
    font-size: 32px;
    transition: color 0.3s ease;
    &.active {
      color: #3b82f6;
    }
    &.completed {
      color: #4caf50;
    }
  }
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  gap: 10px;
  flex: 1;
  border-right: none;
  padding: 16px 0;
  cursor: pointer;

  &.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  &-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #e0e0e0;
    color: #757575;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    transition: all 0.3s ease;
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    
    .step.active & {
      background-color: #3b82f6;
      color: white;
    }

    .step.completed & {
      background-color: #4caf50;
      color: white;
    }
  }

  &-title {
    font-size: 0.875rem;
    color: #757575;
    text-align: center;
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    .step.active & {
      color: #3b82f6;
      font-weight: 600;
    }

    .step.completed & {
      color: #4caf50;
    }
  }

  &-line {
    position: absolute;
    top: 20px;
    left: 50px;
    width: 100px;
    height: 2px;
    background-color: #e0e0e0;

    .step.completed & {
      background-color: #4caf50;
    }
  }
}

.step-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (min-width: 768px) {
  .stepper {
    &-header {
      padding: 0;
    }
  }
  .step {
    flex-direction: row;
    justify-content: center;
    padding: 16px 24px;
  }
}
</style>
