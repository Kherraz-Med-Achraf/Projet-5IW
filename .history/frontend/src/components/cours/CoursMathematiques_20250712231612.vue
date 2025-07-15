<template>
  <div class="cours-mathematiques">
    <!-- Header avec progression -->
    <header class="cours-header">
      <button @click="goBack" class="back-btn" aria-label="Retour aux cours">
        <i class="material-icons">arrow_back</i>
      </button>
      <div class="cours-info">
        <h1>Cours de Mathématiques</h1>
        <p>Algèbre - Résolution d'équations (12 minutes)</p>
      </div>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
        <span class="progress-text">{{ currentStepIndex + 1 }}/{{ totalSteps }}</span>
      </div>
    </header>

    <!-- Contenu principal -->
    <main class="cours-content">
      <!-- Étape 1: Introduction interactive -->
      <section v-if="currentStep === 'introduction'" class="cours-section introduction" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">play_circle_filled</i>
              Introduction interactive
            </h2>
            <span class="duration">1 minute</span>
          </div>
          
          <div class="content">
            <div class="problem-scenario">
              <h3>🎮 Situation du problème</h3>
              <div class="scenario-card">
                <div class="scenario-visual">
                  <i class="material-icons scenario-icon">videogame_asset</i>
                </div>
                <div class="scenario-text">
                  <p class="scenario-description">
                    Tu gagnes <strong>2 étoiles</strong> par niveau et tu veux en avoir <strong>14</strong>.
                    Combien de niveaux dois-tu finir ?
                  </p>
                  <button @click="playScenario" class="audio-btn">
                    <i class="material-icons">volume_up</i>
                    Écouter le problème
                  </button>
                </div>
              </div>
            </div>

            <div class="variable-introduction">
              <h3>📦 Découvrons la variable</h3>
              <p>
                Nous allons appeler <strong>x</strong> le nombre de niveaux que tu dois finir.
                <strong>x</strong> est notre <em>variable</em> - comme une boîte mystère !
              </p>
              
              <div class="variable-visual">
                <div class="variable-box" @click="explainVariable">
                  <span class="variable-symbol">x</span>
                  <div class="variable-label">Variable (boîte mystère)</div>
                </div>
                <div class="equals-sign">=</div>
                <div class="question-mark">?</div>
              </div>
            </div>

            <div class="access-mode-selection">
              <h4>🎯 Choisis ton mode d'accès :</h4>
              <div class="mode-options">
                <div 
                  class="mode-option" 
                  :class="{ selected: selectedMode === 'scanning' }"
                  @click="selectMode('scanning')"
                >
                  <i class="material-icons">search</i>
                  <span>Mode scanning</span>
                  <p>Navigation automatique avec validation</p>
                </div>
                <div 
                  class="mode-option" 
                  :class="{ selected: selectedMode === 'tactile' }"
                  @click="selectMode('tactile')"
                >
                  <i class="material-icons">touch_app</i>
                  <span>Mode tactile</span>
                  <p>Sélection directe sur les boutons</p>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            v-if="selectedMode && introductionComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Voir l'expression
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 2: Illustration de la variable -->
      <section v-if="currentStep === 'expression'" class="cours-section expression" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">functions</i>
              Variable et expression
            </h2>
            <span class="duration">3 minutes</span>
          </div>
          
          <div class="content">
            <div class="expression-building">
              <h3>🔢 Construisons l'expression</h3>
              
              <div class="expression-parts">
                <div class="part-row">
                  <div class="part-title">Tu gagnes 2 étoiles par niveau :</div>
                  <div class="expression-part">
                    <div 
                      class="expression-element clickable"
                      :class="{ highlighted: scanningElement === 'coefficient' }"
                      @click="explainElement('coefficient')"
                    >
                      <span class="coefficient">2</span>
                      <span class="times">×</span>
                      <div class="variable-boxes">
                        <div class="var-box">x</div>
                      </div>
                    </div>
                    <div class="audio-btn-small" @click="playAudio('2x')">
                      <i class="material-icons">volume_up</i>
                    </div>
                  </div>
                </div>

                <div class="part-row">
                  <div class="part-title">Tu veux 14 étoiles au total :</div>
                  <div class="expression-part">
                    <div 
                      class="expression-element clickable"
                      :class="{ highlighted: scanningElement === 'equation' }"
                      @click="explainElement('equation')"
                    >
                      <span class="coefficient">2</span>
                      <span class="times">×</span>
                      <div class="var-box">x</div>
                      <span class="equals">=</span>
                      <span class="result">14</span>
                    </div>
                    <div class="audio-btn-small" @click="playAudio('2x = 14')">
                      <i class="material-icons">volume_up</i>
                    </div>
                  </div>
                </div>
              </div>

              <div class="balance-visual">
                <h4>⚖️ L'équation comme une balance</h4>
                <div class="balance-container">
                  <div class="balance-side left">
                    <div class="balance-content">
                      <span class="balance-text">2x</span>
                    </div>
                    <div class="balance-plate left-plate"></div>
                  </div>
                  <div class="balance-center">
                    <div class="balance-fulcrum"></div>
                    <div class="balance-base"></div>
                  </div>
                  <div class="balance-side right">
                    <div class="balance-content">
                      <span class="balance-text">14</span>
                    </div>
                    <div class="balance-plate right-plate"></div>
                  </div>
                </div>
                <p class="balance-explanation">
                  Une équation est comme une balance : les deux côtés doivent être égaux !
                </p>
              </div>
            </div>

            <div class="understanding-check">
              <h4>✅ Vérification de compréhension</h4>
              <div class="check-question">
                <p>Que représente <strong>x</strong> dans notre problème ?</p>
                <div class="check-options">
                  <button 
                    class="check-option" 
                    :class="{ selected: selectedCheck === 'levels' }"
                    @click="selectCheck('levels')"
                  >
                    Le nombre de niveaux
                  </button>
                  <button 
                    class="check-option" 
                    :class="{ selected: selectedCheck === 'stars' }"
                    @click="selectCheck('stars')"
                  >
                    Le nombre d'étoiles
                  </button>
                  <button 
                    class="check-option" 
                    :class="{ selected: selectedCheck === 'points' }"
                    @click="selectCheck('points')"
                  >
                    Le nombre de points
                  </button>
                </div>
                <div v-if="selectedCheck" class="check-feedback">
                  <p v-if="selectedCheck === 'levels'" class="correct">
                    ✅ Parfait ! x représente le nombre de niveaux à finir.
                  </p>
                  <p v-else class="incorrect">
                    ❌ Pas tout à fait. Relis le problème : x représente le nombre de niveaux.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            v-if="expressionComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Résoudre l'équation
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 3: Résolution pas à pas -->
      <section v-if="currentStep === 'resolution'" class="cours-section resolution" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">calculate</i>
              Résolution pas à pas
            </h2>
            <span class="duration">4 minutes</span>
          </div>
          
          <div class="content">
            <div class="equation-solving">
              <h3>🔍 Résolvons : 2x = 14</h3>
              
              <div class="solving-steps">
                <div class="step-container">
                  <div class="step-header">
                    <h4>Étape 1 : Diviser par 2</h4>
                    <p>Pour isoler x, nous devons diviser les deux côtés par 2</p>
                  </div>
                  
                  <div class="step-visual">
                    <div class="equation-line">
                      <div class="equation-part">
                        <span class="equation-text">2x</span>
                        <span class="operation" v-if="step1Revealed">÷ 2</span>
                      </div>
                      <span class="equals">=</span>
                      <div class="equation-part">
                        <span class="equation-text">14</span>
                        <span class="operation" v-if="step1Revealed">÷ 2</span>
                      </div>
                    </div>
                    
                    <div class="step-action">
                      <button 
                        v-if="!step1Revealed"
                        @click="revealStep1"
                        class="step-btn"
                      >
                        <i class="material-icons">touch_app</i>
                        Diviser par 2
                      </button>
                      <div v-else class="step-result">
                        <div class="result-equation">
                          <span class="result-text">x = 7</span>
                        </div>
                        <div class="result-audio">
                          <button @click="playAudio('x égale 7')" class="audio-btn">
                            <i class="material-icons">volume_up</i>
                            Écouter le résultat
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="step1Revealed" class="step-container verification">
                  <div class="step-header">
                    <h4>Étape 2 : Vérification</h4>
                    <p>Vérifions que notre solution est correcte</p>
                  </div>
                  
                  <div class="verification-visual">
                    <div class="verification-equation">
                      <span class="verification-text">2 × 7 = 14</span>
                      <button @click="playAudio('2 fois 7 égale 14')" class="audio-btn-small">
                        <i class="material-icons">volume_up</i>
                      </button>
                    </div>
                    
                    <div class="verification-check">
                      <button 
                        v-if="!verificationComplete"
                        @click="completeVerification"
                        class="verify-btn"
                      >
                        <i class="material-icons">check_circle</i>
                        Vérifier
                      </button>
                      <div v-else class="verification-success">
                        <i class="material-icons success-icon">check_circle</i>
                        <span>Correct ! La solution est x = 7</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="verificationComplete" class="balance-final">
                <h4>⚖️ Balance équilibrée</h4>
                <div class="balance-container balanced">
                  <div class="balance-side left">
                    <div class="balance-content">
                      <span class="balance-text">2 × 7 = 14</span>
                    </div>
                    <div class="balance-plate left-plate"></div>
                  </div>
                  <div class="balance-center">
                    <div class="balance-fulcrum"></div>
                    <div class="balance-base"></div>
                  </div>
                  <div class="balance-side right">
                    <div class="balance-content">
                      <span class="balance-text">14</span>
                    </div>
                    <div class="balance-plate right-plate"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            v-if="resolutionComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Faire des exercices
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 4: Exercices -->
      <section v-if="currentStep === 'exercices'" class="cours-section exercices" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">quiz</i>
              Exercices accessibles
            </h2>
            <span class="duration">2.5 minutes</span>
          </div>
          
          <div class="content">
            <!-- Exercice 1: Écriture assistée -->
            <div class="exercise-container">
              <h3>✏️ Exercice 1 : Résolution guidée</h3>
              <div class="exercise-problem">
                <h4>Résous : 3x = 15</h4>
                <p>Que dois-tu faire pour isoler x ?</p>
                
                <div class="solution-input">
                  <div class="input-section">
                    <label>Divise par :</label>
                    <input 
                      v-model="exercise1Answer"
                      type="number"
                      class="large-input"
                      placeholder="?"
                      @input="checkExercise1"
                    >
                  </div>
                  
                  <div class="solution-section">
                    <div class="solution-display">
                      <span>x = </span>
                      <span class="solution-value">{{ exercise1Result || '?' }}</span>
                    </div>
                  </div>
                </div>
                
                <div v-if="exercise1Feedback" class="exercise-feedback">
                  <div v-if="exercise1Correct" class="correct-feedback">
                    <i class="material-icons">check_circle</i>
                    <p>Parfait ! 3x ÷ 3 = 15 ÷ 3, donc x = 5</p>
                  </div>
                  <div v-else class="incorrect-feedback">
                    <i class="material-icons">help</i>
                    <p>Réfléchis : par quel nombre dois-tu diviser pour éliminer le 3 ?</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Exercice 2: Choix multiple -->
            <div class="exercise-container" v-if="exercise1Correct">
              <h3>🎯 Exercice 2 : Choix multiple</h3>
              <div class="exercise-problem">
                <h4>Laquelle de ces équations a pour solution x = 4 ?</h4>
                
                <div class="multiple-choice">
                  <div 
                    v-for="(option, index) in multipleChoiceOptions" 
                    :key="index"
                    class="choice-option"
                    :class="{ 
                      selected: selectedChoice === index,
                      correct: exercise2Answered && option.correct,
                      incorrect: exercise2Answered && selectedChoice === index && !option.correct
                    }"
                    @click="selectChoice(index)"
                  >
                    <div class="choice-content">
                      <div class="choice-equation">{{ option.equation }}</div>
                      <div class="choice-audio">
                        <button @click.stop="playAudio(option.equation)" class="audio-btn-small">
                          <i class="material-icons">volume_up</i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div v-if="exercise2Answered" class="exercise-feedback">
                  <div v-if="exercise2Correct" class="correct-feedback">
                    <i class="material-icons">check_circle</i>
                    <p>Excellent ! 2 × 4 + 3 = 11 ✓</p>
                  </div>
                  <div v-else class="incorrect-feedback">
                    <i class="material-icons">help</i>
                    <p>Vérifie en remplaçant x par 4 dans chaque équation</p>
                    <button @click="resetExercise2" class="retry-btn">
                      <i class="material-icons">refresh</i>
                      Réessayer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            v-if="exercicesComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Problème concret
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 5: Problème concret -->
      <section v-if="currentStep === 'probleme'" class="cours-section probleme" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">store</i>
              Problème en situation réelle
            </h2>
            <span class="duration">1.5 minutes</span>
          </div>
          
          <div class="content">
            <div class="real-problem">
              <h3>📚 Problème : Vente de BD</h3>
              
              <div class="problem-scenario">
                <div class="scenario-visual">
                  <i class="material-icons scenario-icon">menu_book</i>
                </div>
                <div class="scenario-content">
                  <p>
                    Un vendeur vend des BD à <strong>7€ chacune</strong> et reçoit <strong>84€</strong>.
                    Combien de BD a-t-il vendues ?
                  </p>
                  <button @click="playAudio('Un vendeur vend des BD à 7 euros chacune et reçoit 84 euros')" class="audio-btn">
                    <i class="material-icons">volume_up</i>
                    Écouter le problème
                  </button>
                </div>
              </div>
              
              <div class="equation-construction">
                <h4>🔧 Construis l'équation</h4>
                <div class="construction-area">
                  <div class="equation-builder">
                    <div class="builder-parts">
                      <div class="part price-part">
                        <div class="part-visual">
                          <span class="part-number">7</span>
                          <span class="part-unit">€</span>
                        </div>
                        <div class="part-label">Prix par BD</div>
                      </div>
                      <div class="part operator-part">
                        <span class="operator">×</span>
                      </div>
                      <div class="part variable-part">
                        <div class="part-visual">
                          <span class="part-variable">x</span>
                        </div>
                        <div class="part-label">Nombre de BD</div>
                      </div>
                      <div class="part equals-part">
                        <span class="operator">=</span>
                      </div>
                      <div class="part total-part">
                        <div class="part-visual">
                          <span class="part-number">84</span>
                          <span class="part-unit">€</span>
                        </div>
                        <div class="part-label">Total reçu</div>
                      </div>
                    </div>
                    
                    <div class="final-equation">
                      <strong>7x = 84</strong>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="problem-solution">
                <h4>💡 Résolution</h4>
                <div class="solution-steps">
                  <div class="solution-step">
                    <button 
                      v-if="!problemStep1"
                      @click="revealProblemStep1"
                      class="step-btn"
                    >
                      <i class="material-icons">calculate</i>
                      Diviser par 7
                    </button>
                    <div v-else class="step-result">
                      <div class="step-equation">7x ÷ 7 = 84 ÷ 7</div>
                      <div class="step-final">x = 12</div>
                    </div>
                  </div>
                  
                  <div v-if="problemStep1" class="solution-answer">
                    <div class="answer-display">
                      <i class="material-icons">check_circle</i>
                      <span>Le vendeur a vendu <strong>12 BD</strong> !</span>
                    </div>
                    <button @click="playAudio('Bravo, il a vendu 12 BD')" class="audio-btn">
                      <i class="material-icons">volume_up</i>
                      Écouter la réponse
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            v-if="problemeComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Synthèse finale
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 6: Synthèse -->
      <section v-if="currentStep === 'synthese'" class="cours-section synthese" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">summarize</i>
              Synthèse et outils mémos
            </h2>
            <span class="duration">0.5 minutes</span>
          </div>
          
          <div class="content">
            <div class="synthesis-summary">
              <h3>📋 Résumé de la méthode</h3>
              
              <div class="method-steps">
                <div class="method-step">
                  <div class="step-icon">
                    <i class="material-icons">help</i>
                  </div>
                  <div class="step-content">
                    <h4>1. Identifier</h4>
                    <p>Trouve ce que représente x dans le problème</p>
                  </div>
                </div>
                
                <div class="method-step">
                  <div class="step-icon">
                    <i class="material-icons">balance</i>
                  </div>
                  <div class="step-content">
                    <h4>2. Équilibrer</h4>
                    <p>Écris l'équation comme une balance</p>
                  </div>
                </div>
                
                <div class="method-step">
                  <div class="step-icon">
                    <i class="material-icons">calculate</i>
                  </div>
                  <div class="step-content">
                    <h4>3. Résoudre</h4>
                    <p>Isole x en divisant ou multipliant</p>
                  </div>
                </div>
                
                <div class="method-step">
                  <div class="step-icon">
                    <i class="material-icons">check_circle</i>
                  </div>
                  <div class="step-content">
                    <h4>4. Vérifier</h4>
                    <p>Remplace x par ta solution dans l'équation</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="key-concepts">
              <h3>🔑 Concepts clés</h3>
              <div class="concepts-grid">
                <div class="concept-card">
                  <div class="concept-icon">
                    <i class="material-icons">inbox</i>
                  </div>
                  <div class="concept-content">
                    <h4>Variable</h4>
                    <p>Une "boîte" qui contient un nombre inconnu</p>
                  </div>
                </div>
                
                <div class="concept-card">
                  <div class="concept-icon">
                    <i class="material-icons">balance</i>
                  </div>
                  <div class="concept-content">
                    <h4>Équation</h4>
                    <p>Une balance où les deux côtés sont égaux</p>
                  </div>
                </div>
                
                <div class="concept-card">
                  <div class="concept-icon">
                    <i class="material-icons">straighten</i>
                  </div>
                  <div class="concept-content">
                    <h4>Résolution</h4>
                    <p>Trouver la valeur de x qui rend l'équation vraie</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="congratulations">
              <div class="congrats-content">
                <i class="material-icons">celebration</i>
                <h3>🎉 Félicitations !</h3>
                <p>Tu as maîtrisé la résolution d'équations du premier degré !</p>
                <div class="achievement-display">
                  <div class="achievement-badge">
                    <i class="material-icons">emoji_events</i>
                    <span>Expert en algèbre</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="final-actions">
            <button @click="goBack" class="secondary-btn">
              <i class="material-icons">arrow_back</i>
              Retour aux cours
            </button>
            <button @click="restartCourse" class="next-btn">
              <i class="material-icons">refresh</i>
              Recommencer
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// État général
const currentStep = ref('introduction')
const selectedMode = ref<'scanning' | 'tactile' | null>(null)
const scanningElement = ref<string>('')

