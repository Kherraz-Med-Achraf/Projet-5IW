<template>
  <div class="login-container">
    <!-- Partie gauche : Formulaire de connexion -->
    <div class="login-left">
      <div class="login-content">
        <h1 class="brand-title">MonApp</h1>
        <button class="google-button">Login with Google</button>

        <form @submit.prevent="onSubmit" class="login-form">
          <div class="form-group">
            <label for="email">Your Email</label>
            <input v-model="email" id="email" type="email" required />
          </div>
          <div class="form-group">
            <label for="password">Your Password</label>
            <input v-model="password" id="password" type="password" required />
          </div>
          <button type="submit" :disabled="auth.loading" class="submit-button">
            Log in
          </button>
        </form>

        <div class="forgot-password">
          <router-link to="/forgot-password">Forgot password?</router-link>
        </div>

        <div class="signup-prompt">
          Don't have an account?
          <router-link to="/register">Sign up</router-link>
        </div>
      </div>
    </div>

    <!-- Partie droite : Fond coloré / image d'illustration -->
    <div class="login-right">
      <!-- Ici, vous pouvez soit mettre une image de background dans le CSS,
           soit une balise <img> pour afficher une illustration. -->
    </div>

    <!-- Modale OTP : affichée si un tempToken est reçu -->
    <div v-if="showOtpModal" class="modal">
      <div class="modal-content">
        <h2>Enter your OTP code</h2>
        <input v-model="otpCode" type="text" placeholder="Code OTP" />
        <button @click="submitOtp" :disabled="auth.loading">Validate</button>
        <button @click="closeOtpModal" :disabled="auth.loading">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const email = ref('')
const password = ref('')
const otpCode = ref('')
const showOtpModal = ref(false)
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

async function onSubmit() {
  auth.error = ''
  // Appel à initiateLogin, qui renvoie soit un access_token, soit un tempToken
  const response = await auth.initiateLogin({
    email: email.value,
    password: password.value,
  })
  if (response.access_token) {
    toast.success('Vous êtes connecté !')
    router.push('/home')
  } else if (response.tempToken) {
    // OTP activé => on stocke le tempToken et on affiche la modale
    auth.tempToken = response.tempToken
    showOtpModal.value = true
    toast.info('Veuillez saisir votre code OTP')
  } else {
    toast.error(auth.error || 'La connexion a échoué.')
  }
}

async function submitOtp() {
  if (!otpCode.value) {
    toast.error('Veuillez saisir votre code OTP')
    return
  }
  const response = await auth.verifyOtp({
    tempToken: auth.tempToken,
    otpCode: otpCode.value,
  })
  if (response.access_token) {
    toast.success('Connexion réussie !')
    showOtpModal.value = false
    router.push('/home')
  } else {
    toast.error(auth.error || 'OTP invalide.')
  }
}

function closeOtpModal() {
  showOtpModal.value = false
}
</script>

<style scoped>
/* Container global : on sépare l'écran en deux moitiés (50% - 50%). */
.login-container {
  display: flex;
  height: 100vh; /* occupe toute la hauteur de la fenêtre */
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

/* Partie gauche : zone du formulaire */
.login-left {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  /* Couleur de fond (optionnelle) */
  background-color: #fff;
}

/* Contenu centré dans la partie gauche */
.login-content {
  width: 100%;
  max-width: 350px; /* limite la largeur du formulaire */
  margin: 0 auto;
}

/* Titre ou marque */
.brand-title {
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  font-weight: 600;
}

/* Bouton "Login with Google" */
.google-button {
  width: 100%;
  padding: 0.75rem;
  font-size: 0.9rem;
  border: none;
  border-radius: 4px;
  background-color: #4285f4;
  color: #fff;
  cursor: pointer;
  margin-bottom: 1.5rem;
}
.google-button:hover {
  background-color: #2f6bd5;
}

/* Formulaire */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

/* Groupes de champs */
.form-group {
  display: flex;
  flex-direction: column;
  font-size: 0.95rem;
}
.form-group label {
  margin-bottom: 0.25rem;
  font-weight: 500;
}
.form-group input {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/* Bouton soumission */
.submit-button {
  padding: 0.75rem;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  background-color: #1d1d1d;
  color: #fff;
  cursor: pointer;
}
.submit-button:hover {
  background-color: #333;
}

/* Liens "Forgot password?" et "Sign up" */
.forgot-password,
.signup-prompt {
  margin-top: 0.75rem;
  font-size: 0.9rem;
}
.signup-prompt {
  margin-top: 1.2rem;
}
.signup-prompt a,
.forgot-password a {
  text-decoration: none;
  color: #0070f3;
}
.signup-prompt a:hover,
.forgot-password a:hover {
  text-decoration: underline;
}

/* Partie droite : image / illustration / background coloré */
.login-right {
  flex: 1;
  /* Si vous souhaitez mettre une image de fond :
     background: url('/path/to/image.jpg') center/cover no-repeat; */
  background: linear-gradient(to bottom right, #ff3b3b, #f54040, #ff2140);
}

/* MODALE OTP */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal-content {
  background: #fff;
  padding: 1.5rem;
  border-radius: 4px;
  width: 320px;
  text-align: center;
}
.modal-content h2 {
  margin-bottom: 1rem;
}
.modal-content input {
  margin-bottom: 1rem;
  width: 80%;
  padding: 0.5rem;
}
.modal-content button {
  margin: 0 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
