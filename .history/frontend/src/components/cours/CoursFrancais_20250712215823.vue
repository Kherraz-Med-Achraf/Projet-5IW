<template>
  <div class="cours-francais">
    <!-- Header avec progression -->
    <header class="cours-header">
      <button @click="goBack" class="back-btn" aria-label="Retour aux cours">
        <i class="material-icons">arrow_back</i>
      </button>
      <div class="cours-info">
        <h1>Cours de Français</h1>
        <p>Accord du participe passé avec « avoir » (8 minutes)</p>
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
      <!-- Étape 1: Introduction -->
      <section v-if="currentStep === 'introduction'" class="cours-section introduction" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">play_circle_filled</i>
              Introduction
            </h2>
            <span class="duration">1 minute</span>
          </div>
          
          <div class="content">
            <div class="audio-section">
              <h3>🎵 Écoute bien ces deux phrases :</h3>
              <div class="phrase-comparison">
                <button 
                  class="audio-btn phrase1" 
                  :class="{ playing: playingPhrase === 'phrase1' }"
                  @click="playPhrase('phrase1')"
                  aria-label="Écouter la première phrase"
                >
                  <i class="material-icons">{{ playingPhrase === 'phrase1' ? 'stop' : 'volume_up' }}</i>
                  <span>« J'ai lu les lettres »</span>
                  <div class="audio-wave" v-if="playingPhrase === 'phrase1'">
                    <span></span><span></span><span></span>
                  </div>
                </button>
                
                <button 
                  class="audio-btn phrase2" 
                  :class="{ playing: playingPhrase === 'phrase2' }"
                  @click="playPhrase('phrase2')"
                  aria-label="Écouter la deuxième phrase"
                >
                  <i class="material-icons">{{ playingPhrase === 'phrase2' ? 'stop' : 'volume_up' }}</i>
                  <span>« Les lettres que j'ai lu<strong>es</strong> »</span>
                  <div class="audio-wave" v-if="playingPhrase === 'phrase2'">
                    <span></span><span></span><span></span>
                  </div>
                </button>
              </div>
            </div>

            <div class="question-section" v-if="phrasesPlayed >= 2">
              <h3 class="question">🤔 Pourquoi entend-on un « s » à la fin de « lues » ?</h3>
              <div class="answer-options">
                <button 
                  v-for="option in introOptions" 
                  :key="option.id"
                  class="option-btn"
                  :class="{ selected: selectedIntroOption === option.id }"
                  @click="selectIntroOption(option.id)"
                >
                  {{ option.text }}
                </button>
              </div>
              
              <div v-if="selectedIntroOption" class="feedback">
                <p v-if="selectedIntroOption === 'correct'" class="correct">
                  ✅ Très bien ! On entend le « s » parce que le mot s'accorde. Découvrons pourquoi !
                </p>
                <p v-else class="hint">
                  🤔 Pas tout à fait... Réfléchis bien à la différence entre les deux phrases.
                </p>
              </div>
            </div>
          </div>
          
          <button 
            v-if="introComplete"
            @click="nextStep" 
            class="next-btn"
            aria-label="Passer à l'étape suivante"
          >
            Comprendre la règle
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 2: Règle détaillée -->
      <section v-if="currentStep === 'regle'" class="cours-section regle" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">school</i>
              La règle d'accord
            </h2>
            <span class="duration">2 minutes</span>
          </div>
          
          <div class="content">
            <div class="rule-box">
              <h3>📋 Règle importante :</h3>
              <p class="rule-text">
                Le <strong>participe passé + avoir</strong> s'accorde <strong>seulement</strong> 
                si le <strong>COD</strong> est <strong>avant</strong> le verbe.
              </p>
            </div>

            <div class="procedure-steps">
              <h3>🔍 Comment faire l'analyse :</h3>
              <div class="step-cards">
                <div 
                  v-for="(step, index) in procedureSteps" 
                  :key="index"
                  class="step-card"
                  :class="{ revealed: revealedSteps > index }"
                  @click="revealStep(index)"
                >
                  <div class="step-number">{{ index + 1 }}</div>
                  <div class="step-content">
                    <h4>{{ step.title }}</h4>
                    <p v-if="revealedSteps > index">{{ step.description }}</p>
                  </div>
                  <i v-if="revealedSteps <= index" class="material-icons reveal-icon">touch_app</i>
                </div>
              </div>
            </div>

            <div v-if="revealedSteps >= 3" class="examples-section">
              <h3>💡 Exemples oraux :</h3>
              <div class="example-cards">
                <button 
                  v-for="example in examples" 
                  :key="example.id"
                  class="example-btn"
                  @click="playExample(example.id)"
                  :class="{ playing: playingExample === example.id }"
                >
                  <i class="material-icons">{{ playingExample === example.id ? 'stop' : 'play_arrow' }}</i>
                  <div class="example-text">
                    <span class="sentence">{{ example.sentence }}</span>
                    <span class="explanation">{{ example.explanation }}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          <button 
            v-if="ruleComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Faire des exercices
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 3: Exercices interactifs -->
      <section v-if="currentStep === 'exercices'" class="cours-section exercices" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">quiz</i>
              Exercices interactifs
            </h2>
            <span class="duration">2 minutes</span>
          </div>
          
          <div class="content">
            <!-- Quiz 1 -->
            <div class="quiz-container" v-if="currentQuiz === 1">
              <h3>🎯 Quiz 1 : Choisis la bonne réponse</h3>
              <div class="quiz-question">
                <p>Les pommes que j'ai <span class="blank">___</span> (manger) étaient sucrées.</p>
                <div class="quiz-options">
                  <button 
                    v-for="option in quiz1Options" 
                    :key="option.value"
                    class="quiz-option"
                    :class="getQuizOptionClass(option.value, quiz1Answer)"
                    @click="selectQuiz1Answer(option.value)"
                    :disabled="quiz1Answer !== null"
                  >
                    {{ option.label }}
                  </button>
                </div>
                <div v-if="quiz1Answer" class="quiz-feedback">
                  <p v-if="quiz1Answer === 'mangées'" class="correct">
                    ✅ Parfait ! « Les pommes » (COD) est avant le verbe, donc on accorde : mangées
                  </p>
                  <div v-else class="incorrect-feedback">
                    <p class="incorrect">
                      ❌ Pas tout à fait. Le COD « les pommes » est avant le verbe, il faut donc accorder.
                    </p>
                    <button @click="quiz1Answer = null" class="retry-btn">
                      <i class="material-icons">refresh</i>
                      Retenter
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quiz 2 -->
            <div class="quiz-container" v-if="currentQuiz === 2">
              <h3>🎯 Quiz 2 : À ton tour !</h3>
              <div class="quiz-question">
                <p>Les devoirs que j'ai <span class="blank">___</span> (faire) sont finis.</p>
                <div class="quiz-options">
                  <button 
                    v-for="option in quiz2Options" 
                    :key="option.value"
                    class="quiz-option"
                    :class="getQuizOptionClass(option.value, quiz2Answer)"
                    @click="selectQuiz2Answer(option.value)"
                    :disabled="quiz2Answer !== null"
                  >
                    {{ option.label }}
                  </button>
                </div>
                <div v-if="quiz2Answer" class="quiz-feedback">
                  <p v-if="quiz2Answer === 'faits'" class="correct">
                    ✅ Excellent ! « Les devoirs » (masculin pluriel) est avant le verbe, donc : faits
                  </p>
                  <p v-else class="incorrect">
                    ❌ Réfléchis : « les devoirs » est masculin pluriel et placé avant le verbe.
                  </p>
                </div>
              </div>
            </div>

            <!-- Exercice de saisie -->
            <div class="typing-exercise" v-if="currentQuiz === 3">
              <h3>✍️ Exercice d'écriture</h3>
              <p>Les images que j'ai <span class="input-container">
                <input 
                  v-model="typingAnswer"
                  type="text" 
                  class="typing-input"
                  placeholder="..."
                  maxlength="10"
                  @input="checkTyping"
                >
              </span> (voir) étaient belles.</p>
              
              <div v-if="typingFeedback" class="typing-feedback">
                <p v-if="typingAnswer.toLowerCase() === 'vues'" class="correct">
                  ✅ Bravo ! Tu as écrit « vues » correctement !
                </p>
                <p v-else-if="typingAnswer.length > 2" class="hint">
                  💡 Indice : « les images » est féminin pluriel et avant le verbe...
                </p>
              </div>
            </div>

            <!-- Navigation entre quiz -->
            <div class="quiz-navigation">
              <button 
                v-if="currentQuiz > 1"
                @click="previousQuiz" 
                class="nav-btn"
              >
                <i class="material-icons">arrow_back</i>
                Précédent
              </button>
              
              <div class="quiz-indicators">
                <span 
                  v-for="i in 3" 
                  :key="i"
                  class="quiz-indicator"
                  :class="{ active: currentQuiz === i, completed: isQuizCompleted(i) }"
                ></span>
              </div>
              
              <button 
                v-if="currentQuiz < 3 && isQuizCompleted(currentQuiz)"
                @click="nextQuiz" 
                class="nav-btn"
              >
                Suivant
                <i class="material-icons">arrow_forward</i>
              </button>
            </div>
          </div>
          
          <button 
            v-if="exercicesComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Créer une phrase
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 4: Production -->
      <section v-if="currentStep === 'production'" class="cours-section production" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">create</i>
              À toi de jouer !
            </h2>
            <span class="duration">1.5 minutes</span>
          </div>
          
          <div class="content">
            <div class="creation-area">
              <h3>🎨 Crée ta propre phrase</h3>
              <p class="instruction">
                Écris une phrase avec un COD <strong>avant</strong> le verbe et accorde le participe passé !
              </p>
              
              <div class="input-area">
                <textarea 
                  v-model="userSentence"
                  class="sentence-input"
                  placeholder="Exemple : Les chansons que j'ai chantées me rendent heureux."
                  rows="3"
                  maxlength="200"
                ></textarea>
                <div class="char-count">{{ userSentence.length }}/200</div>
              </div>

              <div class="creation-tools">
                <button 
                  @click="giveTip" 
                  class="tip-btn"
                  :disabled="tipGiven"
                >
                  <i class="material-icons">lightbulb</i>
                  {{ tipGiven ? 'Conseil donné' : 'Besoin d\'aide ?' }}
                </button>
                
                <button 
                  @click="validateSentence" 
                  class="validate-btn"
                  :disabled="userSentence.length < 10"
                >
                  <i class="material-icons">check_circle</i>
                  Valider ma phrase
                </button>
              </div>

              <div v-if="tip" class="tip-box">
                <h4>💡 Conseil :</h4>
                <p>{{ tip }}</p>
              </div>

              <div v-if="sentenceValidated" class="validation-result">
                <div class="result-content">
                  <h4>🎉 Excellente phrase !</h4>
                  <p class="user-sentence">"{{ userSentence }}"</p>
                  <p class="encouragement">{{ getEncouragement() }}</p>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            v-if="productionComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Vérification ensemble
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 5: Vérification -->
      <section v-if="currentStep === 'verification'" class="cours-section verification" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">fact_check</i>
              Vérification collective
            </h2>
            <span class="duration">1 minute</span>
          </div>
          
          <div class="content">
            <h3>🔍 Analysons ta phrase ensemble :</h3>
            
            <div class="sentence-analysis" v-if="userSentence">
              <div class="analysis-box">
                <h4>Ta phrase :</h4>
                <p class="analyzed-sentence">{{ userSentence }}</p>
                
                <div class="analysis-steps">
                  <button 
                    v-for="(step, index) in analysisSteps" 
                    :key="index"
                    class="analysis-step"
                    :class="{ revealed: revealedAnalysis > index }"
                    @click="revealAnalysis(index)"
                  >
                    <span class="step-icon">{{ step.icon }}</span>
                    <span class="step-text">{{ step.text }}</span>
                    <i v-if="revealedAnalysis <= index" class="material-icons">touch_app</i>
                  </button>
                </div>
              </div>
            </div>

            <div class="example-analysis">
              <h4>📝 Exemple détaillé :</h4>
              <div class="detailed-example">
                <p class="example-sentence">
                  « Les chansons que j'ai <span class="highlighted">chantées</span> me rendent heureux. »
                </p>
                <div class="analysis-breakdown">
                  <div class="cod-highlight">
                    <span class="label">COD :</span>
                    <span class="value">« Les chansons » (féminin pluriel)</span>
                  </div>
                  <div class="position-highlight">
                    <span class="label">Position :</span>
                    <span class="value">Avant le verbe ✓</span>
                  </div>
                  <div class="accord-highlight">
                    <span class="label">Accord :</span>
                    <span class="value">chanté + es = chantées</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            v-if="verificationComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Voir le résumé
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
              Synthèse et mots-clés
            </h2>
            <span class="duration">0.5 minutes</span>
          </div>
          
          <div class="content">
            <div class="visual-summary">
              <h3>📊 Rappel visuel :</h3>
              <div class="schema-container">
                <div class="schema-card accord">
                  <div class="schema-content">
                    <div class="formula">COD → verbe</div>
                    <div class="result accord-yes">✓ ACCORD</div>
                    <div class="example">« que j'ai chantées »</div>
                  </div>
                </div>
                
                <div class="vs-separator">VS</div>
                
                <div class="schema-card no-accord">
                  <div class="schema-content">
                    <div class="formula">verbe → COD</div>
                    <div class="result accord-no">✗ PAS D'ACCORD</div>
                    <div class="example">« j'ai chanté des chansons »</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="keywords-section">
              <h3>🔑 Mots-clés à retenir :</h3>
              <div class="keywords-grid">
                <div class="keyword-card" v-for="keyword in keywords" :key="keyword.word">
                  <div class="keyword-word">{{ keyword.word }}</div>
                  <div class="keyword-definition">{{ keyword.definition }}</div>
                </div>
              </div>
            </div>

            <div class="congratulations">
              <div class="congrats-content">
                <i class="material-icons">celebration</i>
                <h3>Félicitations !</h3>
                <p>Tu as terminé le cours sur l'accord du participe passé avec « avoir » !</p>
                <div class="achievement-badge">
                  <i class="material-icons">military_tech</i>
                  <span>Cours terminé</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="final-actions">
            <button @click="restartCourse" class="secondary-btn">
              <i class="material-icons">refresh</i>
              Recommencer
            </button>
            <button @click="goBack" class="next-btn">
              <i class="material-icons">home</i>
              Retour aux cours
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// État du cours
const currentStep = ref('introduction')
const currentStepIndex = computed(() => {
  const steps = ['introduction', 'regle', 'exercices', 'production', 'verification', 'synthese']
  return steps.indexOf(currentStep.value)
})
const totalSteps = 6
const progressPercent = computed(() => ((currentStepIndex.value + 1) / totalSteps) * 100)

