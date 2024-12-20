<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";
import sha1 from "js-sha1";

// Basis-URL bepalen op basis van de omgeving
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const router = useRouter();
const jwtToken = localStorage.getItem("jwtToken");

if (!jwtToken) {
  router.push("/login");
}

const route = useRoute();
const productId = ref(""); // Opslaan van de product ID
const productCode = ref("");
const productName = ref("");
const productPrice = ref(null);
const productType = ref("sneaker");
const description = ref("");
const brand = ref("");
const images = ref([]);

let partnerConfigurations = ref([]); // Initializing partner configurations
let dropdownStates = ref({}); // Manage dropdown visibility

const partnerName = ref("");
const tokenPayload = JSON.parse(atob(jwtToken.split(".")[1])); // Decode token
const partnerId = tokenPayload.companyId;

const productData = ref({
  productCode: "",
  productName: "",
  productPrice: null,
  productType: "sneaker",
  description: "",
  brand: "",
  images: [],
  customConfigurations: [],
});

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

const fetchOptionNames = async (optionIds) => {
  try {
    console.log("Fetching option names for IDs:", optionIds);
    const responses = await Promise.all(
      optionIds.map((id) =>
        axios.get(`${baseURL}/options/${id}`, {
          headers: { Authorization: `Bearer ${jwtToken}` },
        })
      )
    );

    const optionNames = responses.map((res) => {
      const option = res.data?.data;
      console.log("Option fetched:", option); // Log the fetched option
      if (!option || !option.name) {
        console.warn(`Option with ID ${optionIds} is missing a name.`);
        return "Onbekende optie"; // Fallback value
      }
      return option.name; // Zorg ervoor dat de naam wordt geretourneerd
    });

    return optionNames;
  } catch (error) {
    console.error("Error fetching option names:", error);
    return optionIds.map(() => "Onbekende optie"); // Fallback value in case of error
  }
};

const selectedOptionName = computed(() => {
  return partnerConfigurations.value.map((config) => {
    const selectedOption = config.value; // Dit is de geselecteerde waarde (ID van de optie)
    if (selectedOption) {
      const option = config.options.find((opt) => opt._id === selectedOption);
      return option ? option.name : "Onbekende optie";
    }
    return "Select an option"; // Fallback tekst voor dropdown
  });
});

