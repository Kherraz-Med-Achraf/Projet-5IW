<!-- src/views/journal/JournalHomeParent.vue -->
<template>
  <div class="journal-parent-container">
    <!-- Header moderne avec sémantique appropriée -->
    <header class="page-header" role="banner">
      <div class="header-content">
        <h1 class="page-title">
          <span class="material-icons" aria-hidden="true">book</span>
          Journal de bord
        </h1>
        <p class="page-subtitle">Consultez les rapports mensuels de vos enfants</p>
      </div>
    </header>

    <!-- Navigation principale -->
    <nav class="selection-section" aria-label="Sélection enfant et année">
      <!-- Sélection de l'enfant -->
      <section class="selection-card" aria-labelledby="child-selection-title">
        <div class="card-header">
          <span class="material-icons" aria-hidden="true">child_care</span>
          <h2 id="child-selection-title">Sélection de l'enfant</h2>
        </div>
        <div class="card-content">
          <div class="form-group">
            <label for="child-select" class="form-label">
              Enfant :
              <span class="sr-only">Sélectionnez un enfant dans la liste</span>
            </label>
            <select
              id="child-select"
              v-model="selectedChildId"
              @change="onChildChange"
              class="form-select"
              :aria-describedby="children.length === 0 ? 'child-empty-message' : undefined"
              :disabled="children.length === 0"
            >
              <option disabled value="">-- Choisir un enfant --</option>
              <option v-for="child in children" :key="child.id" :value="child.id">
                {{ child.firstName }} {{ child.lastName }}
              </option>
            </select>
            <div v-if="children.length === 0" id="child-empty-message" class="help-text" role="status">
              Aucun enfant disponible
            </div>
          </div>
        </div>
      </section>

      <!-- Sélection de l'année scolaire -->
      <section v-if="selectedChildId" class="selection-card" aria-labelledby="year-selection-title">
        <div class="card-header">
          <span class="material-icons" aria-hidden="true">calendar_today</span>
          <h2 id="year-selection-title">Année scolaire</h2>
        </div>
        <div class="card-content">
          <div class="form-group">
            <label for="year-select" class="form-label">
              Année :
              <span class="sr-only">Sélectionnez une année scolaire</span>
            </label>
            <select
              id="year-select"
              v-model="selectedYearId"
              @change="onYearChange"
              class="form-select"
              :aria-describedby="academicYears.length === 0 ? 'year-empty-message' : undefined"
              :disabled="academicYears.length === 0"
            >
              <option disabled value="">-- Choisir une année --</option>
              <option v-for="year in academicYears" :key="year.id" :value="year.id">
                {{ year.label }}
              </option>
            </select>
            <div v-if="academicYears.length === 0" id="year-empty-message" class="help-text" role="status">
              Aucune année scolaire disponible
            </div>
          </div>
        </div>
      </section>
    </nav>

    <!-- Actions principales -->
    <section v-if="selectedChildId && selectedYearId && hasAnySubmittedJournal" 
             class="actions-section" 
             aria-labelledby="actions-title">
      <div class="actions-card">
        <div class="card-header">
          <span class="material-icons" aria-hidden="true">picture_as_pdf</span>
          <h2 id="actions-title">Export PDF</h2>
        </div>
        <div class="card-content">
          <button @click="exportYearReport" 
                  class="btn btn-primary"
                  :aria-describedby="submittedCount > 0 ? 'export-description' : undefined"
                  :disabled="submittedCount === 0">
            <span class="material-icons" aria-hidden="true">download</span>
            Télécharger le journal complet
            <span class="sr-only">au format PDF</span>
          </button>
          <p id="export-description" class="action-description">
            Génère un PDF professionnel avec tous les rapports mensuels de l'année
            ({{ submittedCount }} rapport{{ submittedCount > 1 ? 's' : '' }} disponible{{ submittedCount > 1 ? 's' : '' }})
          </p>
        </div>
      </div>
    </section>

    <!-- Grille des mois moderne -->
    <main v-if="selectedChildId && selectedYearId" class="months-section" role="main" aria-labelledby="months-title">
      <header class="months-header">
        <h2 id="months-title" class="section-title">
          <span class="material-icons" aria-hidden="true">event_note</span>
          Rapports mensuels
        </h2>
        <div class="months-stats" role="status" aria-label="Statistiques des rapports">
          <div class="stat-item">
            <span class="stat-value" aria-label="{{ submittedCount }} rapports disponibles">{{ submittedCount }}</span>
            <span class="stat-label">Disponibles</span>
          </div>
          <div class="stat-item">
            <span class="stat-value" aria-label="{{ 12 - submittedCount }} rapports en attente">{{ 12 - submittedCount }}</span>
            <span class="stat-label">En attente</span>
          </div>
        </div>
      </header>

      <div class="months-grid" role="grid" aria-label="Grille des rapports mensuels">
        <article
          v-for="monthNum in 12"
          :key="monthNum"
          class="month-card"
          :class="{
            'month-card--available': journalExists(monthNum),
            'month-card--unavailable': !journalExists(monthNum)
          }"
          role="gridcell"
          :aria-label="`Rapport de ${monthNames[monthNum - 1]} ${journalExists(monthNum) ? 'disponible' : 'non disponible'}`"
        >
          <header class="month-header">
            <span class="month-number" aria-hidden="true">{{ monthNum.toString().padStart(2, '0') }}</span>
            <h3 class="month-name">{{ monthNames[monthNum - 1] }}</h3>
          </header>
          
          <div class="month-content">
            <div v-if="journalExists(monthNum)" class="month-available">
              <div class="status-badge status-badge--success" role="status">
                <span class="material-icons" aria-hidden="true">check_circle</span>
                <span aria-label="Rapport disponible">Disponible</span>
              </div>
              <button @click="viewReport(monthNum)" 
                      class="btn btn-outline"
                      :aria-label="`Consulter le rapport de ${monthNames[monthNum - 1]}`">
                <span class="material-icons" aria-hidden="true">visibility</span>
                Consulter
              </button>
            </div>
            
            <div v-else class="month-unavailable">
              <div class="status-badge status-badge--pending" role="status">
                <span class="material-icons" aria-hidden="true">schedule</span>
                <span aria-label="Rapport en attente">En attente</span>
              </div>
              <p class="unavailable-text">Rapport non disponible</p>
            </div>
          </div>
        </article>
      </div>
    </main>

    <!-- État vide moderne -->
    <div v-if="!selectedChildId || !selectedYearId" class="empty-state" role="status" aria-live="polite">
      <div class="empty-icon" aria-hidden="true">
        <span class="material-icons">auto_stories</span>
      </div>
      <h3 class="empty-title">Sélectionnez un enfant et une année</h3>
      <p class="empty-description">
        Choisissez un enfant et une année scolaire pour consulter les rapports mensuels disponibles.
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="journalStore.loading" class="loading-state" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p>Chargement des données...</p>
    </div>

    <!-- Messages d'erreur -->
    <div v-if="journalStore.error" class="error-state" role="alert" aria-live="assertive">
      <span class="material-icons" aria-hidden="true">error</span>
      <p>{{ journalStore.error }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { useChildStore } from "@/stores/childStore";
import { useJournalStore } from "@/stores/journalStore";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import { jsPDF } from "jspdf";

const childStore = useChildStore();
const journalStore = useJournalStore();
const authStore = useAuthStore();
const router = useRouter();

// Listes et sélections réactives
const children = ref<
  Array<{ id: number; firstName: string; lastName: string }>
>([]);
const academicYears = ref<Array<{ id: number; label: string }>>([]);
const selectedChildId = ref<number | "">("");
const selectedYearId = ref<number | "">("");

// Journaux récupérés pour l'enfant + année
const journals = computed(() => journalStore.journals);

// Tableau des noms de mois
const monthNames = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Stats computed
const submittedCount = computed(() => {
  return journals.value.filter(j => j.isSubmitted).length;
});

// Au montage, charger la liste des enfants du parent et des années
onMounted(async () => {
  // Récupération des enfants du parent connecté
  if (!childStore.referentChildren.length) {
    await childStore.fetchReferentChildren();
  }
  children.value = childStore.referentChildren.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
  }));

  // Récupération des années scolaires
  if (!journalStore.academicYears.length) {
    await journalStore.fetchAcademicYears();
  }
  academicYears.value = journalStore.academicYears.map((y) => ({
    id: y.id,
    label: y.label,
  }));
});

