<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Router setup
const router = useRouter();
const route = useRoute();

// Auth & API setup
const token = localStorage.getItem("jwtToken");
const baseURL =
  window.location.hostname !== "localhost"
    ? "https://rebilt-backend.onrender.com/api/v1"
    : "http://localhost:3000/api/v1";

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

// Reactive data for configuration form
const fieldName = ref("");
const fieldType = ref("");
const optionsInput = ref("");
const colorInput = ref(""); // For color type
const colorOptions = reactive([]); // Store color options with names and color codes
const options = reactive([]); // Dropdown options (names)
const isLoading = ref(false);

// Helper function to fetch option names by ID
const fetchOptionNameById = async (optionId) => {
  try {
    const response = await axios.get(`${baseURL}/options/${optionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data?.data?.name || `Unknown (${optionId})`;
  } catch (error) {
    console.error(`Error fetching option ${optionId}:`, error.message);
    return `Unknown (${optionId})`;
  }
};

// Update options based on input (for dropdown)
const updateOptions = () => {
  options.splice(
    0,
    options.length,
    ...optionsInput.value
      .split(",")
      .map((opt) => opt.trim())
      .filter((opt) => opt !== "")
  );
};

// Add color to the list of color options
// Add color to the list of color options
const addColorToList = async () => {
  if (colorInput.value) {
    try {
      // Make an API request to create a new color option
      const response = await axios.post(
        `${baseURL}/options`,
        {
          name: colorInput.value, // Store color code as the name
          type: "Color", // Specify this is a Color option
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const colorOption = response.data.data;
      colorOptions.push({
        name: colorInput.value, // Use the color code as the name (this is what we want)
        colorCode: colorOption._id, // Store the _id of the created option
      });
      colorInput.value = ""; // Clear the color input after adding
    } catch (error) {
      console.error("Error adding color:", error.message);
      alert("Failed to add color. Please try again.");
    }
  } else {
    alert("Please select a color.");
  }
};

// Update the configuration
const updateConfiguration = async () => {
  if (!fieldName.value.trim()) {
    alert("Field name cannot be empty.");
    return;
  }

  // Check if dropdown options or color input is valid
  if (fieldType.value === "Dropdown" && options.length === 0) {
    alert("Please provide at least one option for the dropdown.");
    return;
  }

  if (fieldType.value === "Color" && colorOptions.length === 0) {
    alert("Please select at least one color.");
    return;
  }

  const configId = route.params.id;
  const configurationPayload = {
    fieldName: fieldName.value,
    fieldType: fieldType.value,
    // For color, pass all the selected colors
    options:
      fieldType.value === "Color"
        ? colorOptions.map((c) => c.name) // Use the color name (or colorCode if preferred) instead of the _id
        : options,
    ...(fieldType.value === "Color" && { isColor: true }),
  };

  if (partnerId) {
    configurationPayload.partnerId = partnerId;
  }

  try {
    isLoading.value = true;
    const response = await axios.put(
      `${baseURL}/configurations/${configId}`,
      configurationPayload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("Configuration updated:", response.data);
    router.back();
  } catch (error) {
    console.error("Error updating configuration:", error.message);
    alert("Failed to update configuration. Please try again.");
  } finally {
    isLoading.value = false;
  }
};

// Update the configuration
// Fetch configuration data
const fetchConfiguration = async () => {
  const configId = route.params.id;
  if (!configId) {
    alert("Configuration ID is missing.");
    router.push("/configurations");
    return;
  }

  try {
    const response = await axios.get(`${baseURL}/configurations/${configId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const config = response.data?.data || {};
    fieldName.value = config.fieldName || "";
    fieldType.value = config.fieldType || "";

    // Handle dropdown and color field types
    if (config.fieldType === "Dropdown" && Array.isArray(config.options)) {
      const optionNames = await Promise.all(
        config.options.map((optionId) => fetchOptionNameById(optionId))
      );
      options.splice(0, options.length, ...optionNames);
      optionsInput.value = optionNames.join(", ");
    } else if (config.fieldType === "Color") {
      // Fetch names for color options (colors are stored as IDs)
      const colorDetails = await Promise.all(
        config.options.map(async (colorId) => {
          const name = await fetchOptionNameById(colorId);
          return { name, colorCode: colorId }; // Store color name and code
        })
      );
      colorOptions.splice(0, colorOptions.length, ...colorDetails); // Store color details
      colorInput.value = colorDetails[0]?.colorCode || ""; // Set the first color option as default
    }
  } catch (error) {
    console.error("Error fetching configuration:", error.message);
    alert("Failed to load configuration. Please try again.");
  }
};

// Fetch configuration on mount
onMounted(() => {
  fetchConfiguration();
});
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
            placeholder="Enter field name"
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
            <option value="Color">Color</option>
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

      <div class="row" v-if="fieldType === 'Color'">
        <div class="column">
          <label for="color">Color:</label>
          <input v-model="colorInput" id="color" type="color" required />
          <button type="button" @click="addColorToList">Add Color</button>
        </div>

        <div class="column">
          <label>Current Colors:</label>
          <ul class="color-list">
            <li
              v-for="(color, index) in colorOptions"
              :key="index"
              class="color-item"
              :style="{ backgroundColor: color.colorCode }"
            >
              {{ color.name }}
              <!-- We use the color name here -->
            </li>
          </ul>
        </div>
      </div>

      <div class="row">
        <button type="submit" :disabled="isLoading">
          <span v-if="isLoading">Saving...</span>
          <span v-else>Save Configuration</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
/* CSS */
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
  border: 1px solid var(--gray-700);
  background-color: var(--gray-700);
  color: white;
}

button {
  color: white;
  cursor: pointer;
}

.color-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: row;
  gap: 8px;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--gray-900);
}
</style>
