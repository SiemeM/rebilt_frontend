<script setup>
import { reactive, computed, onMounted, watch, inject } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

// Router instance for navigation
const router = useRouter();

// Inject the user object from parent (settingsPage)
const user = inject("user", () =>
  reactive({
    firstName: "",
    lastName: "",
    role: "",
    profilePicture: "",
  })
);

if (!user) {
  console.error("No user data provided!");
  router.push("/login"); // Verplicht de gebruiker om in te loggen als er geen `user` data is.
}

// Function to extract user data from the JWT token (kan mogelijk overbodig zijn als we al `user` injecteren)
const getUserDataFromToken = () => {
  const token = localStorage.getItem("jwtToken");
  if (token) {
    const payload = token.split(".")[1];
    const decodedPayload = JSON.parse(atob(payload));
    const userId = decodedPayload.userId;
    const firstName = decodedPayload.firstname;
    const lastName = decodedPayload.lastname;
    const role = decodedPayload.role;
    const profilePicture = decodedPayload.profilePicture || "";

    if (!userId) {
      console.error("User ID not found in token");
    }

    return { userId, firstName, lastName, role, profilePicture }; // Return updated fields
  }
  console.error("No token found in localStorage");
  return null;
};

// Function to fetch user data via API (kan eventueel worden vervangen door data in `user` injecteren)
const fetchUserData = async (userId) => {
  const isProduction = window.location.hostname !== "localhost";
  const baseURL = isProduction
    ? "https://glint-backend-admin.onrender.com/api/v1"
    : "http://localhost:3000/api/v1";

  try {
    const response = await axios.get(`${baseURL}/users/${userId}`);
    const userData = response.data.data.user;
    if (userData) {
      // Dynamically update the reactive user data
      user.firstName = userData.firstname || "";
      user.lastName = userData.lastname || "";
      user.role = userData.role || "";
      user.profilePicture = userData.profilePicture || "";
    } else {
      console.error("No user found in the response.");
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
};

// Fetch user data when component is mounted
onMounted(() => {
  const userData = getUserDataFromToken();
  if (userData) {
    // If user data is found in the token, fetch the full user data
    fetchUserData(userData.userId);
  }
});

// Watch for changes in the user object and log them for debugging
watch(
  () => user.firstName,
  (newValue, oldValue) => {
    console.log("User firstName updated:", newValue);
  }
);
watch(
  () => user.lastName,
  (newValue, oldValue) => {
    console.log("User lastName updated:", newValue);
  }
);
watch(
  () => user.role,
  (newValue, oldValue) => {
    console.log("User role updated:", newValue);
  }
);
watch(
  () => user.profilePicture,
  (newValue, oldValue) => {
    console.log("User profile picture updated:", newValue);
  }
);

// Function to handle logout
const logout = () => {
  localStorage.removeItem("jwtToken");
  router.push("/login");
};

const profileImage = computed(() => {
  return (
    user.profilePicture ||
    new URL("../assets/images/Odette_lunettes.webp", import.meta.url).href
  );
});
</script>

<template>
  <nav>
    <div class="logo">
      <h3>REBILT</h3>
    </div>
    <div class="profile">
      <!-- Add dynamic profile picture from user data -->
      <div
        class="profilePicture"
        :style="{ backgroundImage: 'url(' + profileImage + ')' }"
      ></div>
      <div>
        <h3 v-if="user.firstName && user.lastName">
          {{ user.firstName }} {{ user.lastName }}
        </h3>
        <p v-if="user.role">
          {{ user.role }}
        </p>
      </div>
    </div>
    <div class="menu">
      <router-link to="/admin" exact-active-class="active">
        <img src="../assets/icons/package.svg" alt="icon" />
        <p>Products</p>
      </router-link>
      <router-link to="/admin/orders" exact-active-class="active">
        <img src="../assets/icons/order.svg" alt="icon" />
        <p>Orders</p>
      </router-link>
      <router-link
        v-if="user.role === 'partner_owner'"
        to="/admin/styling"
        exact-active-class="active"
      >
        <img src="../assets/icons/paintbrush.svg" alt="icon" />
        <p>Styling</p>
      </router-link>
      <router-link
        v-if="user.role === 'platform_admin'"
        to="/admin/partners"
        exact-active-class="active"
      >
        <img src="../assets/icons/users.svg" alt="icon" />
        <p>Partners</p>
      </router-link>
      <router-link to="/admin/users" exact-active-class="active">
        <img src="../assets/icons/users.svg" alt="icon" />
        <p>Users</p>
      </router-link>
      <router-link to="/admin/settings" exact-active-class="active">
        <img src="../assets/icons/settings.svg" alt="icon" />
        <p>Settings</p>
      </router-link>
      <a @click.prevent="logout">
        <img src="../assets/icons/logout.svg" alt="icon" />
        <p>Logout</p>
      </a>
    </div>
  </nav>
</template>

<style scoped>
nav {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 120px;
  background: linear-gradient(to bottom, #000000, #473c5d);
  height: 100vh;
  padding: 48px 32px;
  position: fixed;
}

nav .logo h3 {
  font-size: 1.5rem;
  color: #ffffff;
  text-transform: uppercase;
  font-weight: bold;
}

nav,
nav .menu {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 48px;
}

nav .profile {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

nav .profile .profilePicture {
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  width: 64px;
  height: 64px;
  border-radius: 50%;
}

nav .profile div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

nav .menu a,
nav .menu a.active {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

nav .menu a.active {
  background-color: var(--purple);
  padding: 4px 12px;
  border-radius: 8px;
}

nav .menu a img {
  width: 24px;
}

nav .menu a p {
  color: var(--white);
}
</style>
