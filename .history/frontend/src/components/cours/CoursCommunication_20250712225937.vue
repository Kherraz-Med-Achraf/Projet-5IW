<template>
  <div class="cours-communication">
    <!-- Header avec progression -->
    <header class="cours-header">
      <button @click="goBack" class="back-btn" aria-label="Retour aux cours">
        <i class="material-icons">arrow_back</i>
      </button>
      <div class="cours-info">
        <h1>Cours de Communication</h1>
        <p>Pictogrammes avancés (8 minutes)</p>
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
              Introduction et modes d'accès
            </h2>
            <span class="duration">1 minute</span>
          </div>
          
          <div class="content">
            <div class="explanation-section">
              <h3>📱 Cours de communication adapté</h3>
              <p class="course-description">
                Aujourd'hui, nous allons apprendre à créer des phrases plus longues 
                en utilisant des <strong>pictogrammes</strong> (petits dessins). 
                Tu pourras communiquer de manière plus riche et expressive !
              </p>
              
              <div class="access-modes">
                <h4>🎯 Choisis ton mode d'accès :</h4>
                <div class="mode-cards">
                  <div 
                    class="mode-card" 
                    :class="{ selected: selectedMode === 'contacteur' }"
                    @click="selectMode('contacteur')"
                  >
                    <i class="material-icons">touch_app</i>
                    <h5>Contacteur unique</h5>
                    <p>Le système fait défiler automatiquement, tu appuies pour valider</p>
                  </div>
                  
                  <div 
                    class="mode-card" 
                    :class="{ selected: selectedMode === 'tactile' }"
                    @click="selectMode('tactile')"
                  >
                    <i class="material-icons">tap_and_play</i>
                    <h5>Tactile direct</h5>
                    <p>Tape directement sur les grands pictogrammes affichés</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            v-if="selectedMode"
            @click="nextStep" 
            class="next-btn"
            aria-label="Passer à l'étape suivante"
          >
            Découvrir les pictogrammes
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 2: Présentation des pictogrammes -->
      <section v-if="currentStep === 'pictogrammes'" class="cours-section pictogrammes" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">image</i>
              Nouveaux pictogrammes
            </h2>
            <span class="duration">1.5 minutes</span>
          </div>
          
          <div class="content">
            <h3>🎨 Découvre tes 6 pictogrammes clés :</h3>
            
            <div class="pictogrammes-grid">
              <div 
                v-for="(picto, index) in pictogrammes" 
                :key="picto.id"
                class="pictogramme-card"
                :class="{ 
                  active: selectedMode === 'contacteur' && scanningIndex === index,
                  revealed: revealedPictos > index 
                }"
                @click="selectPictogramme(index)"
              >
                <div class="picto-icon">
                  <i class="material-icons">{{ picto.icon }}</i>
                </div>
                <div class="picto-content">
                  <h4>{{ picto.word }}</h4>
                  <p v-if="revealedPictos > index">{{ picto.description }}</p>
                </div>
                <div v-if="revealedPictos > index" class="audio-btn" @click.stop="playWord(picto.word)">
                  <i class="material-icons">volume_up</i>
                </div>
              </div>
            </div>
            
            <div v-if="revealedPictos >= 6" class="completion-message">
              <p>✅ Parfait ! Tu connais maintenant tous les pictogrammes de base.</p>
            </div>
          </div>
          
          <button 
            v-if="pictogrammesComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Séquence guidée
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 3: Séquence guidée -->
      <section v-if="currentStep === 'sequence'" class="cours-section sequence" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">trending_flat</i>
              Séquence guidée
            </h2>
            <span class="duration">2 minutes</span>
          </div>
          
          <div class="content">
            <div class="phrase-construction">
              <h3>🎯 Construisons ensemble :</h3>
              <div class="target-phrase">
                <strong>« Je veux jouer parce que je suis heureux »</strong>
              </div>
              
              <div class="phrase-builder">
                <div class="selected-pictos">
                  <div 
                    v-for="(picto, index) in selectedSequence" 
                    :key="index"
                    class="selected-picto"
                  >
                    <i class="material-icons">{{ picto.icon }}</i>
                    <span>{{ picto.word }}</span>
                  </div>
                </div>
                
                <div class="current-selection" v-if="currentSequenceStep < targetSequence.length">
                  <h4>Sélectionne : <strong>{{ targetSequence[currentSequenceStep].word }}</strong></h4>
                  <div class="sequence-options">
                    <div 
                      v-for="(option, index) in sequenceOptions" 
                      :key="option.id"
                      class="sequence-option"
                      :class="{ 
                        highlighted: selectedMode === 'contacteur' && scanningOptionIndex === index,
                        correct: sequenceAnswered && option.id === targetSequence[currentSequenceStep].id,
                        incorrect: sequenceAnswered && option.id !== targetSequence[currentSequenceStep].id && selectedSequenceOption === option.id
                      }"
                      @click="selectSequenceOption(option)"
                    >
                      <i class="material-icons">{{ option.icon }}</i>
                      <span>{{ option.word }}</span>
                    </div>
                  </div>
                </div>
                
                <div v-if="sequenceComplete" class="sequence-success">
                  <h4>🎉 Bravo ! Tu as construit la phrase complète !</h4>
                  <div class="complete-phrase">
                    <div v-for="picto in selectedSequence" :key="picto.id" class="final-picto">
                      <i class="material-icons">{{ picto.icon }}</i>
                      <span>{{ picto.word }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            v-if="sequenceComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Activité interactive
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 4: Activité interactive -->
      <section v-if="currentStep === 'activite'" class="cours-section activite" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">quiz</i>
              Activité interactive
            </h2>
            <span class="duration">2 minutes</span>
          </div>
          
          <div class="content">
            <div class="activity-container">
              <h3>🎯 Reconstuis ces phrases :</h3>
              
              <div class="phrase-selector">
                <h4>Choisis la phrase à construire :</h4>
                <div class="phrase-options">
                  <div 
                    v-for="(phrase, index) in phrasesActivite" 
                    :key="index"
                    class="phrase-option"
                    :class="{ selected: selectedPhrase === index }"
                    @click="selectPhrase(index)"
                  >
                    <span class="phrase-number">{{ index + 1 }}</span>
                    <span class="phrase-text">{{ phrase.text }}</span>
                  </div>
                </div>
              </div>
              
              <div v-if="selectedPhrase !== null" class="phrase-construction-activity">
                <div class="target-display">
                  <h4>À construire : <strong>{{ phrasesActivite[selectedPhrase].text }}</strong></h4>
                </div>
                
                <div class="construction-area">
                  <div class="built-phrase">
                    <div 
                      v-for="(picto, index) in currentBuiltPhrase" 
                      :key="index"
                      class="built-picto"
                    >
                      <i class="material-icons">{{ picto.icon }}</i>
                      <span>{{ picto.word }}</span>
                    </div>
                  </div>
                  
                  <div class="available-pictos">
                    <div 
                      v-for="(picto, index) in availablePictos" 
                      :key="picto.id"
                      class="available-picto"
                      :class="{ 
                        highlighted: selectedMode === 'contacteur' && scanningAvailableIndex === index,
                        disabled: picto.used
                      }"
                      @click="selectAvailablePicto(picto)"
                    >
                      <i class="material-icons">{{ picto.icon }}</i>
                      <span>{{ picto.word }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="activity-controls">
                  <button @click="clearBuiltPhrase" class="clear-btn">
                    <i class="material-icons">refresh</i>
                    Recommencer
                  </button>
                  <button 
                    @click="validateBuiltPhrase" 
                    class="validate-btn"
                    :disabled="currentBuiltPhrase.length === 0"
                  >
                    <i class="material-icons">check_circle</i>
                    Valider
                  </button>
                </div>
                
                <div v-if="phraseValidated" class="phrase-feedback">
                  <div v-if="phraseCorrect" class="correct-feedback">
                    <h4>✅ Parfait ! Phrase correcte !</h4>
                    <p>{{ phraseValidationMessage }}</p>
                  </div>
                  <div v-else class="incorrect-feedback">
                    <h4>❌ Presque ! Essaie encore</h4>
                    <p>{{ phraseValidationMessage }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            v-if="activiteComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Création libre
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 5: Création libre -->
      <section v-if="currentStep === 'creation'" class="cours-section creation" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">create</i>
              Création libre avec soutien
            </h2>
            <span class="duration">1.5 minutes</span>
          </div>
          
          <div class="content">
            <div class="creation-area">
              <h3>🎨 À toi de créer !</h3>
              <p class="instruction">
                Compose une phrase de <strong>6 pictogrammes</strong> incluant un connecteur 
                (« et », « parce que » ou « mais »)
              </p>
              
              <div class="creation-workspace">
                <div class="created-phrase">
                  <div 
                    v-for="(picto, index) in createdPhrase" 
                    :key="index"
                    class="created-picto"
                    @click="removePictoFromCreation(index)"
                  >
                    <i class="material-icons">{{ picto.icon }}</i>
                    <span>{{ picto.word }}</span>
                    <div class="remove-btn">
                      <i class="material-icons">close</i>
                    </div>
                  </div>
                  <div v-if="createdPhrase.length === 0" class="empty-phrase">
                    Sélectionne des pictogrammes pour créer ta phrase
                  </div>
                </div>
                
                <div class="creation-pictos">
                  <div 
                    v-for="(picto, index) in creationPictos" 
                    :key="picto.id"
                    class="creation-picto"
                    :class="{ 
                      highlighted: selectedMode === 'contacteur' && scanningCreationIndex === index,
                      faded: createdPhrase.length >= 6
                    }"
                    @click="addPictoToCreation(picto)"
                  >
                    <i class="material-icons">{{ picto.icon }}</i>
                    <span>{{ picto.word }}</span>
                  </div>
                </div>
              </div>
              
              <div class="creation-controls">
                <button @click="clearCreation" class="clear-btn">
                  <i class="material-icons">refresh</i>
                  Recommencer
                </button>
                <button 
                  @click="validateCreation" 
                  class="validate-btn"
                  :disabled="createdPhrase.length < 6"
                >
                  <i class="material-icons">check_circle</i>
                  Valider ma phrase
                </button>
              </div>
              
              <div v-if="creationValidated" class="creation-result">
                <h4>🎉 Magnifique création !</h4>
                <div class="final-creation">
                  <div v-for="picto in createdPhrase" :key="picto.id" class="final-picto">
                    <i class="material-icons">{{ picto.icon }}</i>
                    <span>{{ picto.word }}</span>
                  </div>
                </div>
                <p class="creation-text">{{ creationText }}</p>
              </div>
            </div>
          </div>
          
          <button 
            v-if="creationComplete"
            @click="nextStep" 
            class="next-btn"
          >
            Conclusion
            <i class="material-icons">arrow_forward</i>
          </button>
        </div>
      </section>

      <!-- Étape 6: Conclusion -->
      <section v-if="currentStep === 'conclusion'" class="cours-section conclusion" role="main">
        <div class="section-card">
          <div class="section-header">
            <h2>
              <i class="material-icons">emoji_events</i>
              Conclusion et évaluation
            </h2>
            <span class="duration">0.5 minutes</span>
          </div>
          
          <div class="content">
            <div class="conclusion-summary">
              <h3>📊 Récapitulatif de ton parcours :</h3>
              
              <div class="achievement-cards">
                <div class="achievement-card">
                  <i class="material-icons">image</i>
                  <h4>Pictogrammes maîtrisés</h4>
                  <p>{{ pictogrammes.length }} pictogrammes appris</p>
                </div>
                
                <div class="achievement-card">
                  <i class="material-icons">trending_flat</i>
                  <h4>Séquence guidée</h4>
                  <p>Phrase complexe construite</p>
                </div>
                
                <div class="achievement-card">
                  <i class="material-icons">quiz</i>
                  <h4>Activité interactive</h4>
                  <p>Phrases reconstruites</p>
                </div>
                
                <div class="achievement-card">
                  <i class="material-icons">create</i>
                  <h4>Création libre</h4>
                  <p>Phrase personnelle créée</p>
                </div>
              </div>
              
              <div class="conclusion-message">
                <h4>🎉 Félicitations !</h4>
                <p>
                  Tu as terminé le cours de communication alternative ! 
                  Tu peux maintenant créer des phrases plus complexes avec des pictogrammes.
                </p>
                
                <div class="next-steps">
                  <h5>💡 Pour aller plus loin :</h5>
                  <ul>
                    <li>Pratique avec d'autres connecteurs (« quand », « si »)</li>
                    <li>Ajoute des adjectifs (« grand », « petit »)</li>
                    <li>Crée des phrases avec des émotions</li>
                  </ul>
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
              Recommencer le cours
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

// Types
interface Pictogramme {
  id: string
  word: string
  icon: string
  description: string
}

interface Phrase {
  text: string
  pictogrammes: Pictogramme[]
}

// Router
const router = useRouter()

// État général
const currentStep = ref('introduction')
const selectedMode = ref<'contacteur' | 'tactile' | null>(null)
const scanningIndex = ref(0)
const scanningInterval = ref<NodeJS.Timeout | null>(null)

// Données des pictogrammes
const pictogrammes = ref<Pictogramme[]>([
  { id: 'je', word: 'Je', icon: 'person', description: 'Première personne du singulier' },
  { id: 'veux', word: 'veux', icon: 'favorite', description: 'Exprimer un désir' },
  { id: 'jouer', word: 'jouer', icon: 'sports_esports', description: 'Activité ludique' },
  { id: 'parce_que', word: 'parce que', icon: 'help', description: 'Connecteur de cause' },
  { id: 'je_suis', word: 'je suis', icon: 'person_outline', description: 'État d\'être' },
  { id: 'heureux', word: 'heureux', icon: 'mood', description: 'Émotion positive' }
])

// État des étapes
const revealedPictos = ref(0)
const currentSequenceStep = ref(0)
const selectedSequence = ref<Pictogramme[]>([])
const sequenceAnswered = ref(false)
const selectedSequenceOption = ref<string | null>(null)
const scanningOptionIndex = ref(0)

// Phrases pour l'activité
const phrasesActivite = ref<Phrase[]>([
  { text: 'Je veux manger parce que j\'ai faim', pictogrammes: [] },
  { text: 'Je veux lire mais je suis fatigué', pictogrammes: [] },
  { text: 'Je veux parler et je suis content', pictogrammes: [] },
  { text: 'Je veux dormir parce que j\'ai sommeil', pictogrammes: [] },
  { text: 'Je veux jouer et je suis heureux', pictogrammes: [] }
])

const selectedPhrase = ref<number | null>(null)
const currentBuiltPhrase = ref<Pictogramme[]>([])
const phraseValidated = ref(false)
const phraseCorrect = ref(false)
const phraseValidationMessage = ref('')
const scanningAvailableIndex = ref(0)

// Création libre
const createdPhrase = ref<Pictogramme[]>([])
const creationValidated = ref(false)
const creationText = ref('')
const scanningCreationIndex = ref(0)

// Pictogrammes étendus pour la création
const creationPictos = ref<Pictogramme[]>([
  ...pictogrammes.value,
  // Connecteurs
  { id: 'et', word: 'et', icon: 'add', description: 'Connecteur d\'addition' },
  { id: 'mais', word: 'mais', icon: 'remove', description: 'Connecteur d\'opposition' },
  { id: 'quand', word: 'quand', icon: 'schedule', description: 'Connecteur de temps' },
  { id: 'si', word: 'si', icon: 'help_outline', description: 'Connecteur de condition' },
  
  // Actions
  { id: 'manger', word: 'manger', icon: 'restaurant', description: 'Action de se nourrir' },
  { id: 'lire', word: 'lire', icon: 'book', description: 'Action de lecture' },
  { id: 'parler', word: 'parler', icon: 'record_voice_over', description: 'Action de communication' },
  { id: 'dormir', word: 'dormir', icon: 'bedtime', description: 'Action de repos' },
  { id: 'ecouter', word: 'écouter', icon: 'hearing', description: 'Action d\'écoute' },
  { id: 'regarder', word: 'regarder', icon: 'visibility', description: 'Action de vision' },
  { id: 'dessiner', word: 'dessiner', icon: 'draw', description: 'Action artistique' },
  { id: 'chanter', word: 'chanter', icon: 'music_note', description: 'Action musicale' },
  { id: 'courir', word: 'courir', icon: 'directions_run', description: 'Action de course' },
  { id: 'marcher', word: 'marcher', icon: 'directions_walk', description: 'Action de marche' },
  
  // États avec "j'ai"
  { id: 'j_ai', word: 'j\'ai', icon: 'person_pin', description: 'Avoir quelque chose' },
  { id: 'faim', word: 'faim', icon: 'lunch_dining', description: 'Sensation de besoin alimentaire' },
  { id: 'soif', word: 'soif', icon: 'local_drink', description: 'Besoin de boire' },
  { id: 'sommeil', word: 'sommeil', icon: 'bedtime', description: 'Besoin de dormir' },
  { id: 'chaud', word: 'chaud', icon: 'whatshot', description: 'Sensation de chaleur' },
  { id: 'froid', word: 'froid', icon: 'ac_unit', description: 'Sensation de froid' },
  { id: 'mal', word: 'mal', icon: 'sick', description: 'Sensation de douleur' },
  { id: 'peur', word: 'peur', icon: 'sentiment_very_dissatisfied', description: 'Émotion de peur' },
  
  // États avec "je suis"  
  { id: 'fatigue', word: 'fatigué', icon: 'bedtime', description: 'État de fatigue' },
  { id: 'content', word: 'content', icon: 'sentiment_satisfied', description: 'Émotion positive' },
  { id: 'triste', word: 'triste', icon: 'sentiment_dissatisfied', description: 'Émotion négative' },
  { id: 'en_colere', word: 'en colère', icon: 'sentiment_very_dissatisfied', description: 'Émotion de colère' },
  { id: 'excite', word: 'excité', icon: 'sentiment_very_satisfied', description: 'Émotion d\'excitation' },
  { id: 'calme', word: 'calme', icon: 'self_improvement', description: 'État de tranquillité' },
  { id: 'malade', word: 'malade', icon: 'sick', description: 'État de maladie' },
  { id: 'fatigue_fort', word: 'très fatigué', icon: 'hotel', description: 'État de grande fatigue' },
  
  // Objets/Lieux
  { id: 'livre', word: 'livre', icon: 'menu_book', description: 'Objet de lecture' },
  { id: 'musique', word: 'musique', icon: 'music_note', description: 'Art sonore' },
  { id: 'jeu', word: 'jeu', icon: 'sports_esports', description: 'Activité ludique' },
  { id: 'eau', word: 'eau', icon: 'water_drop', description: 'Liquide essentiel' },
  { id: 'nourriture', word: 'nourriture', icon: 'fastfood', description: 'Aliment' },
  { id: 'maison', word: 'maison', icon: 'home', description: 'Lieu d\'habitation' },
  { id: 'ecole', word: 'école', icon: 'school', description: 'Lieu d\'apprentissage' },
  { id: 'jardin', word: 'jardin', icon: 'park', description: 'Espace extérieur' },
  
  // Adjectifs
  { id: 'grand', word: 'grand', icon: 'height', description: 'Qualité de taille' },
  { id: 'petit', word: 'petit', icon: 'compress', description: 'Qualité de taille réduite' },
  { id: 'beau', word: 'beau', icon: 'star', description: 'Qualité esthétique' },
  { id: 'bon', word: 'bon', icon: 'thumb_up', description: 'Qualité positive' },
  { id: 'difficile', word: 'difficile', icon: 'warning', description: 'Niveau de complexité' },
  { id: 'facile', word: 'facile', icon: 'check_circle', description: 'Niveau de simplicité' },
  
  // Temps
  { id: 'maintenant', word: 'maintenant', icon: 'schedule', description: 'Moment présent' },
  { id: 'plus_tard', word: 'plus tard', icon: 'schedule_send', description: 'Moment futur' },
  { id: 'hier', word: 'hier', icon: 'history', description: 'Moment passé' },
  { id: 'demain', word: 'demain', icon: 'event', description: 'Moment futur proche' }
])

// Séquence cible
const targetSequence = ref<Pictogramme[]>([
  pictogrammes.value[0], // Je
  pictogrammes.value[1], // veux
  pictogrammes.value[2], // jouer
  pictogrammes.value[3], // parce que
  pictogrammes.value[4], // je suis
  pictogrammes.value[5]  // heureux
])

// Computed
const steps = ['introduction', 'pictogrammes', 'sequence', 'activite', 'creation', 'conclusion']
const totalSteps = computed(() => steps.length)
const currentStepIndex = computed(() => steps.indexOf(currentStep.value))
const progressPercent = computed(() => (currentStepIndex.value / totalSteps.value) * 100)

const pictogrammesComplete = computed(() => revealedPictos.value >= pictogrammes.value.length)
const sequenceComplete = computed(() => selectedSequence.value.length === targetSequence.value.length)
const activiteComplete = computed(() => phraseValidated.value && phraseCorrect.value)
const creationComplete = computed(() => creationValidated.value)

const sequenceOptions = computed(() => {
  if (currentSequenceStep.value >= targetSequence.value.length) return []
  
  const current = targetSequence.value[currentSequenceStep.value]
  const others = pictogrammes.value.filter(p => p.id !== current.id).slice(0, 2)
  
  return [current, ...others].sort(() => Math.random() - 0.5)
})

const availablePictos = computed(() => {
  if (selectedPhrase.value === null) return []
  
  return creationPictos.value.map(picto => ({
    ...picto,
    used: currentBuiltPhrase.value.some(p => p.id === picto.id)
  }))
})

// Méthodes
function goBack() {
  router.push('/mes-cours')
}

function selectMode(mode: 'contacteur' | 'tactile') {
  selectedMode.value = mode
  if (mode === 'contacteur') {
    startScanning()
  }
}

function startScanning() {
  if (scanningInterval.value) {
    clearInterval(scanningInterval.value)
  }
  scanningInterval.value = setInterval(() => {
    scanningIndex.value = (scanningIndex.value + 1) % pictogrammes.value.length
  }, 2000)
}

function stopScanning() {
  if (scanningInterval.value) {
    clearInterval(scanningInterval.value)
    scanningInterval.value = null
  }
}

function nextStep() {
  const currentIndex = steps.indexOf(currentStep.value)
  if (currentIndex < steps.length - 1) {
    currentStep.value = steps[currentIndex + 1]
  }
}

function selectPictogramme(index: number) {
  if (selectedMode.value === 'contacteur' && scanningIndex.value !== index) return
  
  if (index === revealedPictos.value) {
    revealedPictos.value++
    playWord(pictogrammes.value[index].word)
  }
}

function playWord(word: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'fr-FR'
    utterance.rate = 0.8
    utterance.pitch = 1.2
    speechSynthesis.speak(utterance)
  }
}

