<script setup>
import { ref, reactive, onMounted, computed, watch, provide } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Router setup
const router = useRouter();

// Reactive user object to store user details (gebruik reactive voor betere reactiviteit)
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

// Authentication and token handling
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
const partnerId = tokenPayload?.partnerId || null;

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
    // Update the user object
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

    if (userData.role !== "platform_admin") {
      router.push("/login");
    }
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

// Provide the user data to all components (including Navigation)
provide("user", user); // Makes user data available to child components like Navigation

// Haal de producten op vanuit de API
const fetchData = async () => {
  try {
    const token = localStorage.getItem("jwtToken"); // Use the correct variable name
    const response = await fetch(`${baseURL}/products`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const userCompanyId = getUserCompanyId(token); // Pass the correct token here

    data.value = result.data.products.filter(
      (product) => product.partnerId === userCompanyId
    );
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

// Initialiseer component en haal data op
onMounted(fetchData);

// Definities van refs en computed properties
const selectedTypeFilter = ref("All");
const data = ref([]);

// Haal companyId uit het JWT token
const getUserCompanyId = (token) => {
  if (!token) return null;
  const decoded = JSON.parse(atob(token.split(".")[1]));
  return decoded.companyId;
};

// Haal gegevens op bij het laden van de component
onMounted(() => {
  fetchData();
});

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const selectedFilter = ref("all");
const partners = ref([]);
const searchTerm = ref("");
const selectedpartners = ref([]);
const isDeleteButtonVisible = computed(() => selectedpartners.value.length > 0);
const isPopupVisible = ref(false);

const fetchpartners = async () => {
  try {
    const token = localStorage.getItem("jwtToken");
    const response = await fetch(`${baseURL}/partners`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result && result.data && result.data.partners) {
      partners.value = result.data.partners;
    } else {
      console.error("No partners found in the response.");
    }
  } catch (error) {
    console.error("Error fetching partners:", error);
  }
};

const toggleSelection = (partnerId) => {
  const index = selectedpartners.value.indexOf(partnerId);
  if (index === -1) {
    selectedpartners.value.push(partnerId);
  } else {
    selectedpartners.value.splice(index, 1);
  }
};

const toggleSelectAll = (event) => {
  selectedpartners.value = event.target.checked
    ? partners.value.map((partner) => partner._id)
    : [];
};

const confirmDelete = async () => {
  await deletepartners();
  hidePopup();
};

const deletepartners = async () => {
  try {
    for (const id of selectedpartners.value) {
      const response = await fetch(`${baseURL}/partners/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    await fetchpartners();
    selectedpartners.value = [];
  } catch (error) {
    console.error("Error deleting partners:", error);
  }
};

const showPopup = () => {
  isPopupVisible.value = true;
};

const hidePopup = () => {
  isPopupVisible.value = false;
};

const filteredpartners = computed(() => {
  if (!partners.value) return [];
  const filteredBySearch = partners.value.filter((partner) => {
    return Object.values(partner).some((value) =>
      String(value).toLowerCase().includes(searchTerm.value.toLowerCase())
    );
  });

  const filteredByType = filteredBySearch.filter(
    (partner) =>
      selectedFilter.value === "all" || partner.package === selectedFilter.value
  );

  return filteredByType;
});

onMounted(() => {
  fetchpartners();
  setInterval(() => {
    fetchpartners();
  }, 5000);
});
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="overlay" v-if="isPopupVisible"></div>
  <div class="content">
    <h2>Partners</h2>
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
        <router-link exact to="/admin/add-new-partner" class="btn active">
          <p>Add new</p>
          <img src="../../assets/icons/add.svg" alt="icon" />
        </router-link>
        <div
          class="btn display"
          :style="{ display: isDeleteButtonVisible ? 'flex' : 'none' }"
          @click="showPopup"
        >
          <p>Delete item(s)</p>
        </div>
      </div>

      <div class="search">
        <img src="../../assets/icons/search.svg" alt="icon" />
        <input placeholder="Search" v-model="searchTerm" />
      </div>

      <select class="filter" v-model="selectedFilter">
        <option value="all">All</option>
        <option value="standard">Standard</option>
        <option value="plus">Plus</option>
        <option value="pro">Pro</option>
      </select>
    </div>

    <div class="search">
      <img src="../../assets/icons/search.svg" alt="icon" />
      <input placeholder="Search" v-model="searchTerm" />
    </div>

    <div class="partners mobile">
      <div class="items">
        <router-link
          v-if="filteredpartners.length"
          v-for="partner in filteredpartners"
          :key="partner._id"
          :to="{ name: 'EditPartner', params: { id: partner._id } }"
        >
          <div
            class="image"
            :style="{
              backgroundImage:
                'url(http://localhost:5173/src/assets/images/Odette_lunettes.webp)',
            }"
          ></div>
          <div class="elements">
            <div class="text">
              <p class="name">{{ partner.name }}</p>
              <p>{{ partner.contact_email }}</p>
              <p>{{ partner.contact_phone }}</p>
              <p>{{ partner.package }}</p>
            </div>
            <div class="btn">
              <p>Active</p>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <div class="partners desktop">
      <div class="top">
        <input
          type="checkbox"
          @change="toggleSelectAll"
          :checked="
            selectedpartners.length === filteredpartners.length &&
            filteredpartners.length > 0
          "
        />
        <p>Partner ID</p>
        <p>Name</p>
        <p>Contact Email</p>
        <p>Contact Phone</p>
        <p>Package</p>
      </div>

      <div class="table-container">
        <ul v-if="filteredpartners.length" class="list">
          <li v-for="partner in filteredpartners" :key="partner._id">
            <input
              type="checkbox"
              @change="toggleSelection(partner._id)"
              :checked="selectedpartners.includes(partner._id)"
            />
            <router-link
              :to="{ name: 'EditPartner', params: { id: partner._id } }"
            >
              <p>{{ partner._id }}</p>
              <p>{{ partner.name }}</p>
              <p>{{ partner.contact_email }}</p>
              <p>{{ partner.contact_phone }}</p>
              <p>{{ partner.package }}</p>
            </router-link>
          </li>
        </ul>

        <div v-else class="no-partners">
          <p>No partners found matching the selected filters.</p>
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

h2 {
  text-align: center;
  width: 100%;
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
  gap: 80px;
  width: 100%;
}

.menu .btns {
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: center;
}

.btn.display {
  display: none;
  border: 1px solid #d34848;
  background-color: rgba(211, 72, 72, 0.2);
  border-radius: 4px;
  padding: 4px 12px;
}

.search,
select {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--gray-900);
  background-color: var(--gray-900);
  color: var(--text-color);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.search {
  width: 100%;
}

.search input {
  color: var(--text-color);
}

.menu .search {
  display: none;
}

.partners.desktop {
  background-color: var(--secondary-color);
  width: 100%;
  border-radius: 4px;
  overflow-x: auto;
}

.partners.mobile {
  width: 100%;
}

.partners.mobile .items {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.partners.mobile a {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 1.5em;
  padding-bottom: 1em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
}

.partners.mobile a .image {
  width: 64px;
  height: 64px;
  background-size: cover;
  background-position: center;
  border-radius: 4px;
  flex-shrink: 0;
}

.partners.mobile a .elements {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  gap: 1em;
}

.partners.mobile a .elements .text {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.partners.mobile a p {
  font-size: 12px;
  opacity: 0.6;
}

.partners.mobile a p.name {
  opacity: 1;
}

.partners.desktop {
  display: none;
}

.partners::-webkit-scrollbar {
  display: none;
}

.partners .top {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 40px;
  padding: 16px;
  background-color: var(--secondary-color);
  align-items: center;
}

.partners .list {
  display: flex;
  flex-direction: column;
}

.partners .list li {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 40px;
  align-items: center;
  padding: 16px;
}

.partners.desktop .list li:nth-child(odd) {
  background-color: var(--gray-900);
}

.partners .list li a {
  display: contents; /* Zorg ervoor dat de a-tag zich gedraagt als inhoud van de grid */
}

.partners .top p,
.partners .list li p {
  color: var(--text-color);
  white-space: nowrap; /* Zorg ervoor dat tekst niet over meerdere regels gaat */
  overflow: hidden; /* Verberg tekst die te lang is */
  text-overflow: ellipsis; /* Voeg een ellipsis toe als de tekst te lang is */
}

.partners .top p:nth-child(1),
.partners .list li p:nth-child(1) {
  width: 200px; /* De Order ID kolom is nu groter */
}

.partners .top p:nth-child(2),
.partners .list li p:nth-child(2) {
  width: 200px;
}

.partners .top p:nth-child(3),
.partners .list li p:nth-child(3) {
  width: 200px;
}

.partners .top p:nth-child(4),
.partners .list li p:nth-child(4) {
  width: 200px;
}

.partners .top p:nth-child(5),
.partners .list li p:nth-child(5) {
  width: 200px;
}

.partners .top p:nth-child(6),
.partners .list li p:nth-child(6) {
  width: 200px;
}

.partners .list li p:hover {
  text-decoration: underline;
}

.no-partners {
  padding: 16px;
  text-align: center;
  color: var(--text-color);
}

@media (min-width: 1200px) {
  h2,
  .search,
  .partners.mobile {
    display: none;
  }

  .menu .search {
    display: flex;
  }

  .partners.desktop {
    display: block;
  }
  .search {
    width: auto;
  }

  .menu .search,
  select {
    min-width: 320px;
  }
}
</style>