// État audio/interaction
const playingPhrase = ref('')
const phrasesPlayed = ref(0)
const selectedIntroOption = ref('')
const introComplete = computed(() => selectedIntroOption.value === 'correct')

// État règle
const revealedSteps = ref(0)
const playingExample = ref('')
const examplesPlayed = ref(0)
const ruleComplete = computed(() => revealedSteps.value >= 3 && examplesPlayed.value >= 2)

// État exercices  
const currentQuiz = ref(1)
const quiz1Answer = ref(null)
const quiz2Answer = ref(null)
const typingAnswer = ref('')
const typingFeedback = ref(false)
const exercicesComplete = computed(() => quiz1Answer.value === 'mangées' && quiz2Answer.value === 'faits' && typingAnswer.value.toLowerCase() === 'vues')

// État production
const userSentence = ref('')
const tipGiven = ref(false)
const tip = ref('')
const sentenceValidated = ref(false)
const productionComplete = computed(() => sentenceValidated.value)

// État vérification
const revealedAnalysis = ref(0)
const verificationComplete = computed(() => revealedAnalysis.value >= 3)

// Données
const introOptions = [
  { id: 'liaison', text: 'C\'est une liaison' },
  { id: 'correct', text: 'Le mot s\'accorde' },
  { id: 'prononciation', text: 'C\'est la prononciation normale' }
]

