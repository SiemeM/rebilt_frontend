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
export default {
  name: "ImageUpload",
  props: {
    color: Object,
    index: Number,
    colorUploads: Array,
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
      // Controleer of colorUploads[index] gedefinieerd is
      if (!this.colorUploads[index]) {
        // Maak een object aan als colorUploads[index] niet bestaat
        this.colorUploads[index] = { images: [] };
      }

      // Verkrijg de geselecteerde bestanden
      const files = event.target.files;

      // Verwerk alle geselecteerde bestanden
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Voeg de afbeelding toe aan de colorUploads array
        this.colorUploads[index].images.push(URL.createObjectURL(file));
      }

      // Emit een update naar de oudercomponent
      this.$emit("updateColorUploads", this.colorUploads);
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
