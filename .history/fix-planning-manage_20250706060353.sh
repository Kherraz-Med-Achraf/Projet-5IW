#!/bin/bash

# Script pour corriger les styles du planning manage

FILE="frontend/src/views/planning/PlanningManageView.vue"

# 1. Changer la couleur du h1 en blanc (dans le main-header uniquement)
sed -i '' '/\.main-header {/,/}/ s/color: #1f2937;/color: white;/' "$FILE"

# 2. Changer la couleur de l'icône du h1 en blanc (dans le main-header uniquement)
sed -i '' '/\.main-header {/,/}/ s/color: #4338ca;/color: white;/' "$FILE"

# 3. Remplacer complètement le style info-note
sed -i '' '/\.info-note {/,/}/ c\
.info-note {\
  display: flex;\
  align-items: center;\
  gap: 0.5rem;\
  padding: 1rem;\
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);\
  border: 1px solid #bfdbfe;\
  border-radius: 0.75rem;\
  color: #1e40af;\
  font-size: 0.875rem;\
  font-weight: 500;\
\
  .material-icons {\
    color: #3b82f6;\
    font-size: 1.25rem;\
  }\
}' "$FILE"

echo "Modifications appliquées avec succès!" 