const procedureSteps = [
  { title: 'Identifier le verbe', description: 'Trouve le verbe avec l\'auxiliaire avoir (ici, « ai lu »)' },
  { title: 'Repérer le COD', description: 'Cherche le complément d\'objet direct (ici « les lettres »)' },
  { title: 'Vérifier sa position', description: 'Le COD est-il avant ou après le verbe ?' }
]

const examples = [
  { id: 'ex1', sentence: 'J\'ai cueilli la fleur', explanation: 'COD après → cueilli' },
  { id: 'ex2', sentence: 'La fleur que j\'ai cueillie', explanation: 'COD avant → cueillie' }
]

const quiz1Options = [
  { value: 'mangé', label: 'a) mangé' },
  { value: 'mangés', label: 'b) mangés' },
  { value: 'mangée', label: 'c) mangée' },
  { value: 'mangées', label: 'd) mangées' }
]

const quiz2Options = [
  { value: 'fait', label: 'a) fait' },
  { value: 'faits', label: 'b) faits' },
  { value: 'faite', label: 'c) faite' },
  { value: 'faites', label: 'd) faites' }
]

const analysisSteps = [
  { icon: '🔍', text: 'Trouver le verbe avec avoir' },
  { icon: '📍', text: 'Localiser le COD' },
  { icon: '📏', text: 'Vérifier la position' },
  { icon: '✍️', text: 'Appliquer l\'accord' }
]

