<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";
import axios from "axios";

// Router en JWT-token ophalen
const router = useRouter();
const jwtToken = localStorage.getItem("jwtToken");
console.log(jwtToken); // Check if the token is being fetched properly

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
const fetchPartnerData = async () => {
  try {
    const tokenPayload = JSON.parse(atob(jwtToken.split(".")[1])); // Decode token
    console.log(tokenPayload);
    const partnerId = tokenPayload.companyId;
    console.log(partnerId);

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
    } else {
      console.error("Partner data not found in response");
      partnerName.value = "Default";
    }
  } catch (error) {
    console.error("Error fetching partner data:", error.response || error);
    partnerName.value = "Default";
  }
};

// Lifecycle hook voor het ophalen van partnergegevens
onMounted(() => {
  checkToken();
  fetchPartnerData(); // Haal partnergegevens op zodra de component gemonteerd is
});

// Product-informatie refs
const productCode = ref("");
const typeOfProduct = ref("sneaker");
const productName = ref("");
const brand = ref("");
const productPrice = ref("");
const description = ref("");
const colors = ref([]); // Herschrijven naar een array voor kleurselectie
const newColor = ref(""); // Dit wordt gebruikt voor het kleurinvoerveld
const images = ref([]); // Geüploade afbeeldingen

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

const parseColorInput = (input, colorArray) => {
  const newColors = input
    .split(",")
    .map((color) => color.trim())
    .filter(Boolean);

  // Voeg de nieuwe kleuren toe aan de colors array, zonder duplicaten
  newColors.forEach((color) => {
    if (!colorArray.includes(color)) {
      colorArray.push(color);
    }
  });
};

// Functie om een nieuw product toe te voegen
const addProduct = async () => {
  // Controleer of de vereiste velden ingevuld zijn
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

  if (!partnerName.value) {
    errorMessage.value = "Partner data is not available.";
    return;
  }

  // Controleer of er kleuren en maatopties zijn
  const colorsArray = colors.value;

  if (colorsArray.length === 0) {
    errorMessage.value = "Please provide at least one color.";
    return;
  }

  const userCompanyId = jwtToken
    ? JSON.parse(atob(jwtToken.split(".")[1])).companyId
    : null;

  const productData = {
    productCode: productCode.value,
    productName: productName.value,
    productPrice: productPrice.value,
    typeOfProduct: typeOfProduct.value,
    description: description.value,
    brand: brand.value,
    colors: colorsArray,
    images: [],
    partnerId: userCompanyId,
  };

  try {
    if (images.value.length === 0) {
      errorMessage.value = "Please upload at least one image.";
      return;
    }

    productData.images = await Promise.all(
      images.value.map((file) =>
        uploadImageToCloudinary(file, productName.value)
      )
    );
  } catch (error) {
    errorMessage.value = "An error occurred while uploading images.";
    return;
  }

  try {
    const response = await fetch(`${baseURL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(productData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unknown error occurred.");
    }

    console.log("Product successfully added:", data);
    router.push("/admin");
  } catch (error) {
    console.error("Error adding product:", error);
    errorMessage.value = "An error occurred while adding the product.";
  }
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
          <label for="typeOfProduct">Type Of Product:</label>
          <select v-model="typeOfProduct" id="typeOfProduct">
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

      <div class="row">
        <div class="column">
          <label for="colors">Colors:</label>
          <input
            v-model="newColor"
            type="color"
            @change="colors.push(newColor)"
          />
          <div class="color-preview">
            <span
              v-for="(color, index) in colors"
              :key="index"
              :style="{ backgroundColor: color }"
              class="color-box"
            ></span>
          </div>
        </div>
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
</style>
