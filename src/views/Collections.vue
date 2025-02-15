<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { fetchProducts, fetchProductTypes } from "../services/productService";
import { fetchPartnerByName, fetchPartnerById } from "../services/authService";
import DynamicStyle from "../components/DynamicStyle.vue";

const route = useRoute();
// Haal partnernaam op uit de URL en zet eventuele verbindingstekens (zoals streepjes of underscores) om naar spaties

const partnerId = ref(null); // Partner ID van de opgegeven naam
const products = ref([]); // Alle producten
const loading = ref(false); // Laadstatus
const error = ref(null); // Foutstatus
const filters = ref(["All"]); // Dynamische filters, standaard met "All"
const activeFilter = ref("All"); // Actieve filterstatus

// Functie om producten op te halen
const fetchAndSetProducts = async (partnerId) => {
  try {
    const filteredProducts = await fetchProducts(partnerId);
    console.log("Fetched products:", filteredProducts);
    products.value = filteredProducts; // Sla producten op in de state
  } catch (err) {
    console.error("Error fetching products:", err);
    throw new Error("Er is een fout opgetreden bij het ophalen van producten.");
  }
};

// Functie om producttypes op te halen
const fetchAndSetProductTypes = async (partnerId) => {
  try {
    const productTypes = await fetchProductTypes(partnerId);
    console.log("Fetched product types:", productTypes);
    filters.value = ["All", ...productTypes]; // Voeg filters toe
  } catch (err) {
    console.error("Error fetching product types:", err);
    throw new Error(
      "Er is een fout opgetreden bij het ophalen van producttypes."
    );
  }
};

// onMounted: Controleer partnernaam en laad gegevens
onMounted(async () => {
  try {
    loading.value = true;

    // Stel de partnernaam in als queryparameter, bijv. 'OdetteLunettes'
    const partnerName = route.query.partner
      ? route.query.partner.replace(/([A-Z])/g, " $1").trim()
      : null;

    console.log(partnerName);
    // Zoek de partner op naam
    const partner = await fetchPartnerByName(partnerName);
    console.log(partner);
    if (partner) {
      const partnerId = partner._id; // Haal het ID uit de gevonden partner
      console.log(partnerId);
      // Nu kun je de partner ophalen op basis van het ID
      const detailedPartner = await fetchPartnerById(partnerId);
      await fetchAndSetProducts(partnerId); // Haal producten op
      await fetchAndSetProductTypes(partnerId); // Haal filters op

      if (detailedPartner) {
        console.log("Gedetailleerde partnerinformatie:", detailedPartner);
      } else {
        console.error(
          "Geen gedetailleerde informatie gevonden voor deze partner."
        );
      }
    } else {
      console.error("Partner niet gevonden.");
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});

// Filter producten op basis van actieve filter
const filteredProducts = computed(() => {
  if (!activeFilter.value || activeFilter.value === "All") {
    return products.value; // Geef alle producten terug als er geen filter is
  }
  return products.value.filter(
    (product) =>
      product.productType?.toLowerCase() === activeFilter.value.toLowerCase()
  );
});

const setActiveFilter = (filter) => {
  activeFilter.value = filter;
};
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

    <!-- Laden en foutafhandeling -->
    <div v-if="loading">Laden...</div>
    <div v-if="error">{{ error }}</div>

    <!-- Producten tonen -->
    <div v-if="!loading && !error" class="products">
      <div class="row">
        <h2>{{ activeFilter }}</h2>
        <p>
          <span>{{ filteredProducts ? filteredProducts.length : 0 }}</span>
          items
        </p>
      </div>
      <div class="product-grid">
        <router-link
          v-for="product in filteredProducts"
          :key="product._id"
          :to="`/product/${product._id}`"
          :class="['product-card', product.productType]"
        >
          <div class="product-image-container">
            <div
              v-if="
                product.configurations?.length > 0 &&
                product.configurations[0].selectedOptions?.length > 0
              "
              class="product-image"
              :style="{
                backgroundImage:
                  'url(' +
                  product.configurations[0].selectedOptions[0].images[0] +
                  ')',
              }"
            ></div>
            <div v-else class="no-image-message">
              Geen afbeelding beschikbaar
            </div>
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
