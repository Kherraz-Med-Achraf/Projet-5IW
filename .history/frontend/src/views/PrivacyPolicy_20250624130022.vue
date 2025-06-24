<template>
  <div class="privacy-policy">
    <div class="privacy-header">
      <h1>Politique de Confidentialité</h1>
      <p class="subtitle">APAJH - Plateforme de Gestion Éducative</p>
      <p class="last-updated">Dernière mise à jour : {{ lastUpdated }}</p>
    </div>

    <div class="privacy-content">
      <!-- Introduction -->
      <section class="privacy-section">
        <h2>Introduction</h2>
        <p>
          L'APAJH (Association pour Adultes et Jeunes Handicapés) s'engage à protéger 
          et respecter votre vie privée. Cette politique de confidentialité explique 
          comment nous collectons, utilisons et protégeons vos données personnelles 
          dans le cadre de notre plateforme de gestion éducative.
        </p>
        <p>
          Cette politique est conforme au Règlement Général sur la Protection des Données (RGPD) 
          et à la loi Informatique et Libertés.
        </p>
      </section>

      <!-- Responsable du traitement -->
      <section class="privacy-section">
        <h2>Responsable du traitement</h2>
        <div class="contact-card">
          <h3>APAJH</h3>
          <p><strong>Adresse :</strong> [Adresse de l'établissement]</p>
          <p><strong>Téléphone :</strong> [Numéro de téléphone]</p>
          <p><strong>Email :</strong> contact@apajh.org</p>
          <p><strong>Délégué à la Protection des Données (DPO) :</strong> dpo@apajh.org</p>
        </div>
      </section>

      <!-- Données collectées -->
      <section class="privacy-section">
        <h2>Quelles données collectons-nous ?</h2>
        
        <div class="data-categories">
          <div class="data-category">
            <h3>Données personnelles des parents</h3>
            <ul>
              <li>Nom, prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Adresse postale</li>
              <li>Responsabilité légale (tuteur, parent, etc.)</li>
            </ul>
          </div>
          
          <div class="data-category">
            <h3>Données des enfants</h3>
            <ul>
              <li>Nom, prénom, date de naissance</li>
              <li>Informations de scolarité</li>
              <li>Données d'accompagnement éducatif</li>
              <li>Journaux éducatifs mensuels</li>
              <li>Photos/vidéos (avec consentement)</li>
            </ul>
          </div>

          <div class="data-category sensitive">
            <h3>Données de santé</h3>
            <ul>
              <li>Documents médicaux</li>
              <li>Justificatifs d'absence médicale</li>
              <li>Informations sur la situation de handicap</li>
              <li>Contacts d'urgence médicaux</li>
            </ul>
            <p class="sensitive-note">
              Ces données sont particulièrement protégées et stockées sur des serveurs 
              agréés HDS (Hébergement de Données de Santé)
            </p>
          </div>

          <div class="data-category">
            <h3>Données techniques</h3>
            <ul>
              <li>Logs de connexion</li>
              <li>Données de navigation</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Finalités du traitement -->
      <section class="privacy-section">
        <h2>Pourquoi utilisons-nous ces données ?</h2>
        
        <div class="purposes">
          <div class="purpose">
            <h3>Gestion éducative</h3>
            <p>
              Suivi pédagogique personnalisé, planification des activités, 
              communication entre l'équipe éducative et les familles.
            </p>
            <p class="legal-basis"><strong>Base légale :</strong> Mission d'intérêt public</p>
          </div>
          
          <div class="purpose">
            <h3>Communication</h3>
            <p>
              Envoi d'informations importantes, notifications de sécurité, 
              invitations aux événements.
            </p>
            <p class="legal-basis"><strong>Base légale :</strong> Consentement et intérêt légitime</p>
          </div>
          
          <div class="purpose">
            <h3>Sécurité et conformité</h3>
            <p>
              Protection des comptes, prévention des fraudes, 
              respect des obligations légales.
            </p>
            <p class="legal-basis"><strong>Base légale :</strong> Obligation légale et intérêt légitime</p>
          </div>
          
          <div class="purpose">
            <h3>Amélioration du service</h3>
            <p>
              Analyse anonymisée de l'utilisation pour améliorer 
              la plateforme et les services proposés.
            </p>
            <p class="legal-basis"><strong>Base légale :</strong> Intérêt légitime</p>
          </div>
        </div>
      </section>

      <!-- Destinataires -->
      <section class="privacy-section">
        <h2>Qui a accès à vos données ?</h2>
        
        <div class="recipients">
          <div class="recipient">
            <h3>Équipe éducative</h3>
            <p>
              Les éducateurs, enseignants et personnel d'accompagnement ont accès 
              aux données des enfants qu'ils suivent dans le cadre de leur mission éducative.
            </p>
          </div>
          
          <div class="recipient">
            <h3>Personnel administratif</h3>
            <p>
              La direction et le secrétariat ont accès aux données nécessaires 
              à la gestion administrative de l'établissement.
            </p>
          </div>
          
          <div class="recipient">
            <h3>Parents et tuteurs</h3>
            <p>
              Les parents ont accès uniquement aux données concernant leurs propres enfants 
              via leur espace personnel sécurisé.
            </p>
          </div>
          
          <div class="recipient">
            <h3>Prestataires techniques</h3>
            <p>
              Nos prestataires d'hébergement et de maintenance technique, 
              tous soumis à des obligations contractuelles strictes de confidentialité.
            </p>
          </div>
          
          <div class="recipient no-sharing">
            <h3>Aucun partage commercial</h3>
            <p>
              Nous ne vendons, ne louons, ni ne partageons vos données personnelles 
              à des fins commerciales. Aucune donnée n'est transmise à des tiers 
              sans votre consentement explicite.
            </p>
          </div>
        </div>
      </section>

      <!-- Durée de conservation -->
      <section class="privacy-section">
        <h2>Combien de temps conservons-nous vos données ?</h2>
        
        <div class="retention-periods">
          <div class="retention-item">
            <h3>Données de scolarité</h3>
            <p><strong>3 ans</strong> après la fin de l'accompagnement</p>
            <p class="retention-reason">
              Pour assurer la continuité éducative et répondre aux demandes de certificats.
            </p>
          </div>
          
          <div class="retention-item">
            <h3>Documents médicaux</h3>
            <p><strong>10 ans</strong> (obligation légale)</p>
            <p class="retention-reason">
              Conformément aux obligations légales de conservation des dossiers médicaux.
            </p>
          </div>
          
          <div class="retention-item">
            <h3>Logs de sécurité</h3>
            <p><strong>1 an</strong> maximum</p>
            <p class="retention-reason">
              Pour la sécurité informatique et la détection d'intrusions.
            </p>
          </div>
          
          <div class="retention-item">
            <h3>Données de connexion</h3>
            <p><strong>6 mois</strong> puis suppression automatique</p>
            <p class="retention-reason">
              Pour l'assistance technique et la résolution de problèmes.
            </p>
          </div>
          
          <div class="retention-item">
            <h3>Photos et vidéos</h3>
            <p><strong>Durée de l'accompagnement</strong> + 1 an</p>
            <p class="retention-reason">
              Sauf retrait du consentement, auquel cas suppression immédiate.
            </p>
          </div>
        </div>
      </section>

      <!-- Sécurité -->
      <section class="privacy-section">
        <h2>Comment protégeons-nous vos données ?</h2>
        
        <div class="security-measures">
          <div class="security-category">
            <h3>Sécurité technique</h3>
            <ul>
              <li>Chiffrement AES-256 des données sensibles</li>
              <li>Authentification à deux facteurs (2FA)</li>
              <li>Mots de passe forts obligatoires (12 caractères minimum)</li>
              <li>Rotation automatique des mots de passe (60 jours)</li>
              <li>Protocole HTTPS pour toutes les communications</li>
            </ul>
          </div>
          
          <div class="security-category">
            <h3>Contrôles d'accès</h3>
            <ul>
              <li>Système de rôles granulaire</li>
              <li>Principe du moindre privilège</li>
              <li>Logs d'audit de tous les accès aux données sensibles</li>
              <li>Blocage automatique après 3 tentatives de connexion échouées</li>
              <li>Notifications de connexions suspectes</li>
            </ul>
          </div>
          
          <div class="security-category">
            <h3>Infrastructure</h3>
            <ul>
              <li>Serveurs agréés HDS pour les données de santé</li>
              <li>Sauvegardes chiffrées quotidiennes</li>
              <li>Surveillance 24h/24 des infrastructures</li>
              <li>Plans de continuité et de reprise d'activité</li>
              <li>Tests de sécurité réguliers</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Droits des utilisateurs -->
      <section class="privacy-section">
        <h2>Vos droits</h2>
        
        <div class="user-rights">
          <div class="right">
            <h3>Droit d'accès</h3>
            <p>
              Vous pouvez demander une copie de toutes les données personnelles 
              que nous détenons sur vous et votre enfant.
            </p>
            </button>
          </div>
          
          <div class="right">
            <h3>Droit de rectification</h3>
            <p>
              Vous pouvez corriger ou mettre à jour vos informations personnelles 
              si elles sont inexactes ou incomplètes.
            </p>
          </div>
          
          <div class="right">
            <h3>Droit à l'effacement</h3>
            <p>
              Vous pouvez demander la suppression de vos données personnelles 
              dans certaines conditions.
            </p>
          </div>
          
          <div class="right">
            <h3>Droit à la portabilité</h3>
            <p>
              Vous pouvez récupérer vos données dans un format structuré 
              et lisible par machine.
            </p>
          </div>
          
          <div class="right">
            <h3>Droit d'opposition</h3>
            <p>
              Vous pouvez vous opposer au traitement de vos données personnelles 
              pour des motifs légitimes.
            </p>
          </div>
          
          <div class="right">
            <h3>Droit de retrait du consentement</h3>
            <p>
              Vous pouvez retirer votre consentement à tout moment, 
              notamment pour les photos/vidéos.
            </p>
          </div>
        </div>
        
        <div class="rights-info">
          <p>
            <strong>Délai de réponse :</strong> Nous nous engageons à répondre à vos demandes 
            dans un délai maximum de <strong>72 heures</strong> (1 mois maximum pour les demandes complexes).
          </p>
          <p>
            <strong>Exercice gratuit :</strong> L'exercice de vos droits est entièrement gratuit, 
            sauf en cas de demandes manifestement infondées ou excessives.
          </p>
        </div>
      </section>

      <!-- Cookies -->
      <section class="privacy-section">
        <h2>Cookies et technologies similaires</h2>
        
        <div class="cookies-info">
          <div class="cookie-category">
            <h3>Cookies essentiels</h3>
            <p>
              Nécessaires au fonctionnement de la plateforme (authentification, sécurité).
              Ces cookies ne peuvent pas être désactivés.
            </p>
          </div>
          
          <div class="cookie-category">
            <h3>Cookies de performance</h3>
            <p>
              Nous permettent d'analyser l'utilisation de la plateforme pour l'améliorer.
              Vous pouvez les refuser sans impact sur le fonctionnement.
            </p>
          </div>
        </div>
        
        <p>
          Aucun cookie publicitaire ou de tracking commercial n'est utilisé sur notre plateforme.
        </p>
      </section>

      <!-- Transferts internationaux -->
      <section class="privacy-section">
        <h2>Transferts de données</h2>
        <p>
          Vos données personnelles sont traitées et stockées exclusivement 
          au sein de l'Union Européenne. Aucun transfert vers des pays tiers 
          n'est effectué sans garanties appropriées.
        </p>
      </section>

      <!-- Contact et réclamations -->
      <section class="privacy-section">
        <h2>Contact et réclamations</h2>
        
        <div class="contact-grid">
          <div class="contact-item">
            <h3>Délégué à la Protection des Données (DPO)</h3>
            <p><strong>Email :</strong> <a href="mailto:dpo@apajh.org">dpo@apajh.org</a></p>
            <p><strong>Téléphone :</strong> 01 23 45 67 89</p>
            <p><strong>Courrier :</strong> DPO - APAJH<br/>[Adresse de l'établissement]</p>
            <p class="response-time">Délai de réponse : 72h maximum</p>
          </div>
          
          <div class="contact-item">
            <h3>Autorité de contrôle</h3>
            <p>
              Si vous estimez que vos droits ne sont pas respectés, 
              vous pouvez saisir la CNIL :
            </p>
            <p>
              <strong>CNIL</strong><br/>
              3 Place de Fontenoy<br/>
              75007 Paris<br/>
              <a href="https://www.cnil.fr" target="_blank">www.cnil.fr</a>
            </p>
          </div>
        </div>
      </section>

      <!-- Modifications -->
      <section class="privacy-section">
        <h2>Modifications de cette politique</h2>
        <p>
          Cette politique de confidentialité peut être mise à jour pour refléter 
          les changements dans nos pratiques ou la réglementation. 
          Nous vous informerons de toute modification importante par email 
          ou via un avis sur la plateforme.
        </p>
        <p>
          <strong>Version actuelle :</strong> {{ version }}<br/>
          <strong>Date d'entrée en vigueur :</strong> {{ effectiveDate }}
        </p>
      </section>
    </div>

    <!-- Modal de suppression -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal-content" @click.stop>
        <h2>Demande de suppression de données</h2>
        <p>
          Vous pouvez demander la suppression de votre compte et de vos données personnelles.
        </p>
        <p>
          <strong>Attention :</strong> Cette action peut être irréversible et entraîner 
          la perte de l'historique éducatif de votre enfant.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'

const showDeleteModal = ref(false)
const lastUpdated = ref('24 juin 2025')
const version = ref('1.0')
const effectiveDate = ref('15 janvier 2025')

const authStore = useAuthStore()
const toast = useToast()

async function requestDataAccess() {
  try {
    // Envoyer une demande d'accès aux données
    const response = await fetch('http://localhost:3000/auth/request-data-access', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      toast.success('Votre demande d\'accès aux données a été enregistrée. Vous recevrez une réponse sous 72h.')
    } else {
      throw new Error('Erreur lors de la demande')
    }
  } catch (error) {
    toast.error('Erreur lors de l\'envoi de la demande. Contactez directement le DPO.')
  }
}

async function downloadData() {
  try {
    const response = await fetch('http://localhost:3000/auth/export-data', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    
    if (!response.ok) throw new Error('Erreur lors du téléchargement')
    
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mes-donnees-apajh-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Données téléchargées avec succès')
  } catch (error) {
    toast.error('Erreur lors du téléchargement des données')
  }
}

async function submitDeletionRequest() {
  try {
    const response = await fetch('http://localhost:3000/auth/request-deletion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Demande utilisateur via politique de confidentialité'
      })
    })
    
    if (response.ok) {
      toast.success('Votre demande de suppression a été enregistrée. Le DPO vous contactera sous 72h.')
      showDeleteModal.value = false
    } else {
      throw new Error('Erreur lors de la demande')
    }
  } catch (error) {
    toast.error('Erreur lors de l\'envoi de la demande. Contactez directement le DPO.')
  }
}
</script>

