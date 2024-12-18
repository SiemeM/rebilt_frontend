<script setup>
import { ref, reactive, onMounted, computed, provide } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Router setup
const router = useRouter();

// JWT and token setup
const token = localStorage.getItem("jwtToken");
if (!token) {
  router.push("/login");
}

// Base URL for API calls
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Reactive variables for configurations and options
const configurations = ref([]);
const selectedConfigurations = ref([]);
const allOptions = ref([]); // To hold all options (ID -> name mapping)
const searchTerm = ref("");

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

// Fetch data on component mount
onMounted(() => {
  fetchConfigurations();
});
</script>

<template>
  <DynamicStyle />
  <Navigation />

  <div class="content">
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
            selectedConfigurations.length ===
            (configurations.value?.length || 0)
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
