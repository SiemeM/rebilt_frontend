<template>
  <div>
    <input
      type="file"
      id="images-0"
      ref="fileInput"
      @change="handleFileChange(0)"
      style="display: none"
    />
    <button @click="triggerFileInput(0)">Upload Image</button>
  </div>
</template>

<script>
export default {
  name: "ImageUpload",
  methods: {
    // triggerFileInput functie voor bestandselectie
    triggerFileInput(index) {
      const fileInput = document.getElementById(`images-${index}`);
      if (fileInput) {
        fileInput.click();
      } else {
        console.warn("File input niet gevonden");
      }
    },

    handleFileChange(index) {
      const fileInput = document.getElementById(`images-${index}`);
      const files = fileInput?.files;
      if (files && files.length > 0) {
        console.log("Bestand geüpload:", files[0]);
        // Je kunt hier verdere verwerking toevoegen, zoals bestandsupload
      }
    },
  },
};
</script>

<style scoped>
/* Stijl voor de component */
</style>
