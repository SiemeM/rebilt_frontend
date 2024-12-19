<script setup>
import { ref, reactive, onMounted, computed, provide } from "vue";
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

// JWT Token handling
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
const partnerId = tokenPayload?.companyId || null;

if (!userId) {
  router.push("/login");
}

// API base URL
const baseURL =
  window.location.hostname !== "localhost"
    ? "https://rebilt-backend.onrender.com/api/v1"
    : "http://localhost:3000/api/v1";

// Reactive references for partner data and configurations
const partnerPackage = ref(null);
const configurations = ref([]);
const partnerConfigurations = ref([]);
const loadingConfigurations = ref(false);
const optionsMap = reactive({});
const isDataLoaded = ref(false); // Loading status flag

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

const fetchConfigurations = async () => {
  loadingConfigurations.value = true;
  try {
    const response = await axios.get(`${baseURL}/configurations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    configurations.value = response.data?.data || [];
    console.log("All configurations loaded:", configurations.value); // Log all configurations
  } catch (error) {
    console.error("Error fetching configurations:", error);
    configurations.value = [];
  } finally {
    loadingConfigurations.value = false;
  }
};

const fetchPartnerConfigurations = async () => {
  loadingConfigurations.value = true;
  try {
    const [configResponse, optionsResponse] = await Promise.all([
      axios.get(`${baseURL}/partnerconfigurations`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${baseURL}/options`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    const configs = configResponse.data?.data || [];
    const options = optionsResponse.data?.data || [];

    // Map options by their IDs
    options.forEach((option) => {
      optionsMap[option._id] = option;
    });

    // Filter configurations to only include those where the partnerId matches
    partnerConfigurations.value = configs.filter(
      (config) => config.partnerId === partnerId
    );
    console.log("Partner configurations loaded:", partnerConfigurations.value); // Log partner configurations
  } catch (error) {
    console.error("Error fetching partner configurations or options:", error);
    partnerConfigurations.value = [];
  } finally {
    loadingConfigurations.value = false;
  }
};

// Fetch initial data on mount
onMounted(async () => {
  await fetchUserProfile();
  await fetchPartnerData();
  await fetchPartnerConfigurations();
  await fetchConfigurations();
  isDataLoaded.value = true; // Data is fully loaded now
});

// Provide user data globally
provide("user", user);

// Reactive data for product selection and deletion logic
const selectedConfigurations = ref([]);
const searchTerm = ref(""); // Add this line in your setup() function

// Select all configurations
const selectAllPartnerConfigurations = (isSelected) => {
  selectedConfigurations.value = isSelected
    ? partnerConfigurations.value.map((config) => config._id)
    : []; // If selected, set to all partner configuration IDs, else empty array
};

// Function to toggle the selection of individual partner configuration
const toggleSelection = (configId) => {
  const index = selectedConfigurations.value.indexOf(configId);
  if (index === -1) {
    selectedConfigurations.value.push(configId); // Add to selection
  } else {
    selectedConfigurations.value.splice(index, 1); // Remove from selection
  }
};

// Show confirmation popup
const isPopupVisible = ref(false);
const showPopup = () => {
  isPopupVisible.value = true;
};

// Hide confirmation popup
const hidePopup = () => {
  isPopupVisible.value = false;
};

const confirmDelete = async () => {
  if (!isDataLoaded.value) {
    console.error("Data is still loading. Please try again later.");
    return;
  }

  try {
    const productsToDelete =
      selectedConfigurations.value.length > 0
        ? selectedConfigurations.value
        : partnerConfigurations.value.map((config) => config._id);

    console.log("Products to delete:", productsToDelete);

    // Debugging: Log partner configurations before attempting delete
    console.log("Current partner configurations:", partnerConfigurations.value);

    // Start the deletion process
    for (const id of productsToDelete) {
      console.log("Attempting to delete configuration with ID:", id);

      // Zoek naar de configuratie in de partner-configuraties
      const existingConfig = partnerConfigurations.value.find(
        (config) => config._id === id
      );

      if (!existingConfig) {
        console.error(
          `Configuration with ID ${id} not found in partner configurations.`
        );
        continue; // Skip this ID if it's not found
      }

      const response = await axios.delete(
        `${baseURL}/partnerConfigurations/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Debugging: Log the response from the server
      console.log("Delete response:", response);

      if (response.status === 200) {
        // Adjusted to 200 OK
        // Verwijder de configuratie uit de partner configuraties
        partnerConfigurations.value = partnerConfigurations.value.filter(
          (config) => config._id !== id
        );
        console.log(
          `Configuration with ID ${id} deleted from partner configurations.`
        );

        // Optionally, also remove from all configurations
        configurations.value = configurations.value.filter(
          (config) => config._id !== id
        );
        console.log(
          `Configuration with ID ${id} deleted from all configurations.`
        );
      } else {
        throw new Error(`Failed to delete configuration with ID ${id}`);
      }
    }

    // Reset de geselecteerde configuraties
    selectedConfigurations.value = [];
    hidePopup(); // Verberg de popup na succesvol verwijderen
  } catch (error) {
    console.error("Error deleting configurations:", error);
    alert("An error occurred while trying to delete configurations.");
  }
};

const getFullConfiguration = (partnerConfig) => {
  return (
    configurations.value.find(
      (config) => config._id === partnerConfig.configurationId
    ) || {} // Return an empty object if no matching configuration is found
  );
};

// Define the getOptionsNames function
const getOptionsNames = (optionIds) => {
  if (!Array.isArray(optionIds) || optionIds.length === 0) {
    return "No options"; // Return a default string if there are no options
  }
  return optionIds
    .map((id) => optionsMap[id]?.name || "Unknown option")
    .join(", ");
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
        <router-link to="/admin/settings" class="btn active">
          Add New <img src="../../assets/icons/add.svg" alt="icon" />
        </router-link>
        <div
          class="btn display"
          :style="{
            visibility:
              selectedConfigurations.length > 0 ? 'visible' : 'hidden',
          }"
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
          type="checkbox"
          @change="selectAllPartnerConfigurations($event.target.checked)"
        />
        <p>Field Name</p>
        <p>Type</p>
        <p>Options</p>
      </div>

      <div class="table-container">
        <div
          v-for="config in partnerConfigurations"
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
              params: { id: config.configurationId },
              query: { partnerId: config.partnerId },
            }"
          >
            <p>{{ getFullConfiguration(config)?.fieldName || "No name" }}</p>
          </router-link>
          <p>{{ getFullConfiguration(config)?.fieldType || "No type" }}</p>
          <p>
            {{
              getOptionsNames(getFullConfiguration(config)?.options) ||
              "No options"
            }}
          </p>
        </div>
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
