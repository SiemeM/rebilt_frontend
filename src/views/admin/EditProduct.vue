<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";
import { fetchPartnerData } from "../../services/apiService";
import { checkToken, fetchPartnerPackage } from "../../services/authService";
import { fetchPartnerConfigurations } from "../../services/configurationService";
import {
  fetchProductById,
  fetchProductTypes,
  getcolors,
  addProductType,
  add3DProduct,
  add2DProduct,
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
console.log(partnerId);
const partnerConfigurations = ref([]);
const productCode = ref("");
const productName = ref("");
const productType = ref("");
const activeInactive = ref("");
const brand = ref("");
const productPrice = ref("");
const description = ref("");
const uploadedFile = ref(null);
const selectedType = ref("");
const partnerPackage = ref("");
const images = ref([]);
const selectedOptions = ref([]);
const selectedOption = ref([]);
const colors = ref([]);
const productTypes = ref([]);
const dropdownStates = ref({
  sole_top: false, // Begin met de status van de dropdown als gesloten
});
const fetchedColorsPerConfig = {};

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

const handleFileUpload = (fileUrl) => {
  uploadedFile.value = fileUrl;
};

const fetchColorsFromSelectedOptions = async () => {
  try {
    for (let config of partnerConfigurations.value) {
      if (config.selectedOptions && config.selectedOptions.length > 0) {
        // Initialize the selectedColors for the current configuration if empty
        if (!selectedColors.value[config.configurationId._id]) {
          selectedColors.value[config.configurationId._id] = [];
        }

        // Create an empty array for storing colors of each configuration
        fetchedColorsPerConfig[config.configurationId._id] = [];

        for (let selectedOption of config.selectedOptions) {
          // Fetch the color related to this optionId
          const color = await getcolors(selectedOption.colorId);

          if (color) {
            fetchedColorsPerConfig[config.configurationId._id].push(color);
            selectedColors.value[config.configurationId._id].push(color); // Populate selectedColors
          }
        }

        console.log(
          "Fetched colors for config:",
          config.configurationId._id,
          fetchedColorsPerConfig[config.configurationId._id]
        );
      }
    }
  } catch (error) {
    console.error("Error fetching colors for selected options:", error);
  }
};

const fetchProductData = async () => {
  try {
    const response = await axios.get(`${baseURL}/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    const productData = response.data?.data?.product;
    console.log(productData.configurations);

    if (productData) {
      // Populate other product information
      productCode.value = productData.productCode;
      productName.value = productData.productName;
      productType.value = productData.productType;
      activeInactive.value = productData.activeInactive;
      brand.value = productData.brand;
      productPrice.value = productData.productPrice;
      description.value = productData.description;
      images.value = productData.images || [];

      // Handle selectedOptions correctly
      selectedOptions.value = []; // Reset to empty array before populating

      productData.configurations.forEach((config) => {
        if (config.selectedOptions && config.selectedOptions.length > 0) {
          selectedOptions.value.push(config.selectedOptions);
        }
      });

      partnerConfigurations.value = productData.configurations.map((config) => {
        if (config.selectedOptions) {
          // Assuming selectedOptions is an array of selected colors
          config.selectedOptions = config.selectedOptions.map((option) => {
            return {
              colorName: option.optionId.name, // e.g., #e42121
              colorId: option.optionId._id,
              colorImage: option.images[0], // You could also use the image URL if needed
            };
          });
        }
        // Ensure options are populated correctly
        config.options = config.options || []; // You can also populate options from another part of the response

        // Set config.value (if applicable)
        config.value =
          config.selectedOptions && config.selectedOptions[0]
            ? config.selectedOptions[0].colorId
            : ""; // Use the first selected option's ID
        return config;
      });

      // Set selectedOption for the first configuration (if needed)
      selectedOption.value =
        productData.configurations[0]?.selectedOptions[0]?.colorId || "";
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

watch(selectedColors, (newValue) => {
  console.log("Updated selectedColors:", newValue);
});

onMounted(async () => {
  await checkToken();
  await fetchProductData();
  const partnerPackageResponse = await fetchPartnerPackage(partnerId);
  partnerPackage.value = partnerPackageResponse || "";
  const fetchedProductTypes = await fetchProductTypes(partnerId);
  productTypes.value = fetchedProductTypes;

  // Make sure selectedColors is populated after fetching configuration and colors
  partnerConfigurations.value.forEach((config) => {
    if (config.configurationId?.fieldType === "color") {
      if (!selectedColors.value[config.configurationId._id]) {
        selectedColors.value[config.configurationId._id] = [];
      }
    }
  });

  // Fetch colors based on selected options and populate selectedColors
  await fetchColorsFromSelectedOptions(); // <-- Added this line
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
              <label :for="config.configurationId.fieldName">
                {{ config.configurationId.fieldName }}:
              </label>

              <!-- Text field -->
              <template v-if="config.configurationId.fieldType === 'Text'">
                <input
                  v-model="config.value"
                  :id="config.configurationId.fieldName"
                  type="text"
                />
              </template>

              <!-- Dropdown field -->
              <template
                v-else-if="config.configurationId.fieldType === 'Dropdown'"
              >
                <DropdownToggleColor
                  :fieldName="config.configurationId.fieldName"
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
                v-else-if="config.configurationId.fieldType === 'color'"
              >
                <div class="color-dropdown">
                  <div class="dropdown">
                    <DropdownToggleColor
                      :fieldName="config.configurationId.fieldName"
                      :dropdownStates="dropdownStates"
                      :buttonText="buttonText(config.configurationId._id)"
                    >
                      <ColorSelectionToggle
                        v-model="selectedColors[config.configurationId._id]"
                        :colors="
                          fetchedColorsPerConfig[config.configurationId._id] ||
                          []
                        "
                        :dropdownStates="dropdownStates"
                        :fieldName="config.configurationId.fieldName"
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
          <template v-if="config.configurationId.fieldType === 'color'">
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
                v-if="selectedColor.name"
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

      <!-- Submit Button -->
      <template v-if="partnerPackage == 'pro'">
        <template
          v-for="(config, index) in partnerConfigurations"
          :key="config._id"
        >
          <div class="row">
            <div class="column">
              <label
                v-if="config.configurationId"
                :for="config.configurationId.fieldName"
              >
                {{ config.configurationId.fieldName }}:
              </label>

              <!-- Text field -->
              <template v-if="config.configurationId?.fieldType === 'Text'">
                <input
                  v-model="config.value"
                  :id="config.configurationId.fieldName"
                  type="text"
                />
              </template>

              <!-- Dropdown field -->
              <template
                v-else-if="config.configurationId?.fieldType === 'Dropdown'"
              >
                <DropdownToggleColor
                  :fieldName="config.configurationId.fieldName"
                  :dropdownStates="dropdownStates"
                  buttonText="Toggle Dropdown"
                >
                  <div
                    v-for="(option, optionIndex) in configurations"
                    :key="optionIndex"
                  >
                    <span
                      class="color-bullet"
                      :style="{
                        backgroundColor: option.name || 'transparent',
                      }"
                    ></span>
                  </div>
                </DropdownToggleColor>
              </template>

              <!-- Color field -->
              <template
                v-else-if="config.configurationId.fieldType === 'color'"
              >
                <div class="color-dropdown">
                  <div class="dropdown">
                    <DropdownToggleColor
                      :fieldName="config.configurationId.fieldName"
                      :dropdownStates="dropdownStates"
                      :buttonText="buttonText(config.configurationId._id)"
                    >
                      <p>
                        {{
                          console.log(
                            selectedColors[config.configurationId._id] ||
                              "No colors selected"
                          )
                        }}
                      </p>
                      <ColorSelectionToggle
                        v-model="selectedColors[config.configurationId._id]"
                        :colors="
                          fetchedColorsPerConfig[config.configurationId._id] ||
                          []
                        "
                        :dropdownStates="dropdownStates"
                        :fieldName="config.configurationId.fieldName"
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
        <!-- <template
          v-if="
            Object.values(selectedColors).some((colors) => colors.length > 0)
          "
        >
          <ImageUpload
            @file-uploaded="handleFileUpload"
            :color="
              Object.values(selectedColors).find(
                (colors) => colors.length > 0
              )[0]
            "
            :colorUploads="colorUploads"
            :partnerPackage="partnerPackage"
            :partnerName="partnerName"
          />
        </template> -->
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
