#!/bin/bash

FILE="frontend/src/views/planning/PlanningManageView.vue"

# 1. Remplacer le header par le design moderne (lignes 14-25)
sed -i '' '14,25c\
        <!-- En-tête principal moderne -->\
        <div class="planning-header">\
          <div class="header-content">\
            <div class="title-section">\
              <div class="planning-icon">\
                <i class="material-icons">edit_calendar</i>\
              </div>\
              <div class="title-info">\
                <h1 style="color: white;">Gestion des Cours</h1>\
                <p class="subtitle" v-if="selectedStaffName">Planning de {{ selectedStaffName }}</p>\
              </div>\
            </div>\
            \
            <!-- Note d'"'"'information -->\
            <div class="status-indicator">\
              <i class="material-icons">info</i>\
              <span>Annulation et réaffectation des créneaux</span>\
            </div>\
          </div>\
        </div>\
\
        <!-- Panneau de configuration moderne -->\
        <div class="control-panel">\
          <!-- Configuration -->\
          <div class="control-card config-card">\
            <div class="card-header">\
              <i class="material-icons">tune</i>\
              <h3>Configuration</h3>\
            </div>\
            <div class="card-content">' "$FILE"

# 2. Remplacer la partie Configuration et sélection (lignes 27-60)
sed -i '' '27,60c\
              <div class="config-grid">\
                <!-- Sélection semestre -->\
                <div class="config-item">\
                  <label for="semester-select" class="config-label">\
                    <i class="material-icons" aria-hidden="true">event</i>\
                    Semestre\
                  </label>\
                  <select \
                    id="semester-select" \
                    v-model="selectedSemesterId" \
                    @change="loadEvents"\
                    class="config-input"\
                    aria-describedby="semester-help"\
                    :aria-invalid="!selectedSemesterId && semesters.length > 0 ? '"'"'true'"'"' : '"'"'false'"'"'"\
                  >\
                    <option disabled value="">— Choisir un semestre —</option>\
                    <option v-for="s in semesters" :key="s.id" :value="s.id">{{ s.name }}</option>\
                  </select>\
                  <small id="semester-help" class="config-help">\
                    Sélectionnez le semestre pour lequel vous souhaitez gérer les cours\
                  </small>\
                </div>\
\
                <!-- Sélection éducateur -->\
                <div class="config-item">\
                  <label for="staff-select" class="config-label">\
                    <i class="material-icons" aria-hidden="true">person</i>\
                    Éducateur\
                  </label>\
                  <select \
                    id="staff-select" \
                    v-model="selectedStaffId" \
                    @change="loadEvents"\
                    class="config-input"\
                    aria-describedby="staff-help"\
                    :disabled="!selectedSemesterId"\
                    :aria-invalid="!selectedStaffId && staffList.length > 0 && selectedSemesterId ? '"'"'true'"'"' : '"'"'false'"'"'"\
                  >\
                    <option disabled value="">— Choisir un éducateur —</option>\
                    <option v-for="s in staffList" :key="s.userId" :value="s.userId">\
                      {{ s.firstName }} {{ s.lastName }}\
                    </option>\
                  </select>\
                  <small id="staff-help" class="config-help">\
                    Sélectionnez l'"'"'éducateur dont vous souhaitez voir et gérer le planning\
                  </small>\
                </div>\
              </div>\
            </div>\
          </div>' "$FILE"

# 3. Remplacer la section Instructions (lignes 62-77)
sed -i '' '62,77c\
\
          <!-- Instructions -->\
          <div class="control-card instructions-card">\
            <div class="card-header">\
              <i class="material-icons">info</i>\
              <h3>Instructions</h3>\
            </div>\
            <div class="card-content">\
              <div class="instruction-content">\
                <ul role="list">\
                  <li role="listitem"><strong>Clic simple :</strong> Voir les détails du cours et les enfants concernés</li>\
                  <li role="listitem"><strong>Annuler un cours :</strong> Les enfants seront automatiquement réaffectés</li>\
                  <li role="listitem"><strong>Réaffectation :</strong> Transférer les enfants vers un autre créneau</li>\
                </ul>\
              </div>\
            </div>\
          </div>\
        </div>' "$FILE"

# 4. Supprimer la ligne "</section>" orpheline
sed -i '' '79d' "$FILE"

