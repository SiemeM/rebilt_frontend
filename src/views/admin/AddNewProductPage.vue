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
const selectedConfigurations = ref([]);
const partnerConfigurations = ref([]);
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
          (config) => config._id === partnerConfig?.configurationId?._id
        );

        if (!matchingConfig) {
          console.warn(
            `No matching configuration found for configurationId: ${partnerConfig.configurationId?._id}`
          );
          return {
            ...partnerConfig,
            options: [],
            fieldName: "Unknown",
            fieldType: "Unknown",
            value: "",
          };
        }

        const optionsData =
          partnerConfig.options?.map((option) => ({
            optionId: option.optionId,
            ...option,
          })) || [];

        const options =
          optionsData.length > 0 ? await fetchOptionNames(optionsData) : [];

        return {
          ...partnerConfig,
          fieldName: matchingConfig.fieldName,
          fieldType: matchingConfig.fieldType,
          options,
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
        axios.get(`${baseURL}/options/${option.optionId._id}`, {
          headers: { Authorization: `Bearer ${jwtToken}` },
        })
      )
    );

    // Map the responses to return option names (or use value as fallback)
    return responses.map((res, index) => {
      const optionData = res.data?.data;
      return {
        optionId: validOptions[index].optionId, // Make sure we retain the optionId
        name: optionData?.name,
      };
    });
  } catch (error) {
    console.error("Error fetching option names:", error);
    return optionsData.map(() => ({ name: "Unknown" })); // Return 'Unknown' for each optionId in case of an error
  }
};

const addProduct = async () => {
  try {
    if (!productName.value || !productPrice.value) {
      errorMessage.value = "Product name and price are required.";
      return;
    }

    // Verwerk de kleuren en hun afbeeldingen
    const colorsWithImages = await Promise.all(
      selectedColors.value.map(async (colorItem, index) => {
        const uploadedImages = await Promise.all(
          (colorUploads.value[index]?.images || []).map((file) =>
            uploadFileToCloudinary(file, `${productName.value}-${index}`)
          )
        );
        return {
          color: colorItem,
          images: uploadedImages,
        };
      })
    );

    // Configuraties verwerken
    const configurations = partnerConfigurations.value.map((config) => {
      const selectedOptions = [];
      if (config.fieldType === "color" && selectedColors.value.length > 0) {
        selectedColors.value.forEach((selectedColor) => {
          const selectedOptionId = selectedColor._id;
          const images =
            colorsWithImages.find(
              (color) => color.color._id === selectedColor._id
            )?.images || [];

          selectedOptions.push({
            optionId: selectedOptionId,
            images,
            _id: `${selectedOptionId}-${Date.now()}`,
          });
        });
      }
      return {
        configurationId: config.configurationId._id,
        selectedOptions,
      };
    });

    // Het productdata object opstellen
    const productData = {
      productCode: productCode.value,
      productName: productName.value,
      productType: selectedType.value || "sunglasses",
      brand: brand.value,
      description: description.value,
      productPrice: productPrice.value,
      activeInactive: "active",
      partnerId,
      configurations,
    };

    // Verstuur het product naar de API
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
  fetchPartnerPackage();
  fetchPartnerData(); // Haal partnergegevens op zodra de component gemonteerd is
  fetchProducts();
});

