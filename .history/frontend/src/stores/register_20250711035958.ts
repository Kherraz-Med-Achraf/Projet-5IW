import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import { API_BASE_URL } from "@/utils/api";

// URL du backend via variable d'environnement
const API_URL = API_BASE_URL;

export const useRegisterStore = defineStore("register", () => {
  const toast = useToast();
  const router = useRouter();

  const inviteToken = ref<string | null>(null);
  const loading = ref(false);

  const form = reactive({
    firstName: "",
    lastName: "",
    phone: "",
    address: {
      number: "",
      street: "",
      postal: "",
      city: "",
      country: "",
    },
    legalResponsibility: "",
    legalResponsibilityOther: "",
    emergencyContacts: [] as any[],
    children: [] as any[],
    email: "",
    password: "",
    passwordConfirm: "",
  });

  // Helper functions
  /**
   * Ajoute un contact d'urgence si la limite de deux n'est pas dépassée.
   * Affiche un toast d'erreur le cas échéant.
   */
  const addEmergencyContact = () => {
    if (form.emergencyContacts.length >= 1) {
      toast.error("Vous ne pouvez ajouter qu'un seul contact d'urgence");
      return;
    }

    form.emergencyContacts.push({
      firstName: "",
      lastName: "",
      relation: "",
      relationOther: "",
      phone: "",
    });
  };

  const removeEmergencyContact = (index: number) => {
    form.emergencyContacts.splice(index, 1);
  };

  const addChild = () => {
    form.children.push({
      firstName: "",
      lastName: "",
      birthDate: "",
    });
  };

  const removeChild = (index: number) => {
    form.children.splice(index, 1);
  };

  /**
   * Vérifie que chaque enfant a un âge compris entre 9 et 20 ans (inclus).
   */
  const validateChildren = () => {
    const now = Date.now();
    return form.children.every((c: any) => {
      if (!c.birthDate) return false;
      const age = (now - new Date(c.birthDate).getTime()) / 3.15576e10;
      return age >= 9 && age <= 20;
    });
  };

  // Validation des étapes pour la navigation progressive
  const isStepOneComplete = () => {
    // Informations parent obligatoires
    const parentValid =
      form.firstName.trim() &&
      form.lastName.trim() &&
      form.phone.trim() &&
      form.address.number.trim() &&
      form.address.street.trim() &&
      form.address.postal.trim() &&
      form.address.city.trim() &&
      form.address.country.trim() &&
      form.legalResponsibility.trim();

    // Contacts d'urgence facultatifs : s'ils existent, au moins un doit être complet
    const emergencyContactValid =
      form.emergencyContacts.length === 0 ||
      form.emergencyContacts.some(
        (contact: any) =>
          contact.firstName?.trim() &&
          contact.lastName?.trim() &&
          contact.phone?.trim() &&
          contact.relation?.trim()
      );

    return parentValid && emergencyContactValid;
  };

  const isStepTwoComplete = () => {
    // Au moins un enfant avec toutes les informations requises et âge valide
    const hasValidChildren = form.children.some((child: any) => {
      if (
        !child.firstName?.trim() ||
        !child.lastName?.trim() ||
        !child.birthDate
      ) {
        return false;
      }
      // Vérifier l'âge (entre 9 et 20 ans)
      const birthDate = new Date(child.birthDate);
      const now = new Date();
      const age =
        (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return age >= 9 && age <= 20;
    });

    return hasValidChildren;
  };

  const canAccessStep = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return isStepOneComplete();
    if (step === 3) return isStepOneComplete() && isStepTwoComplete();
    return false;
  };

  const validateToken = async (token: string) => {
    try {
      console.log('🔍 Validation du token d\'invitation:', token?.substring(0, 20) + '...');
      const res = await fetch(`${API_URL}/invitations/validate/${token}`);
      const data = await res.json();
      console.log('📨 Réponse validation:', { status: res.status, data });
      
      if (!res.ok) {
        console.error('❌ Validation échouée:', data.message);
        throw new Error(data.message);
      }
      
      form.email = data.email;
      inviteToken.value = token;
      console.log('✅ Token validé avec succès, email:', data.email);
      return true;
    } catch (e: any) {
      console.error('❌ Erreur validation token:', e.message);
      toast.error(e.message || "Lien d'invitation invalide ou expiré");
      
      // 🔧 FIX: Supprimer la redirection automatique vers login
      // L'utilisateur peut être en cours d'inscription (step 2/3)
      // Laisser le router guard gérer la redirection si nécessaire
      
      return false;
    }
  };

  const submitRegistration = async () => {
    loading.value = true;
    try {
      // Validation des mots de passe
      if (form.password !== form.passwordConfirm) {
        toast.error("Les mots de passe ne correspondent pas");
        return false;
      }

      // Validation de l'âge des enfants
      if (form.children.length && !validateChildren()) {
        toast.error("Chaque enfant doit avoir entre 9 et 20 ans");
        return false;
      }

      // Nettoyage des données
      const contactsClean = form.emergencyContacts.filter(
        (c: any) => c.firstName && c.lastName && c.phone
      );
      const kidsClean = form.children.filter(
        (c: any) => c.firstName && c.lastName && c.birthDate
      );

      // Construction de l'adresse
      const address = `${form.address.number.trim()} ${form.address.street.trim()}, ${form.address.postal.trim()} ${form.address.city.trim()}, ${form.address.country.trim()}`;

      const legalR =
        form.legalResponsibility === "Autre"
          ? `Autre: ${form.legalResponsibilityOther.trim()}`
          : form.legalResponsibility;

      // Payload
      const payload: any = {
        email: form.email,
        password: form.password,
        passwordConfirm: form.passwordConfirm,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        address,
        legalResponsibility: legalR,
      };

      if (contactsClean.length) payload.emergencyContacts = contactsClean;
      if (kidsClean.length) payload.children = kidsClean;

      // Obtenir le token CSRF des cookies
      const getCsrfTokenFromCookies = () => {
        const cookies = document.cookie.split(';')
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === 'csrf_token') {
            return value
          }
        }
        return null
      }

      const csrfToken = getCsrfTokenFromCookies()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken
      }

      // Soumission selon le type d'inscription
      if (inviteToken.value) {
        payload.token = inviteToken.value;
        const res = await fetch(`${API_URL}/auth/register-by-invite`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
      } else {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
      }

      toast.success("Compte créé ! Connectez-vous.");
      router.push({ name: "Login" });
      return true;
    } catch (e: any) {
      toast.error(e.message || "Erreur d'inscription");
      return false;
    } finally {
      loading.value = false;
    }
  };

  const resetForm = () => {
    Object.assign(form, {
      firstName: "",
      lastName: "",
      phone: "",
      address: {
        number: "",
        street: "",
        postal: "",
        city: "",
        country: "",
      },
      legalResponsibility: "",
      legalResponsibilityOther: "",
      emergencyContacts: [],
      children: [],
      email: "",
      password: "",
      passwordConfirm: "",
    });
    inviteToken.value = null;
  };

  return {
    form,
    loading,
    inviteToken,
    addEmergencyContact,
    removeEmergencyContact,
    addChild,
    removeChild,
    validateToken,
    submitRegistration,
    resetForm,
    isStepOneComplete,
    isStepTwoComplete,
    canAccessStep,
  };
});