// États des étapes
const introductionComplete = ref(false)
const selectedCheck = ref<string>('')
const step1Revealed = ref(false)
const verificationComplete = ref(false)

// Exercices
const exercise1Answer = ref('')
const exercise1Result = ref<number | null>(null)
const exercise1Feedback = ref(false)
const exercise1Correct = ref(false)

const selectedChoice = ref<number | null>(null)
const exercise2Answered = ref(false)
const exercise2Correct = ref(false)

// Problème concret
const problemStep1 = ref(false)

// Options pour l'exercice à choix multiple
const multipleChoiceOptions = ref([
  { equation: '3x - 1 = 11', correct: true },
  { equation: '2x + 3 = 11', correct: true },
  { equation: '5x - 2 = 18', correct: true },
  { equation: '4x + 1 = 15', correct: false }
])

// Computed
const steps = ['introduction', 'expression', 'resolution', 'exercices', 'probleme', 'synthese']
const totalSteps = computed(() => steps.length)
const currentStepIndex = computed(() => steps.indexOf(currentStep.value))
const progressPercent = computed(() => (currentStepIndex.value / totalSteps.value) * 100)

const expressionComplete = computed(() => selectedCheck.value === 'levels')
const resolutionComplete = computed(() => verificationComplete.value)
const exercicesComplete = computed(() => exercise1Correct.value && exercise2Correct.value)
const problemeComplete = computed(() => problemStep1.value)

