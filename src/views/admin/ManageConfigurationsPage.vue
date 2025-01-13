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

// Reactive variables for configurations and options
const configurations = ref([]);
const selectedConfigurations = ref([]);
const allOptions = ref([]); // To hold all options (ID -> name mapping)
const searchTerm = ref("");
const showDeletePopup = ref(false); // To control the visibility of the delete popup
const isDeleteButtonVisible = computed(
  () => selectedConfigurations.value.length > 0
);

// Fetch configurations data
const fetchConfigurations = async () => {
  try {
    const response = await axios.get(`${baseURL}/configurations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    configurations.value = response.data?.data || [];
    fetchOptions();
  } catch (error) {
    console.error("Error fetching configurations:", error);
  }
};

// Fetch options data (used to map option IDs to option names)
const fetchOptions = async () => {
  try {
    const response = await axios.get(`${baseURL}/options`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    allOptions.value = response.data?.data || [];
  } catch (error) {
    console.error("Error fetching options:", error);
  }
};

// Filtering configurations based on the search term
const filteredConfigurations = computed(() => {
  const lowerSearchTerm = searchTerm.value.toLowerCase();
  return configurations.value.filter((config) =>
    Object.values(config).join(" ").toLowerCase().includes(lowerSearchTerm)
  );
});

// Toggle selection logic for individual configurations
const toggleSelection = (configId) => {
  const index = selectedConfigurations.value.indexOf(configId);
  if (index > -1) {
    selectedConfigurations.value.splice(index, 1);
  } else {
    selectedConfigurations.value.push(configId);
  }
};

// Toggle select all logic
const toggleSelectAll = () => {
  if (selectedConfigurations.value.length === configurations.value.length) {
    selectedConfigurations.value = [];
  } else {
    selectedConfigurations.value = configurations.value.map(
      (config) => config._id
    );
  }
};

const getOptionName = (optionId) => {
  const option = allOptions.value.find((opt) => opt._id === optionId);
  return option ? option.name : "Unknown"; // Return the name or "Unknown" if not found
};

// Show the delete confirmation popup
const showPopup = () => {
  showDeletePopup.value = true;
};

// Hide the delete confirmation popup
const hidePopup = () => {
  showDeletePopup.value = false;
};

// Delete selected configurations
// Function to delete the selected configurations
const deleteSelectedConfigurations = async () => {
  if (selectedConfigurations.value.length === 0) {
    return;
  }

  try {
    // Iterate over each selected configuration
    for (const configId of selectedConfigurations.value) {
      // Send the DELETE request to the correct endpoint with the specific config ID
      await axios.delete(`${baseURL}/configurations/${configId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    // Optionally, refresh the list of configurations after deletion
    await fetchConfigurations();

    // Clear the selected configurations
    selectedConfigurations.value = [];
  } catch (error) {
    console.error("Error deleting configurations:", error);
  }
};

// Fetch data on component mount
onMounted(() => {
  fetchConfigurations();
});
</script>

<template>
  <DynamicStyle />
  <Navigation />

  <div class="content">
    <div class="popup" v-if="showDeletePopup">
      <img src="../../assets/icons/cross-circle.svg" alt="icon" />
      <div class="text">
        <h2>Are you sure?</h2>
        <p>Do you really want to delete this item(s)?</p>
        <div class="btns">
          <button @click="hidePopup">Cancel</button>
          <button @click="deleteSelectedConfigurations" class="btn active">
            Delete
          </button>
        </div>
      </div>
    </div>

    <div class="menu">
      <div class="btns">
        <router-link to="/admin/add-new-configuration" class="btn active">
          Add New <img src="../../assets/icons/add.svg" alt="icon" />
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

    <!-- Configurations Table -->
    <div class="configurations">
      <div class="top">
        <input
          type="checkbox"
          @change="toggleSelectAll"
          :checked="
            selectedConfigurations.length === configurations.value?.length
          "
        />
        <p>Field Name</p>
        <p>Type</p>
        <p>Options</p>
        <p>Partner ID</p>
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
                config.options && Array.isArray(config.options)
                  ? config.options.map(getOptionName).join(", ")
                  : ""
              }}
            </p>
            <p>{{ config.partnerId || "None" }}</p>
          </router-link>
        </div>
      </div>

      <!-- No configurations message -->
      <div v-if="!filteredConfigurations.length" class="no-data">
        No configurations found.
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
  border-radius: 4px;
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
  border-radius: 4px;
  padding: 4px 12px;
}

.btn.display p {
  color: #d34848;
}

.search,
select {
  padding: 4px 12px;
  border-radius: 4px;
  border: none;
  border: 1px solid var(--gray-900);
  background-color: var(--gray-900);
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
  border-radius: 4px;
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
  border-radius: 4px 8px 0 0;
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
  grid-template-columns: repeat(7, 1fr);
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