function selectSequenceOption(option: Pictogramme) {
  if (sequenceAnswered.value) return
  
  selectedSequenceOption.value = option.id
  sequenceAnswered.value = true
  
  if (option.id === targetSequence.value[currentSequenceStep.value].id) {
    selectedSequence.value.push(option)
    playWord(option.word)
    
    setTimeout(() => {
      if (currentSequenceStep.value < targetSequence.value.length - 1) {
        currentSequenceStep.value++
        sequenceAnswered.value = false
        selectedSequenceOption.value = null
      }
    }, 1500)
  } else {
    setTimeout(() => {
      sequenceAnswered.value = false
      selectedSequenceOption.value = null
    }, 2000)
  }
}

function selectPhrase(index: number) {
  selectedPhrase.value = index
  currentBuiltPhrase.value = []
  phraseValidated.value = false
}

function selectAvailablePicto(picto: Pictogramme) {
  if (picto.used) return
  
  currentBuiltPhrase.value.push(picto)
  playWord(picto.word)
}

function clearBuiltPhrase() {
  currentBuiltPhrase.value = []
  phraseValidated.value = false
}

function validateBuiltPhrase() {
  if (currentBuiltPhrase.value.length === 0) return
  
  phraseValidated.value = true
  const builtText = currentBuiltPhrase.value.map(p => p.word).join(' ')
  const targetText = phrasesActivite.value[selectedPhrase.value!].text
  
  // Validation simplifiée - on considère que c'est correct si au moins 3 mots correspondent
  const builtWords = builtText.toLowerCase().split(' ')
  const targetWords = targetText.toLowerCase().split(' ')
  const matches = builtWords.filter(word => targetWords.includes(word))
  
  phraseCorrect.value = matches.length >= 3
  phraseValidationMessage.value = phraseCorrect.value 
    ? 'Excellente construction de phrase !' 
    : 'Bonne tentative ! Essaie de suivre l\'ordre des mots.'
}

