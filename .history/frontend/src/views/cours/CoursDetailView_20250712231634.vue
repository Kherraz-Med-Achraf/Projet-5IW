<template>
  <div class="cours-detail-wrapper">
    <!-- Cours de Français -->
    <CoursFrancais v-if="matiere === 'francais'" />
    
    <!-- Cours de Communication -->
    <CoursCommunication v-else-if="matiere === 'communication'" />
    
    <!-- Cours de Mathématiques -->
    <CoursMathematiques v-else-if="matiere === 'math'" />
    
    <!-- Autres cours (placeholders pour l'instant) -->
    <div v-else class="cours-placeholder">
      <PageHeader
        :title="`Cours de ${getMatiereTitle(matiere)}`"
        subtitle="Contenu en cours de développement"
        icon="construction"
      />
      <div class="placeholder-content">
        <i class="material-icons">build</i>
        <p>Ce cours sera bientôt disponible !</p>
        <button @click="goBack" class="back-btn">
          <i class="material-icons">arrow_back</i>
          Retour aux cours
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import CoursFrancais from '@/components/cours/CoursFrancais.vue'
import CoursCommunication from '@/components/cours/CoursCommunication.vue'
import CoursMathematiques from '@/components/cours/CoursMathematiques.vue'

const route = useRoute()
const router = useRouter()

const matiere = route.params.matiere as string

function getMatiereTitle(matiere: string): string {
  const titles: Record<string, string> = {
    francais: 'Français',
    math: 'Mathématiques',
    emotion: 'Émotion',
    wouf: 'Wouf',
    communication: 'Communication'
  }
  return titles[matiere] || matiere
}

function goBack() {
  router.push({ name: 'MesCours' })
}
</script>

<style scoped lang="scss">
.cours-detail-wrapper {
  min-height: 100vh;
  background: #ffffff;
}

.cours-placeholder {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  
  .placeholder-content {
    text-align: center;
    background: white;
    padding: 3rem;
    border-radius: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    
    i {
      font-size: 4rem;
      color: #6b7280;
      margin-bottom: 1rem;
    }
    
    p {
      font-size: 1.2rem;
      color: #6b7280;
      margin-bottom: 2rem;
    }
    
    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #4444ac;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background: #3a3a96;
        transform: translateY(-2px);
      }
    }
  }
}
</style> 