<script setup>
import { ref, reactive, computed, onMounted, provide } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";

// Router setup
const router = useRouter();

// JWT Handling Utility
const getToken = () => localStorage.getItem("jwtToken");

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

// Check for token validity
const token = getToken();
const tokenPayload = parseJwt(token);
const userId = tokenPayload?.userId;
const partnerId = tokenPayload?.partnerId || null;

// If no valid userId, redirect to login
if (!userId) {
  router.push("/login");
}

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Reactive state
const user = reactive({
  firstName: "",
  lastName: "",
  email: "",
  oldEmail: "",
  password: "",
  country: "",
  city: "",
  postalCode: "",
  profilePicture: "",
  bio: "",
  role: "",
  activeUnactive: true,
});

const partnerPackage = ref(null);
const orders = ref([]);
const selectedOrders = ref([]);
const searchTerm = ref("");
const selectedFilter = ref("All");

// API Call Utility Function
const fetchDataFromApi = async (url, method = "GET", data = {}) => {
  const token = getToken();
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    method,
    data,
  };

  try {
    const response = await axios(url, config);
    return response.data?.data || {};
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
};

// Fetch User Profile
const fetchUserProfile = async () => {
  const userData = await fetchDataFromApi(`${baseURL}/users/${userId}`);
  if (userData?.user) {
    Object.assign(user, userData.user); // Directly update the user object
  }
};

// Fetch Partner Data
const fetchPartnerData = async () => {
  if (partnerId) {
    const partnerData = await fetchDataFromApi(
      `${baseURL}/partners/${partnerId}`
    );
    partnerPackage.value =
      partnerData?.partner?.package || "No package available";
  }
};

let productCode = "";
// Fetch Orders Data
const fetchOrders = async () => {
  const ordersData = await fetchDataFromApi(`${baseURL}/orders`);
  orders.value = ordersData?.orders || [];

  // Iterate over each order to access productCode
  orders.value.forEach((order) => {
    if (order.productId && order.productId.productCode) {
      console.log("Product Code:", order.productId.productCode);
      // You can assign the productCode to a variable if you need to use it later
      const productCode = order.productId.productCode;
    } else {
      console.log("Product Code is missing for order:", order._id);
    }
  });

  console.log(ordersData); // Log the entire response for debugging
};

// Initial Fetch on Mount
onMounted(async () => {
  await fetchUserProfile();
  await fetchPartnerData();
  await fetchOrders();
  setInterval(fetchOrders, 5000); // Poll orders every 5 seconds
});

// Computed values for filtering
const filteredOrders = computed(() => {
  return orders.value.filter((order) => {
    const matchesSearchTerm = Object.values(order).some((value) =>
      String(value).toLowerCase().includes(searchTerm.value.toLowerCase())
    );
    const matchesFilter =
      selectedFilter.value === "All" ||
      order.orderStatus === selectedFilter.value;
    return matchesSearchTerm && matchesFilter;
  });
});

// Handle Order Selection
const toggleSelection = (orderId) => {
  const index = selectedOrders.value.indexOf(orderId);
  if (index === -1) {
    selectedOrders.value.push(orderId);
  } else {
    selectedOrders.value.splice(index, 1);
  }
};

const toggleSelectAll = (event) => {
  selectedOrders.value = event.target.checked
    ? orders.value.map((order) => order._id)
    : [];
};

// Handle Deleting Orders
const isDeleteButtonVisible = computed(() => selectedOrders.value.length > 0);
const deleteSelectedOrders = () => {
  if (selectedOrders.value.length === 0) return;
  showPopup();
};

const confirmDelete = async () => {
  await deleteOrders();
  hidePopup();
};

const deleteOrders = async () => {
  try {
    for (const id of selectedOrders.value) {
      // Optimistically remove deleted orders from the list to update the UI instantly
      orders.value = orders.value.filter((order) => order._id !== id);
      await fetch(`${baseURL}/orders/${id}`, { method: "DELETE" });
    }
    selectedOrders.value = [];
  } catch (error) {
    console.error("Error deleting orders:", error);
  }
};

// Popup visibility management
const isPopupVisible = ref(false);
const showPopup = () => {
  isPopupVisible.value = true;
};
const hidePopup = () => {
  isPopupVisible.value = false;
};

// Provide user data to Navigation component
provide("user", user);
</script>

