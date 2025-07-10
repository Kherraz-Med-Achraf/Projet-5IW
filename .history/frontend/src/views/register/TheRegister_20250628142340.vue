<template>
  <div class="register-container">
    <TheStepper
      :currentStep="currentStep"
      :steps="[
        { title: 'Informations du parent' },
        { title: 'Informations de l\'enfant' },
        { title: 'Création du compte' },
      ]"
      @update:currentStep="handleStepChange"
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
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useRegisterStore } from "@/stores/register";
import { useToast } from "vue-toastification";

const currentStep = ref(1);
const router = useRouter();
const route = useRoute();
const registerStore = useRegisterStore();
const toast = useToast();

// Fonction pour mettre à jour currentStep selon la route
const updateCurrentStepFromRoute = () => {
  const path = router.currentRoute.value.path;
  if (path.includes("step-one")) {
    currentStep.value = 1;
  } else if (path.includes("step-two")) {
    // Vérifier si on peut accéder à l'étape 2
    if (registerStore.canAccessStep(2)) {
      currentStep.value = 2;
    } else {
      toast.error("Veuillez d'abord compléter l'étape 1");
      router.push({ path: "/register/step-one", query: route.query });
      currentStep.value = 1;
    }
  } else if (path.includes("step-three")) {
    // Vérifier si on peut accéder à l'étape 3
    if (registerStore.canAccessStep(3)) {
      currentStep.value = 3;
    } else if (registerStore.canAccessStep(2)) {
      toast.error("Veuillez d'abord compléter l'étape 2");
      router.push({ path: "/register/step-two", query: route.query });
      currentStep.value = 2;
    } else {
      toast.error("Veuillez d'abord compléter l'étape 1");
      router.push({ path: "/register/step-one", query: route.query });
      currentStep.value = 1;
    }
  }
};

// Initialiser la navigation vers la première étape
onMounted(() => {
  updateCurrentStepFromRoute();

  // Si on est sur /register sans étape spécifique, aller à step-one
  if (router.currentRoute.value.path === "/register") {
    router.push({ path: "/register/step-one", query: route.query });
  }
});

// Surveiller les changements de route pour mettre à jour currentStep
watch(() => router.currentRoute.value.path, updateCurrentStepFromRoute);

const handleStepChange = (step) => {
  // Vérifier si on peut accéder à cette étape
  if (!registerStore.canAccessStep(step)) {
    if (step === 2) {
      toast.error("Veuillez d'abord compléter l'étape 1");
    } else if (step === 3) {
      if (!registerStore.isStepOneComplete()) {
        toast.error("Veuillez d'abord compléter l'étape 1");
      } else {
        toast.error("Veuillez d'abord compléter l'étape 2");
      }
    }
    return;
  }

  currentStep.value = step;
  const routes = {
    1: "/register/step-one",
    2: "/register/step-two",
    3: "/register/step-three"
  };

  if (routes[step]) {
    router.push({ path: routes[step], query: route.query });
  }
};

// Vérifier la présence d'un token d'invitation à l'arrivée sur la page
onMounted(async () => {
  const token = route.query.token;
  if (token) {
    await registerStore.validateToken(token);
  }
});
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
