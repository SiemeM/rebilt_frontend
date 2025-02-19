<script setup>
import { ref, toRaw, computed, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
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
  add3DProduct,
  add2DProduct,
} from "../../services/productService";
import DropdownToggle from "../../components/DropdownToggle.vue";
import DropdownToggleColor from "../../components/DropdownToggleColor.vue";
import ColorSelectionToggle from "../../components/ColorSelectionToggle.vue";
import ImageUpload from "../../components/ImageUpload.vue";

// Reactive variables
const router = useRouter();
const partnerConfigurations = ref([]);
const productCode = ref("");
const productName = ref("");
const brand = ref("");
const productType = ref("");
const productPrice = ref("");
const description = ref("");
const colorUploads = ref([]);
const dropdownStates = ref({});
const uploadedFile = ref(null);
const thumbnail = ref(null);
const modelFile = ref(null);
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

const handleFileUpload = (uploadedUrls) => {
  if (!uploadedUrls || uploadedUrls.length === 0) {
    console.error("❌ Geen geldige upload-URL ontvangen.");
    return;
  }

  console.log("✅ Bestanden succesvol geüpload:", uploadedUrls);

  // Voorbeeld: Voeg de eerste geüploade URL toe aan een state variabele
  uploadedFile.value = uploadedUrls[0]; // Werk nu met de URL i.p.v. een bestand
};

const handleThumbnailUpload = (event) => {
  const files = event.target.files;
  console.log(files);

  if (!files || files.length === 0) {
    console.error("❌ Geen geldige afbeeldings-URL.");
    return;
  }

  const file = files[0];
  if (!file || !file.name) {
    console.error("❌ Bestand heeft geen naam.");
    return;
  }

  // Update the thumbnail value for the thumbnail file
  thumbnail.value = file; // Use a separate reference for the thumbnail file
};

const modelFileInput = ref(null);