const fetchProductData = async () => {
  const id = route.params.id;
  productId.value = id;
  try {
    const response = await fetch(`${baseURL}/products/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const fetchedProductData = data?.data?.product;

    console.log("Fetched Product Data:", fetchedProductData);

    if (fetchedProductData) {
      productCode.value = fetchedProductData.productCode;
      productName.value = fetchedProductData.productName;
      productPrice.value = fetchedProductData.productPrice;
      productType.value = fetchedProductData.productType;
      description.value = fetchedProductData.description;
      brand.value = fetchedProductData.brand;
      images.value = fetchedProductData.images;

      productData.value.customConfigurations =
        fetchedProductData.customConfigurations || [];
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
    const partnerResponse = await axios.get(
      `${baseURL}/partnerConfigurations`,
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
        params: { partnerId },
      }
    );

    const partnerConfigs = partnerResponse.data?.data || [];

    const productResponse = await axios.get(
      `${baseURL}/products/${productId.value}`,
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
      }
    );

    const productData = productResponse.data?.data?.product || {};
    const productConfigurations = productData.configurations || [];

    const partnerConfigsWithNames = await Promise.all(
      partnerConfigs.map(async (partnerConfig) => {
        const matchingConfig = productConfigurations.find(
          (config) =>
            config.configurationId._id === partnerConfig.configurationId
        );

        const options = matchingConfig?.options || [];

        // Haal de geselecteerde optie-ID op
        const selectedOption = partnerConfig.selectedOption
          ? partnerConfig.selectedOption._id
          : matchingConfig?.selectedOption?._id || null;

        let selectedOptionName = null;

        // Als een geselecteerde optie bestaat, haal dan de naam op
        if (selectedOption) {
          selectedOptionName = await fetchOptionNames([selectedOption]);
        }

        // Zorg ervoor dat de naam correct wordt ingesteld (gebruik de naam als deze beschikbaar is, anders een fallback)
        const optionName =
          selectedOptionName && selectedOptionName[0]
            ? selectedOptionName[0]
            : "Onbekende optie";

        return {
          ...partnerConfig,
          fieldName: matchingConfig?.configurationId?.fieldName || "Unknown",
          fieldType: matchingConfig?.configurationId?.fieldType || "Text",
          options,
          value: selectedOption,
          selectedOptionName: optionName, // De naam van de geselecteerde optie
        };
      })
    );

    partnerConfigurations.value = partnerConfigsWithNames;
  } catch (error) {
    console.error("Error fetching partner configurations:", error);
  }
};

// Dropdown toggle function
const toggleDropdown = (fieldName) => {
  dropdownStates.value = {
    ...dropdownStates.value,
    [fieldName]: !dropdownStates.value[fieldName], // Toggle de staat voor de dropdown
  };
};

// Select a color from the dropdown
// Selecteer een kleur uit de dropdown
const selectColor = (option, fieldName) => {
  const selectedColor = option._id;

  // Find the correct configuration and update the selected color
  const colorField = partnerConfigurations.value.find(
    (config) => config.fieldName === fieldName
  );

  if (colorField) {
    colorField.value = selectedColor; // Update the selected color ID
    colorField.selectedOptionName = option.name; // Ensure name is updated for display
  }

  // Close the dropdown after selection
  dropdownStates.value[fieldName] = false;
};

// Handle file change for images
const handleFileChange = (event) => {
  images.value = Array.from(event.target.files);
};

// Upload image to Cloudinary
const uploadImageToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "ycy4zvmj");
  formData.append("cloud_name", "dzempjvto");
  formData.append("folder", partnerName.value);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dzempjvto/image/upload`,
      {
        method: "POST",
        body: formData,
      }
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

// Upload new images to Cloudinary
const uploadNewImages = async () => {
  const uploadedImages = [];

  for (const file of images.value) {
    try {
      const imageUrl = await uploadImageToCloudinary(file);
      uploadedImages.push(imageUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Fout bij het uploaden van de afbeeldingen.");
    }
  }

  return uploadedImages;
};

// Update product
const updateProduct = async () => {
  if (
    !productCode.value ||
    !productName.value ||
    !productPrice.value ||
    !productType.value ||
    !description.value ||
    !brand.value
  ) {
    alert("Vul alstublieft alle vereiste velden in.");
    return;
  }

  // Maak het object dat naar de backend gestuurd wordt
  const productDataToSend = {
    productCode: productCode.value,
    productName: productName.value,
    productPrice: productPrice.value,
    productType: productType.value,
    description: description.value,
    brand: brand.value,
    images: images.value.length > 0 ? images.value : productData.images,
    configurations: partnerConfigurations.value, // Voeg configuraties toe
    customConfigurations: partnerConfigurations.value.filter(
      (config) => config.custom // Filter op de custom configuraties
    ), // Voeg custom configuraties toe
  };

  try {
    let uploadedImages = [];
    if (images.value.length > 0) {
      uploadedImages = await uploadNewImages();
      productDataToSend.images = uploadedImages;
    }

    // PUT request naar de backend om het product bij te werken
    const response = await fetch(`${baseURL}/products/${productId.value}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product: productDataToSend }),
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      console.error("Response error:", result); // Log de fout respons van de backend
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Redirect naar de admin pagina bij succes
    router.push("/admin");
  } catch (error) {
    console.error("Error updating product:", error);
    alert("Er is een fout opgetreden bij het bijwerken van het product.");
  }
};
const updateConfigurations = () => {
  partnerConfigurations.value = partnerConfigurations.value.map((config) => {
    const selectedOption = config.selectedOption
      ? config.selectedOption._id
      : null;

    console.log("Selected Option:", selectedOption);

    return {
      ...config,
      value: selectedOption || config.value, // Gebruik de geselecteerde optie als de waarde
    };
  });
};

// On component mount, fetch data
onMounted(() => {
  fetchPartnerData();
  fetchProductData();
  updateConfigurations();
});
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="content">
    <h1>Product Bewerken</h1>
    <form v-if="productData" @submit.prevent="updateProduct">
      <div class="row">
        <div class="column">
          <label for="productCode">Product Code:</label>
          <input
            v-model="productCode"
            id="productCode"
            type="text"
            placeholder="Voer de productcode in"
            required
          />
        </div>
        <div class="column">
          <label for="productName">Productnaam:</label>
          <input
            v-model="productName"
            id="productName"
            type="text"
            placeholder="Voer de productnaam in"
            required
          />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="productPrice">Prijs:</label>
          <input
            v-model="productPrice"
            id="productPrice"
            type="number"
            placeholder="Voer de prijs in"
            required
          />
        </div>
        <div class="column">
          <label for="productType">Type:</label>
          <input
            v-model="productType"
            id="productType"
            type="text"
            placeholder="Voer het producttype in"
          />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="description">Beschrijving:</label>
          <input
            v-model="description"
            id="description"
            type="text"
            placeholder="Voer een productbeschrijving in"
            required
          />
        </div>
        <div class="column">
          <label for="brand">Merk:</label>
          <input
            v-model="brand"
            id="brand"
            type="text"
            placeholder="Voer het merk in"
            required
          />
        </div>
      </div>

      <div
        v-for="(config, index) in partnerConfigurations"
        :key="config._id"
        class="row"
      >
        <div class="column">
          <label :for="config.fieldName">{{ config.fieldName }}:</label>

          <!-- Text Input Field -->
          <template v-if="config.fieldType === 'Text'">
            <input v-model="config.value" :id="config.fieldName" type="text" />
          </template>

          <!-- Color Input Field -->
          <!-- Color Dropdown -->
          <template v-if="config.fieldType === 'Color'">
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
                          )?.backgroundColor || 'transparent'
                        : 'transparent',
                    }"
                  ></span>
                  <p>
                    {{ config.selectedOptionName || "Selecteer een kleur" }}
                  </p>
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
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Dropdown voor andere velden -->
          <template v-if="config.fieldType === 'Dropdown'">
            <select v-model="config.value" :id="config.fieldName">
              <!-- Placeholder if no value is selected -->
              <option value="" disabled v-if="!config.value">
                {{ config.selectedOptionName || "Selecteer een optie" }}
              </option>
              <!-- Loop through the available options -->
              <option
                v-for="(option, index) in config.options"
                :key="index"
                :value="option._id"
              >
                {{ option.name || "Onbekende optie" }}
              </option>
            </select>
          </template>
        </div>
      </div>

      <div class="column">
        <label for="images">Afbeeldingen:</label>
        <input @change="handleFileChange" id="images" type="file" multiple />
      </div>
      <div class="column">
        <button type="submit" class="btn active">Bewerk Product</button>
      </div>
    </form>
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
  gap: 120px;
  width: 100%;
}

form .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

input,
select {
  padding: 8px;
  margin-bottom: 16px;
  border-radius: 4px;
  border: 1px solid #333;
  background-color: #333;
  color: white;
}

button {
  color: white;
  cursor: pointer;
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
  z-index: 999; /* Ensure this has a higher value than other elements */
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