// Méthodes
function goBack() {
  router.push('/mes-cours')
}

function selectMode(mode: 'scanning' | 'tactile') {
  selectedMode.value = mode
  if (mode === 'scanning') {
    // Démarrer le scanning
    startScanning()
  }
  introductionComplete.value = true
}

function startScanning() {
  // Implémentation du scanning
  const elements = ['coefficient', 'equation', 'balance']
  let currentIndex = 0
  
  const scanInterval = setInterval(() => {
    scanningElement.value = elements[currentIndex]
    currentIndex = (currentIndex + 1) % elements.length
  }, 2000)
  
  // Arrêter le scanning après 10 secondes
  setTimeout(() => {
    clearInterval(scanInterval)
    scanningElement.value = ''
  }, 10000)
}

function nextStep() {
  const currentIndex = steps.indexOf(currentStep.value)
  if (currentIndex < steps.length - 1) {
    currentStep.value = steps[currentIndex + 1]
  }
}

function playScenario() {
  playAudio('Tu gagnes 2 étoiles par niveau et tu veux en avoir 14. Combien de niveaux dois-tu finir ?')
}

function playAudio(text: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    utterance.rate = 0.8
    utterance.pitch = 1.0
    speechSynthesis.speak(utterance)
  }
}

function explainVariable() {
  playAudio('x est notre variable, comme une boîte mystère qui contient le nombre que nous cherchons')
}

