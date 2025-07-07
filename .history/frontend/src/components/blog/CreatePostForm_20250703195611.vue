<template>
  <transition name="modal">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal-content create-post-form">
        <h3>✨ Créer un nouveau post</h3>

        <form @submit.prevent="handleSubmit" class="post-form">
          <!-- Titre -->
          <div class="form-group">
            <label for="title">Titre du post</label>
            <div class="input-with-ai">
              <input
                id="title"
                v-model="form.title"
                type="text"
                placeholder="Saisissez le titre..."
                required
                maxlength="200"
              />
              <label class="ai-checkbox">
                <input
                  type="checkbox"
                  v-model="titlePropose"
                  @change="onProposeTitle"
                />
                <span class="ai-label"
                  >🤖 Proposer une amélioration via IA</span
                >
                <span v-if="titleGenerating" class="generating"
                  >(génération…)</span
                >
              </label>
            </div>

            <!-- AI Proposal for title -->
            <div
              v-if="titleProposal && !titleGenerating"
              class="ai-suggestion"
              role="region"
              aria-labelledby="ai-title-suggestion-title"
            >
              <header class="suggestion-header">
                <span class="material-icons" aria-hidden="true">lightbulb</span>
                <h3 id="ai-title-suggestion-title">Suggestion d'amélioration</h3>
              </header>
              <div class="suggestion-text" role="article">{{ titleProposal }}</div>
              
              <div class="suggestion-actions" role="group" aria-label="Actions pour la suggestion de titre">
                <button
                  @click="acceptTitleProposal"
                  class="edit-btn edit-btn-success edit-btn-sm"
                  type="button"
                  aria-describedby="accept-title-help"
                >
                  <span class="material-icons" aria-hidden="true">check</span>
                  Appliquer
                </button>
                <div id="accept-title-help" class="sr-only">
                  Remplace le titre actuel par la suggestion IA
                </div>
                <button
                  @click="titleProposal = null; titlePropose = false"
                  class="edit-btn edit-btn-custom edit-btn-sm"
                  type="button"
                >
                  <span class="material-icons" aria-hidden="true">close</span>
                  Ignorer
                  <span class="sr-only">la suggestion</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label for="description" class="form-label">Description</label>
            <textarea
              id="description"
              v-model="form.description"
              required
              placeholder="Décrivez votre article..."
              class="form-textarea"
              rows="4"
            ></textarea>
          </div>

          <!-- AI helper for description -->
          <div v-if="!loading" class="ai-helper-modern" role="region" aria-labelledby="ai-desc-title">
            <div class="ai-toggle">
              <h3 id="ai-desc-title" class="sr-only">Assistant IA pour la description</h3>
              <label class="ai-switch" for="desc-ai">
                <input
                  type="checkbox"
                  id="desc-ai"
                  v-model="descriptionPropose"
                  @change="onProposeDescription"
                  class="switch-input"
                  :aria-describedby="descriptionGenerating ? 'ai-desc-generating' : 'ai-desc-description'"
                  :disabled="descriptionGenerating"
                />
                <span class="switch-slider" aria-hidden="true"></span>
                <span class="sr-only">Activer l'assistant IA pour améliorer la description</span>
              </label>
              <div class="ai-label">
                <span class="material-icons" aria-hidden="true">psychology</span>
                <span>Assistant IA</span>
              </div>
            </div>
            <div id="ai-desc-description" class="ai-help-text">
              L'IA peut vous proposer des améliorations de votre description
            </div>

            <div v-if="descriptionGenerating" class="ai-loading" role="status" aria-live="polite">
              <div class="ai-spinner" aria-hidden="true"></div>
              <span id="ai-desc-generating">Génération en cours...</span>
            </div>
          </div>

          <!-- AI Proposal for description -->
          <div
            v-if="descriptionProposal && !descriptionGenerating"
            class="ai-suggestion"
            role="region"
            aria-labelledby="ai-desc-suggestion-title"
          >
            <header class="suggestion-header">
              <span class="material-icons" aria-hidden="true">lightbulb</span>
              <h3 id="ai-desc-suggestion-title">Suggestion d'amélioration</h3>
            </header>
            <div class="suggestion-text" role="article">{{ descriptionProposal }}</div>
            
            <div class="suggestion-actions" role="group" aria-label="Actions pour la suggestion de description">
              <button
                @click="acceptDescriptionProposal"
                class="edit-btn edit-btn-success edit-btn-sm"
                type="button"
                aria-describedby="accept-desc-help"
              >
                <span class="material-icons" aria-hidden="true">check</span>
                Appliquer
              </button>
              <div id="accept-desc-help" class="sr-only">
                Remplace la description actuelle par la suggestion IA
              </div>
              <button
                @click="descriptionProposal = null; descriptionPropose = false"
                class="edit-btn edit-btn-custom edit-btn-sm"
                type="button"
              >
                <span class="material-icons" aria-hidden="true">close</span>
                Ignorer
                <span class="sr-only">la suggestion</span>
              </button>
            </div>
          </div>

          <!-- Upload média -->
          <div class="form-group">
            <label for="media">Image ou vidéo (optionnel)</label>
            <div class="file-upload">
              <input
                id="media"
                type="file"
                @change="handleFileChange"
                accept="image/*,video/*"
                ref="fileInput"
              />
              <div v-if="selectedFile" class="file-preview">
                <span>{{ selectedFile.name }}</span>
                <button type="button" @click="removeFile" class="remove-file">
                  ❌
                </button>
              </div>
            </div>
          </div>

          <!-- Aperçu du média -->
          <div v-if="mediaPreview" class="media-preview">
            <img
              v-if="isImage"
              :src="mediaPreview"
              alt="Aperçu"
              class="preview-image"
            />
            <video
              v-else-if="isVideo"
              :src="mediaPreview"
              controls
              class="preview-video"
            ></video>
          </div>

          <!-- Boutons -->
          <div class="form-actions">
            <button type="button" @click="handleClose" class="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              :disabled="loading || !form.title || !form.description"
              class="btn-primary"
            >
              {{ loading ? "Création..." : "Publier le post" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useBlogStore } from "@/stores/blogStore";

// Props
const emit = defineEmits<{
  postCreated: [];
  close: [];
}>();

const props = defineProps<{ visible: boolean }>();

// Store
const blogStore = useBlogStore();

// État local
const form = ref({
  title: "",
  description: "",
});

const selectedFile = ref<File | null>(null);
const mediaPreview = ref<string | null>(null);
const fileInput = ref<HTMLInputElement>();
const loading = ref(false);

// États IA pour le titre
const titlePropose = ref(false);
const titleGenerating = ref(false);
const titleProposal = ref<string | null>(null);

// États IA pour la description
const descriptionPropose = ref(false);
const descriptionGenerating = ref(false);
const descriptionProposal = ref<string | null>(null);

// Computed
const isImage = computed(() => {
  return selectedFile.value?.type.startsWith("image/") ?? false;
});

const isVideo = computed(() => {
  return selectedFile.value?.type.startsWith("video/") ?? false;
});

// Watchers
watch(selectedFile, (newFile) => {
  if (newFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      mediaPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(newFile);
  } else {
    mediaPreview.value = null;
  }
});

// Méthodes
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];

    // Vérifier la taille (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      alert("Le fichier ne peut pas dépasser 50MB");
      return;
    }

    selectedFile.value = file;
  }
};