const keywords = [
  { word: 'COD', definition: 'Complément d\'Objet Direct' },
  { word: 'Position', definition: 'Avant ou après le verbe' },
  { word: 'Accord', definition: 'Ajouter -e, -s ou -es' }
]

// Méthodes
function goBack() {
  router.push({ name: 'MesCours' })
}

function nextStep() {
  const steps = ['introduction', 'regle', 'exercices', 'production', 'verification', 'synthese']
  const currentIndex = steps.indexOf(currentStep.value)
  if (currentIndex < steps.length - 1) {
    currentStep.value = steps[currentIndex + 1]
  }
}

function playPhrase(phrase: string) {
  if (playingPhrase.value === phrase) {
    // Arrêter l'audio en cours
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    playingPhrase.value = ''
  } else {
    playingPhrase.value = phrase
    phrasesPlayed.value = Math.max(phrasesPlayed.value, phrase === 'phrase1' ? 1 : 2)
    
    // Synthèse vocale réelle avec Web Speech API
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance()
      
      // Texte à lire selon la phrase
      const texts = {
        'phrase1': "J'ai lu les lettres",
        'phrase2': "Les lettres que j'ai lues"
      }
      
      utterance.text = texts[phrase as keyof typeof texts] || phrase
      utterance.lang = 'fr-FR'
      utterance.rate = 0.8  // Vitesse plus lente pour les enfants
      utterance.pitch = 1.1 // Ton légèrement plus aigu
      utterance.volume = 0.8
      
      // Événements
      utterance.onend = () => {
        playingPhrase.value = ''
      }
      
      utterance.onerror = () => {
        playingPhrase.value = ''
        console.log('⚠️ Synthèse vocale non disponible, mode visuel activé')
      }
      
      // Démarrer la synthèse
      window.speechSynthesis.speak(utterance)
    } else {
      // Fallback visuel si pas de synthèse vocale
      console.log('⚠️ Synthèse vocale non supportée par ce navigateur')
      setTimeout(() => {
        playingPhrase.value = ''
      }, 3000)
    }
  }
}

