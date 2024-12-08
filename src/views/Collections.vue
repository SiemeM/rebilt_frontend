<script setup>
import { ref, onMounted, computed } from "vue";
import router from "../router";

const products = ref([]); // All products
const loading = ref(false); // Loading state
const error = ref(null); // Error state
const activeFilter = ref("All"); // Active filter state

// Determine base URL based on environment
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Fetch products from API
const fetchProducts = async () => {
  try {
    loading.value = true;

    const response = await fetch(`${baseURL}/products/`, {
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

// Filter products based on the active filter
const filteredProducts = computed(() => {
  return activeFilter.value === "All"
    ? products.value // Return all products if "All" is selected
    : products.value.filter(
        (product) => product.typeOfProduct === activeFilter.value.toLowerCase()
      );
});

// Set active filter when a filter is clicked
const setActiveFilter = (filter) => {
  activeFilter.value = filter;
};

onMounted(() => {
  fetchProducts(); // Fetch products on component mount
});
</script>

<template>
  <div class="collection-page">
    <div class="top">
      <h1>Collections</h1>
      <nav class="collection-nav">
        <p
          :class="{ active: activeFilter === 'All' }"
          @click="setActiveFilter('All')"
        >
          All
        </p>
        <p
          :class="{ active: activeFilter === 'Optical' }"
          @click="setActiveFilter('Optical')"
        >
          Optical
        </p>
        <p
          :class="{ active: activeFilter === 'Sun' }"
          @click="setActiveFilter('Sun')"
        >
          Sun
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
          :class="['product-card', product.typeOfProduct]"
        >
          <div class="product-image-container">
            <!-- Show product image if available -->
            <div
              v-if="product.images.length > 0"
              class="product-image"
              :style="{ backgroundImage: 'url(' + product.images[0] + ')' }"
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
.collection-page {
  padding: 80px 24px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
  width: 100%;
}

.collection-page .top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.collection-nav {
  display: flex;
  gap: 80px;
}

.collection-nav p {
  cursor: pointer;
  transition: color 0.3s;
}

.collection-nav .active {
  color: var(--white);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--white);
}

.products {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  width: 100%;
  padding: 0 200px;
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
  background: #222;
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
  background: #333;
  padding: 20px;
}

.product-image {
  width: 100%;
  height: 100%;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  border-bottom: 1px solid #444;
}

.product-info {
  padding: 16px 24px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  color: #aa91de;
}

@media (min-width: 800px) {
  .products .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1200px) {
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
