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
  console.log("Geen token gevonden, doorsturen naar login.");
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

const setFonts = () => {
  // Stel de fonts in op basis van de geselecteerde waarden
  document.documentElement.style.setProperty(
    "--title-font",
    selectedFontForTitles.value || "default"
  );
  document.documentElement.style.setProperty(
    "--body-font",
    selectedFontForText.value || "default"
  );
};

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

    console.log("Huisstijl succesvol opgehaald:", response.data);
    huisstijlData.primaryColor = response.data.primary_color;
    huisstijlData.secondaryColor = response.data.secondary_color;
    huisstijlData.textColor = response.data.text_color;
    huisstijlData.titlesColor = response.data.titles_color;
    huisstijlData.backgroundColor = response.data.background_color;
    huisstijlData.backgroundImage = response.data.logo_url; // Optional field

    // Set the font values if they exist
    selectedFontForTitles.value = response.data.fontFamilyTitles || "";
    selectedFontForText.value = response.data.fontFamilyBodyText || "";
  } catch (error) {
    console.error("Fout bij het ophalen van huisstijl:", error);
  }
};

// Functie om de huisstijl in de database bij te werken
const updateHouseStyleInDatabase = async () => {
  try {
    const payload = {
      primary_color: huisstijlData.primaryColor,
      secondary_color: huisstijlData.secondaryColor,
      text_color: huisstijlData.textColor,
      titles_color: huisstijlData.titlesColor,
      background_color: huisstijlData.backgroundColor,
      fontFamilyBodyText: selectedFontForText.value, // Font voor tekst
      fontFamilyTitles: selectedFontForTitles.value, // Font voor titels
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

    console.log("Huisstijl succesvol geüpdatet:", response.data);
    await getHouseStyleFromDatabase(); // Refresh om de bijgewerkte data op te halen
    setFonts(); // Werk de fonts bij nadat de stijl is geüpdatet
  } catch (error) {
    console.error("Fout bij het bijwerken van huisstijl:", error);
  }
};

// Functie om de kleurkiezer te openen en kleur te updaten
const openColorPicker = (field) => {
  const input = document.createElement("input");
  input.type = "color";
  input.value = huisstijlData[field];

  input.addEventListener("input", async (event) => {
    huisstijlData[field] = event.target.value;
    console.log(`${field} bijgewerkt naar: ${huisstijlData[field]}`); // Log de kleur om te controleren
    await updateHouseStyleInDatabase(); // Update de wijziging in de database
  });

  input.click();
};

const resetHouseStyle = async () => {
  // Define the default values for the house style
  const defaultHuisstijl = {
    primaryColor: "#9747ff",
    secondaryColor: "#000000",
    textColor: "#ffffff",
    titlesColor: "#0071e3",
    backgroundColor: "#000000",
    backgroundImage: "",
  };

  // Reset the huisstijlData to default values
  huisstijlData.primaryColor = defaultHuisstijl.primaryColor;
  huisstijlData.secondaryColor = defaultHuisstijl.secondaryColor;
  huisstijlData.textColor = defaultHuisstijl.textColor;
  huisstijlData.titlesColor = defaultHuisstijl.titlesColor;
  huisstijlData.backgroundColor = defaultHuisstijl.backgroundColor;
  huisstijlData.backgroundImage = defaultHuisstijl.backgroundImage; // Dit is optioneel

  // Optionally, update the database with the default values
  await updateHouseStyleInDatabase();
};

onMounted(() => {
  console.log("Component gemonteerd, data wordt opgehaald...");
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

      <!-- <div class="images">
        <h2>Images</h2>
        <div class="column">
          <h3>Logo</h3>
          <div class="row">
            <img :src="huisstijlData.logo" alt="Logo" />
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
            <input
              type="file"
              ref="backgroundInput"
              @change="handleFileChange($event, 'backgroundImage')"
              style="display: none"
            />
            <button @click="triggerFileInput('backgroundImage')">Upload</button>
          </div>
        </div>
      </div> -->
    </div>
  </div>
</template>

<style scoped>
.elements {
  background-color: var(--secondary-color);
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
