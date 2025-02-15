<script setup>
import { ref, onMounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";
import { fetchPartnerData } from "../../services/apiService";
import { checkToken, fetchPartnerPackage } from "../../services/authService";
import { fetchPartnerConfigurations } from "../../services/configurationService";
import {
  fetchProductTypes,
  getcolors,
  addProductType,
} from "../../services/productService";
import DropdownToggle from "../../components/DropdownToggle.vue";
import DropdownToggleColor from "../../components/DropdownToggleColor.vue";
import ColorSelectionToggle from "../../components/ColorSelectionToggle.vue";
import ImageUpload from "../../components/ImageUpload.vue";

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";
const router = useRouter();
const route = useRoute();
const productId = route.params.id;
const jwtToken = localStorage.getItem("jwtToken");
const tokenPayload = jwtToken ? JSON.parse(atob(jwtToken.split(".")[1])) : {};
const partnerId = tokenPayload.companyId;
const partnerConfigurations = ref([]);
const productCode = ref("");
const partnerName = ref("");
const productName = ref("");
const productType = ref("");
const activeInactive = ref("");
const brand = ref("");
const productPrice = ref("");
const description = ref("");
const colorUploads = ref([]);
const uploadedFile = ref(null);
const selectedType = ref("");
const partnerPackage = ref("");
const images = ref([]);
const selectedOptions = ref([]);
const selectedOption = ref([]);
const productTypes = ref([]);
const dropdownStates = ref({
  sole_top: false, // Begin met de status van de dropdown als gesloten
});

const fetchProductData = async () => {
  try {
    const response = await axios.get(`${baseURL}/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    const productData = response.data?.data?.product;

    if (productData) {
      productCode.value = productData.productCode;
      productName.value = productData.productName;
      productType.value = productData.productType;
      activeInactive.value = productData.activeInactive;
      brand.value = productData.brand;
      productPrice.value = productData.productPrice;
      description.value = productData.description;

      // **Bestaande afbeeldingen in colorUploads zetten**
      let colorUploadsArray = [];

      if (productData.configurations) {
        productData.configurations.forEach((config, index) => {
          let images = [];

          if (config.selectedOptions) {
            config.selectedOptions.forEach((option) => {
              if (option.images && option.images.length > 0) {
                images.push(...option.images);
              }
            });
          }

          colorUploadsArray[index] = { images };
        });
      }

      colorUploads.value = colorUploadsArray; // Opslaan in Vue-reactive state
    } else {
      console.error("Geen productdata gevonden.");
    }
  } catch (error) {
    console.error("Error fetching product data:", error);
  }
};

const editProduct = async () => {
  try {
    if (!productName.value || !productPrice.value || !productCode.value) {
      console.error("❌ Missing required fields.");
      return;
    }

    if (!uploadedFile.value) {
      console.error("❌ No file uploaded.");
      return;
    }

    await updateProduct(productId, {
      productCode: productCode.value,
      productName: productName.value,
      productType: selectedType.value,
      productPrice: productPrice.value,
      description: description.value,
      brand: brand.value,
      file: uploadedFile.value,
      configurations: partnerConfigurations.value,
    });

    router.push("/");
  } catch (error) {
    console.error("❌ Error updating product:", error);
  }
};

// Object to store selected colors per configuration
const selectedColors = ref({});

const buttonText = (configId) => {
  const selected = selectedColors.value[configId]?.length || 0;
  if (selected === 0) {
    return "Select colors";
  }

  const colorNames = selectedColors.value[configId]
    .slice(0, 2)
    .map((color) => color.name)
    .join(", ");

  if (selectedColors.value[configId].length > 2) {
    return `${colorNames} + ${selected - 2} more`;
  }

  return colorNames;
};

// Fetch colors for each configuration
const fetchedColors = ref([]);
const fetchcolors = async (partnerId) => {
  try {
    const selectedOptions = await getcolors(partnerId);
    if (
      !selectedOptions ||
      !Array.isArray(selectedOptions) ||
      selectedOptions.length === 0
    ) {
      console.error("❌ Geen geldige kleuren ontvangen");
      return;
    }

    fetchedColors.value = selectedOptions.map((option) => ({
      optionId: option.optionId || "",
      name: option.color || "Unnamed Color",
      images: option.images || [],
    }));
  } catch (error) {
    console.error("❌ Fout in fetchcolors:", error);
  }
};

// Map colors per configuration
const fetchedColorsPerConfig = {};

const handleFileUpload = (fileUrl) => {
  if (!fileUrl || !fileUrl[0]) {
    console.error("❌ Geen geldige afbeeldings-URL.");
    return;
  }

  // Zet de eerste waarde van de array als de URL
  uploadedFile.value = fileUrl; // Gebruik enkel de eerste URL als string
};

onMounted(async () => {
  if (!partnerId) {
    console.error("❌ Partner ID is niet beschikbaar.");
    return;
  }

  try {
    await checkToken();

    // Fetch partner data
    const partnerData = await fetchPartnerData(partnerId, jwtToken);
    partnerName.value = partnerData?.name || "";

    // Fetch partner package
    const partnerPackageResponse = await fetchPartnerPackage(partnerId);
    partnerPackage.value = partnerPackageResponse || "";

    // Fetch partner configurations
    const { partnerConfigs } = await fetchPartnerConfigurations(
      partnerId,
      jwtToken
    );

    partnerConfigurations.value = partnerConfigs || [];

    // Fetch colors
    await fetchProductData();
    await fetchcolors(partnerId);

    // Wait for Vue reactivity to process the color updates
    await nextTick();

    const rawFetchedColors = fetchedColors.value;

    if (rawFetchedColors.length > 0) {
      partnerConfigurations.value.forEach((config) => {
        if (config?.configurationDetails?.fieldType === "color") {
          const configId = config.configurationId._id;

          const configColors = config.options.map((option) => {
            return rawFetchedColors.find(
              (color) => color.optionId === option.optionId._id
            );
          });

          fetchedColorsPerConfig[configId] = configColors;
          selectedColors.value[configId] = []; // Initialize selected colors for this config
        }
      });
    } else {
      console.warn("⚠️ Geen kleuren gevonden.");
    }

    // Fetch product types
    const fetchedProductTypes = await fetchProductTypes(partnerId);
    productTypes.value = fetchedProductTypes;
  } catch (error) {
    console.error("❌ Error tijdens initialisatie:", error);
  }
});
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="content">
    <h1>Edit Product</h1>
    <form @submit.prevent="editProduct">
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

      <!-- Render partner configurations dynamically -->
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
                      :buttonText="buttonText(config.configurationId._id)"
                    >
                      <ColorSelectionToggle
                        v-model:selectedColors="
                          selectedColors[config.configurationId._id]
                        "
                        :colors="
                          fetchedColorsPerConfig[config.configurationId._id] ||
                          []
                        "
                        :dropdownStates="dropdownStates"
                        :fieldName="config.configurationDetails.fieldName"
                        :colorOptions="
                          fetchedColorsPerConfig[config.configurationId._id] ||
                          []
                        "
                      />
                    </DropdownToggleColor>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Upload zone voor 'standard' pakket -->
          <!-- Upload zone per geselecteerde kleur binnen een configuratie -->
          <template v-if="config.configurationDetails.fieldType === 'color'">
            <div
              v-for="(selectedColor, colorIndex) in selectedColors[
                config.configurationId._id
              ] || []"
              :key="colorIndex"
              class="column"
            >
              <p>{{ selectedColor.name }} - Upload images</p>
              <ImageUpload
                @file-uploaded="handleFileUpload"
                :existingFiles="images"
                :partnerPackage="partnerPackage"
                :partnerName="partnerName"
              />
            </div>
          </template>
        </template>
      </template>

      <!-- Submit Button -->
      <template v-if="partnerPackage == 'pro'">
        <template
          v-for="(config, index) in partnerConfigurations"
          :key="config._id"
        >
          <div class="row">
            <div class="column">
              <label
                v-if="config.configurationDetails"
                :for="config.configurationDetails.fieldName"
              >
                {{ config.configurationDetails.fieldName }}:
              </label>

              <!-- Text field -->
              <template
                v-if="config.configurationDetails?.fieldType === 'Text'"
              >
                <input
                  v-model="config.value"
                  :id="config.configurationDetails.fieldName"
                  type="text"
                />
              </template>

              <!-- Dropdown field -->
              <template
                v-else-if="
                  config.configurationDetails?.fieldType === 'Dropdown'
                "
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
                      :style="{ backgroundColor: option.name || 'transparent' }"
                    ></span>
                    {{ option.name || "Unnamed Color" }}
                  </div>
                </DropdownToggleColor>
              </template>

              <!-- Color field -->
              <template
                v-else-if="config.configurationDetails?.fieldType === 'color'"
              >
                <div class="color-dropdown">
                  <div class="dropdown">
                    <DropdownToggleColor
                      :fieldName="config.configurationDetails.fieldName"
                      :dropdownStates="dropdownStates"
                      :buttonText="buttonText(config.configurationId._id)"
                    >
                      <ColorSelectionToggle
                        v-model:selectedColors="
                          selectedColors[config.configurationId._id]
                        "
                        :colors="
                          fetchedColorsPerConfig[config.configurationId._id] ||
                          []
                        "
                        :dropdownStates="dropdownStates"
                        :fieldName="config.configurationDetails.fieldName"
                        :colorOptions="
                          fetchedColorsPerConfig[config.configurationId._id] ||
                          []
                        "
                      />
                    </DropdownToggleColor>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </template>

        <!-- Display one ImageUpload if there's at least one selected color -->
        <template
          v-if="
            Object.values(selectedColors).some((colors) => colors.length > 0)
          "
        >
          <ImageUpload
            @file-uploaded="handleFileUpload"
            :colorUploads="colorUploads"
            :partnerPackage="partnerPackage"
            :partnerName="partnerName"
          />
        </template>
      </template>

      <button class="btn active" type="submit">Update Product</button>
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