function explainElement(element: string) {
  const explanations = {
    coefficient: '2x signifie 2 fois x, c\'est-à-dire 2 étoiles par niveau',
    equation: '2x égale 14 signifie que 2 fois le nombre de niveaux doit donner 14 étoiles',
    balance: 'Une équation est comme une balance, les deux côtés doivent être égaux'
  }
  playAudio(explanations[element as keyof typeof explanations])
}

function selectCheck(option: string) {
  selectedCheck.value = option
}

function revealStep1() {
  step1Revealed.value = true
  playAudio('2x divisé par 2 égale 14 divisé par 2, donc x égale 7')
}

function completeVerification() {
  verificationComplete.value = true
  playAudio('2 fois 7 égale 14. Correct ! Notre solution est validée.')
}

function checkExercise1() {
  const answer = parseInt(exercise1Answer.value)
  exercise1Feedback.value = true
  
  if (answer === 3) {
    exercise1Correct.value = true
    exercise1Result.value = 5
    playAudio('Parfait ! 3x divisé par 3 égale 15 divisé par 3, donc x égale 5')
  } else {
    exercise1Correct.value = false
    exercise1Result.value = null
  }
}

function selectChoice(index: number) {
  selectedChoice.value = index
  exercise2Answered.value = true
  
  // Vérifier si l'option choisie est correcte
  const selectedOption = multipleChoiceOptions.value[index]
  
  // Pour cet exercice, on cherche x = 4
  // 2x + 3 = 11 → 2(4) + 3 = 8 + 3 = 11 ✓
  if (selectedOption.equation === '2x + 3 = 11') {
    exercise2Correct.value = true
    playAudio('Excellent ! 2 fois 4 plus 3 égale 11')
  } else {
    exercise2Correct.value = false
  }
}

