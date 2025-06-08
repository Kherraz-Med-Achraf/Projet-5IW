<template>
  <div class="dashboard-home">
    <div class="welcome-section">
      <h3>Bienvenue sur votre tableau de bord</h3>
      <p>Voici un aperçu de vos données principales</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div class="stat-content">
          <h4>Utilisateurs</h4>
          <p class="stat-number">1,234</p>
          <span class="stat-change positive">+12%</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <div class="stat-content">
          <h4>Rapports</h4>
          <p class="stat-number">567</p>
          <span class="stat-change positive">+8%</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
            />
          </svg>
        </div>
        <div class="stat-content">
          <h4>Revenus</h4>
          <p class="stat-number">€45,678</p>
          <span class="stat-change negative">-3%</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        </div>
        <div class="stat-content">
          <h4>Activité</h4>
          <p class="stat-number">89%</p>
          <span class="stat-change positive">+5%</span>
        </div>
      </div>
    </div>

    <div class="recent-activity">
      <h4>Activité récente</h4>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="4" />
            </svg>
          </div>
          <div class="activity-content">
            <p>Nouvel utilisateur inscrit</p>
            <span class="activity-time">Il y a 2 minutes</span>
          </div>
        </div>
        <div class="activity-item">
          <div class="activity-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              />
            </svg>
          </div>
          <div class="activity-content">
            <p>Rapport généré avec succès</p>
            <span class="activity-time">Il y a 15 minutes</span>
          </div>
        </div>
        <div class="activity-item">
          <div class="activity-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div class="activity-content">
            <p>Paramètres mis à jour</p>
            <span class="activity-time">Il y a 1 heure</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Composant d'accueil du dashboard
</script>

<style scoped lang="scss">
.dashboard-home {
  .welcome-section {
    margin-bottom: 2rem;

    h3 {
      color: #111827;
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
    }

    p {
      color: #6b7280;
      margin: 0;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: #fff;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 1rem;

    .stat-icon {
      width: 48px;
      height: 48px;
      background: #eff6ff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: $primary-color;
    }

    .stat-content {
      h4 {
        margin: 0 0 0.25rem 0;
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .stat-number {
        margin: 0 0 0.25rem 0;
        color: #111827;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .stat-change {
        font-size: 0.75rem;
        font-weight: 500;

        &.positive {
          color: #059669;
        }

        &.negative {
          color: #dc2626;
        }
      }
    }
  }

  .recent-activity {
    background: #fff;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;

    h4 {
      margin: 0 0 1rem 0;
      color: #111827;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .activity-icon {
        width: 32px;
        height: 32px;
        background: #f3f4f6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
      }

      .activity-content {
        p {
          margin: 0 0 0.25rem 0;
          color: #111827;
          font-size: 0.875rem;
        }

        .activity-time {
          color: #6b7280;
          font-size: 0.75rem;
        }
      }
    }
  }
}
</style>