<style scoped lang="scss">
.privacy-policy {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.6;
  color: #374151;
}

.privacy-header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
  
  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }
  
  .subtitle {
    font-size: 1.2rem;
    color: #6b7280;
    margin-bottom: 1rem;
  }
  
  .last-updated {
    background: #f3f4f6;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    display: inline-block;
    font-size: 0.9rem;
    color: #4b5563;
  }
}

.privacy-section {
  margin-bottom: 3rem;
  
  h2 {
    font-size: 1.8rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #3b82f6;
  }
  
  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 1rem;
  }
  
  p {
    margin-bottom: 1rem;
  }
}

.contact-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  
  h3 {
    color: #1e40af;
    margin-bottom: 1rem;
  }
}

.data-categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.data-category {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  
  &.sensitive {
    border-color: #fbbf24;
    background: #fffbeb;
  }
  
  h3 {
    color: #374151;
    margin-bottom: 1rem;
  }
  
  ul {
    list-style: none;
    padding: 0;
    
    li {
      padding: 0.3rem 0;
      position: relative;
      padding-left: 1.5rem;
      
      &:before {
        content: '•';
        position: absolute;
        left: 0;
        color: #3b82f6;
        font-weight: bold;
      }
    }
  }
}

.sensitive-note {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  color: #92400e;
  padding: 0.8rem;
  border-radius: 6px;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.purposes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.purpose {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  
  .legal-basis {
    font-size: 0.9rem;
    color: #059669;
    margin-top: 0.5rem;
  }
}

.recipients {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.recipient {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  
  &.no-sharing {
    border-color: #10b981;
    background: #ecfdf5;
    
    h3 {
      color: #047857;
    }
  }
}

.retention-periods {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.retention-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  
  .retention-reason {
    font-size: 0.9rem;
    color: #6b7280;
    font-style: italic;
  }
}

.security-measures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.security-category {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  
  ul {
    list-style: none;
    padding: 0;
    
    li {
      padding: 0.3rem 0;
      position: relative;
      padding-left: 1.5rem;
      
      &:before {
        content: '🔒';
        position: absolute;
        left: 0;
      }
    }
  }
}

.user-rights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.right {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
}

.action-button {
  display: inline-block;
  background: #3b82f6;
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background 0.3s;
  margin-top: 0.5rem;
  
  &:hover {
    background: #1d4ed8;
  }
  
  &.danger {
    background: #dc2626;
    
    &:hover {
      background: #b91c1c;
    }
  }
}

.rights-info {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
  
  p {
    margin-bottom: 0.5rem;
    color: #1e40af;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

.cookies-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.cookie-category {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.contact-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  
  a {
    color: #3b82f6;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  .response-time {
    color: #059669;
    font-weight: 500;
    margin-top: 0.5rem;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  
  h2 {
    color: #dc2626;
    margin-bottom: 1rem;
  }
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: flex-end;
}

.btn-cancel, .btn-danger {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  
  &.btn-cancel {
    background: #6b7280;
    color: white;
    
    &:hover {
      background: #4b5563;
    }
  }
  
  &.btn-danger {
    background: #dc2626;
    color: white;
    
    &:hover {
      background: #b91c1c;
    }
  }
}

@media (max-width: 768px) {
  .privacy-policy {
    padding: 1rem;
  }
  
  .privacy-header h1 {
    font-size: 2rem;
  }
  
  .data-categories,
  .purposes,
  .recipients,
  .retention-periods,
  .security-measures,
  .user-rights {
    grid-template-columns: 1fr;
  }
}
</style>
