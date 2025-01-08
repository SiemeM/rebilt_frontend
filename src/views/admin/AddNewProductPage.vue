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
  // Validate required fields
  if (
    !productCode.value ||
    !productName.value ||
    !productPrice.value ||
    !description.value ||
    !brand.value
  ) {
    errorMessage.value = "Please fill in all required fields.";
    return;
  }

  // Check for unique product code
  const isProductCodeUnique = await checkProductCodeUniqueness(
    productCode.value
  );
  if (!isProductCodeUnique) {
    return; // Stop the function if the product code is not unique
  }

  // Prepare selected configurations and validate selectedOption
  const selectedConfigurations = partnerConfigurations.value
    .map((config) => {
      const configurationId = config.configurationId;

      // Ensure the configurationId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(configurationId)) {
        console.error("Invalid ObjectId:", configurationId);
        errorMessage.value = `Invalid configurationId: ${configurationId}`;
        return null;
      }

      // Ensure that selectedOption is a valid ObjectId or set to null if empty
      const selectedOption = config.value; // Get the selectedOption (optionId) from selectedConfig

      if (!selectedOption || !mongoose.Types.ObjectId.isValid(selectedOption)) {
        console.warn(
          `Invalid or missing selectedOption for ${config.fieldName}`
        );
        errorMessage.value = `Invalid or missing selectedOption for ${config.fieldName}`;
        return null; // Do not include invalid configurations
      }

      return {
        configurationId: configurationId,
        selectedOption: selectedOption, // Now this is the valid ObjectId (optionId)
      };
    })
    .filter((config) => config !== null); // Filter out invalid configurations

  // Check if configurations are empty (e.g., missing options)
  if (selectedConfigurations.length === 0) {
    errorMessage.value = "No valid configurations selected.";
    return;
  }

  const partnerId = tokenPayload?.companyId || null;

  const productData = {
    productCode: productCode.value,
    productName: productName.value,
    productPrice: productPrice.value,
    productType: productType.value,
    description: description.value,
    brand: brand.value,
    images:
      images.value.length > 0
        ? await Promise.all(
            images.value.map((file) =>
              uploadImageToCloudinary(file, productName.value)
            )
          )
        : [],
    partnerId: partnerId, // Use the extracted userCompanyId here
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
      console.error("Failed to add product. Status:", response.status);
      errorMessage.value = "Failed to add product.";
    }
  } catch (error) {
    console.error("Error adding product:", error);
    if (error.response) {
      console.error("Server response error:", error.response.data);
      errorMessage.value = `Error: ${
        error.response.data.message || "Unknown error"
      }`;
    } else if (error.request) {
      console.error("No response received:", error.request);
      errorMessage.value = "No response from server.";
    } else {
      console.error("Error during request:", error.message);
      errorMessage.value = "Error during request.";
    }
  }
};

// Lifecycle hook voor het ophalen van partnergegevens
onMounted(() => {
  checkToken();
  fetchPartnerData(); // Haal partnergegevens op zodra de component gemonteerd is
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
          <select v-model="productType" id="productType">
            <option value="sneaker">Sneaker</option>
            <option value="boot">Boot</option>
            <option value="sandals">Sandals</option>
            <option value="formal">Formal</option>
            <option value="slippers">Slippers</option>
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
              <div class="dropdown">
                <!-- Geselecteerde optie -->
                <div
                  class="dropdown-selected"
                  @click="toggleDropdown(config.fieldName)"
                >
                  <!-- Toon de geselecteerde kleur -->
                  <span
                    class="color-bullet"
                    :style="{
                      backgroundColor:
                        config.options.find(
                          (option) => option.optionId === config.value
                        )?.backgroundColor || 'transparent',
                    }"
                  ></span>
                  <!-- Toon de naam van de geselecteerde kleur -->
                  <p>
                    {{
                      config.options.find(
                        (option) => option.optionId === config.value
                      )?.name || "Select color"
                    }}
                  </p>
                </div>

                <!-- Dropdown opties -->
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
                    <!-- Kleurbol voor elke optie -->
                    <span
                      class="color-bullet"
                      :style="{
                        backgroundColor:
                          option.backgroundColor || 'transparent',
                      }"
                    ></span>
                    <!-- Naam van de optie -->
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
