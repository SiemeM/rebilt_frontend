<script setup>
import { ref, reactive, onMounted, computed, watch, provide } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Router setup
const router = useRouter();

// Reactive user object to store user details
const user = reactive({
  firstName: "",
  lastName: "",
  email: "",
  newEmail: "",
  oldEmail: "",
  password: "",
  newPassword: "",
  oldPassword: "",
  newPasswordRepeat: "",
  country: "",
  city: "",
  postalCode: "",
  profilePicture: "",
  bio: "",
  role: "",
  activeUnactive: true,
});

// Authentication and token handling
const token = localStorage.getItem("jwtToken");
if (!token) {
  router.push("/login");
}

const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error parsing JWT:", error);
    return null;
  }
};

const tokenPayload = parseJwt(token);
const userId = tokenPayload?.userId;
const partnerId = tokenPayload?.companyId;
if (!userId) {
  router.push("/login");
}

// Base URL for API calls
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Partner related data
const partnerPackage = ref(null);

// Fetch user profile data
const fetchUserProfile = async () => {
  try {
    const response = await axios.get(`${baseURL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const userData = response.data?.data?.user || {};
    user.firstName = userData.firstname || "";
    user.lastName = userData.lastname || "";
    user.email = userData.email || "";
    user.oldEmail = userData.email || "";
    user.country = userData.country || "";
    user.city = userData.city || "";
    user.postalCode = userData.postalCode || "";
    user.profilePicture = userData.profilePicture || "";
    user.bio = userData.bio || "";
    user.role = userData.role || "";
    user.activeUnactive = userData.activeUnactive ?? true;
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
};

// Fetch partner data (if applicable)
const fetchPartnerData = async () => {
  try {
    const response = await axios.get(`${baseURL}/partners/${partnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const partner = response.data?.data?.partner || {};
    partnerPackage.value = partner.package || "No package available";
  } catch (error) {
    console.error("Error fetching partner data:", error);
    partnerPackage.value = "Error loading partner data";
  }
};

// Fetch initial data on mount
onMounted(async () => {
  await fetchUserProfile();
  await fetchPartnerData();
});

// Provide the user data to all components
provide("user", user); // Makes user data available to child components like Navigation

// Fetch products data
const fetchData = async () => {
  try {
    const token = localStorage.getItem("jwtToken");
    const response = await fetch(`${baseURL}/products`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const userCompanyId = getUserCompanyId(token);

    data.value = result.data.products.filter(
      (product) => product.partnerId === userCompanyId
    );
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

// Arrays to store configurations
const partnerConfigurations = ref([]);
const selectedConfigurations = ref([]);

// Nieuwe API-aanroep om configuraties op te halen
const fetchConfigurations = async () => {
  try {
    const response = await axios.get(`${baseURL}/configurations`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const configurations = response.data?.data || [];
    return configurations;
  } catch (error) {
    console.error("Error fetching configurations:", error);
    return [];
  }
};

// Fetch partner configurations
// Haal de partnerconfiguraties en configuraties op en koppel ze
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
        headers: { Authorization: `Bearer ${token}` },
        params: { partnerId },
      }
    );

    const partnerConfigs = partnerResponse.data?.data || [];
    partnerConfigurations.value = partnerConfigs.filter(
      (config) => String(config.partnerId) === String(partnerId)
    );

    // Haal de algemene configuraties op
    const configurations = await fetchConfigurations();

    // Koppel de configuraties aan de partnerconfiguraties
    partnerConfigurations.value.forEach((partnerConfig) => {
      const matchingConfig = configurations.find(
        (config) => config._id === partnerConfig.configurationId
      );
      if (matchingConfig) {
        partnerConfig.fieldName = matchingConfig.fieldName; // Voeg het fieldName toe
      }
    });

    console.log(partnerConfigurations.value);
  } catch (error) {
    console.error("Error fetching partner configurations:", error);
  }
};

// Initial data fetch
onMounted(fetchData);
onMounted(fetchPartnerConfigurations);

// Computed properties
const selectedTypeFilter = ref("All");
const data = ref([]);
const searchTerm = ref("");
const selectedProducts = ref([]);
const isDeleteButtonVisible = computed(() => selectedProducts.value.length > 0);
const isPopupVisible = ref(false);

// Get user company ID from JWT token
const getUserCompanyId = (token) => {
  if (!token) return null;
  const decoded = JSON.parse(atob(token.split(".")[1]));
  return decoded.companyId;
};

// Select or deselect a product
const toggleSelection = (productId) => {
  const index = selectedProducts.value.indexOf(productId);
  if (index === -1) {
    selectedProducts.value.push(productId);
  } else {
    selectedProducts.value.splice(index, 1);
  }
};

// Select or deselect all products
const toggleSelectAll = (event) => {
  selectedProducts.value = event.target.checked
    ? data.value.map((product) => product._id)
    : [];
};

// Start the delete process for selected products
const deleteSelectedProducts = () => {
  if (selectedProducts.value.length === 0) return;
  showPopup();
};

// Confirm the deletion of selected products
const confirmDelete = async () => {
  await deleteProducts();
  hidePopup();
};

// Extract public_id from Cloudinary URL
const extractPublicId = (imageUrl) => {
  try {
    const parts = imageUrl.split("/image/upload/");
    if (parts.length < 2) {
      console.error("Invalid URL structure:", imageUrl);
      return null;
    }

    let publicIdWithVersion = parts[1];
    const publicIdParts = publicIdWithVersion.split("/");

    if (
      publicIdParts[0].startsWith("v") &&
      !isNaN(Number(publicIdParts[0].slice(1)))
    ) {
      publicIdParts.shift();
    }

    const publicIdWithoutExtension = publicIdParts.join("/").split(".")[0];
    return publicIdWithoutExtension;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
};

// Delete image from Cloudinary
const deleteImageFromCloudinary = async (imageUrl) => {
  const publicId = extractPublicId(imageUrl);
  if (!publicId) {
    console.error("No valid public_id found for image:", imageUrl);
    return;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(timestamp, publicId);

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/dzempjvto/image/destroy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_id: publicId,
          api_key: "496836855294519",
          timestamp: timestamp,
          signature: signature,
        }),
      }
    );

    const result = await response.json();
    if (result.result !== "ok") {
      throw new Error("Cloudinary delete failed: " + result.result);
    }
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
  }
};