// Quand l'enfant change, on efface l'année sélectionnée et la grille
function onChildChange() {
  selectedYearId.value = "";
  journalStore.journals = [];
}

// Quand l'année change, on va chercher les journaux correspondants
async function onYearChange() {
  if (selectedChildId.value && selectedYearId.value) {
    await journalStore.fetchJournals(
      selectedChildId.value,
      selectedYearId.value
    );
  }
}

// Vérifie si un journal existe ET est soumis pour un mois donné
function journalExists(month: number): boolean {
  return journals.value.some((j) => j.month === month && j.isSubmitted);
}

// Indique s'il y a au moins un journal soumis dans l'année
const hasAnySubmittedJournal = computed(() => {
  return journals.value.some((j) => j.isSubmitted);
});

// Redirection vers la page de consultation du journal de bord
function viewReport(month: number) {
  router.push({
    name: "JournalMonth",
    params: {
      childId: selectedChildId.value,
      yearId: selectedYearId.value,
      month,
    },
  });
}

// Fonction de nettoyage pour PDF
function sanitizePdfText(text: string): string {
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\u00C0-\u017F]/g, '');
}

// Export PDF professionnel harmonisé avec la version staff
async function exportYearReport() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = margin;

  // Couleurs harmonisées
  const primaryColor = [68, 68, 172]; // #4444ac
  const secondaryColor = [107, 114, 128]; // #6b7280
  const lightGray = [249, 250, 251]; // #f9fafb
  const darkGray = [31, 41, 55]; // #1f2937

  // === HEADER PROFESSIONNEL ===
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('JOURNAL ANNUEL', margin, 25);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Institut Médico-Éducatif', margin, 35);

  const today = new Date().toLocaleDateString('fr-FR');
  doc.setFontSize(10);
  const dateText = `Généré le ${today}`;
  const dateWidth = doc.getTextWidth(dateText);
  doc.text(dateText, pageWidth - margin - dateWidth, 15);

  currentY = 70;

  // === INFORMATIONS ENFANT ===
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(margin, currentY, contentWidth, 35, 'F');
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(margin, currentY, contentWidth, 35, 'S');

  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS', margin + 10, currentY + 15);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Enfant : ${sanitizePdfText(childDisplayName.value)}`, margin + 10, currentY + 25);
  doc.text(`Année scolaire : ${sanitizePdfText(yearLabel.value)}`, margin + 10, currentY + 32);

  currentY += 55;

  // === RAPPORTS MENSUELS ===
  const submittedJournals = journals.value
    .filter((j) => j.isSubmitted)
    .sort((a, b) => a.month - b.month);

  if (submittedJournals.length > 0) {
    // Titre de section
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(3);
    doc.line(margin, currentY, margin + 30, currentY);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORTS MENSUELS', margin + 35, currentY + 2);
    
    currentY += 20;

    submittedJournals.forEach((journal, index) => {
      // Vérifier la place disponible
      if (currentY + 60 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }

      const monthLabel = monthNames[journal.month - 1];
      
      // Numéro du mois dans un cercle
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.circle(margin + 8, currentY + 8, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(journal.month.toString(), margin + 6, currentY + 10);

      // Nom du mois
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(monthLabel, margin + 20, currentY + 10);
      
      currentY += 18;

      // Contenu du rapport
      if (journal.contenu && journal.contenu.trim()) {
        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const observations = sanitizePdfText(journal.contenu);
        const wrappedText = doc.splitTextToSize(observations, contentWidth - 40);
        
        // Fond gris pour le contenu
        const textHeight = wrappedText.length * 6 + 16;
        doc.setFillColor(248, 250, 252);
        doc.rect(margin + 15, currentY, contentWidth - 15, textHeight, 'F');
        doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setLineWidth(0.5);
        doc.rect(margin + 15, currentY, contentWidth - 15, textHeight, 'S');
        
        doc.text(wrappedText, margin + 20, currentY + 10);
        currentY += textHeight + 10;
      } else {
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Aucune observation renseignée', margin + 20, currentY + 5);
        currentY += 15;
      }

      // Ligne de séparation
      if (index < submittedJournals.length - 1) {
        doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.setLineWidth(0.5);
        doc.line(margin + 20, currentY, pageWidth - margin, currentY);
        currentY += 15;
      }
    });
  } else {
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text('Aucun rapport disponible pour cette année.', margin, currentY);
  }

  // === FOOTER PROFESSIONNEL ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Ligne de séparation
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1);
    doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

    // Texte du footer
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Document généré automatiquement par le système de gestion IME', margin, pageHeight - 15);
    
    // Numéro de page
    doc.text(`Page ${i} sur ${totalPages}`, pageWidth - margin - 30, pageHeight - 15);
  }

  // === SAUVEGARDE ===
  const fileName = `Journal_Annuel_${sanitizePdfText(childFileLabel.value)}_${sanitizePdfText(yearLabel.value)}.pdf`;
  doc.save(fileName);
}

