<script setup>
import { ref, reactive, onMounted, watch, provide } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

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
const partnerId = tokenPayload?.companyId || null;
if (!userId) {
  router.push("/login");
}

// Partner related data
const partnerPackage = ref(null);
const fallbackLogo = "../../assets/images/REBILT-logo-white.svg";

// Base URL depending on environment
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
    Object.assign(user, userData);
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

// Initialize data fetching on mount
onMounted(async () => {
  await fetchUserProfile();
  await fetchPartnerData();
});

// Provide the user data to all components (including Navigation)
provide("user", user);

// Watch for changes in user data and log updates
watch(
  user,
  (newUser) => {
    console.log("User data updated:", newUser);
  },
  { deep: true }
);

// House style data management
const huisstijlData = reactive({
  primaryColor: "#9747ff",
  secondaryColor: "#000000",
  textColor: "#ffffff",
  titlesColor: "#0071e3",
  backgroundColor: "#000000",
  fonts: [], // Fonts initialized as an empty array
  logo: "",
  backgroundImage: "",
});

const selectedFontForTitles = ref("");
const selectedFontForText = ref("");
const GoogleFonts = ref([]);

// Set dynamic font styles
const setFonts = () => {
  document.documentElement.style.setProperty(
    "--title-font",
    selectedFontForTitles.value || "default"
  );
  document.documentElement.style.setProperty(
    "--body-font",
    selectedFontForText.value || "default"
  );
};

// Fetch Google Fonts
const fetchGoogleFonts = async () => {
  const apiKey = "AIzaSyBAS05cq9-WKD92VljeuLee5V7YkIrTTMw";
  const googleFontsApi = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}`;
  try {
    const { data } = await axios.get(googleFontsApi);
    GoogleFonts.value = data.items.map((font) => font.family);
  } catch (error) {
    console.error("Error fetching Google Fonts:", error);
  }
};

// Select and load a font
const selectFont = async (font, type) => {
  const fontUrl = `https://fonts.googleapis.com/css2?family=${font.replace(
    / /g,
    "+"
  )}:wght@400;700&display=swap`;

  const existingLink = document.head.querySelector(`link[href="${fontUrl}"]`);
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);
  }

  if (type === "title") {
    selectedFontForTitles.value = font;
  } else if (type === "text") {
    selectedFontForText.value = font;
  }

  await updateHouseStyleInDatabase();
};

const openColorPicker = (field) => {
  const input = document.createElement("input");
  input.type = "color";
  input.value = huisstijlData[field];

  input.addEventListener("input", async (event) => {
    huisstijlData[field] = event.target.value;
    await updateHouseStyleInDatabase();
  });

  input.click();
};

// Fetch house style from the database
const getHouseStyleFromDatabase = async () => {
  try {
    const response = await axios.get(`${baseURL}/partners/${partnerId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const partnerData = response.data?.data?.partner || {};
    Object.assign(huisstijlData, {
      primaryColor: partnerData.primary_color || "#9747ff",
      secondaryColor: partnerData.secondary_color || "#000000",
      textColor: partnerData.text_color || "#ffffff",
      titlesColor: partnerData.titles_color || "#0071e3",
      backgroundColor: partnerData.background_color || "#000000",
      logo: partnerData.logo_url || "",
      backgroundImage: partnerData.background_image_url || "",
    });

    selectedFontForTitles.value = partnerData.fontFamilyTitles || "Syne";
    selectedFontForText.value = partnerData.fontFamilyBodyText || "DM Sans";
  } catch (error) {
    console.error("Error fetching house style:", error);
  }
};

// Reset house style to default values
const resetHouseStyle = async () => {
  const defaultHuisstijl = {
    primaryColor: "#9747ff",
    secondaryColor: "#000000",
    textColor: "#ffffff",
    titlesColor: "#0071e3",
    backgroundColor: "#000000",
    backgroundImage: "",
    fontFamilyTitles: "Syne",
    fontFamilyBodyText: "DM Sans",
    logo: "https://res.cloudinary.com/dzempjvto/image/upload/v1734208533/Stijn/Huisstijl/yzezrygcrnb8pztjyplp.jpg",
  };

  Object.assign(huisstijlData, defaultHuisstijl);

  try {
    await updateHouseStyleInDatabase();
  } catch (error) {
    console.error("Error updating house style:", error);
  }
};

