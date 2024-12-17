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

const jwtToken = localStorage.getItem("jwtToken");

// Redirect naar login als er geen token is
if (!jwtToken) {
  router.push("/login");
}

// Variabelen voor configuratiegegevens
const fieldName = ref("");
const fieldType = ref("");
const optionsInput = ref(""); // Gebruiken we om de invoer voor opties vast te leggen
const options = ref([]); // Dit wordt een array van opties

// Functie om opties om te zetten naar een array
const updateOptions = () => {
  options.value = optionsInput.value
    .split(",")
    .map((option) => option.trim()) // Trim de extra spaties
    .filter((option) => option !== ""); // Verwijder lege waarden
};

// Functie om een nieuwe configuratie toe te voegen
const addConfiguration = async () => {
  // Configuratie payload
  const configurationPayload = {
    fieldName: fieldName.value,
    fieldType: fieldType.value,
    options: options.value, // Voor een dropdown, vul hier de opties in
  };

  // Als het veldtype 'Dropdown' is, moeten we controleren of de opties zijn ingevoerd
  if (fieldType.value === "Dropdown" && !options.value.length) {
    // Opties zijn niet ingevuld, maar geen alert meer
    return;
  }

  try {
    const response = await fetch(`${baseURL}/configurations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(configurationPayload),
    });

    if (!response.ok) {
      const errorDetail = await response.json();
      throw new Error(
        `Fout bij het toevoegen van de configuratie: ${errorDetail.message}`
      );
    }

    const result = await response.json();

    // Redirect naar de configuratiepagina
    router.back();
  } catch (error) {
    console.error("Error adding configuration:", error.message);
    alert("Er is een fout opgetreden bij het toevoegen van de configuratie.");
  }
};
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="content">
    <h1>Nieuwe Configuratie Toevoegen</h1>
    <form @submit.prevent="addConfiguration">
      <div class="row">
        <div class="column">
          <label for="fieldName">Veldnaam:</label>
          <input v-model="fieldName" id="fieldName" type="text" required />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="fieldType">Veldtype:</label>
          <select v-model="fieldType" id="fieldType" required>
            <option value="">Selecteer een veldtype</option>
            <option value="Text">Tekst</option>
            <option value="Dropdown">Dropdown</option>
            <!-- Je kunt hier meer opties toevoegen voor andere types -->
          </select>
        </div>
      </div>
      <div class="row" v-if="fieldType === 'Dropdown'">
        <div class="column">
          <label for="options">Opties:</label>
          <input
            v-model="optionsInput"
            id="options"
            type="text"
            placeholder="Voer opties in, gescheiden door komma's"
            @input="updateOptions"
          />
          <small>Bijv. Optie 1, Optie 2, Optie 3</small>
        </div>
      </div>

      <button type="submit" class="btn active">Voeg Configuratie Toe</button>
    </form>
  </div>
</template>

<style scoped>
.content {
  width: 100%;
  height: 100vh;
}

form {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
  width: 100%;
}

form .row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 120px;
  width: 100%;
}

form .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

input,
select {
  padding: 8px;
  margin-bottom: 16px;
  border-radius: 4px;
  border: 1px solid #333;
  background-color: #333;
  color: white;
}

button {
  color: white;
  cursor: pointer;
}
</style>
