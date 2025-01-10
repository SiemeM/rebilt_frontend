<script setup>
import { reactive, ref, computed, onMounted, inject } from "vue";
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
    ? "https://rebilt-backend.onrender.com/api/v1"
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

// Definieer de huisstijl data
const huisstijlData = reactive({
  primaryColor: "#d4af37",
  secondaryColor: "#f0edea",
  backgroundColor: "#ffffff",
  textColor: "#ffffff",
  fontFamilyBodyText: "Work Sans",
  fontFamilyTitles: "Libre Barcode 128",
  logo_url: "../../src/assets/images/rebilt-favicon.svg",
});

// Fetch user data when component is mounted
onMounted(() => {
  const userData = getUserDataFromToken();
  if (userData) {
    // If user data is found in the token, fetch the full user data
    fetchUserData(userData.userId);
  }
});

// Function to handle logout
const logout = () => {
  localStorage.removeItem("jwtToken");
  router.push("/login");
};

// Function to dynamically select the icon based on the active route
const getActiveIcon = (routeName, defaultIcon) => {
  const currentRoute = router.currentRoute.value.path;

  switch (routeName) {
    case "products":
      return currentRoute === "/admin"
        ? "../src/assets/icons/tag_active.svg"
        : "../src/assets/icons/tag.svg";
    case "orders":
      return currentRoute === "/admin/orders"
        ? "../src/assets/icons/inbox_active.svg"
        : "../src/assets/icons/inbox.svg";
    case "partners":
      return currentRoute === "/admin/partners"
        ? "../src/assets/icons/partners_active.svg"
        : "../src/assets/icons/partners.svg";
    case "styling":
      return currentRoute === "/admin/styling"
        ? "../src/assets/icons/styling_active.svg"
        : "../src/assets/icons/styling.svg";
    case "users":
      return currentRoute === "/admin/users"
        ? "../src/assets/icons/users_active.svg"
        : "../src/assets/icons/users.svg";
    case "settings":
      return currentRoute === "/admin/settings"
        ? "../src/assets/icons/settings_active.svg"
        : "../src/assets/icons/settings.svg";
    case "logout":
      return "../assets/icons/logout.svg"; // Logout icon is always static
    default:
      return defaultIcon; // Return the default icon for all other routes
  }
};

const profileImage = computed(() => {
  return (
    user.profilePicture ||
    new URL("../assets/images/Odette_lunettes.webp", import.meta.url).href
  );
});

// Reactieve variabele om bij te houden welk label moet worden weergegeven
const hoveredLabel = ref("");

function showLabel(label) {
  hoveredLabel.value = label;
}

function hideLabel() {
  hoveredLabel.value = "";
}
</script>