// Update house style in the database
const updateHouseStyleInDatabase = async () => {
  const houseStyleData = {
    name: "Odette Lunettes",
    address: {
      street: "92, Goudenregenlaan",
      city: "Sint-Niklaas",
      postal_code: "9100",
      country: "België",
    },
    contact_email: "jonasdebruyne734@gmail.com",
    contact_phone: "0472671833",
    package: "standard",
    primary_color: huisstijlData.primaryColor,
    secondary_color: huisstijlData.secondaryColor,
    titles_color: huisstijlData.titlesColor,
    text_color: huisstijlData.textColor,
    background_color: huisstijlData.backgroundColor,
    fontFamilyBodyText: selectedFontForText.value,
    fontFamilyTitles: selectedFontForTitles.value,
    logo_url: huisstijlData.logo || null,
  };

  try {
    const response = await axios.put(
      `${baseURL}/partners/${partnerId}`,
      houseStyleData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("House style updated successfully:", response.data);
  } catch (error) {
    console.error("Error updating house style:", error);
  }
};

// Fetch house style and Google Fonts
onMounted(() => {
  getHouseStyleFromDatabase();
  fetchGoogleFonts();
});
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="content">
    <h1>Styling</h1>
    <div class="elements">
      <!-- Colours Section -->
      <div class="top">
        <h2>Colours</h2>
        <a href="#" class="btn" @click.prevent="resetHouseStyle">Reset</a>
      </div>
      <div class="colours">
        <div class="column">
          <h3>Primary Color</h3>
          <div class="row">
            <p>{{ huisstijlData.primaryColor }}</p>
            <div
              class="color"
              :style="{ backgroundColor: huisstijlData.primaryColor }"
              @click="openColorPicker('primaryColor')"
            ></div>
          </div>
        </div>
        <div class="column">
          <h3>Secondary Color</h3>
          <div class="row">
            <p>{{ huisstijlData.secondaryColor }}</p>
            <div
              class="color"
              :style="{ backgroundColor: huisstijlData.secondaryColor }"
              @click="openColorPicker('secondaryColor')"
            ></div>
          </div>
        </div>
        <div class="column">
          <h3>Text color</h3>
          <div class="row">
            <p>{{ huisstijlData.textColor }}</p>
            <div
              class="color"
              :style="{ backgroundColor: huisstijlData.textColor }"
              @click="openColorPicker('textColor')"
            ></div>
          </div>
        </div>
        <div class="column">
          <h3>Titles color</h3>
          <div class="row">
            <p>{{ huisstijlData.titlesColor }}</p>
            <div
              class="color"
              :style="{ backgroundColor: huisstijlData.titlesColor }"
              @click="openColorPicker('titlesColor')"
            ></div>
          </div>
        </div>
        <div class="column">
          <h3>Background color</h3>
          <div class="row">
            <p>{{ huisstijlData.backgroundColor }}</p>
            <div
              class="color"
              :style="{ backgroundColor: huisstijlData.backgroundColor }"
              @click="openColorPicker('backgroundColor')"
            ></div>
          </div>
        </div>
      </div>
      <!-- Fonts Section -->
      <div class="fonts">
        <h2>Fonts</h2>
        <!-- Dropdown voor lettertype selectie -->
        <div class="font">
          <h3>Font voor titles</h3>
          <div class="row">
            <div class="font-preview">
              <h3>Voorbeeld met "{{ selectedFontForTitles }}"</h3>
              <p :style="{ fontFamily: selectedFontForTitles }">
                AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz
              </p>
            </div>

            <div class="font-select">
              <label for="font-dropdown">Selecteer een font:</label>
              <select
                id="font-dropdown"
                v-model="selectedFontForTitles"
                @change="selectFont(selectedFontForTitles, 'title')"
              >
                <option value="" disabled :selected="!selectedFontForTitles">
                  Selecteer een font
                </option>
                <option
                  v-for="font in [
                    ...GoogleFonts,
                    ...(Array.isArray(huisstijlData.fonts)
                      ? huisstijlData.fonts
                      : []),
                  ]"
                  :key="font"
                  :value="font"
                  :style="{ fontFamily: font }"
                >
                  {{ font }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div class="font">
          <h3>Font voor tekst</h3>
          <div class="row">
            <div class="font-preview">
              <h3>Voorbeeld met "{{ selectedFontForText }}"</h3>
              <p :style="{ fontFamily: selectedFontForText }">
                AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz
              </p>
            </div>
            <div class="font-select">
              <label for="font-dropdown">Selecteer een font:</label>
              <select
                id="font-dropdown"
                v-model="selectedFontForText"
                @change="selectFont(selectedFontForText, 'text')"
              >
                <option value="" disabled :selected="!selectedFontForText">
                  Selecteer een font
                </option>
                <!-- Voeg zowel Google Fonts als de fonts uit huisstijlData toe -->
                <option
                  v-for="font in [
                    ...GoogleFonts,
                    ...huisstijlData.fonts.map((f) => f.name),
                  ]"
                  :key="font"
                  :value="font"
                  :style="{ fontFamily: font }"
                >
                  {{ font }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="images">
        <h2>Images</h2>
        <div class="column">
          <h3>Logo</h3>
          <div class="row">
            <img
              v-if="huisstijlData.logo"
              :src="huisstijlData.logo"
              alt="Logo"
              class="logo"
            />
            <div v-else>
              <img :src="fallbackLogo" alt="Logo" class="logo" />
            </div>

            <!-- Logo upload button -->
            <button @click="triggerLogoUpload" class="btn active">
              Upload Logo
            </button>
            <input
              ref="logoInput"
              type="file"
              accept="image/*"
              @change="handleLogoUpload"
              style="display: none"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.elements {
  padding: 24px;
  background-color: var(--secondary-color);
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  border-radius: 8px;
}

.elements .top {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.elements .top h2 {
  padding-bottom: 0;
  border-bottom: none;
}

.elements h2 {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.elements .colours,
.elements .fonts,
.elements .images {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column .row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.images .column .row {
  align-items: flex-end;
}

.images .column .row img {
  width: 64px;
  height: 64px;
}

.column .row .color {
  width: 24px;
  height: 24px;
  border: 3px solid var(--text-color);
  border-radius: 50%;
  cursor: pointer;
}

.elements .fonts .font {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.elements .fonts .font .row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
}

.elements .fonts .font .row .font-preview,
.elements .fonts .font .row .font-select {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 50%;
}

#font-dropdown {
  width: 100%;
  padding: 8px;
  font-size: 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-top: 8px;
}
</style>
