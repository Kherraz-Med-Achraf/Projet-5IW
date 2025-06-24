<script setup lang="ts">
import { RouterView, useRoute } from "vue-router";
import ChatWidget from "@/components/chat/ChatWidget.vue";

const route = useRoute();
</script>

<template>
  <RouterView v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </RouterView>
  <ChatWidget v-if="route.name !== 'Chat'" />
</template>

<style scoped lang="scss">
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