<template>
  <nav class="mobileNav">
    <router-link
      v-if="user.role === 'partner_owner' || user.role === 'partner_admin'"
      to="/admin"
      exact-active-class="active"
    >
      <div
        class="menu-item"
        @mouseover="showLabel('Products')"
        @mouseleave="hideLabel"
      >
        <img
          :src="getActiveIcon('products', '../assets/icons/tag.svg')"
          alt="icon"
        />
        <p>Products</p>
        <span class="label" v-show="hoveredLabel === 'Products'">Products</span>
      </div>
    </router-link>
    <router-link
      v-if="user.role === 'partner_owner' || user.role === 'partner_admin'"
      to="/admin/orders"
      exact-active-class="active"
    >
      <div
        class="menu-item"
        @mouseover="showLabel('Orders')"
        @mouseleave="hideLabel"
      >
        <img
          :src="getActiveIcon('orders', '../assets/icons/inbox.svg')"
          alt="icon"
        />
        <p>Orders</p>
        <span class="label" v-show="hoveredLabel === 'Orders'">Orders</span>
      </div>
    </router-link>
    <router-link
      v-if="user.role === 'platform_admin'"
      to="/admin/partners"
      exact-active-class="active"
    >
      <div
        class="menu-item"
        @mouseover="showLabel('Partners')"
        @mouseleave="hideLabel"
      >
        <img
          :src="getActiveIcon('partners', '../assets/icons/partners.svg')"
          alt="icon"
        />
        <p>Partners</p>
        <span class="label" v-show="hoveredLabel === 'Partners'">Partners</span>
      </div>
    </router-link>
    <router-link
      v-if="user.role === 'partner_owner' || user.role === 'partner_admin'"
      to="/admin/users"
      exact-active-class="active"
    >
      <div
        class="menu-item"
        @mouseover="showLabel('Users')"
        @mouseleave="hideLabel"
      >
        <img
          :src="getActiveIcon('users', '../assets/icons/users.svg')"
          alt="icon"
        />
        <p>Users</p>
        <span class="label" v-show="hoveredLabel === 'Users'">Users</span>
      </div>
    </router-link>
    <router-link to="/admin/settings" exact-active-class="active">
      <div
        class="menu-item profilePicture"
        @mouseover="showLabel('Settings')"
        @mouseleave="hideLabel"
        :style="{ backgroundImage: 'url(' + profileImage + ')' }"
      >
        <span class="label" v-show="hoveredLabel === 'Settings'">Settings</span>
      </div>
    </router-link>
  </nav>

  <nav class="desktopNav">
    <div class="elements">
      <div
        class="logo"
        :style="{ backgroundImage: 'url(' + huisstijlData.logo_url + ')' }"
      ></div>
      <div class="menu">
        <router-link
          v-if="user.role === 'partner_owner' || user.role === 'partner_admin'"
          to="/admin"
          exact-active-class="active"
        >
          <div
            class="menu-item"
            @mouseover="showLabel('Products')"
            @mouseleave="hideLabel"
          >
            <img
              :src="getActiveIcon('products', '../assets/icons/package.svg')"
              alt="icon"
            />
            <span class="label" v-show="hoveredLabel === 'Products'"
              >Products</span
            >
          </div>
        </router-link>
        <router-link
          v-if="user.role === 'partner_owner' || user.role === 'partner_admin'"
          to="/admin/orders"
          exact-active-class="active"
        >
          <div
            class="menu-item"
            @mouseover="showLabel('Orders')"
            @mouseleave="hideLabel"
          >
            <img
              :src="getActiveIcon('orders', '../assets/icons/order.svg')"
              alt="icon"
            />
            <span class="label" v-show="hoveredLabel === 'Orders'">Orders</span>
          </div>
        </router-link>
        <router-link
          v-if="user.role === 'partner_owner'"
          to="/admin/styling"
          exact-active-class="active"
        >
          <div
            class="menu-item"
            @mouseover="showLabel('Styling')"
            @mouseleave="hideLabel"
          >
            <img
              :src="getActiveIcon('styling', '../assets/icons/styling.svg')"
              alt="icon"
            />
            <span class="label" v-show="hoveredLabel === 'Styling'"
              >Styling</span
            >
          </div>
        </router-link>
        <router-link
          v-if="user.role === 'platform_admin'"
          to="/admin/partners"
          exact-active-class="active"
        >
          <div
            class="menu-item"
            @mouseover="showLabel('Partners')"
            @mouseleave="hideLabel"
          >
            <img
              :src="getActiveIcon('partners', '../assets/icons/users.svg')"
              alt="icon"
            />
            <span class="label" v-show="hoveredLabel === 'Partners'"
              >Partners</span
            >
          </div>
        </router-link>
        <router-link
          v-if="user.role === 'partner_owner' || user.role === 'partner_admin'"
          to="/admin/users"
          exact-active-class="active"
        >
          <div
            class="menu-item"
            @mouseover="showLabel('Users')"
            @mouseleave="hideLabel"
          >
            <img
              :src="getActiveIcon('users', '../assets/icons/users.svg')"
              alt="icon"
            />
            <span class="label" v-show="hoveredLabel === 'Users'">Users</span>
          </div>
        </router-link>
        <router-link
          v-if="user.role === 'partner_owner' || user.role === 'partner_admin'"
          to="/admin/myconfigurations"
          exact-active-class="active"
        >
          <div
            class="menu-item"
            @mouseover="showLabel('Configurations')"
            @mouseleave="hideLabel"
          >
            <img
              :src="getActiveIcon('settings', '../assets/icons/settings.svg')"
              alt="icon"
            />
            <span class="label" v-show="hoveredLabel === 'Configurations'"
              >Configurations</span
            >
          </div>
        </router-link>
      </div>
    </div>
    <a @click.prevent="logout">
      <img src="../assets/icons/logout.svg" alt="icon" />
    </a>
  </nav>
</template>

<style scoped>
/* background: linear-gradient(-45deg, #473c5d, #000000); */
.mobileNav {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  background-color: var(--secondary-color);
  box-shadow: 0px -4px 8px rgba(0, 0, 0, 0.1);
  padding: 16px 24px 32px 24px;
  position: fixed;
  z-index: 999;
  bottom: 0;
  width: 100%;
}

.mobileNav a {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.mobileNav a p {
  display: none;
}

.desktopNav {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(
    -45deg,
    var(--primary-color),
    var(--background-color)
  );
  height: calc(100vh - 48px);
  margin: 24px 0px 24px 24px;
  padding: 24px;
  position: fixed;
  border-radius: 1rem;
}

.desktopNav .elements {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 64px;
}

.desktopNav .logo {
  background-repeat: no-repeat;
  background-size: contain;
  background-position: left;
  width: 24px;
  height: 24px;
}

.desktopNav .menu {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.desktopNav .profile div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.desktopNav .menu a img {
  width: 24px;
}

.desktopNav .menu a p {
  color: var(--text-color);
}

.menu-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.menu-item .label {
  position: absolute;
  left: 64px;
  top: 0; /* Past de afstand onder de afbeelding aan */
  background-color: var(--primary-color);
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 14px;
  margin: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
  letter-spacing: 1px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.icons .icon:hover p {
  opacity: 1;
}

.menu-item:hover .label {
  opacity: 1;
}

@media (min-width: 768px) {
  .mobileNav {
    display: none;
  }
  .desktopNav {
    display: flex;
  }
  .profilePicture {
    width: 24px;
    height: 24px;
  }
}
</style>
