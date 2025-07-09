<!-- src/views/journal/JournalHomeParent.vue -->
<template>
  <main class="profile-container" role="main" lang="fr">
    <div class="profile-content">
      <!-- Loading State -->
      <div v-if="journalStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
        <h3>Chargement des données</h3>
        <p>Veuillez patienter...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="journalStore.error" class="error-state">
        <span class="material-icons">error</span>
        <div>
          <h3>Erreur de chargement</h3>
          <p>{{ journalStore.error }}</p>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else class="journal-parent-container">
        <!-- Header -->
        <div class="content-grid">
          <PageHeader 
            title="Journal de bord" 
            subtitle="Consultez les rapports mensuels de vos enfants"
            icon="auto_stories"
          />
        </div>

        <!-- Selection Section -->
        <section class="profile-section">
          <div class="section-header">
            <div class="section-title">
              <div class="section-icon">
                <span class="material-icons">tune</span>
              </div>
              <div>
                <h2>Sélection</h2>
                <p>Choisissez un enfant et une année scolaire</p>
              </div>
            </div>
          </div>

          <div class="section-content">
            <!-- Child Selection -->
            <div class="form-group">
              <label for="child-select" class="form-label">Enfant</label>
              <select
                id="child-select"
                v-model="selectedChildId"
                @change="onChildChange"
                class="form-select"
                :disabled="children.length === 0"
              >
                <option disabled value="">-- Choisir un enfant --</option>
                <option v-for="child in children" :key="child.id" :value="child.id">
                  {{ child.firstName }} {{ child.lastName }}
                </option>
              </select>
              <div v-if="children.length === 0" class="help-text">
                Aucun enfant disponible
              </div>
            </div>

            <!-- Year Selection -->
            <div v-if="selectedChildId" class="form-group">
              <label for="year-select" class="form-label">Année scolaire</label>
              <select
                id="year-select"
                v-model="selectedYearId"
                @change="onYearChange"
                class="form-select"
                :disabled="academicYears.length === 0"
              >
                <option disabled value="">-- Choisir une année --</option>
                <option v-for="year in academicYears" :key="year.id" :value="year.id">
                  {{ year.label }}
                </option>
              </select>
              <div v-if="academicYears.length === 0" class="help-text">
                Aucune année scolaire disponible
              </div>
            </div>
          </div>
        </section>

        <!-- Export Section -->
        <section v-if="selectedChildId && selectedYearId && hasAnySubmittedJournal" class="profile-section">
          <div class="section-header">
            <div class="section-title">
              <div class="section-icon">
                <span class="material-icons">picture_as_pdf</span>
              </div>
              <div>
                <h2>Export PDF</h2>
                <p>{{ submittedCount }} rapport{{ submittedCount > 1 ? 's' : '' }} disponible{{ submittedCount > 1 ? 's' : '' }}</p>
              </div>
            </div>
          </div>

          <div class="section-content">
            <button @click="exportYearReport" class="edit-btn edit-btn-success">
              <span class="material-icons">download</span>
              Télécharger le journal complet
            </button>
            <p class="export-description">
              Génère un PDF professionnel avec tous les rapports mensuels de l'année
            </p>
          </div>
        </section>

        <!-- Months Grid -->
        <section v-if="selectedChildId && selectedYearId" class="profile-section">
          <div class="section-header">
            <div class="section-title">
              <div class="section-icon">
                <span class="material-icons">event_note</span>
              </div>
              <div>
                <h2>Rapports mensuels</h2>
                <p>{{ childDisplayName }} - {{ yearLabel }}</p>
              </div>
            </div>
            <div class="stats-summary">
              <div class="stat-item">
                <span class="stat-value">{{ submittedCount }}</span>
                <span class="stat-label">Disponibles</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ 12 - submittedCount }}</span>
                <span class="stat-label">En attente</span>
              </div>
            </div>
          </div>

          <div class="section-content">
            <div class="months-grid">
              <div
                v-for="(monthName, index) in monthNames"
                :key="index"
                class="month-card"
                :class="{
                  'month-available': journalExists(monthNumbers[index]),
                  'month-unavailable': !journalExists(monthNumbers[index])
                }"
              >
                <div class="month-header">
                  <span class="month-number">{{ monthNumbers[index].toString().padStart(2, '0') }}</span>
                  <h3 class="month-name">{{ monthName }}</h3>
                </div>
                
                <div class="month-content">
                  <div v-if="journalExists(monthNumbers[index])" class="month-available-content">
                    <div class="status-badge status-success">
                      <span class="material-icons">check_circle</span>
                      <span>Disponible</span>
                    </div>
                    <button @click="viewReport(monthNumbers[index])" class="edit-btn edit-btn-sm">
                      <span class="material-icons">visibility</span>
                      Consulter
                    </button>
                  </div>
                  
                  <div v-else class="month-unavailable-content">
                    <div class="status-badge status-pending">
                      <span class="material-icons">schedule</span>
                      <span>En attente</span>
                    </div>
                    <p class="unavailable-text">Rapport non disponible</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Empty State -->
        <div v-if="!selectedChildId || !selectedYearId" class="empty-state">
          <div class="empty-icon">
            <span class="material-icons">auto_stories</span>
          </div>
          <h3>Sélectionnez un enfant et une année</h3>
          <p>Choisissez un enfant et une année scolaire pour consulter les rapports mensuels disponibles.</p>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useChildStore } from "@/stores/childStore";