// Product-informatie refs
const productCode = ref("");
const partnerPackage = ref("");
const productType = ref("sneaker");
const productName = ref("");
const brand = ref("");
const productPrice = ref("");
const description = ref("");
// Haal het pakket van de partner op
async function fetchPartnerPackage() {
  try {
    const response = await fetch(`${baseURL}/partners/${partnerId}`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    partnerPackage.value = data.data.partner.package || "";
  } catch (err) {
    console.error("Error fetching partner package:", err);
  }
}

// Kleur-upload functie
const handleColorImageUpload = (event, index) => {
  if (!event?.target?.files) {
    console.warn(
      "Geen geldig event object gevonden bij handleColorImageUpload"
    );
    return;
  }

  // Zorg ervoor dat colorUploads[index] bestaat en een images array bevat
  if (!colorUploads.value[index]) {
    colorUploads.value[index] = { images: [] }; // Initialiseer het object als het nog niet bestaat
  }

  const files = Array.from(event.target.files).filter(
    (file) => file instanceof File
  );

  if (files.length > 0) {
    const file = files[0]; // Neem het eerste bestand
    const fileExtension = file.name.split(".").pop().toLowerCase(); // Controleer bestandstype

    // Controleer of de gebruiker een Standard pakket heeft en of het bestandstype niet is toegestaan
    if (
      partnerPackage.value === "Standard" &&
      ["glb", "gltf"].includes(fileExtension)
    ) {
      console.warn("GLB bestanden zijn alleen toegestaan voor Pro-gebruikers.");
      alert(
        "GLB bestanden zijn alleen toegestaan voor Pro-gebruikers. Je kunt alleen afbeeldingen uploaden."
      );
      return; // Stop de upload voor dit bestand
    }

    // Voeg het bestand toe aan colorUploads (als het bestandstype geldig is)
    colorUploads.value[index].images.push(...files);
  }
};

// Cloudinary upload functie
// Functie voor het uploaden van bestanden naar Cloudinary
const uploadFileToCloudinary = async (file, productName, partnerName) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ycy4zvmj");
    formData.append("cloud_name", "dzempjvto");

    const folderName = `${
      partnerName || "DefaultFolder"
    }/Products/${productName}`;
    formData.append("folder", folderName);

    // Wacht totdat het partnerpakket is opgehaald
    if (!partnerPackage.value) {
      console.error("Partner package not available");
      document.querySelector(".errorMessage").innerHTML =
        "Er is een probleem met het ophalen van het partnerpakket."; // Foutmelding voor ontbrekend partnerpakket
      return; // Stop de upload als het partnerpakket nog niet beschikbaar is
    }

    let uploadEndpoint;
    const fileExtension = file.name.split(".").pop().toLowerCase();

    // Check het pakket van de partner (Pro of Standard)
    if (partnerPackage.value === "pro") {
      if (
        ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileExtension)
      ) {
        uploadEndpoint =
          "https://api.cloudinary.com/v1_1/dzempjvto/image/upload"; // Afbeelding upload
      } else if (["glb", "gltf"].includes(fileExtension)) {
        uploadEndpoint = "https://api.cloudinary.com/v1_1/dzempjvto/raw/upload"; // 3D-bestand upload
      } else {
        throw new Error("Unsupported file type");
      }
    } else if (partnerPackage.value === "standard") {
      if (
        ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileExtension)
      ) {
        uploadEndpoint =
          "https://api.cloudinary.com/v1_1/dzempjvto/image/upload"; // Afbeelding upload
      } else {
        // Toon foutmelding voor Standard gebruikers die een niet-ondersteund bestand proberen te uploaden
        document.querySelector(".errorMessage").innerHTML =
          "Standard plan users can only upload images.";
        return; // Stop verdere verwerking
      }
    } else {
      throw new Error("Invalid partner package");
    }

    // Upload bestand naar Cloudinary
    const response = await fetch(uploadEndpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error("No secure_url found in Cloudinary response");
    }

    // Return de secure URL als de upload succesvol is
    return data.secure_url;
  } catch (error) {
    // Log de fout naar de console
    console.error("Error uploading file:", error);

    // Toon de foutmelding in de frontend
    document.querySelector(".errorMessage").innerHTML =
      error.message || "Er is een onbekende fout opgetreden."; // Toon generieke foutmelding als er geen specifieke fout is

    // Gooi de fout verder om de aanroepende functie te informeren over het probleem
    throw error;
  }
};

const triggerFileInput = (index) => {
  const fileInput = document.getElementById(`images-${index}`);
  if (fileInput) {
    fileInput.click();
  } else {
    console.warn("File input niet gevonden");
  }
};

// Meerdere kleuren beheren
const colorUploads = ref([]); // Array om kleuren en bijbehorende afbeeldingen bij te houden

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

// Afbeeldingen uploaden per kleur

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
                  :id="'images-' + index"
                  style="display: none"
                  multiple
                  @change="handleColorImageUpload($event, index)"
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

                <!-- Voeg hier de waarschuwing toe voor Standard gebruikers die GLB-bestanden proberen te uploaden -->
                <p class="errorMessage"></p>
              </div>
            </div>
          </template>
        </div>
      </div>

      <button type="submit" class="btn active">Add product</button>
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