function addPictoToCreation(picto: Pictogramme) {
  if (createdPhrase.value.length >= 6) return
  
  createdPhrase.value.push(picto)
  playWord(picto.word)
}

function removePictoFromCreation(index: number) {
  createdPhrase.value.splice(index, 1)
}

function clearCreation() {
  createdPhrase.value = []
  creationValidated.value = false
}

function validateCreation() {
  if (createdPhrase.value.length < 6) return
  
  creationValidated.value = true
  creationText.value = createdPhrase.value.map(p => p.word).join(' ')
  
  // Lecture de la phrase créée
  playWord(creationText.value)
}

function restartCourse() {
  // Réinitialiser toutes les variables
  currentStep.value = 'introduction'
  selectedMode.value = null
  revealedPictos.value = 0
  currentSequenceStep.value = 0
  selectedSequence.value = []
  sequenceAnswered.value = false
  selectedPhrase.value = null
  currentBuiltPhrase.value = []
  phraseValidated.value = false
  createdPhrase.value = []
  creationValidated.value = false
  
  stopScanning()
}

// Lifecycle
onMounted(() => {
  // Initialisation si nécessaire
})

onUnmounted(() => {
  stopScanning()
})
</script>

<style scoped lang="scss">
// Variables
$primary-color: #4444ac;
$secondary-color: #f59e0b;
$success-color: #10b981;
$danger-color: #ef4444;
$background: #ffffff;