import { useJournalStore } from "@/stores/journalStore";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import { jsPDF } from "jspdf";
import { useToast } from "vue-toastification";
import PageHeader from "@/components/PageHeader.vue";

const childStore = useChildStore();
const journalStore = useJournalStore();
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

// Reactive data
const children = ref<Array<{ id: number; firstName: string; lastName: string }>>([]);
const academicYears = ref<Array<{ id: number; label: string }>>([]);
const selectedChildId = ref<number | "">("");
const selectedYearId = ref<number | "">("");

// Computed
const journals = computed(() => journalStore.journals);

// Tableau des noms de mois dans l'ordre de l'année scolaire (septembre à août)
const monthNames = [
  "Septembre", "Octobre", "Novembre", "Décembre",
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août"
];

// Mapping pour convertir l'index d'affichage vers le numéro de mois réel
const monthNumbers = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

const submittedCount = computed(() => {
  return journals.value.filter(j => j.isSubmitted).length;
});

const hasAnySubmittedJournal = computed(() => {
  return journals.value.some((j) => j.isSubmitted);
});

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

// Lifecycle
onMounted(async () => {
  try {
    // Vider complètement les enfants avant de commencer
    children.value = [];
    
    // Toujours refetch pour avoir les données les plus récentes
    await childStore.fetchReferentChildren();
    
    // Filtrer les doublons par ID au cas où le store en contiendrait
    const uniqueChildren = childStore.referentChildren.filter((child, index, self) => 
      index === self.findIndex(c => c.id === child.id)
    );
    
    children.value = uniqueChildren.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
    }));

    // Vider complètement les années scolaires avant de commencer
    academicYears.value = [];
    
    // Toujours refetch pour avoir les données les plus récentes
    await journalStore.fetchAcademicYears();
    
    // Filtrer les doublons par ID au cas où le store en contiendrait
    const uniqueYears = journalStore.academicYears.filter((year, index, self) => 
      index === self.findIndex(y => y.id === year.id)
    );
    
    academicYears.value = uniqueYears.map((y) => ({
      id: y.id,
      label: y.label,
    }));
  } catch (error: any) {
    toast.error(error.message || "Erreur lors du chargement des données");
  }
});

// Methods
function onChildChange() {
  selectedYearId.value = "";
  journalStore.journals = [];
}

