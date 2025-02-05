<template>
  <div class="color-upload-section">
    <input
      type="file"
      :id="'images-' + index"
      style="display: none"
      multiple
      @change="handleColorImageUpload($event, index)"
    />

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

      <div
        v-for="(previewUrl, imgIndex) in previewImages(
          colorUploads[index]?.images
        )"
        :key="imgIndex"
        class="image-preview"
      >
        <img
          v-if="isImageFile(previewUrl)"
          :src="previewUrl"
          alt="Uploaded file preview"
          width="100"
        />
        <div v-else>
          <p>3D bestand geüpload:</p>
          <div class="threejs-container" />
          <!-- Upload 3D Model Button -->
          <button
            @click="triggerFileInput(index)"
            v-if="isModelLoaded"
            class="btn active"
          >
            Upload 3D model
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { nextTick } from "vue";
import { uploadFileToCloudinary } from "../services/fileService"; // Cloudinary upload function
import { markRaw } from "vue";

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
      if (!files.length) return;

      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExtension = file.name.split(".").pop().toLowerCase();

        // Validate the file extension based on package
        if (this.partnerPackage === "pro") {
          if (["png", "jpg", "jpeg", "webp"].includes(fileExtension)) {
            alert("Pro-gebruikers kunnen alleen 3D-bestanden uploaden.");
            return;
          }

          if (["glb", "gltf", "obj"].includes(fileExtension)) {
            try {
              const secureUrl = await uploadFileToCloudinary(
                file,
                this.color.name,
                this.partnerName
              );
              console.log("File uploaded successfully:", secureUrl);

              // Add to the colorUploads array
              this.colorUploads[index] = this.colorUploads[index] || {
                images: [],
              };
              this.colorUploads[index].images.push(secureUrl);
              uploadedUrls.push(secureUrl);

              // Trigger 3D model rendering after upload
              this.render3DModel(secureUrl, `threejs-${index}`, fileExtension);

              // Emit the uploaded URLs to the parent component
              this.$emit("file-uploaded", uploadedUrls);
            } catch (error) {
              console.error("Error uploading to Cloudinary:", error);
            }
          }
        } else {
          if (["glb", "gltf", "obj"].includes(fileExtension)) {
            alert(
              "Standaard-gebruikers kunnen alleen 2D-afbeeldingen uploaden."
            );
            return;
          }

          if (["png", "jpg", "jpeg", "webp"].includes(fileExtension)) {
            const imageUrl = URL.createObjectURL(file);
            uploadedUrls.push(imageUrl);
            this.colorUploads[index] = this.colorUploads[index] || {
              images: [],
            };
            this.colorUploads[index].images.push(imageUrl);
          }
        }
      }

      // Emit the uploaded URLs to the parent component
      if (uploadedUrls.length) {
        this.$emit("file-uploaded", uploadedUrls);
      }
    },

    render3DModel(url, containerId, fileExtension) {
      // 3D Model rendering logic
    },

    previewImages(images) {
      return images || [];
    },

    isImageFile(fileUrl) {
      return /\.(jpeg|jpg|png|gif)$/i.test(fileUrl);
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
  width: 100%;
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