const removeFile = () => {
  selectedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

// Méthodes IA
const onProposeTitle = async () => {
  if (!titlePropose.value) {
    titleProposal.value = null;
    titleGenerating.value = false;
    return;
  }

  if (!form.value.title.trim()) {
    alert(
      "Veuillez d'abord saisir un titre avant de demander une amélioration."
    );
    titlePropose.value = false;
    return;
  }

  titleGenerating.value = true;
  titleProposal.value = null;

  try {
    const response = await fetch("http://localhost:3000/ai/mission-improve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        prompt: form.value.title,
        type: 'blog',
        subType: 'title'
      }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la génération de l'amélioration");
    }

    const data = await response.json();
    titleProposal.value = data.suggestion;
  } catch (error: any) {
    alert("Erreur lors de la génération de l'amélioration : " + error.message);
    titlePropose.value = false;
  } finally {
    titleGenerating.value = false;
  }
};

const acceptTitleProposal = () => {
  if (titleProposal.value) {
    form.value.title = titleProposal.value;
    titlePropose.value = false;
    titleProposal.value = null;
  }
};

const onProposeDescription = async () => {
  if (!descriptionPropose.value) {
    descriptionProposal.value = null;
    descriptionGenerating.value = false;
    return;
  }

  if (!form.value.description.trim()) {
    alert(
      "Veuillez d'abord saisir une description avant de demander une amélioration."
    );
    descriptionPropose.value = false;
    return;
  }

  descriptionGenerating.value = true;
  descriptionProposal.value = null;

  try {
    const response = await fetch("http://localhost:3000/ai/mission-improve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        prompt: form.value.description,
        type: 'blog',
        subType: 'description'
      }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la génération de l'amélioration");
    }

    const data = await response.json();
    descriptionProposal.value = data.suggestion;
  } catch (error: any) {
    alert("Erreur lors de la génération de l'amélioration : " + error.message);
    descriptionPropose.value = false;
  } finally {
    descriptionGenerating.value = false;
  }
};