function resetExercise2() {
  selectedChoice.value = null
  exercise2Answered.value = false
  exercise2Correct.value = false
}

function revealProblemStep1() {
  problemStep1.value = true
  playAudio('7x divisé par 7 égale 84 divisé par 7, donc x égale 12')
}

function restartCourse() {
  // Réinitialiser toutes les variables
  currentStep.value = 'introduction'
  selectedMode.value = null
  introductionComplete.value = false
  selectedCheck.value = ''
  step1Revealed.value = false
  verificationComplete.value = false
  exercise1Answer.value = ''
  exercise1Result.value = null
  exercise1Feedback.value = false
  exercise1Correct.value = false
  selectedChoice.value = null
  exercise2Answered.value = false
  exercise2Correct.value = false
  problemStep1.value = false
}
</script>

<style scoped lang="scss">
// Variables
$primary-color: #3b82f6;
$secondary-color: #f59e0b;
$success-color: #10b981;
$danger-color: #ef4444;
$background: #ffffff;

.cours-mathematiques {
  min-height: 100vh;
  background: $background;
  font-family: "Satoshi", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
}

// Header
.cours-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;

  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border: none;
    border-radius: 50%;
    background: $primary-color;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: darken($primary-color, 10%);
      transform: scale(1.05);
    }
  }

  .cours-info {
    flex: 1;
    text-align: center;
    margin: 0 2rem;

    h1 {
      margin: 0 0 0.25rem 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1f2937;
    }

    p {
      margin: 0;
      font-size: 0.875rem;
      color: #6b7280;
    }
  }

  .progress-container {
    display: flex;
    align-items: center;
    gap: 1rem;

    .progress-bar {
      width: 8rem;
      height: 0.5rem;
      background: #e5e7eb;
      border-radius: 1rem;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, $primary-color, $secondary-color);
        transition: width 0.5s ease;
        border-radius: 1rem;
      }
    }

    .progress-text {
      font-size: 0.875rem;
      font-weight: 600;
      color: $primary-color;
      min-width: 3rem;
    }
  }
}