const addNewProduct = async () => {
  try {
    // Validatie van verplichte velden
    if (!productName.value || !productPrice.value || !productCode.value) {
      console.error("❌ Missing required fields.");
      return;
    }

    if (!uploadedFile.value) {
      console.error("❌ No file uploaded.");
      return;
    }

    // Validatie of kleuren geselecteerd zijn
    if (
      Object.values(selectedColors.value).every((colors) => colors.length === 0)
    ) {
      console.error("❌ No colors selected.");
      return;
    }

    console.log(uploadedFile.value); // Debugging de bestand-URL

    // Toevoegen van afbeeldingen voor elke kleurconfiguratie
    partnerConfigurations.value.forEach((config) => {
      if (config.configurationDetails.fieldType === "color") {
        const configId = config.configurationId._id;
        const selectedColorOptions = selectedColors.value[configId] || [];

        // Log om te controleren of we de geselecteerde kleuren hebben
        console.log(
          "Selected colors for configId:",
          configId,
          selectedColorOptions
        );

        config.options.forEach((option) => {
          // Haal de afbeeldingen op voor de geselecteerde kleuropties
          const colorImages =
            fetchedColorsPerConfig[configId]?.find(
              (color) => color.optionId === option.optionId
            )?.images || []; // Gebruik een lege array als er geen afbeeldingen zijn

          console.log("Color images for option", option.optionId, colorImages);

          // Voeg de afbeeldingen toe aan de optie als de kleur geselecteerd is
          if (
            selectedColorOptions.some(
              (selected) => selected.optionId === option.optionId
            )
          ) {
            option.images = colorImages; // Kleurafbeeldingen toewijzen
          }
        });
      }
    });

    // Maak de API-aanroep met de bijgewerkte configuraties en afbeeldingen
    const partnerPackageResponse = await fetchPartnerPackage(partnerId);
    partnerPackage.value = partnerPackageResponse || "";

    if (partnerPackage.value == "pro" && selectedType.value === "3D") {
      await add3DProduct({
        productCode: productCode.value,
        productName: productName.value,
        productType: productType.value || "sunglasses", // Zorg ervoor dat dit correct wordt ingevuld
        productPrice: productPrice.value,
        description: description.value,
        brand: brand.value,
        activeInactive: "active",
        partnerId,
        configurations: partnerConfigurations.value,
        file: modelFile, // 3D model bestand
        thumbnail: thumbnail.value, // Correcte verwijzing naar de thumbnail
      });
    }

    if (partnerPackage.value == "pro" && selectedType.value === "2D") {
      console.log(partnerPackage.value);
      console.log(uploadedFile.value);

      // Controleer of partnerConfigurations correct is gedefinieerd en niet leeg is
      if (
        !partnerConfigurations.value ||
        partnerConfigurations.value.length === 0
      ) {
        console.error("❌ Geen geldige configuraties gevonden!");
        return;
      }

      // Log de configuraties om te zien of ze goed zijn geladen
      console.log("Partner configurations:", partnerConfigurations.value);

      // Controleer of de configuratie-ID beschikbaar is
      const selectedConfigurationId =
        partnerConfigurations.value[0]?.configurationId?._id || null;

      // Log de configuratie-ID voor debugging
      console.log(
        "selectedConfigurationId in addNewProduct:",
        selectedConfigurationId
      );

      if (!selectedConfigurationId) {
        console.error("❌ selectedConfigurationId ontbreekt in addNewProduct!");
        return;
      }

      // Controleer of er afbeeldingen zijn om door te geven
      if (!uploadedFile.value) {
        console.error("❌ Geen afbeeldingen om te uploaden!");
        return;
      }

      // Zorg ervoor dat de afbeeldingen in de juiste structuur zijn
      const images = Array.isArray(uploadedFile.value)
        ? uploadedFile.value
        : [uploadedFile.value]; // Zet het bestand om naar een array als het een enkel bestand is

      // De afbeeldingen voor het 2D-product kunnen verschillende opties hebben, dus we moeten zorgen dat ze correct worden doorgegeven
      try {
        // Converteer de Proxy naar een eenvoudig array-object voor doorgeven aan add2DProduct
        const configurations = JSON.parse(
          JSON.stringify(partnerConfigurations.value)
        );
        console.log(
          "Partner configurations passed to add2DProduct:",
          configurations
        );

        // Geef de gegevens door aan de functie
        await add2DProduct({
          file: uploadedFile.value,
          configurationId: selectedConfigurationId,
          configurations: configurations, // Geef de configuraties direct door
          productCode: productCode.value,
          productName: productName.value,
          productType: selectedType.value || "sunglasses",
          productPrice: productPrice.value,
          description: description.value,
          brand: brand.value,
          activeInactive: "active",
          partnerId,
          images: images, // Zorg ervoor dat de afbeeldingen een array zijn en doorgegeven worden
        });
      } catch (error) {
        console.error("Fout bij het toevoegen van product:", error);
      }
    }

    // Redirect naar de homepagina na het toevoegen
    router.push("/");
  } catch (error) {
    console.error("❌ Error adding product:", error);
  }
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
    <h1>Add new product</h1>
    <form @submit.prevent="addNewProduct">
      <h3>Product info:</h3>
      <div class="row">
        <div class="column">
          <label for="2DOr3DProduct">Select Product Type:</label>
          <select v-model="selectedType" id="2DOr3DProduct">
            <option value="2D">2D Product</option>
            <option value="3D">3D Product</option>
          </select>
        </div>
      </div>

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
          <div class="dropdown">
            <DropdownToggle
              v-model="productType"
              :fieldName="'sole_top'"
              :dropdownStates="dropdownStates"
              :buttonText="'Select type of product'"
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

      <h3>Configurations:</h3>
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

      <template v-if="partnerPackage == 'pro'">
        <div class="configurations">
          <!-- Configuraties voor het product -->
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
                      v-for="(option, optionIndex) in config.options"
                      :key="optionIndex"
                    >
                      <span
                        class="color-bullet"
                        :style="{
                          backgroundColor: option.name || 'transparent',
                        }"
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
                            fetchedColorsPerConfig[
                              config.configurationId._id
                            ] || []
                          "
                          :dropdownStates="dropdownStates"
                          :fieldName="config.configurationDetails.fieldName"
                          :colorOptions="
                            fetchedColorsPerConfig[
                              config.configurationId._id
                            ] || []
                          "
                        />
                      </DropdownToggleColor>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>

        <!-- Uploadzone voor 2D of 3D afhankelijk van keuze -->
        <div v-if="selectedType === '2D'" class="uploadzones">
          <h3>Upload Images for 2D Product:</h3>
          <template
            v-for="(config, index) in partnerConfigurations"
            :key="config._id"
          >
            <!-- Upload zones per geselecteerde kleur binnen configuratie -->
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
        </div>

        <div v-if="selectedType === '3D'" class="uploadzones">
          <div class="uploadzone">
            <h3>Upload 3D Model File:</h3>
            <div class="row">
              <div class="column">
                <input
                  ref="modelFileInput"
                  type="file"
                  @change="handleFileUpload"
                  accept=".glb,.fbx,.obj"
                />
                <p>Upload 3D model file (GLB, FBX, OBJ formats)</p>
              </div>
            </div>
          </div>
          <div class="uploadzone">
            <!-- Upload de thumbnail voor het 3D-model -->
            <h3>Upload Thumbnail for 3D Model:</h3>
            <div class="row">
              <div class="column">
                <input
                  type="file"
                  @change="handleThumbnailUpload"
                  accept=".jpeg,.jpg,.png,.gif"
                />
                <p>Upload Thumbnail (JPG, PNG, GIF formats)</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <button class="btn active" type="submit">Add Product</button>
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

form h3 {
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

.configurations {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 2rem;
  width: 100%;
}

.uploadzones {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1rem;
  width: 100%;
}

.uploadzones .uploadzone {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

  .configurations {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .configurations {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
