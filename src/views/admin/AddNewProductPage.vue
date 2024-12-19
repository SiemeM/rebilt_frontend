<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";
import axios from "axios";

// Router en JWT-token ophalen
const router = useRouter();
const jwtToken = localStorage.getItem("jwtToken");
console.log(jwtToken);
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

    console.log("Partner Configurations:", partnerConfigurations.value);
  } catch (error) {
    console.error("Error fetching partner configurations:", error);
  }
};

const fetchOptionNames = async (optionIds) => {
  try {
    const responses = await Promise.all(
      optionIds.map((id) =>
        axios.get(`${baseURL}/options/${id}`, {
          headers: { Authorization: `Bearer ${jwtToken}` },
        })
      )
    );

    return responses.map((res) => res.data?.data || "Unknown"); // Zorg ervoor dat we een object met een _id terugkrijgen
  } catch (error) {
    console.error("Error fetching option names:", error);
    return optionIds.map(() => "Unknown");
  }
};

import mongoose from "mongoose";

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

  // Check JWT token
  if (!jwtToken) {
    console.error("JWT Token is missing!");
    errorMessage.value = "Authorization token is missing.";
    return;
  }

  let userCompanyId = null;
  try {
    const tokenPayload = JSON.parse(atob(jwtToken.split(".")[1])); // Decode token
    userCompanyId = tokenPayload.companyId;
  } catch (error) {
    console.error("Error decoding token", error);
    errorMessage.value = "Invalid token.";
    return;
  }

  // Prepare selected configurations
  const selectedConfigurations = partnerConfigurations.value
    .map((config) => {
      const configurationId = config.configurationId;

      // Ensure the configurationId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(configurationId)) {
        console.error("Invalid ObjectId:", configurationId);
        errorMessage.value = `Invalid configurationId: ${configurationId}`;
        return null;
      }

      return {
        configurationId: configurationId, // Ensure this is a valid ObjectId
        value: config.value || "", // The selected value (which is now an _id)
      };
    })
    .filter((config) => config !== null); // Filter out invalid configurations

  // Prepare custom configurations with ObjectIds
  const customConfigurations = partnerConfigurations.value
    .map((config) => {
      if (config.value) {
        // Ensure selectedOption is a valid ObjectId (it will now store the _id)
        const selectedOption = config.value;

        // Ensure selectedOption is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(selectedOption)) {
          console.error("Invalid selectedOption:", selectedOption);
          errorMessage.value = `Invalid selectedOption: ${selectedOption}`;
          return null;
        }

        return {
          fieldName: config.fieldName, // Field name (e.g., 'Size', 'Color')
          fieldType: config.fieldType, // Field type (e.g., 'Select', 'Text')
          selectedOption: selectedOption, // Now this is the valid ObjectId
        };
      }
      return null;
    })
    .filter((config) => config !== null); // Filter out invalid custom configurations

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
    partnerId: userCompanyId,
    configurations: selectedConfigurations.map(
      (config) => config.configurationId // Now this will be the correct configurationId
    ),
    customConfigurations: customConfigurations, // Ensure custom configurations use ObjectIds
  };

  try {
    const response = await axios.post(`${baseURL}/products`, productData, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Response from server:", response.data);

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
  // Zoek de configuratie object op op basis van het fieldName
  const selectedConfig = partnerConfigurations.value.find(
    (config) => config.fieldName === fieldName
  );

  if (selectedConfig) {
    // Stel de selectedOption in op het ID van de geselecteerde optie
    selectedConfig.value = option._id; // Alleen het _id wordt opgeslagen
  }

  // Sluit de dropdown na het selecteren van de kleur
  dropdownStates.value[fieldName] = false;
};
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="content">
    <h1>Add New Product</h1>
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
          <template v-if="config.fieldType === 'Text'">
            <input v-model="config.value" :id="config.fieldName" type="text" />
          </template>

          <template v-else-if="config.fieldType === 'Dropdown'">
            <select v-model="config.value" :id="config.fieldName">
              <option
                v-for="(option, index) in config.options"
                :key="index"
                :value="option._id"
              >
                {{ option.name }}
              </option>
            </select>
          </template>

          <template v-else-if="config.fieldType === 'Color'">
            <div class="color-dropdown">
              <div class="dropdown">
                <div
                  class="dropdown-selected"
                  @click="toggleDropdown(config.fieldName)"
                >
                  <span
                    class="color-bullet"
                    :style="{
                      backgroundColor: config.value
                        ? config.options.find(
                            (option) => option._id === config.value
                          )?.backgroundColor
                        : 'transparent',
                    }"
                  ></span>
                  <p>
                    {{
                      config.options.find(
                        (option) => option._id === config.value
                      )?.name || "Select color"
                    }}
                  </p>
                  <!-- Toon de naam -->
                </div>
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
                    <!-- Toon de naam van de kleur -->
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

      <button type="submit" class="btn active">Add Product</button>
    </form>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.content {
  width: 100%;
  height: 100vh;
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
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
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
</style>