.cours-communication {
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.next-btn {
  background: linear-gradient(135deg, $success-color, darken($success-color, 10%));
  color: white;

  &:hover:not(:disabled) {
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
.course-description {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #374151;
  margin: 1.5rem 0;
}

.access-modes {
  margin-top: 2rem;
  
  h4 {
    margin-bottom: 1rem;
    color: $primary-color;
  }
}

.mode-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.mode-card {
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
  
  h5 {
    margin: 0.5rem 0;
    font-weight: 600;
    color: #1f2937;
  }
  
  p {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.4;
  }
}

// Section Pictogrammes
.pictogrammes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.pictogramme-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: $primary-color;
    transform: translateY(-2px);
  }
  
  &.active {
    border-color: $secondary-color;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
  }
  
  &.revealed {
    border-color: $success-color;
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  }
  
  .picto-icon {
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background: $primary-color;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    
    i {
      font-size: 2rem;
    }
  }
  
  .picto-content {
    flex: 1;
    
    h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
    }
    
    p {
      margin: 0;
      color: #6b7280;
      font-size: 0.875rem;
    }
  }
  
  .audio-btn {
    width: 3rem;
    height: 3rem;
    border: none;
    border-radius: 50%;
    background: $secondary-color;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    
    &:hover {
      background: darken($secondary-color, 10%);
      transform: scale(1.1);
    }
  }
}