function selectIntroOption(optionId: string) {
  selectedIntroOption.value = optionId
}

function revealStep(index: number) {
  if (revealedSteps.value <= index) {
    revealedSteps.value = index + 1
  }
}

function playExample(exampleId: string) {
  if (playingExample.value === exampleId) {
    // Arrêter l'audio en cours
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    playingExample.value = ''
  } else {
    playingExample.value = exampleId
    examplesPlayed.value++
    
    // Synthèse vocale pour les exemples
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance()
      
      const exampleTexts = {
        'ex1': "J'ai cueilli la fleur. COD après, donc cueilli",
        'ex2': "La fleur que j'ai cueillie. COD avant, donc cueillie"
      }
      
      utterance.text = exampleTexts[exampleId as keyof typeof exampleTexts] || exampleId
      utterance.lang = 'fr-FR'
      utterance.rate = 0.8
      utterance.pitch = 1.1
      utterance.volume = 0.8
      
      utterance.onend = () => {
        playingExample.value = ''
      }
      
      utterance.onerror = () => {
        playingExample.value = ''
      }
      
      window.speechSynthesis.speak(utterance)
    } else {
      setTimeout(() => {
        playingExample.value = ''
      }, 2000)
    }
  }
}

function selectQuiz1Answer(answer: string) {
  quiz1Answer.value = answer
}

function selectQuiz2Answer(answer: string) {
  quiz2Answer.value = answer
}

function checkTyping() {
  typingFeedback.value = typingAnswer.value.length > 0
}

function getQuizOptionClass(option: string, answer: any) {
  if (answer === null) return ''
  if (option === answer) {
    return option === 'mangées' || option === 'faits' ? 'correct' : 'incorrect'
  }
  return ''  // Ne plus désactiver les autres options pour permettre de retenter
}

function isQuizCompleted(quizNum: number) {
  switch (quizNum) {
    case 1: return quiz1Answer.value === 'mangées'
    case 2: return quiz2Answer.value === 'faits'
    case 3: return typingAnswer.value.toLowerCase() === 'vues'
    default: return false
  }
}

function nextQuiz() {
  if (currentQuiz.value < 3) {
    currentQuiz.value++
  }
}

function previousQuiz() {
  if (currentQuiz.value > 1) {
    currentQuiz.value--
  }
}

function giveTip() {
  if (!tipGiven.value) {
    tip.value = "Pense à une phrase comme « Les livres que j'ai lus », « La chanson que j'ai écoutée », ou « Les films que j'ai vus »..."
    tipGiven.value = true
  }
}

function validateSentence() {
  sentenceValidated.value = true
}

function getEncouragement() {
  const encouragements = [
    "Tu maîtrises bien cette règle !",
    "Excellent travail sur l'accord !",
    "Tu as bien analysé la position du COD !",
    "Bravo pour cette belle phrase !"
  ]
  return encouragements[Math.floor(Math.random() * encouragements.length)]
}

function revealAnalysis(index: number) {
  if (revealedAnalysis.value <= index) {
    revealedAnalysis.value = index + 1
  }
}

