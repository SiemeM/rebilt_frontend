<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Router en JWT-token ophalen
const router = useRouter();
const jwtToken = localStorage.getItem("jwtToken");
const errorMessage = ref("");

// Basis-URL bepalen afhankelijk van de omgeving
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const filteredProducts = ref([]);
const selectedColors = ref([]);
// Functie om te controleren of de gebruiker is ingelogd
const checkToken = () => {
  if (!jwtToken) {
    router.push("/login");
  }
};

// Functie om partnergegevens op te halen en partnernaam dynamisch in te stellen
const partnerName = ref("");
const tokenPayload = JSON.parse(atob(jwtToken.split(".")[1])); // Decode token
const partnerId = tokenPayload.companyId;
const productTypes = ref([]); // Om de producttypes op te slaan
const selectedType = ref(""); // Om het geselecteerde producttype bij te houden

// Functie om partnergegevens op te halen en partnernaam dynamisch in te stellen
const fetchPartnerData = async () => {
  try {
    if (!partnerId) {
      console.error("Partner ID (companyId) is not available in the token.");
      router.push("/login");
      return;
    }

    const response = await axios.get(`${baseURL}/partners/${partnerId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    const partner = response.data?.data?.partner;
    if (partner) {
      partnerName.value = partner.name || "Default"; // Dynamische partnernaam
      await fetchPartnerConfigurations(partnerId); // Fetch partner configurations
    } else {
      console.error("Partner data not found in response");
      partnerName.value = "Default";
    }
  } catch (error) {
    console.error("Error fetching partner data:", error.response || error);
    partnerName.value = "Default";
  }
};

const fetchProducts = async () => {
  try {
    const response = await axios.get(`${baseURL}/products`, {
      params: { partnerId }, // Voeg het partnerId toe aan de queryparameters
    });

    const products = response.data?.data?.products || [];

    // Haal de unieke producttypes op
    const types = [...new Set(products.map((product) => product.productType))];

    productTypes.value = types; // Sla de unieke producttypes op
    filteredProducts.value = products; // Begin met alle producten
  } catch (error) {
    console.error("Error fetching products:", error);
  }
};

// Functie om producten te filteren op basis van het geselecteerde type
const filterProductsByType = () => {
  if (selectedType.value) {
    filteredProducts.value = filteredProducts.value.filter(
      (product) => product.productType === selectedType.value
    );
  } else {
    // Als er geen type is geselecteerd, toon dan alle producten
    fetchProducts();
  }
};

const fetchPartnerConfigurations = async () => {
  if (!partnerId) {
    console.warn("No partnerId provided.");
    return;
  }

  try {
    // Haal de partnerconfiguraties op
    const partnerResponse = await axios.get(
      `${baseURL}/partnerConfigurations`,
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
        params: { partnerId },
      }
    );

    const partnerConfigs = partnerResponse.data?.data || [];
    const configurationsResponse = await axios.get(
      `${baseURL}/configurations`,
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
      }
    );

    const configurations = configurationsResponse.data?.data || [];

    partnerConfigurations.value = await Promise.all(
      partnerConfigs.map(async (partnerConfig) => {
        const matchingConfig = configurations.find(
          (config) => config._id === partnerConfig.configurationId
        );

        // Extract optionIds and their related objects from the options array
        const optionsData =
          matchingConfig?.options?.map((option) => {
            return {
              optionId: option.optionId, // Behoud de optionId
              ...option, // Voeg de rest van de option toe (images, _id, etc.)
            };
          }) || [];

        // Fetch the option names using the extracted optionIds
        const options =
          optionsData.length > 0 ? await fetchOptionNames(optionsData) : [];

        return {
          ...partnerConfig,
          fieldName: matchingConfig?.fieldName,
          fieldType: matchingConfig?.fieldType,
          options, // Ingevulde opties met namen
          value: "",
        };
      })
    );
  } catch (error) {
    console.error("Error fetching partner configurations:", error);
  }
};

const fetchOptionNames = async (optionsData) => {
  try {
    // Filter out undefined or empty IDs before making API calls
    const validOptions = optionsData.filter(
      (option) => option.optionId && option.optionId !== "undefined"
    );

    // If there are no valid optionIds, return an empty array or some default value
    if (validOptions.length === 0) {
      return optionsData.map(() => ({ name: "Unknown" })); // Return an object with name as 'Unknown'
    }

    // Fetch data from the API for each optionId using the correct URL structure
    const responses = await Promise.all(
      validOptions.map((option) =>
        axios.get(`${baseURL}/options/${option.optionId}`, {
          headers: { Authorization: `Bearer ${jwtToken}` },
        })
      )
    );

    // Map the responses to return option names (or use value as fallback)
    return responses.map((res, index) => {
      const optionData = res.data?.data;
      return {
        optionId: validOptions[index].optionId, // Make sure we retain the optionId
        name: optionData?.name || "Unknown",
      };
    });
  } catch (error) {
    console.error("Error fetching option names:", error);
    return optionsData.map(() => ({ name: "Unknown" })); // Return 'Unknown' for each optionId in case of an error
  }
};

import mongoose from "mongoose";

const checkProductCodeUniqueness = async (productCode) => {
  try {
    const response = await axios.get(
      `${baseURL}/products?productCode=${productCode}`,
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      }
    );

    // If the product already exists, show an error and prevent submission
    if (response.data?.data?.length > 0) {
      errorMessage.value = `Product code "${productCode}" already exists. Please choose another one.`;
      return false; // Return false to indicate that the product code is not unique
    }

    return true; // Product code is unique
  } catch (error) {
    console.error("Error checking product code:", error);
    errorMessage.value = "Error checking product code uniqueness.";
    return false;
  }
};

// In the addProduct method, call this function before proceeding
const addProduct = async () => {
  // Controleer of er minstens één kleur is
  if (colorUploads.value.length === 0) {
    errorMessage.value = "Please add at least one color.";
    return;
  }

  // Verwerk kleuren en hun afbeeldingen
  const colorsWithImages = await Promise.all(
    colorUploads.value.map(async (colorItem) => {
      const uploadedImages = await Promise.all(
        colorItem.images.map((file) =>
          uploadImageToCloudinary(
            file,
            `${productName.value}-${colorItem.color}`
          )
        )
      );

      return {
        color: colorItem.color,
        images: uploadedImages,
      };
    })
  );

  const productData = {
    productCode: productCode.value,
    productName: productName.value,
    productPrice: productPrice.value,
    productType: productType.value,
    description: description.value,
    brand: brand.value,
    colors: colorsWithImages,
    partnerId: tokenPayload?.companyId || null,
    configurations: selectedConfigurations,
  };

  try {
    const response = await axios.post(`${baseURL}/products`, productData, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 201) {
      router.push("/admin");
    } else {
      errorMessage.value = "Failed to add product.";
    }
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Unknown error.";
  }
};

// Lifecycle hook voor het ophalen van partnergegevens
onMounted(() => {
  checkToken();
  fetchPartnerData(); // Haal partnergegevens op zodra de component gemonteerd is
  fetchProducts();
});

// Product-informatie refs
const productCode = ref("");
const productType = ref("sneaker");
const productName = ref("");
const brand = ref("");
const productPrice = ref("");
const description = ref("");
const newColor = ref(""); // Dit wordt gebruikt voor het kleurinvoerveld
const images = ref([]);
const image = ref(""); // Dit moet initialisatie zijn

const partnerConfigurations = ref([]);

// Functie voor het uploaden van afbeeldingen naar Cloudinary
const uploadImageToCloudinary = async (file, productName) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "ycy4zvmj");
  formData.append("cloud_name", "dzempjvto");

  const folderName = `${
    partnerName.value || "DefaultFolder"
  }/Products/${productName}`;
  formData.append("folder", folderName);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dzempjvto/image/upload`,
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error("No secure_url found in Cloudinary response");
    }

    return data.secure_url;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

// Functie om de verborgen file input te triggeren
const triggerFileInput = (index) => {
  const fileInput = document.getElementById(`images-${index}`);
  if (fileInput) {
    fileInput.click();
  }
};

// Meerdere kleuren beheren
const colorUploads = ref([]); // Array om kleuren en bijbehorende afbeeldingen bij te houden

// Functie om een kleur toe te voegen
const addColor = () => {
  const newColorObject = { colorId: "", images: [] };
  colorUploads.value.push(newColorObject);
};

// Functie om een kleur te verwijderen
const removeColor = (index) => {
  colorUploads.value.splice(index, 1);
};

// Dropdown states beheren
const dropdownStates = ref({});

// Functie om een dropdown te toggelen
const toggleDropdown = (fieldName) => {
  // Sluit alle andere dropdowns
  for (const key in dropdownStates.value) {
    if (key !== fieldName) {
      dropdownStates.value[key] = false;
    }
  }
  // Toggle de huidige dropdown
  dropdownStates.value[fieldName] = !dropdownStates.value[fieldName];
};

// Functie om een kleur uit de dropdown te selecteren
const selectColor = (option, fieldName) => {
  // Find the configuration object based on the fieldName (e.g., "Kleur")
  const selectedConfig = partnerConfigurations.value.find(
    (config) => config.fieldName === fieldName
  );

  if (selectedConfig) {
    // Set the selected option's ObjectId (optionId)
    selectedConfig.value = option.optionId; // This will store the selected optionId (ObjectId)
  } else {
    console.warn(`No configuration found for ${fieldName}`);
  }

  // Close the dropdown after selection
  dropdownStates.value[fieldName] = false;
};

// Afbeeldingen uploaden per kleur
const handleColorImageUpload = (event, index) => {
  if (!event || !event.target || !event.target.files) {
    console.warn(
      "Geen geldig event object gevonden bij handleColorImageUpload"
    );
    return;
  }

  const files = Array.from(event.target.files).filter(
    (file) => file instanceof File
  );

  if (files.length > 0) {
    colorUploads.value[index].images.push(...files);
  }
};

// Voorbeeld-URLs bijhouden voor uploads
const previewColorImages = (images) =>
  images.map((file) => URL.createObjectURL(file));

// Functie om kleuren als array te verwerken (indien nodig)
const parseInputToArray = (input) => {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const toggleColorSelection = (option, fieldName) => {
  const index = selectedColors.value.indexOf(option.optionId);
  if (index === -1) {
    // Voeg de kleur toe aan de selectie
    selectedColors.value.push(option.optionId);
  } else {
    // Verwijder de kleur uit de selectie
    selectedColors.value.splice(index, 1);
  }

  // Sluit de dropdown na selectie
  dropdownStates.value[fieldName] = false;
};

const previewImages = (images) => {
  // Zorg ervoor dat 'images' een array is
  if (!Array.isArray(images)) {
    return []; // Return een lege array als 'images' niet gedefinieerd is
  }
  return images.map((file) => URL.createObjectURL(file));
};

// Functie om de naam van de kleur op te halen aan de hand van de optionId
const getColorNameById = (colorId) => {
  // Loop door partnerConfigurations om de juiste configuratie te vinden
  for (const partnerConfig of partnerConfigurations.value) {
    const colorOption = partnerConfig.options.find(
      (option) => option.optionId === colorId
    );
    if (colorOption) {
      return colorOption.name; // Geef de naam van de kleur terug als gevonden
    }
  }
  return "Unnamed Color"; // Geef "Unnamed Color" terug als geen match is gevonden
};

// Exporteer functies en variabelen voor gebruik in de template
// onMounted(() => {
//   addColor();
//   removeColor();
//   toggleDropdown();
//   selectColor();
//   handleColorImageUpload();
//   previewColorImages();
//   dropdownStates();
//   triggerFileInput();
// });
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
          <label :for="config.fieldName">{{ config.fieldName }}:</label>

          <!-- Text field -->
          <template v-if="config.fieldType === 'Text'">
            <input v-model="config.value" :id="config.fieldName" type="text" />
          </template>

          <!-- Dropdown field -->
          <template v-else-if="config.fieldType === 'Dropdown'">
            <select v-model="config.value" :id="config.fieldName">
              <option
                v-for="(option, index) in config.options"
                :key="index"
                :value="option.optionId"
              >
                {{ option.name || "Unnamed Option" }}
              </option>
            </select>
          </template>

          <!-- Color field -->
          <template v-else-if="config.fieldType === 'color'">
            <div class="color-dropdown">
              <!-- Dropdown opties voor kleuren -->
              <div class="dropdown">
                <div
                  class="dropdown-selected"
                  @click="toggleDropdown(config.fieldName)"
                >
                  <!-- Toon de geselecteerde kleuren in de dropdown -->
                  <p v-if="selectedColors.length > 0">
                    Selected colors:
                    <span
                      v-for="(colorId, index) in selectedColors"
                      :key="index"
                      style="color: {{ index }}"
                    >
                      {{ getColorNameById(colorId) }}
                      <span v-if="index !== selectedColors.length - 1">, </span>
                    </span>
                  </p>

                  <p v-else>Select colors</p>
                </div>

                <div
                  v-if="dropdownStates[config.fieldName]"
                  class="dropdown-options"
                >
                  <div
                    v-for="(option, index) in config.options"
                    :key="index"
                    class="dropdown-option"
                    @click="toggleColorSelection(option, config.fieldName)"
                  >
                    <!-- Checkbox voor het selecteren van kleuren -->
                    <input
                      type="checkbox"
                      :value="option.optionId"
                      v-model="selectedColors"
                    />
                    <span
                      class="color-bullet"
                      :style="{ backgroundColor: option.name || 'transparent' }"
                    ></span>
                    <p>{{ option.name || "Unnamed Color" }}</p>
                  </div>
                </div>
              </div>

              <!-- Sectie voor afbeeldingsuploads per geselecteerde kleur -->
              <div
                v-for="(colorId, index) in selectedColors"
                :key="colorId"
                class="color-upload-section"
              >
                <p>
                  Upload images for:
                  {{
                    config.options.find((option) => option.optionId === colorId)
                      ?.name || "Unnamed Color"
                  }}
                </p>

                <input
                  type="file"
                  :id="'images-' + colorId"
                  multiple
                  style="display: none"
                  @change="(e) => handleColorImageUpload(e, index)"
                />

                <div
                  class="uploadImage"
                  @click="() => triggerFileInput(index)"
                  :style="{
                    flexDirection:
                      colorUploads[index]?.images?.length > 0
                        ? 'row'
                        : 'column',
                    flexWrap:
                      colorUploads[index]?.images?.length > 0
                        ? 'wrap'
                        : 'no-wrap',
                    justifyContent:
                      colorUploads[index]?.images?.length > 0
                        ? 'flex-start'
                        : 'center',
                  }"
                >
                  <div v-if="!colorUploads[index]?.images?.length" class="text">
                    <img
                      src="../../assets/icons/image-add.svg"
                      alt="image-add"
                    />
                    <p>Afbeeldingen, video's of 3D-modellen toevoegen</p>
                  </div>

                  <div
                    v-for="(previewUrl, imgIndex) in previewImages(
                      colorUploads[index]?.images
                    )"
                    :key="imgIndex"
                  >
                    <img
                      :src="previewUrl"
                      alt="Uploaded image preview"
                      width="100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <button type="submit" class="btn active">Add product</button>
    </form>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.content {
  width: 100%;
  margin-bottom: 72px;
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
  border: 1px solid #333;
  background-color: #333;
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
  background-color: #333;
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
  background-color: #333;
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
  border-radius: 0.5rem;
  width: 100%;
  height: 120px;
  background-color: #333;
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
