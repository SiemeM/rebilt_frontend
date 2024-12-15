<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Router instance and user validation
const router = useRouter();
const token = localStorage.getItem("jwtToken");

if (!token) {
  router.push("/login");
}

// JWT token parsing
const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    return JSON.parse(decodeURIComponent(jsonPayload));
  } catch (error) {
    console.error("Error parsing JWT:", error);
    return null;
  }
};

const tokenPayload = parseJwt(token);
const userId = tokenPayload?.userId || null;

if (!userId) {
  router.push("/login");
}

// API base URL configuration
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Reactive data for the user profile and house style
const huisstijlData = reactive({
  primaryColor: "#9747ff",
  secondaryColor: "#000000",
  textColor: "#ffffff",
  titlesColor: "#0071e3",
  backgroundColor: "#000000",
  fonts: [],
  logo: "",
  backgroundImage: "",
});
const selectedFontForTitles = ref("");
const selectedFontForText = ref("");
const GoogleFonts = ref([]);

// Ensure setFonts is always available
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

const selectFont = async (font, type) => {
  const fontUrl = `https://fonts.googleapis.com/css2?family=${font.replace(
    / /g,
    "+"
  )}:wght@400;700&display=swap`;

  // Check if the font is already in the document head
  const existingLink = document.head.querySelector(`link[href="${fontUrl}"]`);
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);
  }

  // Update the selected font based on type (title or text)
  if (type === "title") {
    selectedFontForTitles.value = font;
  } else if (type === "text") {
    selectedFontForText.value = font;
  }

  // Directly update the font to the database
  await updateHouseStyleInDatabase();
};

// Fetch house style from the database
const getHouseStyleFromDatabase = async () => {
  try {
    const response = await axios.get(`${baseURL}/houseStyles/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    huisstijlData.primaryColor = response.data.primary_color;
    huisstijlData.secondaryColor = response.data.secondary_color;
    huisstijlData.textColor = response.data.text_color;
    huisstijlData.titlesColor = response.data.titles_color;
    huisstijlData.backgroundColor = response.data.background_color;
    huisstijlData.logo = response.data.logo_url || ""; // Set logo URL

    // Set fonts if available
    selectedFontForTitles.value = response.data.fontFamilyTitles || "";
    selectedFontForText.value = response.data.fontFamilyBodyText || "";
  } catch (error) {
    console.error("Error fetching house style:", error);
  }
};

// Open color picker and update color
const openColorPicker = (field) => {
  const input = document.createElement("input");
  input.type = "color";
  input.value = huisstijlData[field];

  input.addEventListener("input", async (event) => {
    huisstijlData[field] = event.target.value;
    await updateHouseStyleInDatabase(); // Update the change in the database
  });

  input.click();
};

// Reset house style function
const resetHouseStyle = async () => {
  const defaultHuisstijl = {
    primaryColor: "#9747ff",
    secondaryColor: "#000000",
    textColor: "#ffffff",
    titlesColor: "#0071e3",
    backgroundColor: "#000000",
    backgroundImage: "", // Clear background image
    fontFamilyTitles: "Syne", // Default font for titles
    fontFamilyBodyText: "DM Sans", // Default font for text
    logo: "https://res.cloudinary.com/dzempjvto/image/upload/v1734208533/Stijn/Huisstijl/yzezrygcrnb8pztjyplp.jpg", // Default Cloudinary logo URL
  };

  // Reset logo and other values
  huisstijlData.primaryColor = defaultHuisstijl.primaryColor;
  huisstijlData.secondaryColor = defaultHuisstijl.secondaryColor;
  huisstijlData.textColor = defaultHuisstijl.textColor;
  huisstijlData.titlesColor = defaultHuisstijl.titlesColor;
  huisstijlData.backgroundColor = defaultHuisstijl.backgroundColor;
  huisstijlData.backgroundImage = defaultHuisstijl.backgroundImage; // Clear background image
  huisstijlData.logo = defaultHuisstijl.logo; // Set default logo URL

  selectedFontForTitles.value = defaultHuisstijl.fontFamilyTitles;
  selectedFontForText.value = defaultHuisstijl.fontFamilyBodyText;

  await updateHouseStyleInDatabase(); // Update the database with the reset values
};

// Upload image to Cloudinary
const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "ycy4zvmj");
  formData.append("cloud_name", "dzempjvto");
  formData.append("folder", "Stijn/Huisstijl");

  try {
    const { data } = await axios.post(
      "https://api.cloudinary.com/v1_1/dzempjvto/image/upload",
      formData
    );
    return data.secure_url; // URL of the uploaded image on Cloudinary
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

// Handle logo upload
const handleLogoUpload = async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      // Upload file to Cloudinary and get URL
      const logoUrl = await uploadToCloudinary(file);

      // Update logo URL in huisstijlData
      huisstijlData.logo = logoUrl;

      // Update the house style in the database with the new logo URL
      await updateHouseStyleInDatabase();
    } catch (error) {
      console.error("Error uploading logo:", error);
    }
  }
};

const fallbackLogo = "../../assets/images/REBILT-logo-white.svg"; // Default fallback logo

// Update house style in the database
const updateHouseStyleInDatabase = async () => {
  try {
    const payload = {
      primary_color: huisstijlData.primaryColor,
      secondary_color: huisstijlData.secondaryColor,
      text_color: huisstijlData.textColor,
      titles_color: huisstijlData.titlesColor,
      background_color: huisstijlData.backgroundColor,
      fontFamilyBodyText: selectedFontForText.value,
      fontFamilyTitles: selectedFontForTitles.value,
      logo_url: huisstijlData.logo || "", // Empty logo
      background_image_url: huisstijlData.backgroundImage || "", // Empty background image
    };

    const response = await axios.put(
      `${baseURL}/houseStyles/${userId}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    await getHouseStyleFromDatabase(); // Fetch updated house style
    setFonts(); // Update fonts
  } catch (error) {
    console.error("Error updating house style:", error);
  }
};

const logoInput = ref(null);
const backgroundInput = ref(null);

// Trigger file input for logo upload
const triggerLogoUpload = () => {
  logoInput.value.click();
};

// Trigger file input for background image upload
const triggerBackgroundUpload = () => {
  backgroundInput.value.click();
};

// Initial setup on component mount
onMounted(() => {
  fetchGoogleFonts(); // Fetch available Google Fonts
  getHouseStyleFromDatabase(); // Fetch user's house style from the database
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