.completion-message {
  margin-top: 2rem;
  padding: 1rem;
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border-radius: 0.75rem;
  text-align: center;
  
  p {
    margin: 0;
    color: $success-color;
    font-weight: 600;
  }
}

// Section Séquence
.phrase-construction {
  .target-phrase {
    text-align: center;
    font-size: 1.5rem;
    font-weight: 600;
    color: $primary-color;
    margin: 2rem 0;
    padding: 1rem;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    border-radius: 0.75rem;
  }
}

.phrase-builder {
  .selected-pictos {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin: 2rem 0;
    flex-wrap: wrap;
  }
  
  .selected-picto {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: $success-color;
    color: white;
    border-radius: 0.75rem;
    
    i {
      font-size: 2rem;
    }
    
    span {
      font-weight: 600;
    }
  }
}

.current-selection {
  margin: 2rem 0;
  
  h4 {
    text-align: center;
    color: $primary-color;
    margin-bottom: 1rem;
  }
}

.sequence-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.sequence-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
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
  
  &.correct {
    border-color: $success-color;
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  }
  
  &.incorrect {
    border-color: $danger-color;
    background: linear-gradient(135deg, #fef2f2, #fecaca);
  }
  
  i {
    font-size: 2.5rem;
    color: $primary-color;
  }
  
  span {
    font-weight: 600;
    color: #1f2937;
  }
}

