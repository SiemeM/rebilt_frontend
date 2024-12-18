<script setup>
import { ref, reactive, onMounted, computed, watch, provide } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Router setup
const router = useRouter();

// Reactive user object to store user details (gebruik reactive voor betere reactiviteit)
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

const decodeToken = (token) => {
  if (!token) return null;
  const base64Payload = token.split(".")[1];
  const decodedPayload = JSON.parse(atob(base64Payload));
  return decodedPayload; // Dit bevat de payload, inclusief de partner-id
};

// JWT-token controle
const jwtToken = localStorage.getItem("jwtToken");
if (!jwtToken) {
  router.push("/login");
}

const decoded = decodeToken(token);
const decodedToken = decodeToken(jwtToken);
const userPartnerId = decodedToken?.companyId;

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
const partnerId = tokenPayload?.partnerId || null;

if (!userId) {
  router.push("/login");
}

// Base URL for API calls
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://https://rebilt-backend.onrender.com/api/v1"
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
    // Update the user object
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
  if (!partnerId) return;

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

// Provide the user data to all components (including Navigation)
provide("user", user); // Makes user data available to child components like Navigation

// Fetch product data
const fetchData = async () => {
  try {
    const response = await fetch(`${baseURL}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();
    const userCompanyId = getUserCompanyId(token);
    data.value = result.data.products.filter(
      (product) => product.partnerId === userCompanyId
    );
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

// Fetch partner configurations
const fetchPartnerConfigurations = async () => {
  try {
    const [configResponse, optionsResponse] = await Promise.all([
      axios.get(`${baseURL}/configurations`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${baseURL}/options`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const configs = configResponse.data?.data || [];
    const options = optionsResponse.data?.data || [];

    partnerConfigurations.value = configs.filter(
      (config) => config.partnerId === partnerId
    );
    optionsMap.value = options.reduce((acc, option) => {
      acc[option._id] = option.name;
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching partner configurations or options:", error);
    partnerConfigurations.value = []; // Ensure partnerConfigurations is an empty array on error
  }
};

// Helper function to get the user company ID from JWT
const getUserCompanyId = (token) => {
  if (!token) return null;
  const decoded = JSON.parse(atob(token.split(".")[1]));
  return decoded.companyId;
};

// Fetch data when component mounts
onMounted(async () => {
  await fetchUserProfile();
  await fetchPartnerData();
  await fetchData();
  await fetchPartnerConfigurations();
});

// Reactive references and computed properties
const selectedTypeFilter = ref("All");
const data = ref([]);
const searchTerm = ref("");
const selectedProducts = ref([]);
const isDeleteButtonVisible = computed(() => selectedProducts.value.length > 0);
const isPopupVisible = ref(false);
const partnerConfigurations = ref([]); // Initialize as empty array
const optionsMap = ref({});

const filteredConfigurations = computed(() => {
  // Safely check for partnerConfigurations.value
  return partnerConfigurations.value && partnerConfigurations.value.length > 0
    ? partnerConfigurations.value.filter(
        (config) =>
          config.partnerId === partnerId &&
          Object.values(config)
            .join(" ")
            .toLowerCase()
            .includes(searchTerm.value.toLowerCase())
      )
    : []; // Return an empty array if partnerConfigurations is empty or undefined
});

// Handling product selection
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

// Handle product deletion
const deleteSelectedProducts = () => {
  if (selectedProducts.value.length === 0) return;
  showPopup();
};

const confirmDelete = async () => {
  await deleteProducts();
  hidePopup();
};

// Cloudinary image deletion helpers
const extractPublicId = (imageUrl) => {
  try {
    const parts = imageUrl.split("/image/upload/");
    if (parts.length < 2) return null;

    let publicIdWithVersion = parts[1];
    const publicIdParts = publicIdWithVersion.split("/");

    if (
      publicIdParts[0].startsWith("v") &&
      !isNaN(Number(publicIdParts[0].slice(1)))
    ) {
      publicIdParts.shift();
    }

    return publicIdParts.join("/").split(".")[0];
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
};

const deleteImageFromCloudinary = async (imageUrl) => {
  const publicId = extractPublicId(imageUrl);
  if (!publicId) return;

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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    await fetchData();
    selectedProducts.value = [];
  } catch (error) {
    console.error("Error deleting products:", error);
    alert("An error occurred while deleting products.");
  }
};

// Show and hide popup for confirmation
const showPopup = () => {
  isPopupVisible.value = true;
};

const hidePopup = () => {
  isPopupVisible.value = false;
};
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="overlay" v-if="isPopupVisible"></div>
  <div class="content">
    <!-- Delete confirmation popup -->
    <div class="popup" v-if="isPopupVisible">
      <h2>Are you sure?</h2>
      <p>Do you really want to delete the selected item(s)?</p>
      <div class="popup-buttons">
        <button @click="hidePopup">Cancel</button>
        <button @click="confirmDelete" class="btn active">Delete</button>
      </div>
    </div>

    <!-- Actions menu -->
    <div class="menu">
      <div class="btns">
        <router-link to="/admin/settings" class="btn active"
          >Add New <img src="../../assets/icons/add.svg" alt="icon" />
        </router-link>
        <div
          class="btn display"
          :style="{ visibility: isDeleteButtonVisible ? 'visible' : 'hidden' }"
          @click="showPopup"
        >
          <p>Delete item(s)</p>
        </div>
      </div>

      <div class="search">
        <img src="../../assets/icons/search.svg" alt="icon" />
        <input placeholder="Search" v-model="searchTerm" />
      </div>
    </div>

    <!-- Configurations table -->
    <div class="configurations">
      <div class="top">
        <input
          v-if="filteredConfigurations.length > 0"
          type="checkbox"
          @change="toggleSelectAll"
          :checked="
            selectedConfigurations.length === filteredConfigurations.length &&
            filteredConfigurations.length > 0
          "
        />
        <p>Field Name</p>
        <p>Type</p>
        <p>Options</p>
      </div>

      <div class="table-container">
        <div
          v-for="config in filteredConfigurations"
          :key="config._id"
          class="listItem"
        >
          <input
            type="checkbox"
            :checked="selectedConfigurations.includes(config._id)"
            @change="toggleSelection(config._id)"
          />
          <router-link
            :to="{
              name: 'EditConfiguration',
              params: { id: config._id },
              query: { partnerId: config.partnerId },
            }"
          >
            <p>{{ config.fieldName }}</p>
            <p>{{ config.fieldType }}</p>
            <p>
              {{
                config.options
                  .map((optionId) => optionsMap[optionId])
                  .join(", ")
              }}
            </p>
          </router-link>
        </div>
      </div>

      <p
        v-if="!partnerConfigurations || partnerConfigurations.length === 0"
        class="no-configurations"
      >
        No configurations found.
      </p>
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

.popup img {
  width: 64px;
  height: 64px;
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
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.search input {
  color: var(--text-color);
}

.configurations {
  background-color: var(--secondary-color);
  width: 100%;
  border-radius: 8px;
  overflow-x: auto;
  white-space: nowrap;
}

.configurations::-webkit-scrollbar {
  display: none;
}

.configurations .top {
  display: flex;
  flex-direction: row;
  align-items: center;
  border-radius: 8px 8px 0 0;
  gap: 16px;
  padding: 4px 16px;
  background-color: var(--secondary-color);
}

.configurations .list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.configurations .listItem {
  display: flex;
  flex-direction: row;
  padding: 16px;
  gap: 16px;
}

.configurations .listItem:nth-child(even) {
  background-color: rgb(var(--primary-color), 0.1);
}

.configurations .listItem a {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  column-gap: 16px;
  row-gap: 16px;
}

.configurations .top p,
.configurations .listItem p {
  color: var(--text-color);
}

.configurations .top p:nth-child(1),
.configurations .listItem p:nth-child(1) {
  width: 200px;
}

.configurations .top p:nth-child(2),
.configurations .listItem p:nth-child(2) {
  width: 200px;
}

.configurations .top p:nth-child(3),
.configurations .listItem p:nth-child(3) {
  width: 200px;
}

.configurations .top p:nth-child(4),
.configurations .listItem p:nth-child(4) {
  width: 200px;
}

.configurations .top p:nth-child(5),
.configurations .listItem p:nth-child(5) {
  width: 200px;
}

.configurations .top p:nth-child(6),
.configurations .listItem p:nth-child(6) {
  width: 200px;
}

.configurations .top p:nth-child(7),
.configurations .listItem p:nth-child(7) {
  width: 200px;
}

.configurations .listItem p:hover {
  text-decoration: underline;
}

.no-configurations {
  padding: 16px;
  text-align: center;
  color: var(--text-color);
}
</style>
