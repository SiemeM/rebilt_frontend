<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";
import { fetchPartnerData } from "../../services/apiService";
import { checkToken, fetchPartnerPackage } from "../../services/authService";
import {
  fetchPartnerConfigurations,
  fetchOptionNames,
  addNewColor,
} from "../../services/configurationService";

import {
  fetchProducts,
  filterProductsByType,
  add2DProduct,
  add3DProduct,
  handleColorImageUploadFor2D,
  handleColorImageUploadFor3D,
  getcolors,
  fetchcolors,
} from "../../services/productService";

import DropdownToggle from "../../components/DropdownToggle.vue"; // Importeer de DropdownToggle component
import ColorSelectionToggle from "../../components/ColorSelectionToggle.vue";

const selectedColors = ref([]);
const partnerConfigurations = ref([]);
const productTypes = ref([]);
const productCode = ref("");
const productName = ref("");
const brand = ref("");
const productPrice = ref("");
const description = ref("");
const colorUploads = ref([]);
const dropdownStates = ref({});
const newColorName = ref("");

const jwtToken = localStorage.getItem("jwtToken");
const tokenPayload = jwtToken ? JSON.parse(atob(jwtToken.split(".")[1])) : {};
const partnerId = tokenPayload.companyId;
const selectedType = ref(""); // Add this line
const partnerPackage = ref(""); // or initialize with actual data
const colors = ref([]); // Reactive property voor kleuren

onMounted(async () => {
  if (partnerId) {
    try {
      await checkToken();
      await fetchPartnerData(partnerId);

      const { partnerConfigs } = await fetchPartnerConfigurations(
        partnerId,
        jwtToken
      );
      partnerConfigurations.value = partnerConfigs;

      // Fetch colors for the configuration
      const fetchedColors = await getcolors(partnerId);
      if (fetchedColors && Array.isArray(fetchedColors)) {
        colors.value = fetchedColors;

        partnerConfigurations.value.forEach((config) => {
          const fieldName = config.configurationDetails.fieldName;

          // Initialize empty array for each fieldName if not already present
          if (!selectedColors.value[fieldName]) {
            selectedColors.value[fieldName] = [];
          }

          // Populate the selectedColors array for each fieldName with the fetched colors
          colors.value.forEach((color) => {
            selectedColors.value[fieldName].push({
              optionId: color.optionId,
              name: color.name || "Unnamed Color",
              images: color.images || [],
            });
          });
        });

        console.log(selectedColors.value); // Verify the structure
      } else {
        console.warn("No colors returned from getcolors");
      }
    } catch (error) {
      console.error("Error during initialization:", error);
    }
  } else {
    console.error("Partner ID is not available.");
  }
});
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="content">
    <h1>Add new product</h1>
    <form @submit.prevent="handleSubmit">
      <div class="row">
        <div class="column">
          <label for="productCode">Product Code:</label>
          <input v-model="productCode" id="productCode" type="text" required />
        </div>
        <div class="column">
          <label for="productName">Product Name:</label>
          <input v-model="productName" id="productName" type="text" required />
        </div>
      </div>

      <div class="row">
        <div class="column">
          <label for="productType">Type Of Product:</label>
          <select
            v-model="selectedType"
            id="productType"
            @change="filterProductsByType"
          >
            <option value="">Select Product Type</option>
            <option
              v-for="(type, index) in productTypes"
              :key="index"
              :value="type"
            >
              {{ type }}
            </option>
          </select>
        </div>
        <div class="column">
          <label for="brand">Brand:</label>
          <input v-model="brand" id="brand" type="text" required />
        </div>
      </div>

      <div class="row">
        <div class="column">
          <label for="productPrice">Price:</label>
          <input
            v-model="productPrice"
            id="productPrice"
            type="number"
            required
          />
        </div>
        <div class="column">
          <label for="description">Description:</label>
          <textarea v-model="description" id="description" required></textarea>
        </div>
      </div>

      <!-- Dynamically render partner configurations -->
      <div
        v-for="config in partnerConfigurations"
        :key="config._id"
        class="row"
      >
        <div class="column">
          <label :for="config.configurationDetails.fieldName"
            >{{ config.configurationDetails.fieldName }}:</label
          >

          <!-- Text field -->
          <template v-if="config.configurationDetails.fieldType === 'Text'">
            <input
              v-model="config.value"
              :id="config.configurationDetails.fieldName"
              type="text"
            />
          </template>

          <!-- Dropdown field -->
          <template
            v-else-if="config.configurationDetails.fieldType === 'Dropdown'"
          >
            <DropdownToggle
              :fieldName="config.configurationDetails.fieldName"
              :dropdownStates="dropdownStates"
              buttonText="Toggle Dropdown"
            >
              <div v-for="(option, index) in configurations" :key="index">
                <span
                  class="color-bullet"
                  :style="{ backgroundColor: color.name || 'transparent' }"
                ></span>
                {{ color.name || "Unnamed Color" }}
              </div>
            </DropdownToggle>
          </template>

          <!-- Color field -->
          <template
            v-else-if="config.configurationDetails.fieldType === 'color'"
          >
            <div class="color-dropdown">
              <div class="dropdown">
                <DropdownToggle
                  :fieldName="config.configurationDetails.fieldName"
                  :dropdownStates="dropdownStates"
                  buttonText="Select colors"
                >
                  <ColorSelectionToggle
                    :selectedColors="
                      selectedColors[config.configurationDetails.fieldName]
                    "
                    :dropdownStates="dropdownStates"
                    :fieldName="config.configurationDetails.fieldName"
                    :colorOptions="colors"
                  />
                </DropdownToggle>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div v-if="partnerPackage == 'pro'" class="color-upload-section">
        <!-- Only show the upload zone if the color has images or is selected -->
        <p>Upload 3D model</p>
        <input
          type="file"
          :id="'images-' + index"
          style="display: none"
          multiple
          @change="handleColorImageUploadFor3D($event, index)"
        />
        <div class="uploadImage" @click="() => triggerFileInput(index)">
          <div v-if="!colorUploads[index]?.images?.length" class="text">
            <img src="../../assets/icons/image-add.svg" alt="image-add" />
            <p>3D-model toevoegen</p>
          </div>

          <div
            v-for="(previewUrl, imgIndex) in previewImages(
              colorUploads[index]?.images
            )"
            :key="imgIndex"
          >
            <img :src="previewUrl" alt="Uploaded image preview" width="100" />
          </div>
        </div>
      </div>

      <!-- Submit button to trigger the form submission -->
      <button class="btn active" type="submit">Add product</button>
    </form>
  </div>
