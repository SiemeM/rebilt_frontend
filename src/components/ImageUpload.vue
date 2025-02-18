<template>
  <div class="color-upload-section">
    <!-- Verborgen input voor het selecteren van bestanden -->
    <input
      type="file"
      :id="'images-' + index"
      style="display: none"
      multiple
      @change="handleColorImageUpload($event, index)"
    />

    <!-- Upload knop -->
    <div
      class="uploadImage"
      @click="() => (isModelLoaded ? null : triggerFileInput(index))"
      :style="{
        justifyContent: colorUploads[index]?.images?.length
          ? 'flex-start'
          : 'center',
      }"
    >
      <div v-if="!colorUploads[index]?.images?.length" class="text">
        <img src="../assets/icons/image-add.svg" alt="image-add" />
        <p>Bestanden toevoegen</p>
      </div>

      <!-- Lijst van geüploade bestanden -->
      <div
        v-for="(previewUrl, imgIndex) in previewImages(
          colorUploads[index]?.images
        )"
        :key="imgIndex"
        class="image-preview"
      >
        <!-- Template voor afbeeldingen -->
        <template v-if="isImageUrl(previewUrl)">
          <img :src="previewUrl" alt="Uploaded file preview" width="100" />
        </template>

        <template v-else>
          <p>3D bestand geüpload:</p>
          <div :id="'threejs-' + index" class="threejs-container" />
          <button
            @click="triggerFileInput(index)"
            v-if="isModelLoaded"
            class="btn active"
          >
            Upload nieuw 3D model
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { uploadFileToCloudinary } from "../services/fileService";

export default {
  name: "ImageUpload",
  props: {
    color: Object,
    index: Number,
    colorUploads: Array,
    partnerName: String,
    partnerPackage: String,
  },
  data() {
    return {
      isModelLoaded: false,
    };
  },
  methods: {
    triggerFileInput(index) {
      const fileInput = document.getElementById(`images-${index}`);
      if (fileInput) {
        fileInput.click();
      } else {
        console.warn("File input not found");
      }
    },

    async handleThumbnailUpload(event, index) {
      const files = event.target.files;

      // Controleer of er daadwerkelijk bestanden zijn geselecteerd
      if (!files || files.length === 0) {
        console.warn("❌ Geen thumbnail bestand geselecteerd.");
        return;
      }

      const validFiles = Array.from(files).filter((file) => {
        // Controleer of het bestand een afbeelding is
        return this.isImageFile(file);
      });

      if (!validFiles.length) {
        console.warn("❌ Geen geldige thumbnail geselecteerd.");
        return;
      }

      const uploadedUrls = [];
      for (let file of files) {
        // Extra check of file null is
        if (!file) {
          console.error("❌ Thumbnail bestand is null.");
          continue;
        }

        // Controleer of de naam van het bestand beschikbaar is
        if (!file.name) {
          console.error("❌ Thumbnail bestand heeft geen naam.");
          continue;
        }

        const fileExtension = file.name.split(".").pop().toLowerCase();

        try {
          const secureUrl = await uploadFileToCloudinary(
            file,
            this.color.name,
            this.partnerName
          );

          // Voeg de thumbnail toe aan de uploads
          this.colorUploads[index] = this.colorUploads[index] || { images: [] };
          this.colorUploads[index].images.push(secureUrl);
          uploadedUrls.push(secureUrl);

          // **Emit naar parent**
          this.$emit("file-uploaded", uploadedUrls);
        } catch (error) {
          console.error(
            "Fout bij uploaden van thumbnail naar Cloudinary:",
            error
          );
        }
      }
    },

    async handleColorImageUpload(event, index) {
      const files = event.target.files;

      // Controleer of er daadwerkelijk bestanden zijn geselecteerd
      if (!files || files.length === 0) {
        console.warn("❌ Geen bestanden geselecteerd.");
        return;
      }

      const validFiles = Array.from(files).filter((file) => {
        // Controleer of het bestand geldig is (niet null of undefined)
        if (!file) return false; // Extra check om te voorkomen dat file null of undefined is
        // **Pro-gebruikers kunnen zowel afbeeldingen als 3D-bestanden uploaden**
        if (this.partnerPackage === "pro" && this.is3DFile(file)) {
          return true; // Laat Pro-gebruikers 3D-bestanden uploaden
        }

        // **Standaard-gebruikers kunnen alleen 2D-afbeeldingen uploaden**
        if (this.partnerPackage !== "pro" && this.is3DFile(file)) {
          alert(
            "❌ Standaard-gebruikers kunnen alleen 2D-afbeeldingen uploaden."
          );
          return false;
        }

        // **Validatie voor afbeeldingen voor zowel Pro als Standaard-gebruikers**
        if (this.isImageFile(file)) {
          return true;
        }

        return false;
      });

      if (!validFiles.length) {
        console.warn("❌ Geen geldige bestanden geselecteerd.");
        return;
      }

      const uploadedUrls = [];
      for (let file of files) {
        // Extra check of file null is
        if (!file) {
          console.error("❌ Bestand is null.");
          continue;
        }

        // Controleer of de naam van het bestand beschikbaar is
        if (!file.name) {
          console.error("❌ Bestand heeft geen naam.");
          continue;
        }

        const fileExtension = file.name.split(".").pop().toLowerCase();

        try {
          const secureUrl = await uploadFileToCloudinary(
            file,
            this.color.name,
            this.partnerName
          );

          this.colorUploads[index] = this.colorUploads[index] || { images: [] };
          this.colorUploads[index].images.push(secureUrl);
          uploadedUrls.push(secureUrl);

          // **Render 3D model als het een 3D bestand is**
          if (this.is3DFile(file.name)) {
            this.render3DModel(secureUrl, `threejs-${index}`, fileExtension);
          }

          // **Emit naar parent**
          this.$emit("file-uploaded", uploadedUrls);
        } catch (error) {
          console.error("Fout bij uploaden naar Cloudinary:", error);
        }
      }
    },

    render3DModel(url, containerId, fileExtension) {
      // Hier zou je Three.js of een andere 3D library kunnen gebruiken
      this.isModelLoaded = true;
    },

    previewImages(images) {
      return images || [];
    },

    isImageFile(file) {
      return file && file.type && file.type.startsWith("image/");
    },

    isImageUrl(url) {
      return /\.(jpeg|jpg|png|gif|webp)$/i.test(url);
    },

    is3DFile(file) {
      return file && file.name && /\.(glb|gltf|fbx|obj)$/i.test(file.name);
    },
  },
};
</script>

<style scoped>
.color-upload-section,
.image-preview div {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.uploadImage {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.25rem;
  width: 100%;
  background-color: var(--gray-700);
}

.uploadImage .text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.image-preview {
  width: 50px;
}

.image-preview img {
  width: 50px;
  height: 50px;
  object-fit: cover;
}

.image-preview div {
  width: 100%;
}

.threejs-container {
  width: 100%;
  height: 400px;
}
</style>
