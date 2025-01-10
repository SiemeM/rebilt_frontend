<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

const router = useRouter();
const route = useRoute();
const jwtToken = localStorage.getItem("jwtToken");
const errorMessage = ref("");
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";
const productTypes = ref([]); // Om de producttypes op te slaan
const filteredProducts = ref([]);
const selectedColors = ref([]);
const selectedType = ref(""); // Om het geselecteerde producttype bij te houden
const checkToken = () => {
  if (!jwtToken) {
    router.push("/login");
  }
};
const productCode = ref("");
const productType = ref("sneaker");
const activeInactive = ref("");
const productName = ref("");
const brand = ref("");
const productPrice = ref("");
const description = ref("");
const images = ref([]);
const selectedOptions = ref([]);
const productConfigurations = ref([]);
const partnerConfigurations = ref([]);
const partnerName = ref("");
const tokenPayload = JSON.parse(atob(jwtToken.split(".")[1]));
const partnerId = tokenPayload.companyId;
const productId = ref(route.params.id);
const selectedOption = ref(null);

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

      console.log(selectedOptions.value); // Check if selectedOptions is populated

      // Handle the selectedOptions for each configuration (if necessary)
      // After fetching the product data
      console.log("^poiuhgy", productData.configurations);
      partnerConfigurations.value = productData.configurations.map((config) => {
        console.log(config.selectedOptions);
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

      console.log(
        "partnerConfigurations",
        partnerConfigurations.value[0].selectedOptions
      );

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

const fetchPartnerConfigurations = async () => {
  if (!partnerId) {
    console.warn("No partnerId provided.");
    return;
  }

  try {
    // Fetch partner configurations
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
        // Extract configurationId and match it with existing configurations
        const matchingConfig = configurations.find(
          (config) =>
            String(config._id) === String(partnerConfig.configurationId._id)
        );

        if (!matchingConfig) {
          console.warn(
            `No matching configuration found for ${partnerConfig.configurationId._id}`
          );
        }

        // Now, check if 'selectedOptions' is available in the matchingConfig or related data
        const selectedOptions = matchingConfig?.selectedOptions || []; // Try getting selectedOptions from configurationId

        // If no selectedOptions in matchingConfig, fall back to the partnerConfig options
        const fallbackSelectedOptions = partnerConfig.options.map((option) => ({
          colorName: option.optionId.name, // Use option's name as color name
          colorId: option.optionId._id, // Use option's _id
          colorImage: option.images[0] || "", // If no image, return empty string
        }));

        const formattedSelectedOptions = selectedOptions.length
          ? selectedOptions.map((option) => ({
              colorName: option.optionId.name,
              colorId: option.optionId._id,
              colorImage: option.images[0] || "",
            }))
          : fallbackSelectedOptions; // Use fallback if no selectedOptions in matchingConfig

        // Fetch options for the matching configuration
        const options = matchingConfig?.options
          ? await fetchOptionNames(matchingConfig.options)
          : [];

        // Return the populated partnerConfig
        return {
          ...partnerConfig,
          fieldName: matchingConfig?.fieldName || "Unknown",
          fieldType: matchingConfig?.fieldType || "Text",
          options, // Add options for the partner config
          selectedOptions: formattedSelectedOptions, // Add the selected options
          value:
            formattedSelectedOptions.length > 0
              ? formattedSelectedOptions[0].colorId // Use the first selected option as value
              : "", // Empty if no selected options
        };
      })
    );

    console.log("partnerConfigurations", partnerConfigurations.value);
  } catch (error) {
    console.error("Error fetching partner configurations:", error);
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

  const colorsWithImages = await Promise.all(
    selectedColors.value.map(async (colorItem, index) => {
      console.log("Processing color:", colorItem);
      const uploadedImages = await Promise.all(
        (colorUploads.value[index]?.images || []).map((file) =>
          uploadImageToCloudinary(file, `${productName.value}-${index}`)
        )
      );
      console.log("Uploaded images for color:", uploadedImages);
      return {
        color: colorItem,
        images: uploadedImages,
      };
    })
  );

  if (config.fieldType === "color" && selectedColors.value.length > 0) {
    selectedColors.value.forEach((selectedColor) => {
      const selectedOptionId = selectedColor._id;
      const images =
        colorsWithImages.find((color) => color.color._id === selectedColor._id)
          ?.images || [];
      console.log("Selected color and images:", selectedColor, images);

      selectedOptions.push({
        optionId: selectedOptionId,
        images,
        _id: `${selectedOptionId}-${Date.now()}`,
      });
    });
  }

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

const dropdownStates = ref({});

const toggleDropdown = (fieldName) => {
  console.log("Toggling dropdown for field:", fieldName);
  if (fieldName) {
    console.log("Before toggle:", dropdownStates.value);
    for (const key in dropdownStates.value) {
      if (key !== fieldName) {
        dropdownStates.value[key] = false;
      }
    }
    dropdownStates.value[fieldName] = !dropdownStates.value[fieldName];
    console.log("After toggle:", dropdownStates.value);
  } else {
    console.warn("fieldName is not defined:", fieldName);
  }
};

const toggleColorSelection = (option, fieldName) => {
  console.log("Before toggle:", selectedColors.value);
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
  console.log("After toggle:", selectedColors.value);
};

// Call restoreSelectedOption on mounted to ensure the data is restored
onMounted(() => {
  checkToken();
  loadProductConfigurations();
  checkToken();
  fetchPartnerData();
  fetchProductData();
  fetchProducts();
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
              {{ "Select product type" }}
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
          <template v-if="config.fieldType === 'color'">
            <div class="dropdown">
              <div
                class="dropdown-selected"
                @click="toggleDropdown(config.fieldName)"
              >
                <!-- Show selected colors -->
                <p
                  v-if="
                    config.selectedOptions && config.selectedOptions.length > 0
                  "
                >
                  Selected color:
                  <span
                    v-for="(option, index) in config.selectedOptions"
                    :key="index"
                  >
                    <span :style="{ color: option.colorName }">{{
                      option.colorName
                    }}</span>
                    <span v-if="index !== config.selectedOptions.length - 1"
                      >,
                    </span>
                  </span>
                </p>

                <p v-else>Select color</p>
              </div>

              <div
                v-if="dropdownStates[config.fieldName]"
                class="dropdown-options"
              >
                <div
                  v-for="(option, index) in config.selectedOptions"
                  :key="index"
                  class="dropdown-option"
                  @click="toggleColorSelection(option, config.fieldName)"
                >
                  <!-- Checkbox for selecting colors -->
                  <input
                    type="checkbox"
                    :value="option.colorId"
                    v-model="selectedColors"
                  />
                  <span
                    class="color-bullet"
                    :style="{
                      backgroundColor: option.colorName || 'transparent',
                    }"
                  ></span>
                  <p>{{ option.colorName || "Unnamed Color" }}</p>
                </div>
              </div>
            </div>
          </template>
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
