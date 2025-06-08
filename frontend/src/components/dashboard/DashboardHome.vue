<template>
  <div class="dashboard-home">
    <div class="welcome-section">
      <h1>Bienvenue dans le tableau de bord APAJH</h1>
      <p>Gérez facilement toutes les entités de votre organisation.</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card" @click="navigateTo('children')">
        <div class="stat-icon">
          <i class="material-icons">child_care</i>
        </div>
        <div class="stat-content">
          <h3>Enfants</h3>
          <p>Gestion des enfants pris en charge</p>
          <span class="click-indicator">
            <i class="material-icons">arrow_forward</i>
          </span>
        </div>
      </div>

      <div class="stat-card" @click="navigateTo('parents')">
        <div class="stat-icon">
          <i class="material-icons">family_restroom</i>
        </div>
        <div class="stat-content">
          <h3>Parents</h3>
          <p>Suivi des familles</p>
          <span class="click-indicator">
            <i class="material-icons">arrow_forward</i>
          </span>
        </div>
      </div>

      <div class="stat-card" @click="navigateTo('directors')">
        <div class="stat-icon">
          <i class="material-icons">admin_panel_settings</i>
        </div>
        <div class="stat-content">
          <h3>Directeurs</h3>
          <p>Administration générale</p>
          <span class="click-indicator">
            <i class="material-icons">arrow_forward</i>
          </span>
        </div>
      </div>

      <div class="stat-card" @click="navigateTo('secretaries')">
        <div class="stat-icon">
          <i class="material-icons">business_center</i>
        </div>
        <div class="stat-content">
          <h3>Secrétaires</h3>
          <p>Gestion administrative</p>
          <span class="click-indicator">
            <i class="material-icons">arrow_forward</i>
          </span>
        </div>
      </div>

      <div class="stat-card" @click="navigateTo('service-managers')">
        <div class="stat-icon">
          <i class="material-icons">supervisor_account</i>
        </div>
        <div class="stat-content">
          <h3>Chefs de service</h3>
          <p>Encadrement des équipes</p>
          <span class="click-indicator">
            <i class="material-icons">arrow_forward</i>
          </span>
        </div>
      </div>

      <div class="stat-card" @click="navigateTo('staff')">
        <div class="stat-icon">
          <i class="material-icons">groups</i>
        </div>
        <div class="stat-content">
          <h3>Personnel</h3>
          <p>Équipes spécialisées</p>
          <span class="click-indicator">
            <i class="material-icons">arrow_forward</i>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  navigateToMenu: [menuName: string];
}>();

function navigateTo(menuName: string) {
  emit("navigateToMenu", menuName);
}
</script>

<style scoped lang="scss">
.dashboard-home {
  .welcome-section {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    color: white;

    h1 {
      margin: 0 0 1rem 0;
      font-size: 2.5rem;
      font-weight: 600;
    }

    p {
      margin: 0;
      font-size: 1.2rem;
      opacity: 0.9;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.2);
      }

      &:active {
        transform: translateY(-2px);
        transition: transform 0.1s ease;
      }

      .stat-icon {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1.5rem;

        .material-icons {
          font-size: 32px;
          color: white;
        }
      }

      .stat-content {
        position: relative;

        h3 {
          margin: 0 0 0.5rem 0;
          color: #111827;
          font-size: 1.5rem;
          font-weight: 600;
        }

        p {
          margin: 0;
          color: #6b7280;
          font-size: 1rem;
          line-height: 1.5;
        }

        .click-indicator {
          position: absolute;
          top: 0;
          right: 0;
          opacity: 0;
          transition: all 0.3s ease;
          color: #667eea;

          .material-icons {
            font-size: 20px;
          }
        }
      }

      &:hover .stat-content .click-indicator {
        opacity: 1;
        transform: translateX(4px);
      }
    }
  }
}
</style>
