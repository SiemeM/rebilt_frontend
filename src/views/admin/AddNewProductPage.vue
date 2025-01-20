<script setup>
import { toRaw } from "vue";
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
  addProduct,
  getcolors,
  fetchcolors,
  fetchProductTypes,
} from "../../services/productService";

import DropdownToggle from "../../components/DropdownToggle.vue";
import DropdownToggleColor from "../../components/DropdownToggleColor.vue";
import ColorSelectionToggle from "../../components/ColorSelectionToggle.vue";
import ImageUpload from "../../components/ImageUpload.vue";
import { uploadFileToCloudinary } from "../../services/fileService";

const selectedColors = ref([]); // Selected colors for the product
const partnerConfigurations = ref([]); // Partner configuration data
const productCode = ref(""); // Product code
const productName = ref(""); // Product name
const brand = ref(""); // Product brand
const productPrice = ref(""); // Product price
const description = ref(""); // Product description
const colorUploads = ref([]); // For storing uploaded images per color
const dropdownStates = ref({}); // Dropdown toggle states
const newColorName = ref(""); // New color name input
const newProducts = ref([]); // Lege array voor reactiviteit

const jwtToken = localStorage.getItem("jwtToken");
const tokenPayload = jwtToken ? JSON.parse(atob(jwtToken.split(".")[1])) : {};
const partnerId = tokenPayload.companyId;
const selectedType = ref(""); // Selected product type
const partnerPackage = ref(""); // Partner package
const colors = ref([]); // List of colors for selection
const uploadError = ref("");
const partnerName = ref("");
const productTypes = ref([]);

const addProductType = (productTypes, newType) => {
  // Ensure productTypes is an array before proceeding
  if (!Array.isArray(productTypes)) {
    console.error("productTypes is not an array", productTypes);
    return; // Stop execution if productTypes is not an array
  }

  if (!productTypes.includes(newType)) {
    productTypes.push(newType);
  } else {
    console.warn("This product type already exists!");
  }
};

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

onMounted(async () => {
  if (partnerId) {
    try {
      // Stap 1: Controleer de token
      await checkToken();

      // Stap 2: Haal partnerdata op
      const partnerData = await fetchPartnerData(partnerId, jwtToken);
      if (partnerData && partnerData.name) {
        partnerName.value = partnerData.name;
      } else {
        console.error("Partner data or partner name is missing.");
      }

      // Stap 3: Haal het partner package op
      const partnerPackageResponse = await fetchPartnerPackage(partnerId);
      partnerPackage.value = partnerPackageResponse;

      if (partnerPackageResponse) {
        partnerPackage.value = partnerPackageResponse;
      } else {
        console.error("Partner package data is missing.");
      }

      // Stap 4: Haal partner configuraties op
      const { partnerConfigs } = await fetchPartnerConfigurations(
        partnerId,
        jwtToken
      );
      partnerConfigurations.value = partnerConfigs;

      // Stap 5: Haal de kleuren op voor de configuraties
      const fetchedColors = await getcolors(partnerId);
      if (fetchedColors && Array.isArray(fetchedColors)) {
        colors.value = fetchedColors;

        // Initialiseer de kleurconfiguraties
        partnerConfigurations.value.forEach((config) => {
          const fieldName = config.configurationDetails.fieldName;
          if (config.configurationDetails.fieldType === "color") {
            // Vul de kleurenarray voor elk fieldName met de opgehaalde kleuren
            colors.value.forEach((color) => {
              if (!config.colors) {
                config.colors = [];
              }

              // Gebruik enkel de naam van de kleur (geen hex of andere waarde)
              config.colors.push({
                name: color.name || "Unnamed Color", // Gebruik de naam, fallback naar "Unnamed Color" als het niet beschikbaar is
              });
            });
          }
        });
      } else {
        console.warn("No colors returned from getcolors");
      }

      // Stap 6: Haal de producten op en filter ze
      const fetchedProductTypes = await fetchProductTypes(partnerId);

      // Unwrap the Proxy using toRaw (for Vue's reactive data)
      const unwrappedProductTypes = toRaw(fetchedProductTypes);

      // Ensure it's an array before assigning to productTypes
      if (Array.isArray(unwrappedProductTypes)) {
        productTypes.value = unwrappedProductTypes;
      } else {
        console.error("Fetched product types are not an array.");
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
    <form @submit.prevent="addProduct">
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
          <!-- Replacing select dropdown with DropdownToggle for product type -->
          <div class="dropdown" v-if="productTypes.length > 0">
            <DropdownToggle
              v-model="selectedType"
              :fieldName="'sole_top'"
              :dropdownStates="dropdownStates"
              :buttonText="'Select colors'"
              :types="productTypes"
              @addOption="addProductType(productTypes, $event)"
            >
            </DropdownToggle>
          </div>
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
      <!-- Template voor 'standard' package -->
      <template v-if="partnerPackage == 'standard'">
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
                <DropdownToggleColor
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
                </DropdownToggleColor>
              </template>

              <!-- Color field -->
              <template
                v-else-if="config.configurationDetails.fieldType === 'color'"
              >
                <div class="color-dropdown">
                  <div class="dropdown">
                    <DropdownToggleColor
                      :fieldName="config.configurationDetails.fieldName"
                      :dropdownStates="dropdownStates"
                      :buttonText="buttonText"
                    >
                      <ColorSelectionToggle
                        v-model="selectedColors"
                        :fieldName="'colorField'"
                        :dropdownStates="dropdownStates"
                        :colorOptions="colorOptions"
                        @update:selectedColors="updateSelectedColors"
                        @update:colorOptions="updateColorOptions"
                      />
                    </DropdownToggleColor>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Upload zone voor 'standard' pakket -->
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
                :partnerPackage="partnerPackage"
                :partnerName="partnerName"
              />
            </div>
          </template>
        </template>
      </template>

      <!-- Template voor 'pro' package -->
      <template v-if="partnerPackage == 'pro'">
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
                <DropdownToggleColor
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
                </DropdownToggleColor>
              </template>

              <!-- Color field -->
              <template
                v-else-if="config.configurationDetails.fieldType === 'color'"
              >
                <div class="color-dropdown">
                  <div class="dropdown">
                    <DropdownToggleColor
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
                    </DropdownToggleColor>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </template>

        <!-- Enkele uploadzone voor 'pro' pakket -->
        <ImageUpload
          v-for="(selectedColor, colorIndex) in selectedColors"
          :key="colorIndex"
          :color="selectedColor"
          :index="colorIndex"
          :colorUploads="colorUploads"
          :partnerPackage="partnerPackage"
          :partnerName="partnerName"
        />
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