.sequence-success {
  text-align: center;
  margin: 2rem 0;
  
  h4 {
    color: $success-color;
    margin-bottom: 1rem;
  }
}

.complete-phrase {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
  
  .final-picto {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border-radius: 0.75rem;
    
    i {
      font-size: 2rem;
      color: $secondary-color;
    }
    
    span {
      font-weight: 600;
      color: #92400e;
    }
  }
}

// Section Activité
.phrase-selector {
  margin-bottom: 2rem;
  
  h4 {
    color: $primary-color;
    margin-bottom: 1rem;
  }
}

.phrase-options {
  display: grid;
  gap: 1rem;
}

.phrase-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: $primary-color;
  }
  
  &.selected {
    border-color: $primary-color;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
  }
  
  .phrase-number {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: $primary-color;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }
  
  .phrase-text {
    flex: 1;
    font-weight: 500;
    color: #1f2937;
  }
}

.phrase-construction-activity {
  margin-top: 2rem;
  
  .target-display {
    text-align: center;
    margin-bottom: 2rem;
    
    h4 {
      color: $primary-color;
    }
  }
}

.construction-area {
  .built-phrase {
    min-height: 5rem;
    padding: 1rem;
    border: 2px dashed #e5e7eb;
    border-radius: 0.75rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }
  
  .built-picto {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: $primary-color;
    color: white;
    border-radius: 0.75rem;
    
    i {
      font-size: 1.5rem;
    }
    
    span {
      font-weight: 600;
      font-size: 0.875rem;
    }
  }
  
  .available-pictos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }
  
  .available-picto {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover:not(.disabled) {
      border-color: $primary-color;
      transform: translateY(-2px);
    }
    
    &.highlighted {
      border-color: $secondary-color;
      background: linear-gradient(135deg, #fef3c7, #fde68a);
    }
    
    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    i {
      font-size: 1.5rem;
      color: $primary-color;
    }
    
    span {
      font-weight: 600;
      font-size: 0.875rem;
      color: #1f2937;
    }
  }
}

