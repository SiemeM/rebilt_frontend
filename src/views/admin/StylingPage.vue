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

// Functie om de huisstijl op te halen
const getHouseStyleFromDatabase = async () => {
  try {
    const response = await axios.get(`${baseURL}/houseStyles/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Huisstijl succesvol opgehaald:", response.data); // Voeg deze log toe om de API response te controleren

    huisstijlData.primaryColor = response.data.primary_color;
    huisstijlData.secondaryColor = response.data.secondary_color;
    huisstijlData.textColor = response.data.text_color;
    huisstijlData.backgroundColor = response.data.background_color;
    huisstijlData.backgroundColor = response.data.background_color;
    huisstijlData.backgroundImage = response.data.logo_url;
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

    // Haal de geüpdatete huisstijl opnieuw op
    await getHouseStyleFromDatabase();
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

onMounted(() => {
  console.log("Component gemonteerd, data wordt opgehaald...");
  getHouseStyleFromDatabase();
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

.elements .colours {
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
</style>
