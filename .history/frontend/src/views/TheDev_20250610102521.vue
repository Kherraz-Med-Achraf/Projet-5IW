<template>
  <div class="dev-container">
    <div class="dev-content">
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
        @update:currentStep="step => currentStep = step"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import TheStepper from "./ui/TheStepper.vue";

const message = ref("Hello from Developer page!");

let currentStep = ref(1);

onMounted(() => {
  console.log("TheDev component mounted");
});
</script>

<style lang="scss" scoped>
.dev-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
  .dev-content {
    width: 100%;
  }
  h1 {
    color: #2c3e50;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.1rem;
    color: #666;
  }
}
</style>
