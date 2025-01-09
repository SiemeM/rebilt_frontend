<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Router en JWT-token ophalen
const router = useRouter();
const route = useRoute();

const jwtToken = localStorage.getItem("jwtToken");
const errorMessage = ref("");

// Basis-URL bepalen afhankelijk van de omgeving
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const productTypes = ref([]); // Om de producttypes op te slaan
const filteredProducts = ref([]);
const selectedType = ref(""); // Om het geselecteerde producttype bij te houden

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

const productId = ref(route.params.id);
const savedOptions = ref({});

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

const selectedOption = ref(null); // Correcte initialisatie van selectedOption

const fetchProducts = async () => {
  try {
    const response = await axios.get(`${baseURL}/products`, {
      params: { partnerId },
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

const fetchProductData = async () => {
  try {
    const response = await axios.get(`${baseURL}/products/${productId.value}`, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    const productData = response.data?.data?.product;

    if (productData) {
      // Vul de andere productinformatie in
      productCode.value = productData.productCode;
      productName.value = productData.productName;
      productType.value = productData.productType;
      activeInactive.value = productData.activeInactive;
      brand.value = productData.brand;
      productPrice.value = productData.productPrice;
      description.value = productData.description;
      images.value = productData.images || [];

      partnerConfigurations.value = productData.configurations.map((config) => {
        // Stel config.value in, gebruik de selectedOption als ID
        config.value = config.selectedOption || ""; // Als geen selectedOption, stel in op een lege waarde
        return config;
      });

      // Stel selectedOption in voor de eerste configuratie
      selectedOption.value = productData.configurations[0]?.selectedOption;
    } else {
      console.error("Geen productdata gevonden.");
    }
  } catch (error) {
    console.error("Error fetching product data:", error);
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

        if (!matchingConfig) {
          console.warn(
            `No matching configuration found for ${partnerConfig.configurationId}`
          );
        }

        const options = matchingConfig?.options
          ? await fetchOptionNames(matchingConfig.options)
          : [];

        return {
          ...partnerConfig,
          fieldName: matchingConfig?.fieldName || "Unknown",
          fieldType: matchingConfig?.fieldType || "Text",
          options, // Ingevulde opties
          value: "",
        };
      })
    );
  } catch (error) {
    console.error("Error fetching partner configurations:", error);
  }
};

import mongoose from "mongoose";
const productConfigurations = ref([]);

const updateSelectedOption = (configurationId, newSelectedOptionId) => {
  // Log alle configuraties om te begrijpen welke beschikbaar zijn
  const availableConfigurations = productConfigurations.value.map((config) =>
    config.configurationId._id.toString()
  );

  // Zoek de configuratie die overeenkomt met configurationId
  const configToUpdate = productConfigurations.value.find(
    (productConfig) =>
      productConfig.configurationId._id.toString() ===
      configurationId.toString()
  );

  if (configToUpdate) {
    // Zoek de optie die overeenkomt met de newSelectedOptionId
    const selectedOptionId = configToUpdate.selectedOption._id.toString();
    const newSelectedOption = configToUpdate.configurationId.options.find(
      (option) => option.optionId.toString() === newSelectedOptionId.toString()
    );

    if (newSelectedOption) {
      // Vergelijk de geselecteerde optie met de nieuwe geselecteerde optie
      if (selectedOptionId !== newSelectedOption.optionId.toString()) {
        // Bijwerken van de geselecteerde optie
        configToUpdate.selectedOption = {
          _id: newSelectedOption.optionId,
          name: newSelectedOption.name,
          type: newSelectedOption.type,
          price: newSelectedOption.price,
        };
      }
    } else {
      console.warn(
        `Nieuwe optie met ID ${newSelectedOptionId} niet gevonden in de configuratie ${configurationId}. Beschikbare opties:`,
        configToUpdate.configurationId.options
      );
    }
  } else {
    console.warn(
      `Configuratie met ID ${configurationId} niet gevonden. Beschikbare configuraties:`,
      availableConfigurations
    );
  }
};

const loadProductConfigurations = () => {
  axios
    .get(`${baseURL}/products/${productId.value}`)
    .then((response) => {
      const productData = response.data.data.product;

      if (
        productData.configurations &&
        Array.isArray(productData.configurations)
      ) {
        productConfigurations.value = productData.configurations.map(
          (config) => ({
            ...config,
            selectedOption: config.selectedOption || null,
          })
        );
      } else {
        console.error("Geen geldige configuraties gevonden in productdata.");
        productConfigurations.value = [];
      }
    })
    .catch((error) => {
      console.error("Error bij het laden van het product:", error);
    });
};

const editProduct = async () => {
  const selectedConfigurations = productConfigurations.value
    .map((config) => ({
      configurationId: config.configurationId._id,
      selectedOption: config.selectedOption ? config.selectedOption._id : null,
    }))
    .filter((config) => config.selectedOption !== null);

  const productData = {
    productCode: productCode.value,
    productName: productName.value,
    productPrice: productPrice.value,
    productType: productType.value,
    activeInactive: activeInactive.value,
    description: description.value,
    brand: brand.value,
    images: images.value.length
      ? await Promise.all(
          images.value.map((file) =>
            uploadImageToCloudinary(file, productName.value)
          )
        )
      : [],
    partnerId: partnerId,
    configurations: selectedConfigurations,
  };

  try {
    const response = await axios.put(
      `${baseURL}/products/${productId.value}`,
      productData,
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200) {
      router.push("/admin");
    } else {
      console.error("Fout bij het bijwerken van het product:", response.status);
    }
  } catch (error) {
    console.error("Error bij het bewerken van het product:", error);
  }
};

onMounted(() => {
  checkToken();
  fetchPartnerData(); // Haal partnergegevens op zodra de component gemonteerd is
  loadProductConfigurations();
});

// Product-informatie refs
const productCode = ref("");
const productType = ref("sneaker");
const activeInactive = ref("");
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

// Functie om geselecteerde afbeeldingen op te slaan
const handleImageUpload = (event) => {
  if (event.target.files && event.target.files.length > 0) {
    // Controleer of de bestanden geldig zijn
    images.value = Array.from(event.target.files).filter(
      (file) => file instanceof File
    );
  }
};

// Functie om kleurvelden en maatopties als arrays te verwerken
const parseInputToArray = (input) => {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const dropdownOpen = ref(false);
const dropdownStates = ref({});

const toggleDropdown = (fieldName) => {
  // Sluit alle dropdowns door de status op false te zetten
  for (const key in dropdownStates.value) {
    if (key !== fieldName) {
      dropdownStates.value[key] = false;
    }
  }
  // Toggle de status van de geselecteerde dropdown
  dropdownStates.value[fieldName] = !dropdownStates.value[fieldName];
};

// Functie voor het selecteren van kleuren
const selectColor = (option, fieldName) => {
  // Zoek de geselecteerde configuratie op basis van het veldnaam
  const selectedConfig = partnerConfigurations.value.find(
    (config) => config.fieldName === fieldName
  );

  if (selectedConfig) {
    // Bewaar de volledige geselecteerde optie in selectedOption
    selectedConfig.selectedOption = option;
    // Bewaar de optionId in value
    selectedConfig.value = option.optionId;

    // Roep de updateSelectedOption functie aan met de configurationId en de optionId
    updateSelectedOption(selectedConfig.configurationId, option.optionId);

    // Bewaar de selectie in localStorage
    localStorage.setItem(`selectedOption_${fieldName}`, option.optionId);
  } else {
    console.warn(`Geen configuratie gevonden voor ${fieldName}`);
  }

  // Sluit de dropdown
  dropdownStates.value[fieldName] = false;
};

// Functie voor het herstellen van geselecteerde opties
const restoreSelectedOption = () => {
  partnerConfigurations.value.forEach((config) => {
    const saved = localStorage.getItem(`selectedOption_${config.fieldName}`);
    if (saved) {
      config.selectedOption = saved;
      config.value = saved;
    } else {
      config.selectedOption = config.value || "";
    }
  });
};

// Call restoreSelectedOption on mounted to ensure the data is restored
onMounted(() => {
  checkToken();
  fetchPartnerData(); // Fetch partner data
  fetchProductData(); // Fetch product data
  fetchProducts(); // Haal producten op
  restoreSelectedOption(); // Restore selected options
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
          <select
            v-model="productType"
            id="productType"
            @change="filterProductsByType"
          >
            <!-- Controleer of productData bestaat en toon de placeholder indien nodig -->
            <option value="" disabled selected>
              {{
                productData && productData.productType
                  ? productData.productType
                  : "Select Product Type"
              }}
            </option>

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

      <div class="row">
        <div class="column">
          <label for="activeInactive">Active/Inactive:</label>
          <select v-model="activeInactive" id="activeInactive">
            <option value="" disabled>Maak een keuze</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
            <input
              v-model="config.value"
              :id="config.fieldName"
              type="text"
              :placeholder="config.value || 'Enter text here'"
            />
          </template>

          <!-- Dropdown field -->
          <template v-else-if="config.fieldType === 'Dropdown'">
            <select v-model="config.value" :id="config.fieldName">
              <option value="" disabled>
                {{
                  config.value
                    ? config.options.find(
                        (option) => option.optionId === config.value
                      )?.name
                    : "Select an option"
                }}
              </option>
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
              <div class="dropdown">
                <div
                  class="dropdown-selected"
                  @click="toggleDropdown(config.fieldName)"
                >
                  <span
                    class="color-bullet"
                    :style="{
                      backgroundColor:
                        config.options.find(
                          (option) => option.optionId === config.value
                        )?.backgroundColor || 'transparent',
                    }"
                  ></span>
                  <p>
                    {{
                      config.options.find(
                        (option) => option.optionId === config.value
                      )?.name ||
                      (selectedOption && selectedOption._id
                        ? config.options.find(
                            (option) => option.optionId === selectedOption._id
                          )?.name || "Select color"
                        : "Select color")
                    }}
                  </p>
                </div>

                <!-- Dropdown options -->
                <div
                  v-if="dropdownStates[config.fieldName]"
                  class="dropdown-options"
                >
                  <div
                    v-for="(option, index) in config.options"
                    :key="index"
                    class="dropdown-option"
                    @click="selectColor(option, config.fieldName)"
                  >
                    <span
                      class="color-bullet"
                      :style="{
                        backgroundColor:
                          option.backgroundColor || 'transparent',
                      }"
                    ></span>
                    <p>{{ option.name || "Unnamed Color" }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="row">
        <div class="column">
          <label for="images">Upload Images:</label>
          <input type="file" id="images" multiple @change="handleImageUpload" />
          <div class="image-preview">
            <img
              v-for="(image, index) in images"
              :key="index"
              v-if="image && image instanceof File"
              :src="URL.createObjectURL(image)"
              alt="preview"
              class="preview-image"
            />
          </div>
        </div>
      </div>

      <button type="submit" class="btn active">Edit Product</button>
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

form {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
  width: 100%;
}

form .row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

form .column {
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

.color-bullet {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 8px;
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
  align-items: center;
  padding: 8px;
  color: white;
  cursor: pointer;
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
