<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Router instantie en gebruikersvalidatie
const router = useRouter();
const token = localStorage.getItem("jwtToken");

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
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Reactieve data voor het gebruikersprofiel en huisstijl
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

// Zorg ervoor dat setFonts altijd beschikbaar is
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

// Google Fonts ophalen
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

// Functie om de huisstijl op te halen
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
    huisstijlData.logo = response.data.logo_url || ""; // Logo URL instellen

    // Set de fonts als ze beschikbaar zijn
    selectedFontForTitles.value = response.data.fontFamilyTitles || "";
    selectedFontForText.value = response.data.fontFamilyBodyText || "";
  } catch (error) {
    console.error("Fout bij het ophalen van huisstijl:", error);
  }
};

// Functie om de kleurkiezer te openen en kleur te updaten
const openColorPicker = (field) => {
  const input = document.createElement("input");
  input.type = "color";
  input.value = huisstijlData[field];

  input.addEventListener("input", async (event) => {
    huisstijlData[field] = event.target.value;
    await updateHouseStyleInDatabase(); // Update de wijziging in de database
  });

  input.click();
};

const resetHouseStyle = async () => {
  const defaultHuisstijl = {
    primaryColor: "#9747ff",
    secondaryColor: "#000000",
    textColor: "#ffffff",
    titlesColor: "#0071e3",
    backgroundColor: "#000000",
    backgroundImage: "",
    logo: "", // Logo leeg maken
  };

  huisstijlData.primaryColor = defaultHuisstijl.primaryColor;
  huisstijlData.secondaryColor = defaultHuisstijl.secondaryColor;
  huisstijlData.textColor = defaultHuisstijl.textColor;
  huisstijlData.titlesColor = defaultHuisstijl.titlesColor;
  huisstijlData.backgroundColor = defaultHuisstijl.backgroundColor;
  huisstijlData.backgroundImage = defaultHuisstijl.backgroundImage;
  huisstijlData.logo = ""; // Het logo leeg maken

  await updateHouseStyleInDatabase(); // Update de huisstijl in de database met het lege logo
};

// Functie voor het uploaden naar Cloudinary
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
    return data.secure_url; // Dit is de URL van de geüploade afbeelding op Cloudinary
  } catch (error) {
    console.error("Fout bij het uploaden van bestand:", error);
    throw error;
  }
};

// Functie om de logo upload te verwerken
// Functie om de logo upload te verwerken
const handleLogoUpload = async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      // Upload het bestand naar Cloudinary en krijg de URL
      const logoUrl = await uploadToCloudinary(file);

      // Werk de logo URL bij in huisstijlData
      huisstijlData.logo = logoUrl;

      // Werk de huisstijl bij in de database met de nieuwe logo_url
      await updateHouseStyleInDatabase();
    } catch (error) {
      console.error("Fout bij het uploaden van logo:", error);
    }
  }
};

const fallbackLogo = "../../assets/images/REBILT-logo-white.svg"; // Replace this with your actual fallback logo URL

// Functie om de huisstijl in de database bij te werken
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
      logo_url: huisstijlData.logo || null, // Zorg ervoor dat de logo URL naar null gaat als leeg
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

    await getHouseStyleFromDatabase(); // Haal de geüpdatete huisstijl op
    setFonts(); // Werk de fonts bij
  } catch (error) {
    console.error("Fout bij het bijwerken van huisstijl:", error);
  }
};

// Functie om de afbeelding te selecteren
const triggerLogoUpload = () => {
  if (logoInput.value) {
    logoInput.value.click();
  }
};

const logoInput = ref(null);
const backgroundInput = ref(null);

const triggerFileInput = (field) => {
  if (field === "logo" && logoInput.value) {
    logoInput.value.click(); // Verwijst naar het `<input>`-element
  } else if (field === "backgroundImage" && backgroundInput.value) {
    backgroundInput.value.click();
  }
};

onMounted(() => {
  getHouseStyleFromDatabase();
  fetchGoogleFonts();
  setFonts();
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

            <!-- Logo uploaden -->
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
