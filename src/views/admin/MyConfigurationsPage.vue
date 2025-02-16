<script setup>
import { ref, reactive, onMounted, computed, provide } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

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

// Reactive references for partner data
const tokenPayload = parseJwt(token);
const userId = tokenPayload?.userId;
const partnerId = tokenPayload?.companyId || null;
const partnerPackage = ref("Standard Package"); // Set partner's package
const partnerName = ref("");
const allDomains = ref([]);

if (!userId) {
  router.push("/login");
}

// API base URL
const baseURL =
  window.location.hostname !== "localhost"
    ? "https://rebilt-backend.onrender.com/api/v1"
    : "http://localhost:3000/api/v1";

// Router setup
const router = useRouter();
const domainName = ref("");

// Computed property om domeinnaam zonder de extensie te tonen
const domainWithoutExtension = computed({
  get() {
    return domainName.value.replace(".rebilt.be", "");
  },
  set(value) {
    domainName.value = value + ".rebilt.be";
  },
});

// Reactive references for partner data and configurations
const configurations = ref([]);
const partnerConfigurations = ref([]);
const loadingConfigurations = ref(false);
const optionsMap = reactive({});
const isDataLoaded = ref(false); // Loading status flag

// Valid domain check computed property
const isValidDomain = computed(() => {
  const domain = domainName.value.trim();
  const domainWithoutExtension = domain.split(".")[0]; // Get the domain part before any extension

  // Regular expression for valid domain name (only lowercase and hyphens)
  const domainPattern = /^[a-z-]+$/; // Only lowercase letters and hyphens
  const forbiddenExtensions = [".be", ".com", ".nl"];

  // Check for uppercase letters
  if (/[A-Z]/.test(domainWithoutExtension)) {
    return {
      isValid: false,
      message: "The domain name cannot contain uppercase letters.",
    };
  }

  // Check for numbers in the domain name (disallow digits)
  if (/\d/.test(domainWithoutExtension)) {
    return {
      isValid: false,
      message: "The domain name cannot contain numbers.",
    };
  }

  // Check if domain contains any forbidden extensions
  if (forbiddenExtensions.some((ext) => domainWithoutExtension.includes(ext))) {
    return {
      isValid: false,
      message: "The domain name cannot contain .be, .com, .nl.",
    };
  }

  // Check if domain matches the valid pattern (only lowercase and hyphens)
  if (!domainPattern.test(domainWithoutExtension)) {
    return {
      isValid: false,
      message:
        "The domain name must only contain lowercase letters and hyphens.",
    };
  }

  return { isValid: true, message: "" };
});

