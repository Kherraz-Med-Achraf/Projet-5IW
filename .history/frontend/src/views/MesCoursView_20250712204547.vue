<template>
  <div class="mes-cours-wrapper">
    <!-- Skip links pour navigation rapide -->
    <div class="skip-links">
      <a href="#sidebar-nav" class="skip-link">Aller à la navigation</a>
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#cours-grid" class="skip-link">Aller aux cours</a>
    </div>

    <main class="profile-container" role="main" lang="fr">
      <div class="profile-content" id="main-content">
        <div class="content-grid">
          <!-- Page Header -->
          <PageHeader
            title="Mes cours"
            subtitle="Découvre tes différents cours et matières"
            icon="school"
          />

          <!-- Section des cours -->
          <section class="profile-section" id="cours-grid">
            <div class="section-header">
              <h2>
                <i class="material-icons" aria-hidden="true">library_books</i>
                Mes matières
              </h2>
            </div>
            <div class="section-content">
              <div class="cours-grid">
                <!-- Français -->
                <div class="cours-card francais" @click="goToCours('francais')" role="button" tabindex="0" @keydown.enter="goToCours('francais')" @keydown.space="goToCours('francais')">
                  <div class="cours-icon">
                    <i class="material-icons">menu_book</i>
                  </div>
                  <div class="cours-content">
                    <h3>Français</h3>
                    <p>Lecture, écriture et expression</p>
                  </div>
                  <div class="cours-arrow">
                    <i class="material-icons">arrow_forward</i>
                  </div>
                </div>

                <!-- Math -->
                <div class="cours-card math" @click="goToCours('math')" role="button" tabindex="0" @keydown.enter="goToCours('math')" @keydown.space="goToCours('math')">
                  <div class="cours-icon">
                    <i class="material-icons">calculate</i>
                  </div>
                  <div class="cours-content">
                    <h3>Mathématiques</h3>
                    <p>Nombres, calculs et logique</p>
                  </div>
                  <div class="cours-arrow">
                    <i class="material-icons">arrow_forward</i>
                  </div>
                </div>

                <!-- Émotion -->
                <div class="cours-card emotion" @click="goToCours('emotion')" role="button" tabindex="0" @keydown.enter="goToCours('emotion')" @keydown.space="goToCours('emotion')">
                  <div class="cours-icon">
                    <i class="material-icons">mood</i>
                  </div>
                  <div class="cours-content">
                    <h3>Émotion</h3>
                    <p>Comprendre et exprimer ses sentiments</p>
                  </div>
                  <div class="cours-arrow">
                    <i class="material-icons">arrow_forward</i>
                  </div>
                </div>

                <!-- Wouf -->
                <div class="cours-card wouf" @click="goToCours('wouf')" role="button" tabindex="0" @keydown.enter="goToCours('wouf')" @keydown.space="goToCours('wouf')">
                  <div class="cours-icon">
                    <i class="material-icons">pets</i>
                  </div>
                  <div class="cours-content">
                    <h3>Wouf</h3>
                    <p>Découverte et amusement</p>
                  </div>
                  <div class="cours-arrow">
                    <i class="material-icons">arrow_forward</i>
                  </div>
                </div>

                <!-- Waf -->
                <div class="cours-card waf" @click="goToCours('waf')" role="button" tabindex="0" @keydown.enter="goToCours('waf')" @keydown.space="goToCours('waf')">
                  <div class="cours-icon">
                    <i class="material-icons">favorite</i>
                  </div>
                  <div class="cours-content">
                    <h3>Waf</h3>
                    <p>Créativité et expression libre</p>
                  </div>
                  <div class="cours-arrow">
                    <i class="material-icons">arrow_forward</i>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'vue-toastification'
import PageHeader from '@/components/PageHeader.vue'

const toast = useToast()

function goToCours(matiere: string) {
  // Pour l'instant, afficher un message
  const matiereNames: Record<string, string> = {
    francais: 'Français',
    math: 'Mathématiques', 
    emotion: 'Émotion',
    wouf: 'Wouf',
    waf: 'Waf'
  }
  
  toast.info(`Bienvenue dans le cours de ${matiereNames[matiere]} ! 🎓`)
  
  // TODO: Ici on pourrait naviguer vers des sous-pages spécifiques
  // router.push({ name: 'CoursDetail', params: { matiere } })
}
</script>

<style scoped lang="scss">
/* Skip links pour navigation rapide */
.skip-links {
  position: absolute;
  top: -40px;
  left: 6px;
  z-index: 1000;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #4444ac;
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
  transition: top 0.3s;

  &:focus {
    top: 6px;
  }
}

/* Structure principale */
.profile-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 2rem 0;
  font-family: "Satoshi", -apple-system, BlinkMacSystemFont, "Segoe UI",
    system-ui, sans-serif;
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

/* Section identique aux autres pages */
.profile-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
}

.section-header {
  background: #4444ac;
  margin: -1.5rem -1.5rem 2rem -1.5rem;
  padding: 1.5rem;
  border-radius: 0.75rem 0.75rem 0 0;
  width: calc(100% + 3rem);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.section-header h2 {
  margin: 0;
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: "Satoshi", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    sans-serif;
}

.section-header h2 i {
  color: white;
  font-size: 1.5rem;
}

.section-content {
  border-radius: 0 0 1.5rem 1.5rem;
  margin: 0 -2rem -2rem -2rem;
  padding: 2rem;
  background: white;
}

/* Grille des cours */
.cours-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.cours-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 1rem;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  &:focus {
    outline: 3px solid #fbbf24;
    outline-offset: 2px;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &.francais {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-color: #f59e0b;
    
    .cours-icon {
      background: #f59e0b;
      color: white;
    }
  }

  &.math {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    border-color: #3b82f6;
    
    .cours-icon {
      background: #3b82f6;
      color: white;
    }
  }

  &.emotion {
    background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
    border-color: #ec4899;
    
    .cours-icon {
      background: #ec4899;
      color: white;
    }
  }

  &.wouf {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    border-color: #10b981;
    
    .cours-icon {
      background: #10b981;
      color: white;
    }
  }

  &.waf {
    background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
    border-color: #8b5cf6;
    
    .cours-icon {
      background: #8b5cf6;
      color: white;
    }
  }
}

.cours-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  i {
    font-size: 2rem;
  }
}

.cours-content {
  flex: 1;
  
  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }
  
  p {
    margin: 0;
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.4;
  }
}

.cours-arrow {
  color: #6b7280;
  transition: transform 0.3s ease;
  
  .cours-card:hover & {
    transform: translateX(4px);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .profile-container {
    padding: 1rem 0;
  }
  
  .profile-content {
    padding: 0 0.5rem;
  }
  
  .cours-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .cours-card {
    padding: 1rem;
  }
  
  .cours-icon {
    width: 3rem;
    height: 3rem;
    
    i {
      font-size: 1.5rem;
    }
  }
}</style> 