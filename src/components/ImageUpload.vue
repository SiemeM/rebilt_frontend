<template>
  <div class="color-upload-section">
    <input
      type="file"
      :id="'images-' + index"
      style="display: none"
      multiple
      @change="handleColorImageUploadFor3D($event, index)"
    />

    <div class="uploadImage" @click="() => triggerFileInput(index)">
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
export default {
  name: "ImageUpload",
  data() {
    return {
      // Voorbeeldgegevens van geüploade afbeeldingen
      colorUploads: [{ images: [] }],
    };
  },
  methods: {
    // Trigger bestandselectie
    triggerFileInput(index) {
      const fileInput = document.getElementById(`images-${index}`);
      if (fileInput) {
        fileInput.click();
      } else {
        console.warn("File input niet gevonden");
      }
    },

    // Verwerken van de geüploade afbeeldingen
    handleColorImageUploadFor3D(event, index) {
      const files = event.target.files;
      if (files && files.length > 0) {
        // Voeg de geselecteerde afbeeldingen toe aan colorUploads
        this.colorUploads[index].images = Array.from(files).map((file) =>
          URL.createObjectURL(file)
        );
      }
    },

    // Genereren van de preview-URL's voor geüploade afbeeldingen
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
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.25rem;
  width: 100%;
  height: 120px;
  background-color: var(--gray-700);
}

.uploadImage .text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.uploadImage img {
  width: 64px;
  height: 64px;
  object-fit: cover;
}

.uploadImage .text img {
  width: 24px;
  height: 24px;
}

.uploadImage p {
  text-align: center;
  font-size: 12px;
}
</style>
