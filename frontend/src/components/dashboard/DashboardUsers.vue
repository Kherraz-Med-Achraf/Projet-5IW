<template>
  <div class="dashboard-users">
    <div class="users-header">
      <h3>Gestion des utilisateurs</h3>
      <button class="btn-primary">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Ajouter un utilisateur
      </button>
    </div>

    <div class="users-filters">
      <input type="text" placeholder="Rechercher un utilisateur..." />
      <select>
        <option value="">Tous les rôles</option>
        <option value="admin">Administrateur</option>
        <option value="user">Utilisateur</option>
        <option value="guest">Invité</option>
      </select>
    </div>

    <div class="users-table">
      <table>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Status</th>
            <th>Dernière connexion</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in mockUsers" :key="user.id">
            <td>
              <div class="user-info">
                <div class="user-avatar">{{ user.name.charAt(0) }}</div>
                <span>{{ user.name }}</span>
              </div>
            </td>
            <td>{{ user.email }}</td>
            <td>
              <span :class="['role-badge', user.role]">{{ user.role }}</span>
            </td>
            <td>
              <span :class="['status-badge', user.status]">{{
                user.status
              }}</span>
            </td>
            <td>{{ user.lastLogin }}</td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                    />
                    <path
                      d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    />
                  </svg>
                </button>
                <button class="btn-icon delete">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="3,6 5,6 21,6" />
                    <path
                      d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const mockUsers = ref([
  {
    id: 1,
    name: "Jean Dupont",
    email: "jean.dupont@example.com",
    role: "admin",
    status: "active",
    lastLogin: "Il y a 2 heures",
  },
  {
    id: 2,
    name: "Marie Martin",
    email: "marie.martin@example.com",
    role: "user",
    status: "active",
    lastLogin: "Il y a 1 jour",
  },
  {
    id: 3,
    name: "Pierre Durand",
    email: "pierre.durand@example.com",
    role: "user",
    status: "inactive",
    lastLogin: "Il y a 5 jours",
  },
  {
    id: 4,
    name: "Sophie Bernard",
    email: "sophie.bernard@example.com",
    role: "guest",
    status: "active",
    lastLogin: "Il y a 3 heures",
  },
]);
</script>

<style scoped lang="scss">
.dashboard-users {
  .users-header {
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

  .users-filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;

    input,
    select {
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;

      &:focus {
        outline: none;
        border-color: $primary-color;
      }
    }

    input {
      flex: 1;
      max-width: 300px;
    }

    select {
      min-width: 150px;
    }
  }

  .users-table {
    background: white;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    overflow: hidden;

    table {
      width: 100%;
      border-collapse: collapse;

      th,
      td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #f3f4f6;
      }

      th {
        background-color: #f9fafb;
        font-weight: 600;
        color: #374151;
        font-size: 0.875rem;
      }

      td {
        color: #111827;
        font-size: 0.875rem;
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .user-avatar {
          width: 32px;
          height: 32px;
          background-color: $primary-color;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
        }
      }

      .role-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;

        &.admin {
          background-color: #fef3c7;
          color: #92400e;
        }

        &.user {
          background-color: #dbeafe;
          color: #1e40af;
        }

        &.guest {
          background-color: #f3f4f6;
          color: #374151;
        }
      }

      .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;

        &.active {
          background-color: #d1fae5;
          color: #065f46;
        }

        &.inactive {
          background-color: #fee2e2;
          color: #991b1b;
        }
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;

        .btn-icon {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;

          &:not(.delete) {
            background-color: #f3f4f6;
            color: #6b7280;

            &:hover {
              background-color: #e5e7eb;
            }
          }

          &.delete {
            background-color: #fef2f2;
            color: #dc2626;

            &:hover {
              background-color: #fee2e2;
            }
          }
        }
      }
    }
  }
}
</style>