<template>
  <Navigation />
  <div class="overlay" v-if="isPopupVisible"></div>
  <div class="content">
    <div class="popup" v-if="isPopupVisible">
      <img src="../../assets/icons/cross-circle.svg" alt="icon" />
      <div class="text">
        <h2>Are you sure?</h2>
        <p>Do you really want to delete this item(s)?</p>
        <div class="btns">
          <button @click="hidePopup">Cancel</button>
          <button @click="confirmDelete" class="btn active">Delete</button>
        </div>
      </div>
    </div>
    <div class="menu">
      <div class="btns">
        <p>Aantal orders: {{ orders.length }}</p>
        <div
          @click="deleteSelectedOrders"
          class="btn display"
          :style="{ visibility: isDeleteButtonVisible ? 'visible' : 'hidden' }"
        >
          <p>Delete item(s)</p>
        </div>
      </div>

      <div class="search">
        <img src="../../assets/icons/search.svg" alt="icon" />
        <input placeholder="Search" v-model="searchTerm" />
      </div>

      <select class="filter" v-model="selectedFilter">
        <option value="All">All</option>
        <option value="pending">Pending</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <div class="orders">
      <div class="top">
        <input
          type="checkbox"
          @change="toggleSelectAll"
          :checked="
            selectedOrders.length === filteredOrders.length &&
            filteredOrders.length > 0
          "
        />
        <p>Order ID</p>
        <p>ProductCode</p>
        <p>LacesColor</p>
        <p>LacesTexture</p>
        <p>SoleBottomColor</p>
        <p>SoleBottomTexture</p>
        <p>SoleTopColor</p>
        <p>SoleTopTexture</p>
        <p>InsideColor</p>
        <p>InsideTexture</p>
        <p>Outside1Color</p>
        <p>Outside1Texture</p>
        <p>Outside2Color</p>
        <p>Outside2Texture</p>
        <p>Outside3Color</p>
        <p>Outside3Texture</p>
        <p>Status</p>
      </div>

      <div class="table-container">
        <ul v-if="filteredOrders.length" class="list">
          <li v-for="order in filteredOrders" :key="order._id">
            <input
              type="checkbox"
              @change="toggleSelection(order._id)"
              :checked="selectedOrders.includes(order._id)"
            />
            <router-link :to="{ name: 'EditOrder', params: { id: order._id } }">
              <p>{{ order._id }}</p>

              <!-- Access productCode from order.productId -->
              <p>{{ order.productId?.productCode || "No product code" }}</p>

              <p>{{ order.lacesColor }}</p>
              <p>{{ order.lacesTexture }}</p>
              <p>{{ order.soleBottomColor }}</p>
              <p>{{ order.soleBottomTexture }}</p>
              <p>{{ order.soleTopColor }}</p>
              <p>{{ order.soleTopTexture }}</p>
              <p>{{ order.insideColor }}</p>
              <p>{{ order.insideTexture }}</p>
              <p>{{ order.outside1Color }}</p>
              <p>{{ order.outside1Texture }}</p>
              <p>{{ order.outside2Color }}</p>
              <p>{{ order.outside2Texture }}</p>
              <p>{{ order.outside3Color }}</p>
              <p>{{ order.outside3Texture }}</p>
              <p>{{ order.orderStatus }}</p>
            </router-link>
          </li>
        </ul>
        <div v-if="filteredOrders.length === 0" class="no-orders">
          No orders found
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
  background-color: #1a1a1a;
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
  color: rgba(255, 255, 255, 0.6);
  border: none;
  background: transparent;
  cursor: pointer;
}

.popup .text .btns .active {
  background-color: #d34848;
  color: var(--white);
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

.search,
select {
  padding: 4px 12px;
  border-radius: 8px;
  border: none;
  border: 1px solid #1d1d1d;
  background-color: #1d1d1d;
  color: var(--white);
  width: 320px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.search input {
  color: var(--white);
}

.orders {
  background-color: #1a1a1a;
  width: 100%;
  border-radius: 8px;
  overflow-x: auto;
}

.orders::-webkit-scrollbar {
  display: none;
}

.orders .top {
  display: grid;
  grid-template-columns: repeat(18, 1fr);
  gap: 40px;
  padding: 4px 16px;
  background-color: #1d1d1d;
  align-items: center; /* --- */
}

.orders .list {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  max-height: 300px;
}

.orders .list li {
  display: grid;
  grid-template-columns: repeat(18, 1fr);
  gap: 40px;
  align-items: center;
}

.orders .list li a {
  display: contents; /* Zorg ervoor dat de a-tag zich gedraagt als inhoud van de grid */
}

.orders .top p,
.orders .list li p {
  color: var(--white);
  white-space: nowrap; /* Zorg ervoor dat tekst niet over meerdere regels gaat */
  overflow: hidden; /* Verberg tekst die te lang is */
  text-overflow: ellipsis; /* Voeg een ellipsis toe als de tekst te lang is */
}

.orders .top p:nth-child(1),
.orders .list li p:nth-child(1) {
  width: 150px; /* De Order ID kolom is nu groter */
}

.orders .top p:nth-child(2),
.orders .list li p:nth-child(2) {
  width: 150px;
}

.orders .top p:nth-child(3),
.orders .list li p:nth-child(3) {
  width: 180px;
}

.orders .top p:nth-child(4),
.orders .list li p:nth-child(4) {
  width: 150px;
}

.orders .top p:nth-child(5),
.orders .list li p:nth-child(5) {
  width: 150px;
}

.orders .top p:nth-child(6),
.orders .list li p:nth-child(6) {
  width: 150px;
}

.orders .top p:nth-child(7),
.orders .list li p:nth-child(7) {
  width: 150px;
}

.orders .top p:nth-child(8),
.orders .list li p:nth-child(8) {
  width: 150px;
}

.orders .top p:nth-child(9),
.orders .list li p:nth-child(9) {
  width: 150px;
}

.orders .top p:nth-child(10),
.orders .list li p:nth-child(10) {
  width: 150px;
}

.orders .top p:nth-child(11),
.orders .list li p:nth-child(11) {
  width: 150px;
}

.orders .top p:nth-child(12),
.orders .list li p:nth-child(12) {
  width: 150px;
}

.orders .top p:nth-child(13),
.orders .list li p:nth-child(13) {
  width: 150px;
}

.orders .top p:nth-child(14),
.orders .list li p:nth-child(14) {
  width: 150px;
}

.orders .top p:nth-child(15),
.orders .list li p:nth-child(15) {
  width: 150px;
}

.orders .top p:nth-child(16),
.orders .list li p:nth-child(16) {
  width: 150px;
}

.orders .top p:nth-child(17),
.orders .list li p:nth-child(17) {
  width: 150px;
}

.orders .top p:nth-child(18),
.orders .list li p:nth-child(18) {
  width: 150px;
}

.orders .list li p:hover {
  text-decoration: underline;
}

.no-orders {
  padding: 16px;
  text-align: center;
  color: var(--white);
}
</style>
