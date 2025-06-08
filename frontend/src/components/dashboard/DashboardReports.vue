<template>
  <div class="dashboard-reports">
    <div class="reports-header">
      <h3>Rapports et analyses</h3>
      <button class="btn-primary">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7,10 12,15 17,10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Exporter
      </button>
    </div>

    <div class="reports-filters">
      <select>
        <option value="weekly">Cette semaine</option>
        <option value="monthly">Ce mois</option>
        <option value="quarterly">Ce trimestre</option>
        <option value="yearly">Cette année</option>
      </select>
      <select>
        <option value="all">Tous les rapports</option>
        <option value="users">Utilisateurs</option>
        <option value="activity">Activité</option>
        <option value="performance">Performance</option>
      </select>
    </div>

    <div class="reports-grid">
      <div class="report-card">
        <div class="report-header">
          <h4>Croissance des utilisateurs</h4>
          <span class="report-period">30 derniers jours</span>
        </div>
        <div class="report-chart">
          <div class="chart-placeholder">
            <svg width="100%" height="120" viewBox="0 0 300 120" fill="none">
              <path
                d="M10 80 L50 65 L90 70 L130 55 L170 40 L210 30 L250 25 L290 20"
                stroke="#3b82f6"
                stroke-width="3"
                fill="none"
              />
              <circle cx="290" cy="20" r="4" fill="#3b82f6" />
            </svg>
          </div>
          <div class="chart-stats">
            <div class="stat">
              <span class="stat-label">Total</span>
              <span class="stat-value">1,234</span>
            </div>
            <div class="stat">
              <span class="stat-label">Croissance</span>
              <span class="stat-value positive">+12%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="report-card">
        <div class="report-header">
          <h4>Taux d'engagement</h4>
          <span class="report-period">7 derniers jours</span>
        </div>
        <div class="report-chart">
          <div class="progress-chart">
            <div class="progress-circle">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  stroke-width="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#10b981"
                  stroke-width="8"
                  stroke-dasharray="283"
                  stroke-dashoffset="70"
                  stroke-linecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div class="progress-text">
                <span class="progress-value">75%</span>
              </div>
            </div>
          </div>
          <div class="chart-stats">
            <div class="stat">
              <span class="stat-label">Actifs</span>
              <span class="stat-value">925</span>
            </div>
            <div class="stat">
              <span class="stat-label">Évolution</span>
              <span class="stat-value positive">+8%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="report-card full-width">
        <div class="report-header">
          <h4>Activité récente</h4>
          <span class="report-period">Temps réel</span>
        </div>
        <div class="activity-timeline">
          <div
            class="timeline-item"
            v-for="item in recentActivity"
            :key="item.id"
          >
            <div class="timeline-dot" :class="item.type"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-title">{{ item.title }}</span>
                <span class="timeline-time">{{ item.time }}</span>
              </div>
              <p class="timeline-description">{{ item.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const recentActivity = ref([
  {
    id: 1,
    type: "success",
    title: "Nouveau rapport généré",
    description: "Rapport mensuel d'activité créé avec succès",
    time: "Il y a 5 min",
  },
  {
    id: 2,
    type: "info",
    title: "Utilisateur connecté",
    description: "jean.dupont@example.com s'est connecté",
    time: "Il y a 12 min",
  },
  {
    id: 3,
    type: "warning",
    title: "Limite atteinte",
    description: "Limite de stockage à 85%",
    time: "Il y a 1h",
  },
  {
    id: 4,
    type: "error",
    title: "Erreur de synchronisation",
    description: "Échec de synchronisation avec le service externe",
    time: "Il y a 2h",
  },
]);
</script>

<style scoped lang="scss">
.dashboard-reports {
  .reports-header {
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

  .reports-filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;

    select {
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      min-width: 150px;

      &:focus {
        outline: none;
        border-color: $primary-color;
      }
    }
  }

  .reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;

    .report-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      border: 1px solid #e5e7eb;

      &.full-width {
        grid-column: 1 / -1;
      }

      .report-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;

        h4 {
          margin: 0;
          color: #111827;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .report-period {
          color: #6b7280;
          font-size: 0.875rem;
        }
      }

      .report-chart {
        .chart-placeholder {
          margin-bottom: 1rem;
        }

        .progress-chart {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;

          .progress-circle {
            position: relative;
            display: inline-block;

            .progress-text {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;

              .progress-value {
                font-size: 1.5rem;
                font-weight: 600;
                color: #111827;
              }
            }
          }
        }

        .chart-stats {
          display: flex;
          justify-content: space-around;
          gap: 1rem;

          .stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;

            .stat-label {
              color: #6b7280;
              font-size: 0.875rem;
            }

            .stat-value {
              color: #111827;
              font-size: 1.125rem;
              font-weight: 600;

              &.positive {
                color: #059669;
              }

              &.negative {
                color: #dc2626;
              }
            }
          }
        }
      }

      .activity-timeline {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;

          .timeline-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-top: 0.25rem;

            &.success {
              background-color: #10b981;
            }

            &.info {
              background-color: #3b82f6;
            }

            &.warning {
              background-color: #f59e0b;
            }

            &.error {
              background-color: #ef4444;
            }
          }

          .timeline-content {
            flex: 1;

            .timeline-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 0.25rem;

              .timeline-title {
                font-weight: 500;
                color: #111827;
              }

              .timeline-time {
                color: #6b7280;
                font-size: 0.75rem;
              }
            }

            .timeline-description {
              margin: 0;
              color: #6b7280;
              font-size: 0.875rem;
            }
          }
        }
      }
    }
  }
}
</style>
