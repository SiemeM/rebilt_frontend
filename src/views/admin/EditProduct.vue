<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import sha1 from "js-sha1";

// Basis-URL bepalen op basis van de omgeving
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
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
const typeOfProduct = ref("sneaker");
const description = ref("");
const brand = ref("");
const colors = ref("");
const sizeOptions = ref([]);
const images = ref([]); // Voeg images toe
const lacesColor = ref([]);
const soleColor = ref([]);
const insideColor = ref([]);
const outsideColor = ref([]);
const partnerName = ref(""); // Partnernaam (kan dynamisch worden ingesteld)

let productData = []; // Productgegevens

// Functie om partnergegevens op te halen
const fetchPartnerData = async () => {
  try {
    const tokenPayload = JSON.parse(atob(jwtToken.split(".")[1])); // Decodeer JWT-token
    const partnerId = tokenPayload.companyId;

    if (!partnerId) {
      console.error("Partner ID (companyId) is not available in the token.");
      router.push("/login");
      return;
    }

    const response = await axios.get(`${baseURL}/partners/${partnerId}`, {
      headers: {
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

// Haal productgegevens op
const fetchProductData = async () => {
  const id = route.params.id;
  productId.value = id;

  try {
    const response = await fetch(`${baseURL}/products/${id}`);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    productData = data.data.product;

    if (productData) {
      productCode.value = productData.productCode;
      productName.value = productData.productName;
      productPrice.value = productData.productPrice;
      typeOfProduct.value = productData.typeOfProduct;
      description.value = productData.description;
      brand.value = productData.brand;
      colors.value = productData.colors;
      sizeOptions.value = productData.sizeOptions;
      images.value = productData.images;
      lacesColor.value = productData.lacesColor;
      soleColor.value = productData.soleColor;
      insideColor.value = productData.insideColor;
      outsideColor.value = productData.outsideColor;
    }
  } catch (error) {
    console.error("Error fetching product data:", error);
    alert("Er is een fout opgetreden bij het ophalen van de productgegevens.");
  }
};

// Functie om de geselecteerde afbeeldingen op te slaan
const handleFileChange = (event) => {
  images.value = Array.from(event.target.files);
};

// Gebruik je eigen uploadfunctie voor Cloudinary
const uploadImageToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "ycy4zvmj");
  formData.append("cloud_name", "dzempjvto");

  const folderName = partnerName.value;
  formData.append("folder", folderName);

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

// Functie om de nieuwe afbeeldingen te uploaden
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

const generateSignature = (timestamp, imageId) => {
  const apiSecret = "g3uD4zo94Nn1l7S20LW_Y8wPKKY"; // Gebruik je Cloudinary api_secret hier
  const signatureString = `public_id=${imageId}&timestamp=${timestamp}${apiSecret}`;

  // Gebruik js-sha1 om de string te hashen
  const signature = sha1(signatureString);
  return signature;
};

// Functie om oude afbeeldingen te verwijderen
// Functie om oude afbeeldingen te verwijderen
const deleteOldImages = async () => {
  try {
    if (!productData.images || productData.images.length === 0) {
      return;
    }

    for (const imageUrl of productData.images) {
      // Stap 1: Haal alles na "/image/upload/" en verwijder de versie (bijv. v1732454523)
      let imageId = imageUrl.split("/image/upload/")[1]; // Haalt alles na "/image/upload/"

      // Stap 2: Verwijder de versie (v<version_number>)
      imageId = imageId.split("/").slice(1).join("/"); // Dit verwijdert de versie en pakt de rest

      // Stap 3: Verwijder bestandsextensie (bijv. .webp, .jpg, .png)
      imageId = imageId.split(".")[0]; // Verwijder alles na de punt

      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateSignature(timestamp, imageId); // Maak een handtekening op basis van je Cloudinary secret

      const deleteResponse = await fetch(
        `https://api.cloudinary.com/v1_1/dzempjvto/image/destroy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            public_id: imageId,
            api_key: "496836855294519", // Voeg je API-key hier in
            timestamp: timestamp,
            signature: signature, // Voeg de handtekening toe
          }),
        }
      );

      const deleteData = await deleteResponse.json();

      if (!deleteResponse.ok || deleteData.result !== "ok") {
        throw new Error(
          `Fout bij verwijderen van oude afbeelding: ${
            deleteData.message || deleteData.result
          }`
        );
      }
    }
  } catch (error) {
    console.error("Error deleting old images:", error);
  }
};

// Functie om het product bij te werken
const updateProduct = async () => {
  if (
    !productCode.value ||
    !productName.value ||
    !productPrice.value ||
    !description.value ||
    !brand.value ||
    !colors.value ||
    !sizeOptions.value ||
    !lacesColor.value ||
    !soleColor.value ||
    !insideColor.value ||
    !outsideColor.value
  ) {
    alert("Vul alstublieft alle vereiste velden in.");
    return;
  }

  const productDataToSend = {
    productCode: productCode.value,
    productName: productName.value,
    productPrice: productPrice.value,
    typeOfProduct: typeOfProduct.value,
    description: description.value,
    brand: brand.value,
    colors: colors.value,
    sizeOptions: sizeOptions.value,
    images: images.value.length > 0 ? images.value : productData.images, // Als er geen nieuwe afbeeldingen zijn, gebruik dan de oude
    lacesColor: lacesColor.value,
    soleColor: soleColor.value,
    insideColor: insideColor.value,
    outsideColor: outsideColor.value,
  };

  try {
    // Eerst de oude afbeeldingen verwijderen (indien nodig)
    if (images.value.length > 0) {
      await deleteOldImages();
    }

    // Als er nieuwe afbeeldingen zijn, upload ze dan
    let uploadedImages = [];
    if (images.value.length > 0) {
      uploadedImages = await uploadNewImages();
      productDataToSend.images = uploadedImages;
    }

    // Stuur de bijgewerkte productgegevens naar de backend
    const response = await fetch(`${baseURL}/products/${productId.value}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product: productDataToSend }),
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    router.push("/admin");
  } catch (error) {
    console.error("Error updating product:", error);
    alert("Er is een fout opgetreden bij het bijwerken van het product.");
  }
};

onMounted(() => {
  fetchPartnerData();
  fetchProductData();
});
</script>

<template>
  <Navigation />
  <div class="content">
    <h1>Product Bewerken</h1>
    <form v-if="productData" @submit.prevent="updateProduct">
      <div class="row">
        <div class="column">
          <label for="productCode">Product Code:</label>
          <input v-model="productCode" id="productCode" type="text" required />
        </div>
        <div class="column">
          <label for="productName">Productnaam:</label>
          <input v-model="productName" id="productName" type="text" required />
        </div>
      </div>
      <div class="column">
        <label for="productPrice">Prijs:</label>
        <input
          v-model="productPrice"
          id="productPrice"
          type="number"
          required
        />
      </div>
      <div class="column">
        <label for="typeOfProduct">Type:</label>
        <input v-model="typeOfProduct" id="typeOfProduct" type="text" />
      </div>
      <div class="column">
        <label for="description">Beschrijving:</label>
        <input v-model="description" id="description" type="text" required />
      </div>
      <div class="column">
        <label for="brand">Merk:</label>
        <input v-model="brand" id="brand" type="text" required />
      </div>
      <div class="column">
        <label for="colors">Kleur:</label>
        <input v-model="colors" id="colors" type="text" />
      </div>
      <div class="column">
        <label for="sizeOptions">Maatopties:</label>
        <input v-model="sizeOptions" id="sizeOptions" type="text" />
      </div>
      <div class="column">
        <label for="lacesColor">Kleur Veters:</label>
        <input v-model="lacesColor" id="lacesColor" type="text" />
      </div>
      <div class="column">
        <label for="soleColor">Kleur Zool:</label>
        <input v-model="soleColor" id="soleColor" type="text" />
      </div>
      <div class="column">
        <label for="insideColor">Kleur Binnenkant:</label>
        <input v-model="insideColor" id="insideColor" type="text" />
      </div>
      <div class="column">
        <label for="outsideColor">Kleur Buitenkant:</label>
        <input v-model="outsideColor" id="outsideColor" type="text" />
      </div>
      <div class="column">
        <label for="images">Afbeeldingen:</label>
        <input @change="handleFileChange" id="images" type="file" multiple />
      </div>
      <button type="submit" class="btn active">Bewerk Product</button>
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
</style>
