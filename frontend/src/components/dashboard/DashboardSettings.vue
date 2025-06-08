<template>
  <div class="dashboard-settings">
    <div class="settings-header">
      <h3>Paramètres</h3>
      <button class="btn-primary" @click="saveSettings">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="20,6 9,17 4,12" />
        </svg>
        Enregistrer
      </button>
    </div>

    <div class="settings-content">
      <div class="settings-section">
        <h4>Profil utilisateur</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Nom complet</label>
            <input v-model="profile.name" type="text" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="profile.email" type="email" />
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input v-model="profile.phone" type="tel" />
          </div>
          <div class="form-group">
            <label>Poste</label>
            <input v-model="profile.position" type="text" />
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h4>Préférences</h4>
        <div class="preferences-list">
          <div class="preference-item">
            <div class="preference-info">
              <h5>Notifications par email</h5>
              <p>Recevoir les notifications importantes par email</p>
            </div>
            <div class="preference-control">
              <label class="toggle">
                <input
                  v-model="preferences.emailNotifications"
                  type="checkbox"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="preference-item">
            <div class="preference-info">
              <h5>Notifications push</h5>
              <p>Recevoir les alertes en temps réel</p>
            </div>
            <div class="preference-control">
              <label class="toggle">
                <input
                  v-model="preferences.pushNotifications"
                  type="checkbox"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="preference-item">
            <div class="preference-info">
              <h5>Mode sombre</h5>
              <p>Utiliser le thème sombre pour l'interface</p>
            </div>
            <div class="preference-control">
              <label class="toggle">
                <input v-model="preferences.darkMode" type="checkbox" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="preference-item">
            <div class="preference-info">
              <h5>Rapports hebdomadaires</h5>
              <p>Recevoir un résumé hebdomadaire par email</p>
            </div>
            <div class="preference-control">
              <label class="toggle">
                <input v-model="preferences.weeklyReports" type="checkbox" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h4>Sécurité</h4>
        <div class="security-options">
          <div class="security-item">
            <div class="security-info">
              <h5>Authentification à deux facteurs</h5>
              <p>Ajouter une couche de sécurité supplémentaire</p>
            </div>
            <button class="btn-secondary">Configurer</button>
          </div>

          <div class="security-item">
            <div class="security-info">
              <h5>Changer le mot de passe</h5>
              <p>Mettre à jour votre mot de passe de connexion</p>
            </div>
            <button class="btn-secondary">Modifier</button>
          </div>

          <div class="security-item">
            <div class="security-info">
              <h5>Sessions actives</h5>
              <p>Gérer les appareils connectés à votre compte</p>
            </div>
            <button class="btn-secondary">Voir les sessions</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h4>Données et confidentialité</h4>
        <div class="privacy-options">
          <div class="privacy-item">
            <div class="privacy-info">
              <h5>Exporter mes données</h5>
              <p>Télécharger une copie de toutes vos données</p>
            </div>
            <button class="btn-secondary">Exporter</button>
          </div>

          <div class="privacy-item">
            <div class="privacy-info">
              <h5>Supprimer mon compte</h5>
              <p>Supprimer définitivement votre compte et toutes vos données</p>
            </div>
            <button class="btn-danger">Supprimer</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useToast } from "vue-toastification";

const toast = useToast();

const profile = ref({
  name: "Jean Dupont",
  email: "jean.dupont@example.com",
  phone: "+33 1 23 45 67 89",
  position: "Administrateur système",
});

const preferences = ref({
  emailNotifications: true,
  pushNotifications: false,
  darkMode: false,
  weeklyReports: true,
});

function saveSettings() {
  // Simulation de sauvegarde
  toast.success("Paramètres enregistrés avec succès !");
}
</script>

<style scoped lang="scss">
.dashboard-settings {
  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;

    h3 {
      margin: 0;
      color: #111827;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background-color: $primary-color;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;

      &:hover {
        background-color: darken($primary-color, 10%);
      }
    }
  }

  .settings-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .settings-section {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;

    h4 {
      margin: 0 0 1.5rem 0;
      color: #111827;
      font-size: 1.125rem;
      font-weight: 600;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 0.75rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        label {
          color: #374151;
          font-weight: 500;
          font-size: 0.875rem;
        }

        input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;

          &:focus {
            outline: none;
            border-color: $primary-color;
          }
        }
      }
    }

    .preferences-list,
    .security-options,
    .privacy-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .preference-item,
    .security-item,
    .privacy-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 6px;

      .preference-info,
      .security-info,
      .privacy-info {
        h5 {
          margin: 0 0 0.25rem 0;
          color: #111827;
          font-size: 0.875rem;
          font-weight: 500;
        }

        p {
          margin: 0;
          color: #6b7280;
          font-size: 0.75rem;
        }
      }

      .preference-control {
        .toggle {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;

          input {
            opacity: 0;
            width: 0;
            height: 0;

            &:checked + .toggle-slider {
              background-color: $primary-color;

              &:before {
                transform: translateX(24px);
              }
            }
          }

          .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: 0.2s;
            border-radius: 24px;

            &:before {
              position: absolute;
              content: "";
              height: 18px;
              width: 18px;
              left: 3px;
              bottom: 3px;
              background-color: white;
              transition: 0.2s;
              border-radius: 50%;
            }
          }
        }
      }

      .btn-secondary {
        padding: 0.5rem 1rem;
        background-color: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;

        &:hover {
          background-color: #e5e7eb;
        }
      }

      .btn-danger {
        padding: 0.5rem 1rem;
        background-color: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;

        &:hover {
          background-color: #fee2e2;
        }
      }
    }
  }
}
</style>
