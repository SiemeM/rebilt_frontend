<script setup>
import { ref, reactive, onMounted, computed, watch, provide } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Router setup
const router = useRouter();
const route = useRoute(); // Access route information

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

// JWT token and user data
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
console.log(partnerId);
if (!userId) {
  router.push("/login");
}

// Partner related data
const partnerPackage = ref(null);

// Fetch user profile data
const fetchUserProfile = async () => {
  try {
    const response = await axios.get(`${baseURL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const userData = response.data?.data?.user || {};
    // Update the user object with the fetched data
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

// Provide user data to all components
provide("user", user);

// Watch for changes in user data
watch(
  user,
  (newUser) => {
    console.log("User data updated:", newUser);
  },
  { deep: true }
);

// Product-related data and fetching
const fetchData = async () => {
  try {
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

// Get company ID from JWT token
const getUserCompanyId = (token) => {
  if (!token) return null;
  const decoded = JSON.parse(atob(token.split(".")[1]));
  return decoded.companyId;
};

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Configuration form data
const fieldName = ref("");
const fieldType = ref("");
const optionsInput = ref(""); // Input for options
const options = ref([]); // Array of options

// Fetch configuration data based on ID
onMounted(async () => {
  const configId = route.params.id;

  if (configId) {
    try {
      // Only include the partnerId in the query string if it's available
      const partnerQuery = partnerId ? `?partnerId=${partnerId}` : "";
      const response = await fetch(
        `${baseURL}/configurations/${configId}${partnerQuery}`, // Fetch with partnerId if available
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error fetching configuration.");
      }

      const config = await response.json();
      console.log("Received configuration:", config); // Debug output

      // Populate the form with the fetched configuration data
      const configOptions = Array.isArray(config.data.options)
        ? config.data.options
        : [];
      const configFieldName = config.data.fieldName || "";
      const configFieldType = config.data.fieldType || "";

      fieldName.value = configFieldName;
      fieldType.value = configFieldType;
      optionsInput.value = configOptions.join(", ");
      options.value = configOptions;
    } catch (error) {
      console.error("Error fetching configuration:", error.message);
      alert("Error fetching configuration.");
    }
  }
});

// Update options from input
const updateOptions = () => {
  options.value = optionsInput.value
    .split(",")
    .map((option) => option.trim()) // Remove extra spaces
    .filter((option) => option !== ""); // Remove empty values
};

// Update the configuration via API
const updateConfiguration = async () => {
  const configurationPayload = {
    fieldName: fieldName.value,
    fieldType: fieldType.value,
    options: options.value, // Dropdown options
  };

  // Ensure that partnerId from token is included, only if not null
  if (partnerId) {
    configurationPayload.partnerId = partnerId;
  }

  const configId = route.params.id;
  try {
    const partnerQuery = partnerId ? `?partnerId=${partnerId}` : "";
    const response = await fetch(
      `${baseURL}/configurations/${configId}${partnerQuery}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configurationPayload),
      }
    );

    if (!response.ok) {
      const errorDetail = await response.json();
      throw new Error(`Error updating configuration: ${errorDetail.message}`);
    }

    const result = await response.json();
    console.log("Update Result:", result);

    router.back(); // Navigate back after update
  } catch (error) {
    console.error("Error updating configuration:", error.message);
    alert("Error updating configuration.");
  }
};
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="content">
    <h1>Edit Configuration</h1>
    <form @submit.prevent="updateConfiguration">
      <div class="row">
        <div class="column">
          <label for="fieldName">Field Name:</label>
          <input
            v-model="fieldName"
            id="fieldName"
            type="text"
            :placeholder="fieldName || 'Enter field name'"
            required
          />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="fieldType">Field Type:</label>
          <select v-model="fieldType" id="fieldType" required>
            <option value="">Select field type</option>
            <option value="Text">Text</option>
            <option value="Dropdown">Dropdown</option>
          </select>
        </div>
      </div>

      <div class="row" v-if="fieldType === 'Dropdown'">
        <div class="column">
          <label for="options">Options:</label>
          <input
            v-model="optionsInput"
            id="options"
            type="text"
            placeholder="Enter options separated by commas"
            @input="updateOptions"
          />
          <small>Example: Option 1, Option 2, Option 3</small>
        </div>
      </div>

      <button type="submit" class="btn active">Update Configuration</button>
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