// Fetch all partner domains to check for duplicates
const fetchAllDomains = async () => {
  try {
    const response = await axios.get(`${baseURL}/partners/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.data || typeof response.data !== "object") {
      console.error("Ongeldige API response structuur:", response);
      return [];
    }

    // Hier halen we de domeinen op uit de partners array
    return response.data.data.partners.map((partner) => partner.domain);
  } catch (error) {
    console.error("❌ Error fetching partner domains:", error);
    return [];
  }
};

const updateDomain = async () => {
  if (!partnerId) return;

  const domain = domainName.value.trim();

  // Prevent appending .rebilt.be if it's already present
  let fullDomain = domain;
  if (!domain.endsWith(".rebilt.be")) {
    fullDomain += ".rebilt.be"; // Only append if it doesn't already have .rebilt.be
  }

  // Ensure that allDomains is an array
  if (!Array.isArray(allDomains.value)) {
    console.error("allDomains is not an array:", allDomains.value);
    isValidDomain.value = {
      isValid: false,
      message: "Error: Domain list is not valid.",
    };
    return;
  }

  // Check if domain is already taken
  if (allDomains.value.includes(fullDomain)) {
    isValidDomain.value = {
      isValid: false,
      message: "Error: This domain name is already taken.",
    };
    return;
  }

  const partnerData = {
    name: partnerName.value,
    package: partnerPackage.value,
    domain: fullDomain,
  };

  try {
    const response = await axios.put(
      `${baseURL}/partners/${partnerId}`,
      partnerData, // Data must be in the body of a PUT request
      {
        headers: { Authorization: `Bearer ${token}` }, // Correct headers for the request
      }
    );

    if (response.status === 200) {
      isValidDomain.value = {
        isValid: true,
        message: "Domain updated successfully.",
      };
    }
  } catch (error) {
    console.error("Error updating domain:", error);
    isValidDomain.value = {
      isValid: false,
      message: "Failed to update the domain.",
    };
  }
};

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

const fetchPartnerData = async () => {
  if (!partnerId) return;
  try {
    const response = await axios.get(`${baseURL}/partners/${partnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const partner = response.data?.data?.partner || {};
    partnerName.value = partner.name || "No name available";
    partnerPackage.value = partner.package || "No package available";
    domainName.value = partner.domain || ""; // Set initial domain value
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

  // Ensure you await the fetchAllDomains() promise
  allDomains.value = await fetchAllDomains();
});

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

    // Start the deletion process
    for (const id of productsToDelete) {
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

      if (response.status === 200) {
        // Adjusted to 200 OK
        // Verwijder de configuratie uit de partner configuraties
        partnerConfigurations.value = partnerConfigurations.value.filter(
          (config) => config._id !== id
        );
        // Optionally, also remove from all configurations
        configurations.value = configurations.value.filter(
          (config) => config._id !== id
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
    <div class="publishWebsite">
      <h2>Publish website</h2>
      <div class="elements">
        <div class="column">
          <label for="website">Domain:</label>
          <div class="input-container">
            <input
              type="text"
              v-model="domainWithoutExtension"
              placeholder="your-domain"
            />
            <span class="suffix">.rebilt.be</span>
          </div>
          <!-- Display validation message -->
          <p v-if="!isValidDomain.isValid" class="error-message">
            {{ isValidDomain.message }}
          </p>
        </div>

        <!-- Disable button if domain is invalid -->
        <button
          @click="updateDomain"
          class="btn active"
          :disabled="!isValidDomain.isValid"
        >
          Publish Domain
        </button>
      </div>
    </div>
    <div class="ourConfigurations">
      <h2>Our configurations</h2>
      <!-- Delete confirmation popup -->
      <div class="popup" v-if="isPopupVisible">
        <h2>Are you sure?</h2>
        <p>Do you really want to delete the selected item(s)?</p>
        <div class="popup-buttons">
          <button @click="hidePopup">Cancel</button>
          <button @click="confirmDelete" class="btn active">Delete</button>
        </div>
      </div>

      <div class="elements">
        <!-- Actions menu -->
        <div class="menu">
          <div class="btns">
            <router-link to="/admin/settings" class="btn active">
              <p>Add New <img src="../../assets/icons/add.svg" alt="icon" /></p>
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
                <p>
                  {{ getFullConfiguration(config)?.fieldName || "No name" }}
                </p>
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
    </div>
  </div>
</template>

<style scoped>
.error-message {
  color: red;
  font-size: 0.9rem;
  margin-top: 8px;
}

.content {
  width: 100%;
  height: 100vh;
}

.publishWebsite,
.ourConfigurations {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.publishWebsite .column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.input-container {
  position: relative;
  width: 100%;
}

.input-container input {
  width: 100%;
  padding: 0.25rem 0 0.25rem 1rem;
  border: 1px solid var(--text-color);
  border-radius: 4px;
  transition: border-color 0.3s ease-in-out;
  text-align: left;
  height: 2rem;
}

.input-container .suffix {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-color);
  opacity: 0.6;
  pointer-events: none;
  text-transform: lowercase;
}

.publishWebsite .elements,
.ourConfigurations .elements {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.btn {
  font-size: 1rem;
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

.configurations .desktop .list li:nth-child(odd) {
  background-color: var(--gray-900);
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

@media (min-width: 768px) {
  .publishWebsite .elements {
    flex-direction: row;
    align-items: flex-end;
  }

  .publishWebsite .btn {
    white-space: nowrap;
  }
}
</style>
