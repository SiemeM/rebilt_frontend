<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Basis-URL afhankelijk van de omgeving
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const jwtToken = localStorage.getItem("jwtToken");
const router = useRouter();

// Redirect naar login als er geen token is
if (!jwtToken) {
  router.push("/login");
}

// Variabelen voor configuratiegegevens
const fieldName = ref("");
const fieldType = ref("");
const optionsInput = ref("");
const options = ref([]); // Dit zal de kleur-ID's bevatten

// Kleur input
const colorInput = ref(""); // Input voor kleurconfiguratie
const selectedColors = ref([]); // Dit slaat de geselecteerde kleuren op als kleur-ID's

// Functie om een unieke kleur-ID te genereren (UUID)
const generateUniqueId = () => {
  return "_" + Math.random().toString(36).substr(2, 9); // Dit genereert een eenvoudige unieke ID
};

// Functie om kleur toe te voegen aan de geselecteerde kleuren
const addColor = () => {
  if (colorInput.value && !selectedColors.value.includes(colorInput.value)) {
    // Genereer een unieke ID voor de kleur
    const colorId = generateUniqueId();

    // Voeg de kleur-ID toe aan de opties-array en de naam voor weergave
    selectedColors.value.push({ id: colorId, hex: colorInput.value });
    options.value.push(colorId); // Voeg de kleur-ID toe aan de opties

    colorInput.value = ""; // Reset de kleurinput
  } else {
    console.error("De geselecteerde kleur heeft geen bijbehorende kleur-ID.");
  }
};

// Functie om de configuratie toe te voegen
const addConfiguration = async () => {
  const configurationPayload = {
    fieldName: fieldName.value,
    fieldType: fieldType.value,
    options:
      fieldType.value === "Color"
        ? selectedColors.value.map((c) => c.hex) // Stuur hex-waarden als opties
        : options.value,
    isColor: fieldType.value === "Color",
  };

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
      console.error("Error from server:", errorDetail);
      throw new Error(
        `Fout bij het toevoegen van de configuratie: ${errorDetail.message}`
      );
    }

    const result = await response.json();
    router.back();
  } catch (error) {
    console.error("Error adding configuration:", error.message);
    alert("Er is een fout opgetreden bij het toevoegen van de configuratie.");
  }
};

const updateOptions = () => {
  // Verwerk de tekst in het invoerveld en zet om naar een array
  options.value = optionsInput.value
    .split(",") // Split de string op komma's
    .map((opt) => opt.trim()) // Verwijder eventuele spaties rond de waarde
    .filter((opt) => opt); // Filter lege waarden eruit
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
            <option value="Color">Kleur</option>
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
      <!-- Kleur input -->
      <div class="row" v-if="fieldType === 'Color'">
        <div class="column">
          <label for="color">Kleur:</label>
          <input v-model="colorInput" id="color" type="color" />
          <button type="button" @click="addColor">Voeg Kleur Toe</button>
          <small>Selecteer een kleur voor de configuratie</small>
        </div>
      </div>

      <!-- Toon de geselecteerde kleuren als cirkels -->
      <div v-if="fieldType === 'Color' && selectedColors.length > 0">
        <h4>Geselecteerde Kleuren:</h4>
        <ul class="color-list">
          <li
            v-for="(color, index) in selectedColors"
            :key="index"
            :style="{
              backgroundColor: color.hex,
            }"
            class="color-circle"
          >
            {{ color.hex }}
          </li>
        </ul>
      </div>

      <button type="submit" class="btn active">Voeg Configuratie Toe</button>
    </form>
  </div>
</template>

<style scoped>
/* Stijl voor de pagina */
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
  border: 1px solid var(--gray-700);
  background-color: var(--gray-700);
  color: white;
}

button {
  color: white;
  cursor: pointer;
}

.color-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.color-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #fff;
}
</style>