async function onYearChange() {
  if (selectedChildId.value && selectedYearId.value) {
    try {
      await journalStore.fetchJournals(selectedChildId.value, selectedYearId.value);
      toast.success("Journaux chargés avec succès");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du chargement des journaux");
    }
  }
}

function journalExists(month: number): boolean {
  return journals.value.some((j) => j.month === month && j.isSubmitted);
}

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

function sanitizePdfText(text: string): string {
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\u00C0-\u017F]/g, '');
}

async function exportYearReport() {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;

    // Couleurs
    const primaryColor = [68, 68, 172];
    const secondaryColor = [107, 114, 128];
    const lightGray = [249, 250, 251];
    const darkGray = [31, 41, 55];

    // Header
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

    // Informations enfant
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

    // Rapports mensuels
    const submittedJournals = journals.value
      .filter((j) => j.isSubmitted)
      .sort((a, b) => a.month - b.month);

    if (submittedJournals.length > 0) {
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

        // Trouver le nom du mois
        const monthIndex = monthNumbers.indexOf(journal.month);
        const monthLabel = monthIndex !== -1 ? monthNames[monthIndex] : `Mois ${journal.month}`;
        
        // Numéro du mois
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
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1);
      doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Document généré automatiquement par le système de gestion IME', margin, pageHeight - 15);
      
      doc.text(`Page ${i} sur ${totalPages}`, pageWidth - margin - 30, pageHeight - 15);
    }

    // Sauvegarde
    const fileName = `Journal_Annuel_${sanitizePdfText(childFileLabel.value)}_${sanitizePdfText(yearLabel.value)}.pdf`;
    doc.save(fileName);
    
    toast.success("PDF généré avec succès !");
  } catch (error: any) {
    toast.error(error.message || "Erreur lors de la génération du PDF");
  }
}
</script>

<style lang="scss" scoped>
/* === MINIMAL CSS - ESSENTIALS ONLY === */

/* Container styles - inherit from global CSS */
.profile-container {
  font-family: 'Satoshi', sans-serif;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 1rem 0;
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Basic sections */
.profile-section {
  background: white;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  padding: 0;
}

.section-header {
  background: #4444ac;
  padding: 2rem 2rem 1rem 2rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 1rem 1rem 0 0;
}

.section-content {
  padding: 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.section-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Add content grid for PageHeader */
.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

/* Selection content */
.section-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #374151;
  font-size: 0.9rem;
}

.form-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-family: inherit;
  font-size: 1rem;
  color: #000000;
}

.form-select:focus {
  outline: none;
  border-color: #4444ac;
  box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
}

.help-text {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #6b7280;
}

.export-description {
  margin: 1rem 0 0 0;
  font-size: 0.9rem;
  color: #6b7280;
}

/* Stats summary */
.stats-summary {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  line-height: 1;
}

.stat-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

/* Months grid */
.months-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.month-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  background: white;
}

.month-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.month-available {
  border-color: #10b981;
}

.month-unavailable {
  opacity: 0.7;
}

.month-header {
  background: #f8fafc;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.month-number {
  background: #4444ac;
  color: white;
  font-size: 1rem;
  font-weight: 700;
  padding: 0.5rem;
  border-radius: 6px;
  min-width: 40px;
  text-align: center;
}

.month-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: #374151;
}

.month-content {
  padding: 1.5rem;
  text-align: center;
}

/* Status badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 1rem;
}

.status-success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.unavailable-text {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0;
}

/* Loading and error states */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #4444ac;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  flex-direction: row;
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin: 1rem 0;
  gap: 1rem;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-icon {
  width: 64px;
  height: 64px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem auto;
}

.empty-icon .material-icons {
  font-size: 2rem;
  color: #9ca3af;
}

/* Responsive */
@media (max-width: 768px) {
  .section-content {
    grid-template-columns: 1fr;
  }
  
  .stats-summary {
    gap: 1rem;
  }
  
  .months-grid {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}
</style>
