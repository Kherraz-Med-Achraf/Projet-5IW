<template>
  <div class="access-denied-container">
    <div class="access-denied-content">
      <div class="icon-container">
        <i class="material-icons">block</i>
      </div>
      
      <h1>Accès refusé</h1>
      
      <p class="error-message">
        Vous n'avez pas les permissions nécessaires pour accéder à cette page.
      </p>
      
      <div class="info-section">
        <h2>Informations sur votre compte :</h2>
        <div class="user-info">
          <div class="info-item">
            <span class="label">Email :</span>
            <span class="value">{{ auth.user?.email }}</span>
          </div>
          <div class="info-item">
            <span class="label">Rôle :</span>
            <span class="value role-badge" :class="getRoleClass(auth.user?.role)">
              {{ getRoleLabel(auth.user?.role) }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button @click="goHome" class="btn-primary">
          <i class="material-icons">home</i>
          Retour à l'accueil
        </button>
        
        <button @click="goBack" class="btn-secondary">
          <i class="material-icons">arrow_back</i>
          Page précédente
        </button>
      </div>
      
      <div class="contact-info">
        <p>
          <i class="material-icons">info</i>
          Si vous pensez qu'il s'agit d'une erreur, contactez l'administration.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

function goHome() {
  router.push({ name: 'Home' })
}

function goBack() {
  router.go(-1)
}

function getRoleClass(role: string | undefined): string {
  const roleClasses: Record<string, string> = {
    ADMIN: 'role-admin',
    DIRECTOR: 'role-director',
    SERVICE_MANAGER: 'role-manager',
    SECRETARY: 'role-secretary',
    STAFF: 'role-staff',
    PARENT: 'role-parent',
  }
  return roleClasses[role || ''] || 'role-default'
}

function getRoleLabel(role: string | undefined): string {
  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    DIRECTOR: 'Directeur',
    SERVICE_MANAGER: 'Chef de service',
    SECRETARY: 'Secrétaire',
    STAFF: 'Personnel',
    PARENT: 'Parent',
  }
  return roleLabels[role || ''] || 'Rôle inconnu'
}
</script>

<style scoped>
.access-denied-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 2rem;
}

.access-denied-content {
  max-width: 600px;
  width: 100%;
  background: white;
  border-radius: 1rem;
  padding: 3rem;
  box-shadow: 
    0 10px 25px rgba(0, 0, 0, 0.1),
    0 4px 6px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.icon-container {
  margin-bottom: 2rem;
}

.icon-container i {
  font-size: 4rem;
  color: #ef4444;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.error-message {
  font-size: 1.125rem;
  color: #64748b;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.info-section {
  background: #f8fafc;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: left;
}

.info-section h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.label {
  font-weight: 600;
  color: #4b5563;
  min-width: 60px;
}

.value {
  color: #1f2937;
}

.role-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
}

/* Couleurs des rôles - conformes WCAG AA */
.role-admin { background-color: #b91c1c; }
.role-director { background-color: #b45309; }
.role-manager { background-color: #6b21a8; }
.role-secretary { background-color: #15803d; }
.role-staff { background-color: #1d4ed8; }
.role-parent { background-color: #be185d; }
.role-default { background-color: #6b7280; }

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.btn-primary {
  background-color: #4338ca;
  color: white;
}

.btn-primary:hover {
  background-color: #3730a3;
  transform: translateY(-1px);
}

.btn-primary:focus {
  outline: 3px solid #0ea5e9;
  outline-offset: 2px;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
}

.btn-secondary {
  background-color: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover {
  background-color: #e2e8f0;
  transform: translateY(-1px);
}

.btn-secondary:focus {
  outline: 3px solid #0ea5e9;
  outline-offset: 2px;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
}

.contact-info {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 0.5rem;
  padding: 1rem;
  color: #92400e;
}

.contact-info p {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.contact-info i {
  color: #f59e0b;
}

@media (max-width: 768px) {
  .access-denied-content {
    padding: 2rem;
  }
  
  h1 {
    font-size: 2rem;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .label {
    min-width: auto;
  }
}
</style> 