// Contenu principal
.cours-content {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.section-card {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
}

.section-header {
  background: linear-gradient(135deg, $primary-color, darken($primary-color, 10%));
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.75rem;

    i {
      font-size: 1.75rem;
    }
  }

  .duration {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.875rem;
    font-weight: 500;
  }
}

.content {
  padding: 2rem;
  background: white;
}

// Boutons
.next-btn, .secondary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border: none;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 2rem auto 0;
  min-width: 12rem;

  &:hover {
    transform: translateY(-2px);
  }
}

.next-btn {
  background: linear-gradient(135deg, $success-color, darken($success-color, 10%));
  color: white;

  &:hover {
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
  }
}

.secondary-btn {
  background: #f3f4f6;
  color: #374151;
  border: 2px solid #e5e7eb;

  &:hover {
    background: #e5e7eb;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

// Section Introduction
.problem-scenario {
  margin: 2rem 0;
}

.scenario-card {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-radius: 1rem;
  border: 2px solid $primary-color;
  
  .scenario-visual {
    .scenario-icon {
      font-size: 4rem;
      color: $primary-color;
    }
  }
  
  .scenario-text {
    flex: 1;
    
    .scenario-description {
      font-size: 1.2rem;
      line-height: 1.6;
      color: #1f2937;
      margin-bottom: 1rem;
    }
  }
}

.audio-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: $secondary-color;
  color: white;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;

  &:hover {
    background: darken($secondary-color, 10%);
    transform: translateY(-2px);
  }
}

.audio-btn-small {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: $secondary-color;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: darken($secondary-color, 10%);
    transform: scale(1.1);
  }
}

.variable-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin: 2rem 0;
  
  .variable-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.05);
    }
    
    .variable-symbol {
      width: 5rem;
      height: 5rem;
      background: linear-gradient(135deg, $primary-color, darken($primary-color, 10%));
      color: white;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    
    .variable-label {
      font-size: 0.875rem;
      color: #6b7280;
      text-align: center;
    }
  }
  
  .equals-sign {
    font-size: 3rem;
    font-weight: 700;
    color: $primary-color;
  }
  
  .question-mark {
    font-size: 3rem;
    font-weight: 700;
    color: $secondary-color;
  }
}

.access-mode-selection {
  margin: 2rem 0;
  
  h4 {
    color: $primary-color;
    margin-bottom: 1rem;
  }
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.mode-option {
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  
  &:hover {
    border-color: $primary-color;
    transform: translateY(-2px);
  }
  
  &.selected {
    border-color: $primary-color;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
  }
  
  i {
    font-size: 2.5rem;
    color: $primary-color;
    margin-bottom: 0.5rem;
  }
  
  span {
    display: block;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }
  
  p {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }
}

// Section Expression
.expression-parts {
  margin: 2rem 0;
}

.part-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 0.75rem;
  
  .part-title {
    flex: 1;
    font-weight: 600;
    color: #1f2937;
  }
  
  .expression-part {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
}

.expression-element {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: $primary-color;
    transform: translateY(-2px);
  }
  
  &.highlighted {
    border-color: $secondary-color;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
  }
  
  .coefficient {
    font-size: 1.5rem;
    font-weight: 700;
    color: $primary-color;
  }
  
  .times {
    font-size: 1.5rem;
    color: #6b7280;
  }
  
  .var-box {
    width: 3rem;
    height: 3rem;
    background: $primary-color;
    color: white;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .equals {
    font-size: 2rem;
    font-weight: 700;
    color: $primary-color;
  }
  
  .result {
    font-size: 1.5rem;
    font-weight: 700;
    color: $success-color;
  }
}

// Balance visuelle
.balance-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2rem 0;
  
  .balance-side {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .balance-content {
      background: white;
      border: 2px solid $primary-color;
      border-radius: 0.75rem;
      padding: 1rem;
      margin-bottom: 1rem;
      
      .balance-text {
        font-size: 1.25rem;
        font-weight: 600;
        color: $primary-color;
      }
    }
    
    .balance-plate {
      width: 6rem;
      height: 0.5rem;
      background: #6b7280;
      border-radius: 0.25rem;
    }
  }
  
  .balance-center {
    margin: 0 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .balance-fulcrum {
      width: 0;
      height: 0;
      border-left: 1rem solid transparent;
      border-right: 1rem solid transparent;
      border-bottom: 2rem solid $primary-color;
      margin-bottom: 0.5rem;
    }
    
    .balance-base {
      width: 3rem;
      height: 0.5rem;
      background: $primary-color;
      border-radius: 0.25rem;
    }
  }
  
  &.balanced {
    .balance-plate {
      background: $success-color;
    }
    
    .balance-fulcrum {
      border-bottom-color: $success-color;
    }
    
    .balance-base {
      background: $success-color;
    }
  }
}

