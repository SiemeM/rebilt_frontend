<script setup>
import { ref, onMounted, computed, watch } from "vue";
import router from "../router";
import DynamicStyle from "../components/DynamicStyle.vue";

const products = ref([]); // All products
const loading = ref(false); // Loading state
const error = ref(null); // Error state
const filters = ref(["All"]); // Dynamic filters with "All" as default
const activeFilter = ref("All"); // Active filter state
const partnerName = ref(""); // Store the partner name from query params

// Determine base URL based on environment
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const fetchPartnerID = async (partnerName) => {
  try {
    // Pas de partnerName aan door hoofdletters om te zetten naar spaties
    const formattedPartnerName = partnerName.value
      .replace(/([A-Z])/g, " $1")
      .trim();

    const partnerQuery = formattedPartnerName
      ? `?partnerName=${formattedPartnerName}`
      : "";

    const response = await fetch(`${baseURL}/partners/${partnerQuery}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    // Zoek de partner in de array die overeenkomt met de geformatteerde partnerName
    const partner = result.data.partners.find(
      (p) => p.name.toLowerCase() === formattedPartnerName.toLowerCase()
    );

    console.log(partner._id);
    if (partner) {
      return partner._id; // Geef de partner ID terug
    } else {
      throw new Error("Partner niet gevonden");
    }
  } catch (err) {
    console.error("Fout bij het ophalen van de partner ID:", err.message);
    error.value = "Er is een fout opgetreden bij het ophalen van de partner.";
  }
};

// Fetch products from API
const fetchProducts = async () => {
  try {
    loading.value = true;

    // Construct the URL with the partner filter if it's set
    const partnerQuery = partnerName.value
      ? `?partnerName=${partnerName.value}`
      : "";
    const response = await fetch(`${baseURL}/products/${partnerQuery}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    // Ensure that images are initialized as an array for each product
    products.value = result.data.products.map((product) => ({
      ...product,
      images: product.images || [], // Set empty array if images is undefined
    }));

    error.value = null; // Reset error
  } catch (err) {
    console.error("Error fetching products:", err.message);
    error.value = "Er is een fout opgetreden bij het ophalen van de producten.";
  } finally {
    loading.value = false; // Stop loading indicator
  }
};

const fetchFilters = async () => {
  try {
    loading.value = true;

    // Construct the URL with the partner filter
    const partnerQuery = partnerName.value
      ? `?partnerName=${partnerName.value}`
      : "";
    const response = await fetch(`${baseURL}/products/${partnerQuery}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    // Extract unique product types for the current partner's products
    const types = Array.from(
      new Set(
        result.data.products
          .map((product) => product.productType || "Unknown")
          .filter((type) => typeof type === "string" && type.trim() !== "")
      )
    );

    filters.value = [
      "All",
      ...types.map((type) => type.charAt(0).toUpperCase() + type.slice(1)),
    ];

    error.value = null; // Reset error
  } catch (err) {
    console.error("Error fetching filters:", err.message);
    error.value = "Er is een fout opgetreden bij het ophalen van de filters.";
  } finally {
    loading.value = false; // Stop loading indicator
  }
};

// Filter products based on the active filter
const filteredProducts = computed(() => {
  return activeFilter.value === "All"
    ? products.value // Return all products if "All" is selected
    : products.value.filter(
        (product) => product.productType === activeFilter.value.toLowerCase()
      );
});

const setActiveFilter = (filter) => {
  activeFilter.value = filter;
};

onMounted(async () => {
  await fetchFilters();
});

// Watch for changes in the query parameter and fetch products accordingly
watch(
  () => window.location.search,
  () => {
    const urlParams = new URLSearchParams(window.location.search);
    const rawPartnerName = urlParams.get("partner"); // Get the partner query param
    partnerName.value = rawPartnerName
      ? rawPartnerName.replace(/\s+/g, "")
      : ""; // Remove spaces
    fetchProducts(); // Fetch products based on the new partner
    fetchPartnerID(partnerName);
  },
  { immediate: true }
);

onMounted(() => {
  // Check the URL on mount in case there is a partner query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const rawPartnerName = urlParams.get("partner") || "";
  partnerName.value = rawPartnerName.replace(/\s+/g, ""); // Remove spaces
  fetchProducts(); // Fetch products when component is mounted
  fetchPartnerID(partnerName);
});
</script>

<template>
  <DynamicStyle />
  <div class="content">
    <div class="top">
      <h1>Collections</h1>
      <nav class="collection-nav">
        <p
          v-for="filter in filters"
          :key="filter"
          :class="{ active: activeFilter === filter }"
          @click="setActiveFilter(filter)"
        >
          {{ filter }}
        </p>
      </nav>
    </div>

    <!-- Loading and error handling -->
    <div v-if="loading">Laden...</div>
    <div v-if="error">{{ error }}</div>

    <!-- Display products -->
    <div v-if="!loading && !error" class="products">
      <div class="row">
        <h2>{{ activeFilter }}</h2>
        <p>
          <span>{{ filteredProducts.length }}</span> items
        </p>
      </div>
      <div class="product-grid">
        <!-- Render products -->
        <router-link
          v-for="product in filteredProducts"
          :key="product._id"
          :to="`/product/${product._id}`"
          :class="['product-card', product.productType]"
        >
          <div class="product-image-container">
            <!-- Show product image if available -->
            <div
              v-if="product.images.length > 0"
              class="product-image"
              :style="{
                backgroundImage: 'url(' + product.images[0]?.url + ')',
              }"
            ></div>
          </div>
          <div class="product-info">
            <p class="product-name">{{ product.productName }}</p>
            <p class="product-price">€ {{ product.productPrice }},00</p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content {
  align-items: center;
}

.content .top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.collection-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.collection-nav p {
  cursor: pointer;
  transition: color 0.3s;
}

.collection-nav .active {
  color: var(--text-color);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--text-color);
}

.products {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  width: 100%;
}

.products .row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.products .product-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  justify-content: center;
  gap: 24px;
  width: 100%;
}

.product-card {
  background: var(--secondary-color);
  border-radius: 10px;
  box-shadow: 0px 8px 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  text-align: center;
  position: relative;
  transition: transform 0.3s, box-shadow 0.3s;
  width: 100%;
}

.product-card:hover {
  transform: scale(1.05);
  box-shadow: 0px 12px 25px rgba(0, 0, 0, 0.8);
}

.product-image-container {
  position: relative;
  width: 100%;
  height: 200px;
  background: var(--secondary-color);
  padding: 20px;
}

.product-image {
  width: 100%;
  height: 100%;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  border-bottom: 1px solid var(--secondary-color);
}

.product-info {
  padding: 16px 24px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  color: var(--primary-color);
}

@media (min-width: 800px) {
  .products .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .collection-nav {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 3rem;
  }
}

@media (min-width: 1200px) {
  .content {
    padding: 108px 1.5rem 1.5rem 1.5rem;
  }
  .products {
    padding: 0 200px;
  }
  .products .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 2000px) {
  .products {
    padding: 0 600px;
  }
}
</style>