</template>

<style scoped>
.content {
  width: 100%;
  margin-bottom: 72px;
}

.error-message {
  color: red;
  font-weight: bold;
  padding: 10px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 5px;
}

form,
.color-dropdown {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
  width: 100%;
}

form .row,
form .column,
.color-upload-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

input,
select,
textarea {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--gray-700);
  background-color: var(--gray-700);
  color: white;
  width: 100%;
}

button {
  color: white;
  cursor: pointer;
}

.colorpicker {
  padding: 0;
  width: 32px;
  height: 32px;
  background-color: transparent;
  border: none;
}

.error {
  color: #d34848;
}

.color-box {
  display: inline-block;
  width: 30px;
  height: 30px;
  margin: 5px;
  border-radius: 4px;
}

.image-preview {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.preview-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
}

.error-message {
  color: #d34848;
  margin-top: 20px;
}

.color-dropdown {
  position: relative;
  width: 100%;
}

.dropdown {
  position: relative;
  display: inline-block;
  width: 100%;
}

.dropdown-selected {
  padding: 8px;
  background-color: var(--gray-700);
  color: white;
  border-radius: 4px;
  display: flex;
  align-items: center;
  cursor: pointer;
  width: 100%;
}

.dropdown-selected span {
  color: var(--text-color);
}

.color-bullet {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: transparent;
}

.dropdown-options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--gray-900);
  border-radius: 4px;
  width: 100%;
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 4px;
}

.dropdown-option {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding: 8px;
  color: white;
  cursor: pointer;
}

.dropdown-option input {
  width: auto;
}

.dropdown-option:hover {
  background-color: #555;
}

.dropdown-option:active {
  background-color: #444;
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

@media (min-width: 768px) {
  .content {
    margin: 0;
  }

  form .row {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 120px;
    width: 100%;
  }
}
</style>