function restartCourse() {
  // Réinitialiser tous les états
  currentStep.value = 'introduction'
  playingPhrase.value = ''
  phrasesPlayed.value = 0
  selectedIntroOption.value = ''
  revealedSteps.value = 0
  playingExample.value = ''
  examplesPlayed.value = 0
  currentQuiz.value = 1
  quiz1Answer.value = null
  quiz2Answer.value = null
  typingAnswer.value = ''
  typingFeedback.value = false
  userSentence.value = ''
  tipGiven.value = false
  tip.value = ''
  sentenceValidated.value = false
  revealedAnalysis.value = 0
}

onMounted(() => {
  // Animation d'entrée ou initialisation
})
</script>

<style scoped lang="scss">
// Variables
$primary-color: #4444ac;
$secondary-color: #fbbf24;
$success-color: #10b981;
$danger-color: #ef4444;
$background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

.cours-francais {
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
  max-width: 900px;
  margin: 0 auto;
}

.cours-section {
  margin-bottom: 2rem;
}

.section-card {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
  }
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
}

// Boutons de navigation
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
.phrase-comparison {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 2rem 0;
}

.audio-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8fafc;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: $primary-color;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }

  &.playing {
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    border-color: $primary-color;
    
    span {
      color: $primary-color;
      font-weight: 600;
    }
  }

  i {
    font-size: 2rem;
    color: $primary-color;
  }

  span {
    font-size: 1.1rem;
    font-weight: 500;
    
    strong {
      color: $danger-color;
      font-weight: 700;
    }
  }
}

.audio-wave {
  position: absolute;
  right: 1rem;
  display: flex;
  gap: 0.25rem;
  align-items: center;

  span {
    width: 0.25rem;
    background: $primary-color;
    border-radius: 1rem;
    animation: wave 1s infinite;

    &:nth-child(1) { height: 1rem; animation-delay: 0s; }
    &:nth-child(2) { height: 1.5rem; animation-delay: 0.2s; }
    &:nth-child(3) { height: 1rem; animation-delay: 0.4s; }
  }
}

@keyframes wave {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}

.question-section {
  margin-top: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 1rem;

  .question {
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
    color: #92400e;
  }
}

.answer-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.option-btn {
  padding: 1rem 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  font-size: 1rem;

  &:hover {
    border-color: $primary-color;
    background: #f8fafc;
  }

  &.selected {
    border-color: $primary-color;
    background: #eff6ff;
    color: $primary-color;
    font-weight: 600;
  }
}

.feedback {
  margin-top: 1rem;

  .correct {
    color: $success-color;
    font-weight: 600;
    padding: 1rem;
    background: #ecfdf5;
    border-radius: 0.5rem;
    border-left: 4px solid $success-color;
  }

  .hint {
    color: #f59e0b;
    font-weight: 600;
    padding: 1rem;
    background: #fffbeb;
    border-radius: 0.5rem;
    border-left: 4px solid #f59e0b;
  }
}

// Section Règle
.rule-box {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  padding: 2rem;
  border-radius: 1rem;
  margin-bottom: 2rem;
  border-left: 4px solid $primary-color;

  .rule-text {
    font-size: 1.1rem;
    line-height: 1.6;
    color: #1e40af;
    margin: 0;

    strong {
      font-weight: 700;
      color: $primary-color;
    }
  }
}

.step-cards {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.step-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8fafc;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: $secondary-color;
    transform: translateY(-2px);
  }

  &.revealed {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border-color: $secondary-color;

    .step-content p {
      opacity: 1;
      max-height: 100px;
    }
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    background: $secondary-color;
    color: white;
    border-radius: 50%;
    font-weight: 700;
    font-size: 1.25rem;
  }

  .step-content {
    flex: 1;

    h4 {
      margin: 0 0 0.5rem 0;
      font-weight: 600;
      color: #1f2937;
    }

    p {
      margin: 0;
      color: #6b7280;
      opacity: 0;
      max-height: 0;
      overflow: hidden;
      transition: all 0.3s ease;
    }
  }

  .reveal-icon {
    color: #9ca3af;
    font-size: 1.5rem;
  }
}

.example-cards {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.example-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: $success-color;
    transform: translateY(-2px);
  }

  &.playing {
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border-color: $success-color;
  }

  i {
    font-size: 2rem;
    color: $success-color;
  }

  .example-text {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    .sentence {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
    }

    .explanation {
      font-size: 0.875rem;
      color: #6b7280;
    }
  }
}

// Section Exercices
.quiz-container {
  margin-bottom: 3rem;
}

