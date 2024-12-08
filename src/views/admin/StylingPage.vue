<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";

// Router instantie en gebruikersvalidatie
const router = useRouter();
const token = localStorage.getItem("jwtToken");

// Als er geen token is, wordt de gebruiker doorgestuurd naar de login pagina
if (!token) {
  router.push("/login");
}

// JWT token parseren
const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    return JSON.parse(decodeURIComponent(jsonPayload));
  } catch (error) {
    console.error("Fout bij het parsen van JWT:", error);
    return null;
  }
};

const tokenPayload = parseJwt(token);
const userId = tokenPayload?.userId || null;
if (!userId) {
  router.push("/login");
}

// API basis URL configuratie
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Reactieve data voor het gebruikersprofiel en huisstijl
const user = ref({
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

const huisstijlData = reactive({
  primaryColor: "#9747ff",
  secondaryColor: "#000000",
  titleColor: "#ffffff",
  colorForButtons: "#0071e3",
  fonts: [], // Google fonts worden hier geladen
  logo: "",
  backgroundImage: "",
});

const selectedFontForTitles = ref("");
const selectedFontForText = ref("");

const GoogleFonts = ref([]);

// Functie om het gebruikersprofiel op te halen
const fetchUserProfile = async () => {
  try {
    const { data } = await axios.get(`${baseURL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    Object.assign(user, data?.data?.user);
  } catch (error) {
    console.error("Fout bij het ophalen van het gebruikersprofiel:", error);
  }
};

// Functie om huisstijl data op te halen
const fetchHuisstijlData = async () => {
  const cachedHuisstijlData = localStorage.getItem("huisstijlData");
  if (cachedHuisstijlData) {
    Object.assign(huisstijlData, JSON.parse(cachedHuisstijlData));
    console.log("Huisstijl data geladen uit cache:", huisstijlData);
    if (huisstijlData.fonts && huisstijlData.fonts.length > 0) {
      selectedFontForTitles.value = huisstijlData.fonts[0].name;
      selectedFontForText.value = huisstijlData.fonts[1].name;
    }
    return;
  }

  try {
    const response = await axios.get(
      `https://res.cloudinary.com/dzempjvto/raw/upload/v1732653110/Stijn/Huisstijl/huisstijl_data.json?nocache=${new Date().getTime()}`
    );
    const data = response.data;
    localStorage.setItem("huisstijlData", JSON.stringify(data));
    Object.assign(huisstijlData, data);
    console.log("Huisstijl data geladen:", data);
    if (huisstijlData.fonts && huisstijlData.fonts.length > 0) {
      selectedFontForTitles.value = huisstijlData.fonts[0].name;
      selectedFontForText.value = huisstijlData.fonts[1].name;
    }
  } catch (error) {
    console.error("Fout bij het ophalen van huisstijl data:", error);
  }
};

// Functie om Google Fonts op te halen
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

// Dynamisch een Google Font laden
const loadGoogleFont = (font) => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(
    /\s+/g,
    "+"
  )}&display=swap`;
  document.head.appendChild(link);
};

// Selecteer een font en update de huisstijl
const selectFont = (font, type) => {
  if (GoogleFonts.value.includes(font)) {
    loadGoogleFont(font); // Dynamisch laden van het font
  }

  if (
    huisstijlData.fonts.some((f) => f.name === font) ||
    GoogleFonts.value.includes(font)
  ) {
    if (type === "title") {
      selectedFontForTitles.value = font;
      huisstijlData.fonts[0].name = font;
    } else if (type === "text") {
      selectedFontForText.value = font;
      huisstijlData.fonts[1].name = font;
    }
    console.log("Geselecteerd font:", font);
  } else {
    console.error("Font niet gevonden in de beschikbare lijst:", font);
  }
};

// Functie om bestand te uploaden naar Cloudinary
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
    return data.secure_url;
  } catch (error) {
    console.error("Fout bij het uploaden van bestand:", error);
    throw error;
  }
};

// Functie om de kleur van een veld aan te passen

// Refs voor bestandsinvoer
const fontInput = ref(null);

// Functie om de bestandinvoer voor fonts aan te roepen
const triggerFontInput = () => {
  fontInput.value?.click();
};

const openColorPicker = (field) => {
  // Kleurkiezer openen
  const input = document.createElement("input");
  input.type = "color";
  input.value = huisstijlData[field];

  input.addEventListener("input", async (event) => {
    huisstijlData[field] = event.target.value;
    await updateHuisstijlDataJson(); // Update de wijzigingen op Cloudinary
  });

  input.click();
};
const resetHouseStyle = async () => {
  const defaultData = {
    primaryColor: "#9747ff",
    secondaryColor: "#000000",
    titleColor: "#ffffff",
    colorForButtons: "#0071e3",
    fonts: [
      {
        name: "DM Sans",
        path: "https://metejoor.be/assets/fonts/DINCondensedWeb.woff2",
      },
      {
        name: "Syne",
        path: "https://metejoor.be/assets/fonts/DINCondensedWeb.woff2",
      },
    ],
    logo: "https://img-cdn.pixlr.com/image-generator/history/65bb506dcb310754719cf81f/ede935de-1138-4f66-8ed7-44bd16efc709/medium.webp",
    backgroundImage:
      "https://img-cdn.pixlr.com/image-generator/history/65bb506dcb310754719cf81f/ede935de-1138-4f66-8ed7-44bd16efc709/medium.webp",
  };

  try {
    // Reset huisstijlData veld per veld
    Object.keys(defaultData).forEach((key) => {
      huisstijlData[key] = defaultData[key];
    });

    // Update de JSON op Cloudinary
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([JSON.stringify(defaultData)], { type: "application/json" })
    );
    formData.append("upload_preset", "ycy4zvmj");
    formData.append("resource_type", "raw");
    formData.append("public_id", "huisstijl_data.json");
    formData.append("folder", "Stijn/Huisstijl");

    await axios.post(
      "https://api.cloudinary.com/v1_1/dzempjvto/raw/upload",
      formData
    );

    console.log("Huisstijl succesvol gereset naar de standaardinstellingen.");
  } catch (error) {
    console.error("Fout bij het resetten van de huisstijl:", error);
  }
};

// Laden van Google Fonts en huisstijl data bij het starten van de component
onMounted(() => {
  fetchGoogleFonts();
  fetchHuisstijlData();
  fetchUserProfile();
});
</script>

<template>
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
          <h3>Title color</h3>
          <div class="row">
            <p>{{ huisstijlData.titleColor }}</p>
            <div
              class="color"
              :style="{ backgroundColor: huisstijlData.titleColor }"
              @click="openColorPicker('titleColor')"
            ></div>
          </div>
        </div>
        <div class="column">
          <h3>Color for buttons</h3>
          <div class="row">
            <p>{{ huisstijlData.colorForButtons }}</p>
            <div
              class="color"
              :style="{ backgroundColor: huisstijlData.colorForButtons }"
              @click="openColorPicker('colorForButtons')"
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
                <!-- Voeg zowel Google Fonts als de fonts uit huisstijlData toe -->
                <option
                  v-for="font in [
                    ...GoogleFonts,
                    ...huisstijlData.fonts.map((f) => f.name),
                  ]"
                  :key="font"
                  :value="font"
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
            <img :src="huisstijlData.logo" alt="Logo" />
            <!-- Bestandinvoer voor logo -->
            <input
              type="file"
              ref="logoInput"
              @change="handleFileChange($event, 'logo')"
              style="display: none"
            />
            <button @click="triggerFileInput('logo')">Upload</button>
          </div>
        </div>

        <div class="column">
          <h3>Background Image</h3>
          <div class="row">
            <img :src="huisstijlData.backgroundImage" alt="Background Image" />
            <!-- Bestandinvoer voor achtergrondafbeelding -->
            <input
              type="file"
              ref="backgroundInput"
              @change="handleFileChange($event, 'backgroundImage')"
              style="display: none"
            />
            <button @click="triggerFileInput('backgroundImage')">Upload</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.elements {
  background-color: #1d1d1d;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
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

.elements .colours {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.elements .colours,
.elements .fonts,
.elements .images {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.elements .images img {
  width: 64px;
  height: 64px;
}

.elements .images .row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
}

button {
  background-color: var(--purple);
  color: var(--white);
  border-radius: 8px;
  padding: 4px 12px;
}
.column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column .row,
.images .row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.column .row .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column .row .color {
  width: 24px;
  height: 24px;
  border: 3px solid var(--gray);
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