// Delete products
const deleteProducts = async () => {
  try {
    for (const id of selectedProducts.value) {
      const product = data.value.find((product) => product._id === id);
      if (product && product.images && product.images.length > 0) {
        for (const imageUrl of product.images) {
          await deleteImageFromCloudinary(imageUrl);
        }
      }

      const response = await fetch(`${baseURL}/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(`Error deleting product with id ${id}`);
      }
    }

    selectedProducts.value = [];
    await fetchData(); // Refresh the data list
  } catch (error) {
    console.error("Error deleting products:", error);
  }
};

// Show popup
const showPopup = () => {
  isPopupVisible.value = true;
};

// Hide popup
const hidePopup = () => {
  isPopupVisible.value = false;
};

// Generate signature for Cloudinary deletion
const generateSignature = (timestamp, publicId) => {
  const secret = "adA9j34J6UeMpoZwMcHzKNfuWoY";
  return md5(
    `public_id=${publicId}&timestamp=${timestamp}&api_secret=${secret}`
  );
};
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="overlay" v-if="isPopupVisible"></div>
  <div class="content">
    <div class="popup" v-if="isPopupVisible">
      <img src="../../assets/icons/cross-circle.svg" alt="icon" />
      <div class="text">
        <h2>Are you sure?</h2>
        <p>Do you really want to delete this item(s)?</p>
        <div class="btns">
          <button @click="hidePopup">Cancel</button>
          <button @click="confirmDelete" class="btn active">Delete</button>
        </div>
      </div>
    </div>
    <div class="menu">
      <div class="btns">
        <router-link exact to="/admin/add-new-product" class="btn active">
          <p>Add new</p>
          <img src="../../assets/icons/add.svg" alt="icon" />
        </router-link>
        <div
          @click="deleteSelectedProducts"
          class="btn display"
          :style="{ visibility: isDeleteButtonVisible ? 'visible' : 'hidden' }"
        >
          <p>Delete item(s)</p>
        </div>
      </div>

      <div class="search">
        <img src="../../assets/icons/search.svg" alt="icon" />
        <input placeholder="Search" v-model="searchTerm" />
      </div>

      <select class="filter" v-model="selectedTypeFilter">
        <option value="All">All</option>
        <option value="optical">Optical</option>
        <option value="sun">Sun</option>
      </select>
    </div>
    <div class="products">
      <div class="top">
        <!-- <input
          type="checkbox"
          @change="toggleSelectAll"
          :checked="
            selectedProducts.length === selectedProducts.length &&
            selectedProducts.length > 0
          "
        /> -->
        <p>Product Code</p>
        <p>Product name</p>
        <p>Type of product</p>
        <p>Brand</p>
        <p>Description</p>
        <p>Status</p>
        <p v-for="config in partnerConfigurations" :key="config._id">
          {{ config.fieldName || "N/A" }}
        </p>
      </div>

      <ul v-if="selectedProducts.length" class="list">
        <li v-for="product in selectedProducts" :key="product._id">
          <input
            type="checkbox"
            @change="toggleSelection(product._id)"
            :checked="selectedProducts.includes(product._id)"
          />
          <router-link
            :to="{ name: 'EditProduct', params: { id: product._id } }"
          >
            <p>{{ product.productCode }}</p>
            <p>{{ product.typeOfProduct }}</p>
            <p>{{ product.brand }}</p>
            <p>{{ product.productName }}</p>
            <p>{{ product.colors }}</p>
            <p>{{ product.description }}</p>
            <p>{{ product.activeUnactive }}</p>

            <!-- Render dynamic configuration values -->
            <div class="configurations">
              <p v-for="config in partnerConfigurations" :key="config._id">
                {{ product[config.fieldName] || "N/A" }}
              </p>
            </div>

            <p>{{ product.glassColor }}</p>
          </router-link>
        </li>
      </ul>

      <div v-else class="no-products">
        <p>Geen producten gevonden voor de huidige zoekopdracht of filter.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content {
  width: 100%;
  height: 100vh;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 999;
}

.popup {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background-color: var(--secondary-color);
  padding: 24px 32px;
  border-radius: 8px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

.popup img {
  width: 64px;
  height: 64px;
}

.popup .text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.popup .text .btns {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.popup .text .btns button {
  border: none;
  background: transparent;
  cursor: pointer;
}

.popup .text .btns .active {
  background-color: #d34848;
  color: var(--text-color);
}

.menu {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.menu .btns {
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: center;
}

.btn.display {
  visibility: hidden;
  border: 1px solid #d34848;
  background-color: rgba(211, 72, 72, 0.2);
  border-radius: 8px;
  padding: 4px 12px;
}

.btn.display p {
  color: #d34848;
}

.search,
select {
  padding: 4px 12px;
  border-radius: 8px;
  border: none;
  border: 1px solid var(--secondary-color);
  background-color: var(--secondary-color);
  color: var(--text-color);
  width: 320px;
}

.no-products {
  text-align: center;
  color: #fff;
  padding: 20px;
}

.search {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.products {
  background-color: var(--secondary-color);
  width: 100%;
  border-radius: 8px;
  overflow-x: auto; /* Enable horizontal scrolling */
  white-space: nowrap; /* Prevent wrapping of items */
}

.products .top {
  display: flex; /* Gebruik flexbox voor een enkele rij */
  gap: 20px; /* Pas de ruimte tussen de items aan */
  border-radius: 8px 8px 0 0;
  padding: 4px 16px;
  background-color: var(--secondary-color);
  width: 100%; /* Zorg ervoor dat de breedte van de container 100% is */
  overflow-x: auto; /* Hiermee kan horizontaal gescrold worden */
  -webkit-overflow-scrolling: touch; /* Zorg voor een vloeiende scroll op mobiele apparaten */
}

.products .top::-webkit-scrollbar {
  display: none; /* Verberg de scrollbalk */
}

.products .list {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  overflow-x: auto; /* Alleen voor verticale scroll indien nodig */
}

.products .list li {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.products .list li:nth-child(even) {
  background-color: rgb(var(--primary-color), 0.1);
}

.products .top input {
  width: 20px;
}

.products .list li a {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 80px;
  padding-left: 80px;
}
.products .list li p {
  color: var(--text-color);
}

.products .list li p:hover {
  text-decoration: underline;
}

.products .top p {
  flex: 1 1 auto; /* Dit maakt de elementen flexibel, met een minimum van de breedte die ze nodig hebben */
  min-width: 90px; /* Minimale breedte per kolom */
  box-sizing: border-box; /* Zorg ervoor dat padding en borders worden meegeteld in de breedte */
}

.products .top input {
  width: 20px;
}

.search input {
  color: var(--text-color);
}
</style>