const acceptDescriptionProposal = () => {
  if (descriptionProposal.value) {
    form.value.description = descriptionProposal.value;
    descriptionPropose.value = false;
    descriptionProposal.value = null;
  }
};

const handleSubmit = async () => {
  loading.value = true;

  try {
    await blogStore.createPost({
      title: form.value.title,
      description: form.value.description,
      media: selectedFile.value || undefined,
    });

    resetForm();
    emit("postCreated");
  } catch (error) {
    // L'erreur est gérée dans le store
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.value = {
    title: "",
    description: "",
  };
  selectedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = "";
  }

  // Reset IA states
  titlePropose.value = false;
  titleGenerating.value = false;
  titleProposal.value = null;
  descriptionPropose.value = false;
  descriptionGenerating.value = false;
  descriptionProposal.value = null;
};

const handleClose = () => {
  resetForm();
  emit("close");
};
</script>

<style scoped lang="scss">
.create-post-form {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  position: relative;
  
  h3 {
    margin: 0 0 1.5rem 0;
    color: #2c3e50;
    font-size: 1.5rem;
    text-align: center;
  }

  .post-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
}

.post-form {
  .form-group {
    margin-bottom: 20px;

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #34495e;
    }
  }

  .input-with-ai {
    position: relative;

    input,
    textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e1e8ed;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.3s;

      &:focus {
        outline: none;
        border-color: #3498db;
      }
    }

    textarea {
      resize: vertical;
      min-height: 120px;
    }

    .ai-checkbox {
      position: absolute;
      top: -30px;
      right: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      cursor: pointer;

      input[type="checkbox"] {
        width: auto;
        margin: 0;
      }

      .ai-label {
        color: #7f8c8d;
        font-weight: normal;
      }

      .generating {
        color: #3498db;
        font-style: italic;
        margin-left: 8px;
      }
    }

    .ai-suggestion {
      margin-top: 12px;
      padding: 16px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      border-left: 4px solid #3498db;

      .suggestion-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;

        .material-icons {
          color: #3498db;
        }

        h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }
      }

      .suggestion-text {
        margin: 0 0 12px 0;
        color: #2c3e50;
        line-height: 1.5;
      }

      .suggestion-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      .edit-btn {
        padding: 8px 16px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: color 0.3s;

        &:hover {
          color: #2980b9;
        }
      }

      .edit-btn-success {
        color: #27ae60;
      }

      .edit-btn-custom {
        color: #95a5a6;
      }
    }
  }

  .file-upload {
    input[type="file"] {
      width: 100%;
      padding: 12px;
      border: 2px dashed #bdc3c7;
      border-radius: 8px;
      background: #f8f9fa;
      cursor: pointer;

      &:hover {
        border-color: #3498db;
      }
    }

    .file-preview {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ecf0f1;
      padding: 8px 12px;
      border-radius: 6px;
      margin-top: 8px;

      .remove-file {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
      }
    }
  }

  .media-preview {
    margin-top: 16px;
    text-align: center;

    .preview-image {
      max-width: 100%;
      max-height: 300px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .preview-video {
      max-width: 100%;
      max-height: 300px;
      border-radius: 8px;
    }
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
    position: sticky;
    bottom: 0;
    background: white;
    padding-top: 1rem;
    border-top: 1px solid #e1e8ed;

    .btn-secondary {
      padding: 12px 20px;
      background: #95a5a6;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.3s;

      &:hover {
        background: #7f8c8d;
      }
    }

    .btn-primary {
      padding: 12px 20px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.3s;

      &:hover:not(:disabled) {
        background: #2980b9;
      }

      &:disabled {
        background: #bdc3c7;
        cursor: not-allowed;
      }
    }
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  overflow-y: auto;
  padding: 2rem 0;
}

.modal-content {
  width: 100%;
  max-width: 650px;
  margin: 0 1rem;
  animation: modalFade 0.3s ease;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
}

@keyframes modalFade {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