# 5. Ajouter les styles CSS modernes avant /* Sections */
sed -i '' '/^\/\* Sections \*\//i\
/* ===== EN-TÊTE MODERNE ===== */\
.planning-header {\
  background: #4444ac;\
  border-radius: 1.5rem;\
  padding: 2.5rem 2rem;\
  color: white;\
  box-shadow: 0 10px 30px rgba(68, 68, 172, 0.3);\
  margin-bottom: 2rem;\
}\
\
.header-content {\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  flex-wrap: wrap;\
  gap: 1.5rem;\
}\
\
.title-section {\
  display: flex;\
  align-items: center;\
  gap: 1.5rem;\
}\
\
.planning-icon {\
  width: 4rem;\
  height: 4rem;\
  background: rgba(255, 255, 255, 0.2);\
  border-radius: 1rem;\
  display: flex;\
  align-items: center;\
  justify-content: center;\
  backdrop-filter: blur(10px);\
  border: 1px solid rgba(255, 255, 255, 0.3);\
}\
\
.planning-icon i {\
  font-size: 2rem;\
  color: white;\
}\
\
.title-info h1 {\
  margin: 0;\
  font-size: 2.5rem;\
  font-weight: 700;\
  font-family: '"'"'Satoshi'"'"', -apple-system, BlinkMacSystemFont, '"'"'Segoe UI'"'"', Roboto, sans-serif;\
}\
\
.subtitle {\
  margin: 0.5rem 0 0 0;\
  font-size: 1.1rem;\
  opacity: 0.9;\
  font-weight: 400;\
}\
\
.status-indicator {\
  display: flex;\
  align-items: center;\
  gap: 0.75rem;\
  padding: 1rem 1.5rem;\
  border-radius: 1rem;\
  backdrop-filter: blur(10px);\
  border: 1px solid rgba(255, 255, 255, 0.3);\
  font-weight: 600;\
  font-size: 0.9rem;\
  background: rgba(59, 130, 246, 0.9);\
  color: white;\
}\
\
/* ===== PANNEAU DE CONTRÔLE MODERNE ===== */\
.control-panel {\
  display: grid;\
  grid-template-columns: 2fr 1fr;\
  gap: 1.5rem;\
  margin-bottom: 2rem;\
}\
\
.control-card {\
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);\
  border-radius: 1rem;\
  padding: 0;\
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);\
  border: 1px solid #e2e8f0;\
  transition: all 0.3s ease;\
  overflow: hidden;\
}\
\
.control-card:hover {\
  transform: translateY(-2px);\
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);\
}\
\
.card-header {\
  display: flex;\
  align-items: center;\
  gap: 0.75rem;\
  padding: 1.5rem 1.5rem 1rem 1.5rem;\
  border-bottom: 1px solid #f1f5f9;\
}\
\
.card-header i {\
  color: #4338ca;\
  font-size: 1.5rem;\
}\
\
.card-header h3 {\
  margin: 0;\
  font-size: 1.1rem;\
  font-weight: 600;\
  color: #1e293b;\
  font-family: '"'"'Satoshi'"'"', -apple-system, BlinkMacSystemFont, '"'"'Segoe UI'"'"', Roboto, sans-serif;\
}\
\
.card-content {\
  padding: 1rem 1.5rem 1.5rem 1.5rem;\
}\
\
.config-grid {\
  display: grid;\
  grid-template-columns: 1fr 1fr;\
  gap: 1.5rem;\
}\
\
.instruction-content ul {\
  margin: 0;\
  padding-left: 1.5rem;\
}\
\
.instruction-content li {\
  margin-bottom: 0.5rem;\
  line-height: 1.6;\
}\
\
@media (max-width: 768px) {\
  .control-panel {\
    grid-template-columns: 1fr;\
    gap: 1rem;\
  }\
  \
  .config-grid {\
    grid-template-columns: 1fr;\
    gap: 1rem;\
  }\
  \
  .planning-header {\
    padding: 2rem 1.5rem;\
  }\
  \
  .header-content {\
    flex-direction: column;\
    text-align: center;\
  }\
  \
  .title-info h1 {\
    font-size: 2rem;\
  }\
  \
  .planning-icon {\
    width: 3rem;\
    height: 3rem;\
  }\
  \
  .planning-icon i {\
    font-size: 1.5rem;\
  }\
}\
' "$FILE"

echo "✅ Header moderne appliqué avec succès !" 