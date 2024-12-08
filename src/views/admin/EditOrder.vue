<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Navigation from "../../components/navComponent.vue";

// Base URL afhankelijk van productie/ontwikkelomgeving
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Router en route
const router = useRouter();
const route = useRoute();

// JWT-token ophalen en controleren
const jwtToken = localStorage.getItem("jwtToken");
if (!jwtToken) {
  router.push("/login");
}

// Data-instellingen
const orderData = ref(null);
const productCode = ref(route.params.id || "");

// Formulierdata
const formData = ref({
  customer: {
    firstName: "",
    lastName: "",
    email: "",
    message: "",
    address: {
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
    },
  },
  productId: "",
  lacesColor: "",
  soleBottomColor: "",
  soleTopColor: "",
  insideColor: "",
  outside1Color: "",
  outside2Color: "",
  outside3Color: "",
  lacesTexture: "",
  soleBottomTexture: "",
  soleTopTexture: "",
  insideTexture: "",
  outside1Texture: "",
  outside2Texture: "",
  outside3Texture: "",
  orderStatus: "",
});

// Ordergegevens ophalen
const fetchOrderData = async () => {
  try {
    const response = await fetch(`${baseURL}/orders/${productCode.value}`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    orderData.value = data.data.order;

    // Formulier vooraf vullen met opgehaalde gegevens
    Object.assign(formData.value, orderData.value);
  } catch (error) {
    console.error("Fout bij het ophalen van ordergegevens:", error);
  }
};

// Order bijwerken
const updateOrder = async () => {
  try {
    const response = await fetch(`${baseURL}/orders/${productCode.value}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(formData.value),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    router.push("/admin/orders");
  } catch (error) {
    console.error("Fout bij het bijwerken van de order:", error);
  }
};

onMounted(fetchOrderData);
</script>

<template>
  <Navigation />
  <div class="content">
    <h1>Order Bewerken</h1>
    <form v-if="orderData" @submit.prevent="updateOrder">
      <h2>Klantinformatie</h2>
      <div class="row">
        <div class="column">
          <label for="firstName">Voornaam:</label>
          <input
            type="text"
            id="firstName"
            v-model="formData.customer.firstName"
            required
          />

          <label for="lastName">Achternaam:</label>
          <input
            type="text"
            id="lastName"
            v-model="formData.customer.lastName"
            required
          />

          <label for="email">E-mail:</label>
          <input
            type="email"
            id="email"
            v-model="formData.customer.email"
            required
          />

          <label for="message">Bericht:</label>
          <textarea id="message" v-model="formData.customer.message"></textarea>
        </div>
        <div class="column">
          <h3>Adres</h3>
          <label for="street">Straat:</label>
          <input
            type="text"
            id="street"
            v-model="formData.customer.address.street"
            required
          />

          <label for="houseNumber">Huisnummer:</label>
          <input
            type="text"
            id="houseNumber"
            v-model="formData.customer.address.houseNumber"
            required
          />

          <label for="postalCode">Postcode:</label>
          <input
            type="text"
            id="postalCode"
            v-model="formData.customer.address.postalCode"
            required
          />

          <label for="city">Stad:</label>
          <input
            type="text"
            id="city"
            v-model="formData.customer.address.city"
            required
          />
        </div>
      </div>

      <h2>Productinformatie</h2>
      <div class="row">
        <div class="column">
          <label for="productId">Product ID:</label>
          <input
            type="text"
            id="productId"
            v-model="formData.productId"
            required
          />

          <label for="lacesColor">Veterskleur:</label>
          <input
            type="text"
            id="lacesColor"
            v-model="formData.lacesColor"
            required
          />

          <label for="lacesTexture">Veters Texture:</label>
          <input
            type="text"
            id="lacesTexture"
            v-model="formData.lacesTexture"
          />

          <label for="soleBottomColor">Zoolkleur (onderkant):</label>
          <input
            type="text"
            id="soleBottomColor"
            v-model="formData.soleBottomColor"
            required
          />

          <label for="soleBottomTexture">Zool Texture (onderkant):</label>
          <input
            type="text"
            id="soleBottomTexture"
            v-model="formData.soleBottomTexture"
          />

          <label for="soleTopColor">Zoolkleur (bovenkant):</label>
          <input
            type="text"
            id="soleTopColor"
            v-model="formData.soleTopColor"
            required
          />

          <label for="soleTopTexture">Zool Texture (bovenkant):</label>
          <input
            type="text"
            id="soleTopTexture"
            v-model="formData.soleTopTexture"
          />
        </div>

        <div class="column">
          <label for="insideColor">Binnenkleur:</label>
          <input
            type="text"
            id="insideColor"
            v-model="formData.insideColor"
            required
          />

          <label for="insideTexture">Binnen Texture:</label>
          <input
            type="text"
            id="insideTexture"
            v-model="formData.insideTexture"
          />

          <label for="outside1Color">Buitenkleur 1:</label>
          <input
            type="text"
            id="outside1Color"
            v-model="formData.outside1Color"
            required
          />

          <label for="outside1Texture">Buiten Texture 1:</label>
          <input
            type="text"
            id="outside1Texture"
            v-model="formData.outside1Texture"
          />

          <label for="outside2Color">Buitenkleur 2:</label>
          <input
            type="text"
            id="outside2Color"
            v-model="formData.outside2Color"
            required
          />

          <label for="outside2Texture">Buiten Texture 2:</label>
          <input
            type="text"
            id="outside2Texture"
            v-model="formData.outside2Texture"
          />

          <label for="outside3Color">Buitenkleur 3:</label>
          <input
            type="text"
            id="outside3Color"
            v-model="formData.outside3Color"
            required
          />

          <label for="outside3Texture">Buiten Texture 3:</label>
          <input
            type="text"
            id="outside3Texture"
            v-model="formData.outside3Texture"
          />

          <label for="orderStatus">Status:</label>
          <select id="orderStatus" v-model="formData.orderStatus" required>
            <option value="pending">Pending</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <button type="submit" class="btn active">Bewerk Order</button>
    </form>
  </div>
</template>

<style scoped>
/* Basisstijl */
.content {
  width: 100%;
  height: 100vh;
}

form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

.row {
  display: flex;
  flex-direction: row;
  gap: 32px;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

input,
textarea,
select {
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #f9f9f9;
  color: #333;
  width: 100%;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}
</style>
