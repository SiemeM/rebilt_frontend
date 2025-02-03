<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";
import { fetchPartnerData } from "../../services/apiService";
import { checkToken, fetchPartnerPackage } from "../../services/authService";
import { fetchPartnerConfigurations } from "../../services/configurationService";
import { fetchProductTypes, getcolors } from "../../services/productService";
import DropdownToggle from "../../components/DropdownToggle.vue";
import DropdownToggleColor from "../../components/DropdownToggleColor.vue";
import ColorSelectionToggle from "../../components/ColorSelectionToggle.vue";
import ImageUpload from "../../components/ImageUpload.vue";
// Reactive variables
const selectedColors = ref([]);
const partnerConfigurations = ref([]);
const productCode = ref("");
const productName = ref("");
const brand = ref("");
const productPrice = ref("");
const description = ref("");
const colorUploads = ref([]);
const dropdownStates = ref({});
const newColorName = ref("");
const newProducts = ref([]);

const jwtToken = localStorage.getItem("jwtToken");
const tokenPayload = jwtToken ? JSON.parse(atob(jwtToken.split(".")[1])) : {};
const partnerId = tokenPayload.companyId;
const selectedType = ref("");
const partnerPackage = ref("");
const colors = ref([]);
const partnerName = ref("");
const productTypes = ref([]);

// Button text for color selection
const buttonText = computed(() => {
  const selected = selectedColors.value.length;
  if (selected === 0) {
    return "Select colors";
  }

  const colorNames = selectedColors.value
    .slice(0, 2)
    .map((color) => color.name)
    .join(", ");

  if (selectedColors.value.length > 2) {
    return `${colorNames} + ${selectedColors.value.length - 2} more`;
  }

  return colorNames;
});

// Update de kleurinformatie naar de juiste variabele
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

    // Werk fetchedColors goed bij met kleurinformatie
    fetchedColors.value = selectedOptions.map((option) => ({
      optionId: option.optionId || "",
      name: option.color || "Unnamed Color",
      images: option.images || [],
    }));

    console.log("🎨 Geselecteerde kleuren:", fetchedColors.value);
  } catch (error) {
    console.error("❌ Fout in fetchcolors:", error);
  }
};

// Bijwerken van kleuren per configuratie:
const fetchedColorsPerConfig = {};

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
    await fetchcolors(partnerId);

    // Wait for Vue reactivity to process the color updates
    await nextTick();

    // Map kleuren per configuratie
    const rawFetchedColors = fetchedColors.value;

    if (rawFetchedColors.length > 0) {
      // Zorg ervoor dat elke configuratie zijn eigen kleurset krijgt
      partnerConfigurations.value.forEach((config) => {
        if (config?.configurationDetails?.fieldType === "color") {
          const configId = config.configurationId._id;

          // Filter de kleuren die specifiek voor deze configuratie zijn
          const configColors = config.options.map((option) => {
            return rawFetchedColors.find(
              (color) => color.optionId === option.optionId._id
            );
          });

          // Sla de kleuren op voor deze configuratie
          fetchedColorsPerConfig[configId] = configColors;

          console.log(
            `Gekoppelde kleuren voor configuratie ${configId}:`,
            fetchedColorsPerConfig[configId]
          );
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
                        v-model:selectedColors="selectedColors"
                        :colors="colors.value"
                        :dropdownStates="dropdownStates"
                        :fieldName="config.configurationDetails.fieldName"
                        :colorOptions="colors.value"
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
              <!-- Zorg ervoor dat config.configurationDetails bestaat -->
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
                      :buttonText="buttonText"
                    >
                      <ColorSelectionToggle
                        v-model:selectedColors="selectedColors"
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
