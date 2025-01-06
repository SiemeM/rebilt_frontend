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

const decodeToken = (token) => {
  if (!token) return null;
  const base64Payload = token.split(".")[1];
  const decodedPayload = JSON.parse(atob(base64Payload));
  return decodedPayload; // Dit bevat de payload, inclusief de partner-id
};

// JWT-token controle
const jwtToken = localStorage.getItem("jwtToken");
if (!jwtToken) {
  router.push("/login");
}

const decoded = decodeToken(token);
const decodedToken = decodeToken(jwtToken);
const userPartnerId = decodedToken?.companyId;

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

// Base URL for API calls
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

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

    if (
      userData.role !== "partner_admin" &&
      userData.role !== "partner_owner"
    ) {
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

// Watch for changes in user data and update the Navigation component
watch(
  user,
  (newUser) => {
    console.log("User data updated:", newUser);
  },
  { deep: true }
);

// Reactieve data-referenties
const data = ref([]); // Zorg ervoor dat data altijd een lege array is
const searchTerm = ref("");
const selectedFilter = ref("All");
const selectedUsers = ref([]); // Dit is een ref voor de geselecteerde gebruikers
const isPopupVisible = ref(false);

// Computed properties voor UI-staat
const isDeleteButtonVisible = computed(() => selectedUsers.value.length > 0);
const emptyState = computed(() => data.value.length === 0);

const fetchData = async () => {
  try {
    const token = localStorage.getItem("jwtToken");
    const decodedToken = parseJwt(token); // Decode the token here
    if (!decodedToken) {
      throw new Error("Invalid token or failed to decode token");
    }

    const response = await fetch(`${baseURL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    const userRole = decodedToken?.role;
    if (userRole === "platform_admin") {
      data.value = result.data.users;
    } else {
      const filteredUsers = result.data.users.filter((user) => {
        const matchesPartner = user.partnerId === userPartnerId;
        return matchesPartner;
      });
      data.value = filteredUsers;
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

// Filter de gebruikers op basis van zoekterm en filter
const filteredUsers = computed(() => {
  // Controleer eerst of data.value gedefinieerd is
  if (!data.value) return [];

  return data.value.filter((user) => {
    const matchesSearchTerm =
      user.firstname.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      user.lastname.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.value.toLowerCase());

    const matchesFilter =
      selectedFilter.value === "All" || user.role === selectedFilter.value;

    return matchesSearchTerm && matchesFilter;
  });
});

// Filter de gebruikers op basis van zoekterm en filter
const selectAllUsers = (isSelected) => {
  selectedUsers.value = isSelected
    ? filteredUsers.value.map((user) => user._id)
    : []; // Wijzig de geselecteerde gebruikers als een lege array
};

// Schakel selectie voor een enkele gebruiker
const toggleSelection = (userId) => {
  const index = selectedUsers.value.indexOf(userId);
  if (index === -1) {
    selectedUsers.value.push(userId);
  } else {
    selectedUsers.value.splice(index, 1);
  }
};

// Verwijderen van geselecteerde gebruikers
const deleteSelectedUsers = async () => {
  if (!selectedUsers.value.length) return;

  try {
    await Promise.all(
      selectedUsers.value.map(async (userId) => {
        const response = await fetch(`${baseURL}/users/${userId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`, // Change jwtToken to token here
          },
        });
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
      })
    );

    // Refresh data and clear selection after successful deletion
    await fetchData();
    selectedUsers.value = [];
  } catch (error) {
    console.error("Error deleting users:", error);
  }
};

// Popup-weergavebeheer
const showPopup = () => (isPopupVisible.value = true);
const hidePopup = () => (isPopupVisible.value = false);
const confirmDelete = async () => {
  await deleteSelectedUsers();
  hidePopup();
};

// Initialiseer component en haal data op
onMounted(fetchData);
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="overlay" v-if="isPopupVisible"></div>
  <div class="content">
    <h2>Users</h2>
    <div class="popup" v-if="isPopupVisible">
      <img src="../../assets/icons/cross-circle.svg" alt="icon" />
      <div class="text">
        <h2>Are you sure?</h2>
        <p>Do you really want to delete this user?</p>
        <div class="btns">
          <button @click="hidePopup">Cancel</button>
          <button @click="confirmDelete" class="btn active">Delete</button>
        </div>
      </div>
    </div>
    <div class="menu">
      <div class="btns">
        <router-link exact to="/admin/add-new-user" class="btn active">
          <p>Add new</p>
          <img src="../../assets/icons/add.svg" alt="icon" />
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
      <select class="filter" v-model="selectedFilter">
        <option value="All">All</option>
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </select>
    </div>

    <div class="search">
      <img src="../../assets/icons/search.svg" alt="icon" />
      <input placeholder="Search" v-model="searchTerm" />
    </div>

    <div class="users mobile">
      <div class="items">
        <router-link
          v-if="filteredUsers && filteredUsers.length > 0"
          v-for="user in filteredUsers"
          :key="user._id"
          :to="{ name: 'EditUser', params: { id: user._id } }"
        >
          <div class="elements">
            <div class="text">
              <p class="name">{{ user.firstname }} {{ user.lastname }}</p>
              <p>{{ user.email }}</p>
              <p>{{ user.role }}</p>
            </div>
            <div
              class="btn"
              :class="{ active: user.activeUnactive === 'active' }"
            >
              <p>{{ user.activeUnactive }}</p>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <div class="users desktop">
      <div class="top">
        <input
          type="checkbox"
          @change="selectAllUsers($event.target.checked)"
        />
        <p>First name</p>
        <p>Last name</p>
        <p>Email</p>
        <p>Role</p>
        <p>Status</p>
      </div>
      <ul v-if="filteredUsers && filteredUsers.length > 0" class="list">
        <li v-for="user in filteredUsers" :key="user._id">
          <router-link
            :to="{ name: 'EditUser', params: { id: user._id } }"
            class="user-link"
          >
            <input
              type="checkbox"
              @change="toggleSelection(user._id)"
              :checked="selectedUsers.includes(user._id)"
              @click.stop
            />
            <p>{{ user.firstname }}</p>
            <p>{{ user.lastname }}</p>
            <p>{{ user.email }}</p>
            <p>{{ user.role }}</p>
            <p>{{ user.activeUnactive }}</p>
          </router-link>
        </li>
      </ul>
      <div v-else-if="emptyState" class="empty-state">
        <p>No users found matching the selected filters.</p>
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
  border-radius: 8px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

.popup img {
  width: 64px;
  height: 64px;
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
  border: 1px solid var(--secondary-color);
  background-color: var(--secondary-color);
  color: var(--text-color);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.search {
  width: 100%;
}

.search {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.search input {
  color: var(--text-color);
}

.menu .search {
  display: none;
}

.users.desktop {
  background-color: var(--secondary-color);
  width: 100%;
  border-radius: 8px;
  overflow-x: auto;
}

.users.mobile {
  width: 100%;
}

.users.mobile .items {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.users.mobile a {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 1.5em;
  padding-bottom: 1em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
}

.users.mobile a .image {
  width: 64px;
  height: 64px;
  background-size: cover;
  background-position: center;
  border-radius: 4px;
  flex-shrink: 0;
}

.users.mobile a .elements {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  gap: 1em;
}

.users.mobile a .elements .text {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.users.mobile a .elements .btn {
  border-radius: 0.75rem;
  padding: 0.75rem 0.025rem;
  width: 60px;
  height: 26px;
}

.users.mobile a .elements .btn.active {
  background-color: #53e971;
  border: none;
}

.users.mobile a .elements .btn p {
  opacity: 1;
}

.users.mobile a .elements .btn.active p {
  color: #000;
  opacity: 1;
}

.users.mobile a p {
  font-size: 12px;
  opacity: 0.6;
}

.users.mobile a p.name {
  opacity: 1;
}

.users.desktop {
  display: none;
}

.users::-webkit-scrollbar {
  display: none;
}

.users .top {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  align-items: center;
  border-radius: 8px 8px 0 0;
  padding: 4px 16px;
  background-color: var(--secondary-color);
}

.users .list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.users .list li {
  display: flex;
  flex-direction: row;
  padding: 16px;
}

.users .list li:nth-child(even) {
  background-color: rgb(var(--primary-color), 0.1);
}

.users .list li a {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  align-items: center;
  column-gap: 16px;
  row-gap: 16px;
}

.users .list li p {
  color: var(--text-color);
}

.users .list li p:hover {
  text-decoration: underline;
}

.users .top input,
.users .list input {
  width: 18px;
  height: 18px;
}

.users .top {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 16px;
  padding: 4px 16px;
}

.users .top p:nth-child(2),
.users .list li a p:nth-child(2) {
  width: 150px;
}

.users .top p:nth-child(3),
.users .list li a p:nth-child(3) {
  width: 190px;
}

.users .top p:nth-child(4),
.users .list li a p:nth-child(4) {
  width: 280px;
}

.users .top p:nth-child(5),
.users .list li a p:nth-child(5) {
  width: 100px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  font-size: 18px;
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
