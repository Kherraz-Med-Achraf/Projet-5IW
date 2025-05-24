<template>
  <div class="register-container">
    <TheStepper
      :currentStep
      :steps="[
        {
          title: 'Informations du parent',
        },
        {
          title: 'Informations de l’enfant',
        },
        {
          title: 'Création du compte',
        },
      ]"
      @update:currentStep="(step) => handleStepChange(step)"
    />
    <RouterView v-slot="{ Component }">
      <transition name="step" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>
  </div>
</template>

<script setup>
import TheStepper from "../ui/TheStepper.vue";
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const currentStep = ref(1);
const router = useRouter();

const handleStepChange = (step) => {
  currentStep.value = step;
  console.log(`Current step changed to: ${step}`);
  const routes = {
    1: "/dev/step-one",
    2: "/dev/step-two",
    3: "/dev/step-three",
  };

  if (routes[step]) {
    router.push(routes[step]);
  }
};
</script>

<style lang="scss" scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #f8fafc;
}
.step-enter-active,
.step-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
}

.step-leave-to {
  opacity: 0;
  transform: translateX(-50px) scale(0.95);
}

.step-enter-to,
.step-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
}
</style>
