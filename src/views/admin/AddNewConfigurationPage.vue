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
    router.push("/admin/configurations");
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