.quiz-question {
  background: #f8fafc;
  padding: 2rem;
  border-radius: 1rem;
  margin-top: 1rem;

  p {
    font-size: 1.2rem;
    text-align: center;
    margin-bottom: 2rem;
    color: #1f2937;

    .blank {
      background: linear-gradient(135deg, $secondary-color, #f59e0b);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 0.5rem;
      font-weight: 600;
    }
  }
}

.quiz-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.quiz-option {
  padding: 1rem 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 500;

  &:hover:not(:disabled) {
    border-color: $primary-color;
    transform: translateY(-2px);
  }

  &.correct {
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border-color: $success-color;
    color: $success-color;
    font-weight: 600;
  }

  &.incorrect {
    background: linear-gradient(135deg, #fef2f2, #fecaca);
    border-color: $danger-color;
    color: $danger-color;
    font-weight: 600;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.quiz-feedback {
  .correct, .incorrect {
    padding: 1rem;
    border-radius: 0.75rem;
    font-weight: 600;
  }

  .correct {
    background: #ecfdf5;
    color: $success-color;
    border-left: 4px solid $success-color;
  }

  .incorrect {
    background: #fef2f2;
    color: $danger-color;
    border-left: 4px solid $danger-color;
  }
}

.typing-exercise {
  background: #f8fafc;
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;

  p {
    font-size: 1.2rem;
    color: #1f2937;
    margin-bottom: 1.5rem;
  }

  .input-container {
    display: inline-block;
    position: relative;
  }

  .typing-input {
    padding: 0.5rem 1rem;
    border: 2px solid $primary-color;
    border-radius: 0.5rem;
    font-size: 1.2rem;
    font-weight: 600;
    text-align: center;
    min-width: 8rem;
    background: linear-gradient(135deg, #fef3c7, #fde68a);

    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.3);
    }
  }
}

.typing-feedback {
  margin-top: 1rem;

  .correct, .hint {
    padding: 1rem;
    border-radius: 0.75rem;
    font-weight: 600;
  }

  .correct {
    background: #ecfdf5;
    color: $success-color;
  }

  .hint {
    background: #fffbeb;
    color: #f59e0b;
  }
}

.quiz-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 1rem;

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: $primary-color;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: darken($primary-color, 10%);
      transform: translateY(-2px);
    }
  }

  .quiz-indicators {
    display: flex;
    gap: 0.5rem;

    .quiz-indicator {
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      background: #e5e7eb;
      transition: all 0.3s ease;

      &.active {
        background: $primary-color;
        transform: scale(1.2);
      }

      &.completed {
        background: $success-color;
      }
    }
  }
}

// Section Production
.creation-area {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  padding: 2rem;
  border-radius: 1rem;

  .instruction {
    font-size: 1.1rem;
    color: #0c4a6e;
    margin-bottom: 2rem;
    text-align: center;
  }
}

.input-area {
  position: relative;
  margin-bottom: 1.5rem;

  .sentence-input {
    width: 100%;
    padding: 1.5rem;
    border: 2px solid #e5e7eb;
    border-radius: 1rem;
    font-size: 1.1rem;
    line-height: 1.6;
    resize: vertical;
    transition: all 0.3s ease;

    &:focus {
      outline: none;
      border-color: $primary-color;
      box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
    }
  }

  .char-count {
    position: absolute;
    bottom: 0.5rem;
    right: 1rem;
    font-size: 0.75rem;
    color: #9ca3af;
  }
}

.creation-tools {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;

  .tip-btn, .validate-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 600;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .tip-btn {
    background: #fef3c7;
    color: #92400e;
    border: 2px solid #f59e0b;

    &:hover:not(:disabled) {
      background: #fde68a;
    }
  }

  .validate-btn {
    background: $success-color;
    color: white;

    &:hover:not(:disabled) {
      background: darken($success-color, 10%);
      transform: translateY(-2px);
    }
  }
}

.tip-box {
  background: #fffbeb;
  border: 2px solid #f59e0b;
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 2rem;

  h4 {
    margin: 0 0 0.5rem 0;
    color: #92400e;
  }

  p {
    margin: 0;
    color: #92400e;
    line-height: 1.6;
  }
}

.validation-result {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border: 2px solid $success-color;
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;

  .result-content {
    h4 {
      margin: 0 0 1rem 0;
      color: $success-color;
      font-size: 1.5rem;
    }

    .user-sentence {
      font-size: 1.2rem;
      font-style: italic;
      color: #1f2937;
      margin: 1rem 0;
      font-weight: 500;
    }

    .encouragement {
      color: #059669;
      font-weight: 600;
      margin: 0;
    }
  }
}