.balance-explanation {
  text-align: center;
  color: #6b7280;
  font-style: italic;
  margin: 0;
}

// Section Vérification
.understanding-check {
  margin: 2rem 0;
  
  h4 {
    color: $primary-color;
    margin-bottom: 1rem;
  }
}

.check-options {
  display: grid;
  gap: 1rem;
  margin: 1rem 0;
}

.check-option {
  padding: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  
  &:hover {
    border-color: $primary-color;
    transform: translateY(-2px);
  }
  
  &.selected {
    border-color: $primary-color;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
  }
}

.check-feedback {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 0.75rem;
  
  .correct {
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border: 2px solid $success-color;
    color: $success-color;
    margin: 0;
  }
  
  .incorrect {
    background: linear-gradient(135deg, #fef2f2, #fecaca);
    border: 2px solid $danger-color;
    color: $danger-color;
    margin: 0;
  }
}

// Section Résolution
.solving-steps {
  margin: 2rem 0;
}

.step-container {
  margin: 2rem 0;
  padding: 2rem;
  background: #f8fafc;
  border-radius: 1rem;
  border: 2px solid #e5e7eb;
  
  &.verification {
    border-color: $success-color;
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  }
}

.step-header {
  margin-bottom: 1.5rem;
  
  h4 {
    color: $primary-color;
    margin-bottom: 0.5rem;
  }
  
  p {
    color: #6b7280;
    margin: 0;
  }
}

.step-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.equation-line {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1.5rem;
  font-weight: 600;
  
  .equation-part {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .equation-text {
      color: $primary-color;
    }
    
    .operation {
      color: $secondary-color;
    }
  }
  
  .equals {
    color: #6b7280;
  }
}

.step-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  background: $secondary-color;
  color: white;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  
  &:hover {
    background: darken($secondary-color, 10%);
    transform: translateY(-2px);
  }
}

.step-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  
  .result-equation {
    font-size: 2rem;
    font-weight: 700;
    color: $success-color;
  }
}

// Section Exercices
.exercise-container {
  margin: 2rem 0;
  padding: 2rem;
  background: #f8fafc;
  border-radius: 1rem;
  border: 2px solid #e5e7eb;
  
  h3 {
    color: $primary-color;
    margin-bottom: 1rem;
  }
}

.exercise-problem {
  h4 {
    color: #1f2937;
    margin-bottom: 0.5rem;
  }
  
  p {
    color: #6b7280;
    margin-bottom: 1.5rem;
  }
}

.solution-input {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin: 2rem 0;
  
  .input-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    
    label {
      font-weight: 600;
      color: #1f2937;
    }
    
    .large-input {
      width: 4rem;
      height: 3rem;
      font-size: 1.5rem;
      text-align: center;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      
      &:focus {
        outline: none;
        border-color: $primary-color;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
    }
  }
  
  .solution-section {
    .solution-display {
      font-size: 1.5rem;
      font-weight: 600;
      color: $primary-color;
      
      .solution-value {
        color: $success-color;
      }
    }
  }
}

.exercise-feedback {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 0.75rem;
  
  .correct-feedback {
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border: 2px solid $success-color;
    
    i {
      color: $success-color;
      margin-right: 0.5rem;
    }
    
    p {
      color: $success-color;
      margin: 0;
    }
  }
  
  .incorrect-feedback {
    background: linear-gradient(135deg, #fef2f2, #fecaca);
    border: 2px solid $danger-color;
    
    i {
      color: $danger-color;
      margin-right: 0.5rem;
    }
    
    p {
      color: $danger-color;
      margin: 0;
    }
  }
}

// Choix multiple
.multiple-choice {
  display: grid;
  gap: 1rem;
  margin: 1rem 0;
}

.choice-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: $primary-color;
    transform: translateY(-2px);
  }
  
  &.selected {
    border-color: $primary-color;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
  }
  
  &.correct {
    border-color: $success-color;
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  }
  
  &.incorrect {
    border-color: $danger-color;
    background: linear-gradient(135deg, #fef2f2, #fecaca);
  }
  
  .choice-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    
    .choice-equation {
      flex: 1;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
    }
  }
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  color: #374151;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  margin-top: 1rem;
  
  &:hover {
    background: #e5e7eb;
  }
}

// Section Problème
.real-problem {
  .problem-scenario {
    margin: 2rem 0;
    
    .scenario-visual {
      .scenario-icon {
        font-size: 4rem;
        color: $primary-color;
      }
    }
    
    .scenario-content {
      flex: 1;
      
      p {
        font-size: 1.2rem;
        line-height: 1.6;
        color: #1f2937;
        margin-bottom: 1rem;
      }
    }
  }
}

.equation-construction {
  margin: 2rem 0;
  
  h4 {
    color: $primary-color;
    margin-bottom: 1rem;
  }
}

