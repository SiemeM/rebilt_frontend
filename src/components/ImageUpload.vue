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

    async handleColorImageUpload(event, index) {
      const files = event.target.files;
      const validFiles = Array.from(files).filter((file) => {
        if (!file) return false; // Extra check om te voorkomen dat file undefined is

        if (this.partnerPackage === "pro" && this.isImageFile(file)) {
          alert("❌ Pro-gebruikers kunnen alleen 3D-bestanden uploaden.");
          return false;
        }
        if (this.partnerPackage !== "pro" && this.is3DFile(file)) {
          alert(
            "❌ Standaard-gebruikers kunnen alleen 2D-afbeeldingen uploaden."
          );
          return false;
        }
        return true;
      });

      if (!validFiles.length) {
        console.warn("❌ Geen geldige bestanden geselecteerd.");
        return;
      }

      const uploadedUrls = [];
      for (let file of files) {
        const fileExtension = file.name.split(".").pop().toLowerCase();

        // **Validatie per pakket**
        if (this.partnerPackage === "pro") {
          if (this.isImageFile(file.name)) {
            alert("Pro-gebruikers kunnen alleen 3D-bestanden uploaden.");
            return;
          }
        } else {
          if (this.is3DFile(file.name)) {
            alert(
              "Standaard-gebruikers kunnen alleen 2D-afbeeldingen uploaden."
            );
            return;
          }
        }

        // **Upload logica**
        try {
          const secureUrl = await uploadFileToCloudinary(
            file,
            this.color.name,
            this.partnerName
          );
          console.log("Bestand succesvol geüpload:", secureUrl);

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
      console.log("Rendering 3D model:", url);
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
      return (
        file &&
        file.type &&
        ["model/gltf-binary", "model/gltf+json", "model/obj"].includes(
          file.type
        )
      );
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