// Section Vérification
.sentence-analysis {
  margin-bottom: 3rem;

  .analysis-box {
    background: #f8fafc;
    padding: 2rem;
    border-radius: 1rem;

    .analyzed-sentence {
      font-size: 1.3rem;
      font-weight: 600;
      color: $primary-color;
      text-align: center;
      margin: 1.5rem 0;
      padding: 1rem;
      background: white;
      border-radius: 0.75rem;
      border: 2px solid #e5e7eb;
    }
  }
}

.analysis-steps {
  display: grid;
  gap: 1rem;
  margin-top: 1.5rem;

  .analysis-step {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      border-color: $primary-color;
    }

    &.revealed {
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
      border-color: $primary-color;
    }

    .step-icon {
      font-size: 1.5rem;
    }

    .step-text {
      flex: 1;
      font-weight: 500;
    }
  }
}

.detailed-example {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  border: 2px solid #e5e7eb;

  .example-sentence {
    font-size: 1.3rem;
    text-align: center;
    margin-bottom: 2rem;
    color: #1f2937;

    .highlighted {
      background: linear-gradient(135deg, $secondary-color, #f59e0b);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 0.5rem;
      font-weight: 700;
    }
  }

  .analysis-breakdown {
    display: grid;
    gap: 1rem;

    > div {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 0.75rem;

      .label {
        font-weight: 600;
        color: #374151;
        min-width: 5rem;
      }

      .value {
        color: $primary-color;
        font-weight: 600;
      }
    }
  }
}

// Section Synthèse
.visual-summary {
  margin-bottom: 3rem;

  .schema-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    margin: 2rem 0;
    flex-wrap: wrap;

    .schema-card {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      min-width: 200px;

      &.accord {
        border: 3px solid $success-color;

        .result.accord-yes {
          background: $success-color;
          color: white;
        }
      }

      &.no-accord {
        border: 3px solid $danger-color;

        .result.accord-no {
          background: $danger-color;
          color: white;
        }
      }

      .formula {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: #1f2937;
      }

      .result {
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
      }

      .example {
        font-style: italic;
        color: #6b7280;
        font-size: 0.875rem;
      }
    }

    .vs-separator {
      font-size: 1.5rem;
      font-weight: 700;
      color: #9ca3af;
      align-self: center;
    }
  }
}

.keywords-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;

  .keyword-card {
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    padding: 1.5rem;
    border-radius: 1rem;
    text-align: center;
    border: 2px solid #e5e7eb;
    transition: all 0.3s ease;

    &:hover {
      border-color: $primary-color;
      transform: translateY(-2px);
    }

    .keyword-word {
      font-size: 1.2rem;
      font-weight: 700;
      color: $primary-color;
      margin-bottom: 0.5rem;
    }

    .keyword-definition {
      font-size: 0.875rem;
      color: #6b7280;
      line-height: 1.4;
    }
  }
}

.congratulations {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 1rem;
  padding: 3rem;
  text-align: center;
  margin-top: 3rem;

  .congrats-content {
    i {
      font-size: 4rem;
      color: #f59e0b;
      margin-bottom: 1rem;
    }

    h3 {
      font-size: 2rem;
      color: #92400e;
      margin: 0 0 1rem 0;
    }

    p {
      font-size: 1.1rem;
      color: #92400e;
      margin: 0 0 2rem 0;
    }

    .achievement-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #f59e0b, #d97706);
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

    .progress-container {
      .progress-bar {
        width: 12rem;
      }
    }
  }

  .cours-content {
    padding: 1rem;
  }

  .content {
    padding: 1rem;
  }

  .phrase-comparison .audio-btn {
    padding: 1rem;

    span {
      font-size: 1rem;
    }
  }

  .quiz-options {
    grid-template-columns: 1fr;
  }

  .creation-tools {
    flex-direction: column;
    align-items: center;
  }

  .schema-container {
    flex-direction: column;
    gap: 1rem;

    .vs-separator {
      transform: rotate(90deg);
    }
  }

  .keywords-grid {
    grid-template-columns: 1fr;
  }

  .final-actions {
    flex-direction: column;
  }
}

// Animations d'entrée
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

// États de focus améliorés pour l'accessibilité
button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 3px solid $secondary-color;
  outline-offset: 2px;
}

// Mode sombre pour l'accessibilité
@media (prefers-color-scheme: dark) {
  .cours-francais {
    background: linear-gradient(135deg, #1f2937, #374151);
  }

  .section-card {
    background: #374151;
    color: white;
  }

  .content {
    background: #374151;
  }
}

// Mode à contraste élevé
@media (prefers-contrast: high) {
  .section-card {
    border: 2px solid #000;
  }
  
  .next-btn, .secondary-btn {
    border: 2px solid #000;
  }
}

// Animation réduite pour les utilisateurs qui le préfèrent
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style> 