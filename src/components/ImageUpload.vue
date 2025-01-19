<template>
  <div class="color-upload-section">
    <!-- File input for selecting images -->
    <input
      type="file"
      :id="'images-' + index"
      style="display: none"
      multiple
      @click="handleColorImageUpload($event, index)"
    />

    <!-- Trigger area for clicking and uploading images -->
    <div
      class="uploadImage"
      @click="() => triggerFileInput(index)"
      :style="{
        justifyContent: colorUploads[index]?.images?.length
          ? 'flex-start'
          : 'center',
      }"
    >
      <!-- Display message when no images are uploaded -->
      <div v-if="!colorUploads[index]?.images?.length" class="text">
        <img src="../assets/icons/image-add.svg" alt="image-add" />
        <p>Bestanden toevoegen</p>
        <!-- Algemene boodschap voor 2D of 3D -->
      </div>

      <!-- Display image previews after uploading -->
      <div
        v-for="(previewUrl, imgIndex) in previewImages(
          colorUploads[index]?.images
        )"
        :key="imgIndex"
        class="image-preview"
      >
        <img :src="previewUrl" alt="Uploaded file preview" width="100" />
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
    partnerName: String, // Partnernaam
    partnerPackage: String, // Het pakket van de gebruiker (Pro of Standaard)
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

    // Handle image and 3D model upload based on file type
    async handleColorImageUpload(event, index) {
      console.log("handleColorImageUpload aangeroepen");
      const files = event.target.files;
      if (!files.length) return;

      // Initialize colorUploads array for the current index if not exists
      if (!this.colorUploads[index]) {
        this.colorUploads[index] = { images: [] };
      }

      const uploadedUrls = [];

      // Loop through files and handle 2D or 3D upload based on file extension
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExtension = file.name.split(".").pop().toLowerCase();

        // Check if the user is a Pro user
        if (this.partnerPackage === "pro") {
          console.log("pro");
          // Pro gebruikers mogen geen 2D-afbeeldingen uploaden
          if (["png", "jpg", "jpeg", "webp"].includes(fileExtension)) {
            console.log("pngggg");
            console.warn("Pro-gebruikers mogen geen 2D-afbeeldingen uploaden.");
            alert("Pro-gebruikers kunnen alleen 3D-bestanden uploaden.");
            return;
          }

          // Pro gebruikers mogen alleen 3D-bestanden uploaden (bijv. glb, gltf, obj)
          if (["glb", "gltf", "obj"].includes(fileExtension)) {
            console.log("3D-bestand geüpload");
            try {
              // Upload the 3D model to Cloudinary
              const secureUrl = await uploadFileToCloudinary(
                file,
                this.color.name,
                this.partnerName
              );
              this.colorUploads[index].images.push(secureUrl); // Add uploaded 3D file URL
              uploadedUrls.push(secureUrl); // Store the 3D file URL
            } catch (error) {
              console.error("Error uploading file to Cloudinary:", error);
            }
          } else {
            console.warn(
              "Ongeldig 3D-bestandstype. Alleen glb, gltf en obj zijn toegestaan."
            );
            alert(
              "Alleen GLB, GLTF en OBJ bestanden worden geaccepteerd voor Pro-gebruikers."
            );
          }
        } else {
          // Standaard-gebruikers mogen geen 3D-bestanden uploaden
          if (["glb", "gltf", "obj"].includes(fileExtension)) {
            console.warn(
              "Standaard-gebruikers mogen geen 3D-bestanden uploaden."
            );
            alert(
              "Standaard-gebruikers kunnen alleen 2D-afbeeldingen uploaden."
            );
            return;
          }

          // Standaard-gebruikers mogen alleen 2D-afbeeldingen uploaden
          if (["png", "jpg", "jpeg", "webp"].includes(fileExtension)) {
            uploadedUrls.push(URL.createObjectURL(file)); // For preview
            this.colorUploads[index].images.push(URL.createObjectURL(file)); // Add 2D image preview URL
          } else {
            console.warn("Ongewoon bestandstype: " + file.name);
            alert("Dit bestandstype wordt niet ondersteund.");
          }
        }
      }

      // Emit the URLs back to the parent component after successful uploads
      if (uploadedUrls.length > 0) {
        this.$emit(
          "updateColorUploads",
          this.colorUploads[index].images,
          index
        ); // Emit URLs to parent
      }
    },

    // Generate preview URLs for uploaded images (2D)
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
