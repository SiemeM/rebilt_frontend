<script setup>
import { ref, computed, onMounted } from "vue";
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

import DropdownToggle from "../../components/DropdownToggle.vue";
import ColorSelectionToggle from "../../components/ColorSelectionToggle.vue";
import ImageUpload from "../../components/ImageUpload.vue";

const selectedColors = ref([]); // Selected colors for the product
const partnerConfigurations = ref([]); // Partner configuration data
const productTypes = ref([]); // List of product types
const productCode = ref(""); // Product code
const productName = ref(""); // Product name
const brand = ref(""); // Product brand
const productPrice = ref(""); // Product price
const description = ref(""); // Product description
const colorUploads = ref([]); // For storing uploaded images per color
const dropdownStates = ref({}); // Dropdown toggle states
const newColorName = ref(""); // New color name input

const jwtToken = localStorage.getItem("jwtToken");
const tokenPayload = jwtToken ? JSON.parse(atob(jwtToken.split(".")[1])) : {};
const partnerId = tokenPayload.companyId;
const selectedType = ref(""); // Selected product type
const partnerPackage = ref(""); // Partner package
const colors = ref([]); // List of colors for selection

// Button text for color selection
const buttonText = computed(() => {
  const selected = selectedColors.value.length;
  if (selected === 0) {
    return "Select colors"; // No colors selected
  }

  // If there are selected colors, show them in the button text (up to 2)
  const colorNames = selectedColors.value
    .slice(0, 2)
    .map((color) => color.name)
    .join(", ");

  if (selectedColors.value.length > 2) {
    return `${colorNames} + ${selectedColors.value.length - 2} more`;
  }

  return colorNames;
});

// Functie om de voorvertoning van afbeeldingen te genereren
const updateColorUploads = (files, index) => {
  // Zorg ervoor dat er een array is voor de betreffende kleur
  if (!colorUploads.value[index]) {
    colorUploads.value[index] = { images: [] };
  }

  // Voeg de geselecteerde bestanden toe
  colorUploads.value[index].images = [...files];
};

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

        // Initialize color configurations
        partnerConfigurations.value.forEach((config) => {
          const fieldName = config.configurationDetails.fieldName;
          if (!colors.value[fieldName]) {
            colors.value[fieldName] = [];
          }

          // Populate the colors array for each fieldName with the fetched colors
          colors.value.forEach((color) => {
            colors.value[fieldName].push({
              optionId: color.optionId,
              name: color.name || "Unnamed Color",
              images: color.images || [],
            });
          });
        });
        console.log(colors.value); // Verify the structure
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

      <!-- Render partner configurations dynamically, with ImageUpload inline -->
      <template
        v-for="(config, index) in partnerConfigurations"
        :key="config._id"
      >
        <div class="row">
          <div class="column">
            <label :for="config.configurationDetails.fieldName">
              {{ config.configurationDetails.fieldName }}:
            </label>

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
                <div
                  v-for="(option, optionIndex) in configurations"
                  :key="optionIndex"
                >
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
                    :buttonText="buttonText"
                  >
                    <ColorSelectionToggle
                      v-model:selectedColors="selectedColors"
                      :colors="colors[config.configurationDetails.fieldName]"
                      :dropdownStates="dropdownStates"
                      :fieldName="config.configurationDetails.fieldName"
                      :colorOptions="colors"
                    />
                  </DropdownToggle>
                </div>
              </div>
            </template>

            <!-- Image upload section comes directly after the color field configuration -->
            <template v-if="config.configurationDetails.fieldType === 'color'">
              <div
                v-for="(selectedColor, colorIndex) in selectedColors"
                :key="colorIndex"
                class="column"
              >
                <p>{{ selectedColor.name }} - Upload 3D Model</p>
                <ImageUpload
                  :color="selectedColor"
                  :index="colorIndex"
                  :colorUploads="colorUploads"
                  @updateColorUploads="updateColorUploads"
                />
              </div>
            </template>
          </div>
        </div>
      </template>

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
