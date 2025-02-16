<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

// Router setup
const router = useRouter();

// Reactive user object to store user details
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
  profileImage: "", // Store the profile picture
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
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
};

const tokenPayload = parseJwt(token);
const userId = tokenPayload?.userId;

if (!userId) {
  router.push("/login");
}

// Base URL for API calls
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Fetch user profile data
const fetchUserProfile = async () => {
  try {
    const response = await axios.get(`${baseURL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const userData = response.data?.data?.user || {};
    // Update the user object with the fetched data
    user.firstName = userData.firstname || "";
    user.lastName = userData.lastname || "";
    user.email = userData.email || "";
    user.oldEmail = userData.email || "";
    user.country = userData.country || "";
    user.city = userData.city || "";
    user.postalCode = userData.postalCode || "";
    user.profileImage = userData.profileImage || ""; // Fetch the profile picture
    user.bio = userData.bio || "";
    user.role = userData.role || "";
    user.activeUnactive = userData.activeUnactive ?? true;
    console.log(userData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
};

// Load the user profile when the component is mounted
onMounted(() => {
  fetchUserProfile();
});

// Ref for the profile image URL (will be dynamically updated)
const profileImage = ref("");

// Watch for changes in the user profile picture to update the profileImage ref
watch(
  () => user.profileImage,
  (newprofileImage) => {
    // Set the profile image to the fetched picture or a default if none exists
    profileImage.value = newprofileImage
      ? newprofileImage
      : "https://via.placeholder.com/150"; // Default image
  }
);
</script>

<template>
  <router-link to="/admin/settings" exact-active-class="active">
    <div
      class="menu-item profileImage"
      :style="{ backgroundImage: 'url(' + profileImage + ')' }"
    ></div>
  </router-link>
</template>

<style scoped>
.profileImage {
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #dadbdd;
  cursor: pointer;
}

.desktopNav .profile div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media (min-width: 768px) {
  .profileImage {
    width: 40px;
    height: 40px;
  }
}
</style>
