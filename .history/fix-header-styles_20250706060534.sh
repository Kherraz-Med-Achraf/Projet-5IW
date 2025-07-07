#!/bin/bash

FILE="frontend/src/views/planning/PlanningManageView.vue"

# Ajouter les styles pour le header principal après la section .profile-section
sed -i '' '/^.profile-section {/,/^}$/a\
\
/* Header principal avec style moderne */\
.main-header-section {\
  background: #4444ac;\
  color: white;\
  box-shadow: 0 10px 30px rgba(68, 68, 172, 0.3);\
  margin-bottom: 2rem;\
  font-family: '"'"'Satoshi'"'"', -apple-system, BlinkMacSystemFont, '"'"'Segoe UI'"'"', sans-serif;\
\
  .section-header {\
    border-bottom: none;\
    padding-bottom: 0;\
    margin-bottom: 0;\
    flex-direction: column;\
    align-items: flex-start;\
    gap: 1rem;\
\
    h1 {\
      display: flex;\
      align-items: center;\
      gap: 0.75rem;\
      margin: 0;\
      font-size: 1.875rem;\
      font-weight: 600;\
      color: white;\
      font-family: '"'"'Satoshi'"'"', -apple-system, BlinkMacSystemFont, '"'"'Segoe UI'"'"', sans-serif;\
\
      .material-icons {\
        color: white;\
        font-size: 2rem;\
      }\
    }\
  }\
\
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
  }\
}' "$FILE"

echo "Styles du header principal ajoutés avec succès!" 