// Computed pour les noms et labels
const childDisplayName = computed(() => {
  const c = children.value.find((c) => c.id === selectedChildId.value);
  return c ? `${c.firstName} ${c.lastName}` : "";
});

const childFileLabel = computed(() => {
  const c = children.value.find((c) => c.id === selectedChildId.value);
  return c ? `${c.firstName}_${c.lastName}` : "";
});

const yearLabel = computed(() => {
  const y = academicYears.value.find((y) => y.id === selectedYearId.value);
  return y ? y.label : "";
});
</script>

<style scoped lang="scss">
/* Variables CSS modernes */
:root {
  --primary-color: #4444ac;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --background-light: #f9fafb;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Container principal */
.journal-parent-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  min-height: calc(100vh - 120px);
}

/* Header de page moderne */
.page-header {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);

  .header-content {
    text-align: center;
    max-width: 600px;
    margin: 0 auto;
  }

  .page-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-size: 2.25rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;

    .material-icons {
      font-size: 2.5rem;
      color: var(--primary-color);
    }
  }

  .page-subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin: 0;
    font-weight: 500;
  }
}

/* Section de sélection */
.selection-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.selection-card {
  background: white;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .card-header {
    background: var(--background-light);
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .material-icons {
      color: var(--primary-color);
      font-size: 1.5rem;
    }

    h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .card-content {
    padding: 1.5rem;
  }
}

/* Formulaires */
.form-group {
  .form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-select {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    color: var(--text-primary);
    background: white;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
    }

    &:hover {
      border-color: var(--primary-color);
    }
  }
}