.activity-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 2rem 0;
  
  .clear-btn, .validate-btn {
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
  
  .clear-btn {
    background: #f3f4f6;
    color: #374151;
    border: 2px solid #e5e7eb;
    
    &:hover:not(:disabled) {
      background: #e5e7eb;
    }
  }
  
  .validate-btn {
    background: $success-color;
    color: white;
    
    &:hover:not(:disabled) {
      background: darken($success-color, 10%);
    }
  }
}

.phrase-feedback {
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: 0.75rem;
  text-align: center;
  
  &.correct-feedback {
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border: 2px solid $success-color;
    
    h4 {
      color: $success-color;
    }
  }
  
  &.incorrect-feedback {
    background: linear-gradient(135deg, #fef2f2, #fecaca);
    border: 2px solid $danger-color;
    
    h4 {
      color: $danger-color;
    }
  }
  
  h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
  }
  
  p {
    margin: 0;
    color: #374151;
  }
}

// Section Création
.creation-workspace {
  margin: 2rem 0;
  
  .created-phrase {
    min-height: 6rem;
    padding: 1rem;
    border: 2px dashed #e5e7eb;
    border-radius: 0.75rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    
    .empty-phrase {
      color: #9ca3af;
      font-style: italic;
    }
  }
  
  .created-picto {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: $primary-color;
    color: white;
    border-radius: 0.75rem;
    position: relative;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      background: darken($primary-color, 10%);
    }
    
    i {
      font-size: 1.5rem;
    }
    
    span {
      font-weight: 600;
      font-size: 0.875rem;
    }
    
    .remove-btn {
      position: absolute;
      top: -0.5rem;
      right: -0.5rem;
      width: 1.5rem;
      height: 1.5rem;
      background: $danger-color;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      
      i {
        font-size: 1rem;
      }
    }
  }
  
  .creation-pictos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }
  
  .creation-picto {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover:not(.faded) {
      border-color: $primary-color;
      transform: translateY(-2px);
    }
    
    &.highlighted {
      border-color: $secondary-color;
      background: linear-gradient(135deg, #fef3c7, #fde68a);
    }
    
    &.faded {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    i {
      font-size: 1.5rem;
      color: $primary-color;
    }
    
    span {
      font-weight: 600;
      font-size: 0.875rem;
      color: #1f2937;
    }
  }
}

.creation-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 2rem 0;
  
  .clear-btn, .validate-btn {
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
  
  .clear-btn {
    background: #f3f4f6;
    color: #374151;
    border: 2px solid #e5e7eb;
    
    &:hover:not(:disabled) {
      background: #e5e7eb;
    }
  }
  
  .validate-btn {
    background: $success-color;
    color: white;
    
    &:hover:not(:disabled) {
      background: darken($success-color, 10%);
    }
  }
}

.creation-result {
  margin-top: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border-radius: 0.75rem;
  text-align: center;
  
  h4 {
    color: $success-color;
    margin-bottom: 1rem;
  }
  
  .final-creation {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin: 1rem 0;
    flex-wrap: wrap;
    
    .final-picto {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: $success-color;
      color: white;
      border-radius: 0.75rem;
      
      i {
        font-size: 1.5rem;
      }
      
      span {
        font-weight: 600;
        font-size: 0.875rem;
      }
    }
  }
  
  .creation-text {
    font-size: 1.2rem;
    font-weight: 600;
    color: #059669;
    margin: 0;
  }
}

// Section Conclusion
.conclusion-summary {
  .achievement-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin: 2rem 0;
  }
  
  .achievement-card {
    padding: 1.5rem;
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border: 2px solid #e5e7eb;
    border-radius: 1rem;
    text-align: center;
    
    i {
      font-size: 2.5rem;
      color: $primary-color;
      margin-bottom: 1rem;
    }
    
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
  
  .conclusion-message {
    text-align: center;
    margin: 2rem 0;
    
    h4 {
      color: $success-color;
      margin-bottom: 1rem;
    }
    
    p {
      color: #374151;
      line-height: 1.6;
    }
  }
  
  .next-steps {
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    padding: 1.5rem;
    border-radius: 0.75rem;
    margin-top: 2rem;
    text-align: left;
    
    h5 {
      color: $primary-color;
      margin: 0 0 1rem 0;
    }
    
    ul {
      margin: 0;
      padding-left: 1.5rem;
      
      li {
        color: #374151;
        margin: 0.5rem 0;
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
  
  .mode-cards {
    grid-template-columns: 1fr;
  }
  
  .pictogrammes-grid {
    grid-template-columns: 1fr;
  }
  
  .sequence-options {
    grid-template-columns: 1fr;
  }
  
  .creation-pictos {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
  
  .final-actions {
    flex-direction: column;
  }
}

// Mode sombre désactivé - fond blanc forcé
@media (prefers-color-scheme: dark) {
  .cours-communication {
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
.mode-card:focus-visible,
.pictogramme-card:focus-visible,
.sequence-option:focus-visible {
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