.equation-builder {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  padding: 2rem;
  
  .builder-parts {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }
  
  .part {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    
    .part-visual {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 1rem;
      background: $primary-color;
      color: white;
      border-radius: 0.75rem;
      font-weight: 600;
      
      .part-number {
        font-size: 1.5rem;
      }
      
      .part-variable {
        font-size: 1.5rem;
        font-weight: 700;
      }
      
      .part-unit {
        font-size: 1rem;
      }
    }
    
    .part-label {
      font-size: 0.875rem;
      color: #6b7280;
      text-align: center;
    }
    
    &.operator-part {
      .operator {
        font-size: 2rem;
        font-weight: 700;
        color: #6b7280;
      }
    }
    
    &.equals-part {
      .operator {
        font-size: 2rem;
        font-weight: 700;
        color: $primary-color;
      }
    }
  }
  
  .final-equation {
    text-align: center;
    font-size: 2rem;
    font-weight: 700;
    color: $success-color;
    padding: 1rem;
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border-radius: 0.75rem;
  }
}

.problem-solution {
  margin: 2rem 0;
  
  h4 {
    color: $primary-color;
    margin-bottom: 1rem;
  }
}

.solution-steps {
  .solution-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin: 1rem 0;
    
    .step-result {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      
      .step-equation {
        font-size: 1.5rem;
        font-weight: 600;
        color: $primary-color;
      }
      
      .step-final {
        font-size: 2rem;
        font-weight: 700;
        color: $success-color;
      }
    }
  }
  
  .solution-answer {
    margin-top: 2rem;
    padding: 2rem;
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border-radius: 1rem;
    text-align: center;
    
    .answer-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1rem;
      
      i {
        font-size: 2rem;
        color: $success-color;
      }
      
      span {
        font-size: 1.5rem;
        font-weight: 600;
        color: $success-color;
      }
    }
  }
}

// Section Synthèse
.synthesis-summary {
  margin: 2rem 0;
}

.method-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.method-step {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8fafc;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  
  .step-icon {
    width: 4rem;
    height: 4rem;
    background: $primary-color;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    i {
      font-size: 2rem;
    }
  }
  
  .step-content {
    flex: 1;
    
    h4 {
      margin: 0 0 0.5rem 0;
      color: #1f2937;
    }
    
    p {
      margin: 0;
      color: #6b7280;
      font-size: 0.875rem;
    }
  }
}

.key-concepts {
  margin: 2rem 0;
  
  h3 {
    color: $primary-color;
    margin-bottom: 1rem;
  }
}

.concepts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.concept-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: $primary-color;
    transform: translateY(-2px);
  }
  
  .concept-icon {
    width: 4rem;
    height: 4rem;
    background: $primary-color;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    
    i {
      font-size: 2rem;
    }
  }
  
  .concept-content {
    h4 {
      margin: 0 0 0.5rem 0;
      color: #1f2937;
    }
    
    p {
      margin: 0;
      color: #6b7280;
      font-size: 0.875rem;
    }
  }
}

.congratulations {
  text-align: center;
  margin: 2rem 0;
  padding: 3rem;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 1rem;
  
  .congrats-content {
    i {
      font-size: 4rem;
      color: $secondary-color;
      margin-bottom: 1rem;
    }
    
    h3 {
      color: #92400e;
      margin: 0 0 1rem 0;
    }
    
    p {
      color: #92400e;
      margin: 0 0 2rem 0;
      font-size: 1.1rem;
    }
    
    .achievement-display {
      .achievement-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: linear-gradient(135deg, $primary-color, darken($primary-color, 10%));
        color: white;
        padding: 1rem 2rem;
        border-radius: 2rem;
        font-weight: 600;
        font-size: 1.1rem;
        
        i {
          font-size: 1.5rem;
          margin: 0;
        }
      }
    }
  }
}

.final-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

// Responsive
@media (max-width: 768px) {
  .cours-header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    
    .cours-info {
      margin: 0;
    }
  }
  
  .cours-content {
    padding: 1rem;
  }
  
  .content {
    padding: 1rem;
  }
  
  .mode-options {
    grid-template-columns: 1fr;
  }
  
  .method-steps {
    grid-template-columns: 1fr;
  }
  
  .concepts-grid {
    grid-template-columns: 1fr;
  }
  
  .final-actions {
    flex-direction: column;
  }
  
  .solution-input {
    flex-direction: column;
    gap: 1rem;
  }
  
  .builder-parts {
    flex-direction: column;
    gap: 1rem;
  }
}

// Mode sombre désactivé - fond blanc forcé
@media (prefers-color-scheme: dark) {
  .cours-mathematiques {
    background: #ffffff !important;
  }

  .section-card {
    background: white !important;
    color: #1f2937 !important;
  }

  .content {
    background: white !important;
  }
}

// Accessibilité
button:focus-visible,
.mode-option:focus-visible,
.check-option:focus-visible,
.choice-option:focus-visible {
  outline: 3px solid $secondary-color;
  outline-offset: 2px;
}

// Animations
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cours-section {
  animation: slideInUp 0.5s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style> 