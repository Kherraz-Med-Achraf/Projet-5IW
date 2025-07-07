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

            <!-- Proposition IA pour le titre -->
            <div v-if="titleProposal && !titleGenerating" class="ai-proposal">
              <p class="proposal-text">
                <strong>Proposition :</strong> {{ titleProposal }}
              </p>
              <button
                type="button"
                @click="acceptTitleProposal"
                class="btn-accept"
              >
                Utiliser cette proposition
              </button>
            </div>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label for="description">Description</label>
            <div class="input-with-ai">
              <textarea
                id="description"
                v-model="form.description"
                placeholder="Décrivez votre post..."
                required
                maxlength="2000"
                rows="5"
              ></textarea>
              <label class="ai-checkbox">
                <input
                  type="checkbox"
                  v-model="descriptionPropose"
                  @change="onProposeDescription"
                />
                <span class="ai-label"
                  >🤖 Proposer une amélioration via IA</span
                >
                <span v-if="descriptionGenerating" class="generating"
                  >(génération…)</span
                >
              </label>
            </div>

            <!-- Proposition IA pour la description -->
            <div
              v-if="descriptionProposal && !descriptionGenerating"
              class="ai-proposal"
            >
              <p class="proposal-text">
                <strong>Proposition :</strong> {{ descriptionProposal }}
              </p>
              <button
                type="button"
                @click="acceptDescriptionProposal"
                class="btn-accept"
              >
                Utiliser cette proposition
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
        type: 'blog'
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
        prompt: `Améliore cette description de post pour un blog d'école spécialisée : "${form.value.description}"`,
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
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;

  h3 {
    margin-bottom: 20px;
    color: #2c3e50;
    font-size: 1.3rem;
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

    .ai-proposal {
      margin-top: 12px;
      padding: 16px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      border-left: 4px solid #3498db;

      .proposal-text {
        margin: 0 0 12px 0;
        color: #2c3e50;
        line-height: 1.5;
      }

      .btn-accept {
        padding: 8px 16px;
        background: #27ae60;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: background-color 0.3s;

        &:hover {
          background: #229954;
        }
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
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 100%;
  max-width: 650px;
  margin: 0 1rem;
  animation: modalFade 0.3s ease;
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
