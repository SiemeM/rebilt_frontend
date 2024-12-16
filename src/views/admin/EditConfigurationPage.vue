<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Basis-URL afhankelijk van de omgeving
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const jwtToken = localStorage.getItem("jwtToken");
const router = useRouter();
const route = useRoute();
let partnerId = route.query.partnerId; // Verkrijg de partnerId uit de queryparameters

// Redirect naar login als er geen token is
if (!jwtToken) {
  router.push("/login");
}

// Variabelen voor configuratiegegevens
const fieldName = ref("");
const fieldType = ref("");
const optionsInput = ref(""); // Gebruiken we om de invoer voor opties vast te leggen
const options = ref([]); // Dit wordt een array van opties

onMounted(async () => {
  const configId = route.params.id;

  // Als partnerId "null" is, converteren we het naar null (JavaScript null)
  if (partnerId === "null") {
    partnerId = null;
  }

  if (configId) {
    try {
      const response = await fetch(
        `${baseURL}/configurations/${configId}?partnerId=${partnerId}`,
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Fout bij het ophalen van de configuratie.");
      }

      const config = await response.json();

      // Log de ontvangen configuratie
      console.log("Received configuration:", config);

      // Controleer of config de nodige velden bevat
      const configOptions = Array.isArray(config.data.options)
        ? config.data.options
        : [];
      const configFieldName = config.data.fieldName || "";
      const configFieldType = config.data.fieldType || "";

      // Vul de velden met de gegevens van de configuratie
      fieldName.value = configFieldName;
      fieldType.value = configFieldType;
      optionsInput.value = configOptions.join(", "); // Join de opties als een string
      options.value = configOptions; // Zet de opties als een array

      // Log de ingevulde velden
      console.log("Veldnaam:", fieldName.value);
      console.log("Veldtype:", fieldType.value);
      console.log("Opties:", optionsInput.value);
    } catch (error) {
      console.error("Error fetching configuration:", error.message);
      alert("Er is een fout opgetreden bij het ophalen van de configuratie.");
    }
  }
});

// Functie om opties om te zetten naar een array
const updateOptions = () => {
  options.value = optionsInput.value
    .split(",")
    .map((option) => option.trim()) // Trim de extra spaties
    .filter((option) => option !== ""); // Verwijder lege waarden
};

// Functie om een configuratie bij te werken
const updateConfiguration = async () => {
  // Configuratie payload
  const configurationPayload = {
    fieldName: fieldName.value,
    fieldType: fieldType.value,
    options: options.value, // Voor een dropdown, vul hier de opties in
  };

  const configId = route.params.id;
  const partnerQuery = partnerId ? `?partnerId=${partnerId}` : ""; // PartnerId optioneel
  try {
    const response = await fetch(
      `${baseURL}/configurations/${configId}${partnerQuery}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify(configurationPayload),
      }
    );

    if (!response.ok) {
      const errorDetail = await response.json();
      throw new Error(
        `Fout bij het bijwerken van de configuratie: ${errorDetail.message}`
      );
    }

    const result = await response.json();
    console.log("Update Result:", result);

    // Redirect naar de configuratiepagina
    router.back();
  } catch (error) {
    console.error("Error updating configuration:", error.message);
    alert("Er is een fout opgetreden bij het bijwerken van de configuratie.");
  }
};
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="content">
    <h1>Configuratie Bewerken</h1>
    <form @submit.prevent="updateConfiguration">
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
            <!-- Voeg hier eventueel andere veldtypes toe -->
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

      <button type="submit" class="btn active">Update Configuratie</button>
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