/* Section d'actions */
.actions-section {
  margin-bottom: 2rem;

  .actions-card {
    background: white;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-md);
    overflow: hidden;

    .card-header {
      background: var(--background-light);
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .material-icons {
        color: var(--primary-color);
        font-size: 1.5rem;
      }

      h2 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .card-content {
      padding: 1.5rem;
      text-align: center;
    }

    .action-description {
      margin: 1rem 0 0 0;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
  }
}

/* Boutons modernes */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;

  .material-icons {
    font-size: 1.125rem;
  }

  &.btn-primary {
    background: var(--primary-color);
    color: white;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &.btn-outline {
    background: transparent;
    color: var(--primary-color);
    border: 2px solid var(--primary-color);

    &:hover {
      background: var(--primary-color);
      color: white;
    }
  }
}

/* Section des mois */
.months-section {
  background: white;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  margin-bottom: 2rem;

  .months-header {
    background: var(--background-light);
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);

      .material-icons {
        color: var(--primary-color);
        font-size: 1.5rem;
      }
    }

    .months-stats {
      display: flex;
      gap: 2rem;

      .stat-item {
        text-align: center;

        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary-color);
        }

        .stat-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      }
    }
  }

  .months-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    padding: 1.5rem;
  }
}

/* Cartes des mois */
.month-card {
  border: 2px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;

  &.month-card--available {
    border-color: var(--success-color);
    background: rgba(16, 185, 129, 0.02);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);
    }
  }

  &.month-card--unavailable {
    border-color: var(--border-color);
    background: var(--background-light);
  }

  .month-header {
    padding: 1rem;
    background: white;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .month-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: var(--primary-color);
      color: white;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.875rem;
    }

    .month-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .month-content {
    padding: 1rem;

    .month-available,
    .month-unavailable {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
      text-align: center;
    }

    .unavailable-text {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
  }
}

/* Badges de statut */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  .material-icons {
    font-size: 1rem;
  }

  &.status-badge--success {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success-color);
  }

  &.status-badge--pending {
    background: rgba(245, 158, 11, 0.1);
    color: var(--warning-color);
  }
}

/* État vide moderne */
.empty-state {
  background: white;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  padding: 4rem 2rem;
  text-align: center;
  box-shadow: var(--shadow-md);

  .empty-icon {
    margin-bottom: 1.5rem;

    .material-icons {
      font-size: 4rem;
      color: var(--text-secondary);
      opacity: 0.6;
    }
  }

  .empty-title {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .empty-description {
    margin: 0;
    color: var(--text-secondary);
    font-size: 1rem;
    line-height: 1.6;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
}

/* Loading state */
.loading-state {
  background: white;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  padding: 3rem 2rem;
  text-align: center;
  box-shadow: var(--shadow-md);

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color);
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem auto;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-weight: 500;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive design */
@media (max-width: 768px) {
  .journal-parent-container {
    padding: 0 0.5rem;
  }

  .page-header {
    padding: 1.5rem;
    margin-bottom: 1.5rem;

    .page-title {
      font-size: 1.875rem;

      .material-icons {
        font-size: 2rem;
      }
    }

    .page-subtitle {
      font-size: 1rem;
    }
  }

  .selection-section {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .months-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .months-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }

  .empty-state {
    padding: 3rem 1.5rem;

    .empty-icon .material-icons {
      font-size: 3rem;
    }

    .empty-title {
      font-size: 1.25rem;
    }
  }
}
</style>
