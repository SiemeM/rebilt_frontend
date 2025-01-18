<template>
  <div class="color-upload-section">
    <input
      type="file"
      :id="'images-' + index"
      style="display: none"
      multiple
      @change="handleColorImageUploadFor3D($event, index)"
    />

    <div
      class="uploadImage"
      @click="() => triggerFileInput(index)"
      :style="{
        justifyContent: colorUploads[index]?.images?.length
          ? 'flex-start'
          : 'center',
      }"
    >
      <div v-if="!colorUploads[index]?.images?.length" class="text">
        <img src="../assets/icons/image-add.svg" alt="image-add" />
        <p>3D-model toevoegen</p>
      </div>

      <div
        v-for="(previewUrl, imgIndex) in previewImages(
          colorUploads[index]?.images
        )"
        :key="imgIndex"
        class="image-preview"
      >
        <img :src="previewUrl" alt="Uploaded image preview" width="100" />
      </div>
    </div>
  </div>
</template>

<script>
import { uploadFileToCloudinary } from "../services/fileService"; // Import your Cloudinary upload function

export default {
  name: "ImageUpload",
  props: {
    color: Object,
    index: Number,
    colorUploads: Array,
  },
  methods: {
    // Trigger file selection
    triggerFileInput(index) {
      const fileInput = document.getElementById(`images-${index}`);
      if (fileInput) {
        fileInput.click();
      } else {
        console.warn("File input not found");
      }
    },

    // Handle 3D model upload (upload to Cloudinary)
    async handleColorImageUploadFor3D(event, index) {
      if (!this.colorUploads[index]) {
        this.colorUploads[index] = { images: [] };
      }

      const files = event.target.files;
      const uploadedUrls = [];

      // Process each file and upload to Cloudinary
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          // Upload the file to Cloudinary and get the secure URL
          const secureUrl = await uploadFileToCloudinary(
            file,
            this.color.name,
            this.$parent.partnerName
          );

          // Add the uploaded URL to the colorUploads array
          this.colorUploads[index].images.push(secureUrl);
          uploadedUrls.push(secureUrl);
        } catch (error) {
          console.error("Error uploading file to Cloudinary:", error);
          this.$emit("updateColorUploads", this.colorUploads); // Emit even in case of error
        }
      }

      // Emit the URLs back to the parent component after successful uploads
      if (uploadedUrls.length > 0) {
        this.$emit("updateColorUploads", this.colorUploads);
      }
    },

    // Generate preview URLs for uploaded images
    previewImages(images) {
      return images || [];
    },
  },
};
</script>

<style scoped>
.color-upload-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.image-preview img {
  width: 50px;
  height: 50px;
  object-fit: cover;
}
</style>
