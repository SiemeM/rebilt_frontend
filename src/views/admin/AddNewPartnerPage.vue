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

// Variabelen voor partnergegevens
const name = ref("");
const street = ref("");
const city = ref("");
const postalCode = ref("");
const country = ref("");
const contactEmail = ref("");
const contactPhone = ref("");
const subscriptionPackage = ref("standard"); // Herbenoemd van 'package' naar 'subscriptionPackage'

const defaultStyles = {
  primary_color: "rgb(151, 71, 255)",
  secondary_color: "rgb(0, 0, 0)",
  titles_color: "rgb(0, 113, 227)",
  text_color: "rgb(255, 255, 255)",
  background_color: "rgb(0, 0, 0)",
  fontFamilyTitles: "Syne, serif",
  fontFamilyBodyText: "DM Sans, sans-serif",
  logo_url: "../../src/assets/images/REBILT-logo-white.svg",
};

// Validatie van het e-mailadres
const isValidEmail = (email) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

// Functie om een nieuwe partner toe te voegen
const addPartner = async () => {
  // Validatie van verplichte velden
  if (!name.value || !subscriptionPackage.value) {
    alert("Naam en pakket zijn verplicht.");
    return;
  }

  if (contactEmail.value && !isValidEmail(contactEmail.value)) {
    alert("Voer een geldig e-mailadres in.");
    return;
  }

  // Definieer de partnerPayload hier
  const partnerPayload = {
    name: name.value,
    address: {
      street: street.value,
      city: city.value,
      postal_code: postalCode.value,
      country: country.value,
    },
    contact_email: contactEmail.value || null,
    contact_phone: contactPhone.value || null,
    package: subscriptionPackage.value, // Gebruik hier de hernoemde variabele 'subscriptionPackage'
    ...defaultStyles, // Voeg de standaard huisstijl toe aan het payload
  };

  try {
    const response = await fetch(`${baseURL}/partners`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(partnerPayload),
    });

    if (!response.ok) {
      const errorDetail = await response.json();
      throw new Error(
        `Fout bij het toevoegen van de partner: ${errorDetail.message}`
      );
    }

    const result = await response.json();
    console.log("Partner succesvol toegevoegd:", result);

    // Redirect naar partnerspagina
    router.push("/admin/partners");
  } catch (error) {
    console.error("Error adding partner:", error.message);
    alert(
      "Er is een fout opgetreden bij het toevoegen van de partner. Controleer de console voor details."
    );
  }
};
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="content">
    <h1>Nieuwe Partner Toevoegen</h1>
    <form @submit.prevent="addPartner">
      <div class="row">
        <div class="column">
          <label for="name">Naam:</label>
          <input v-model="name" id="name" type="text" required />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="street">Straat:</label>
          <input v-model="street" id="street" type="text" />
        </div>
        <div class="column">
          <label for="city">Stad:</label>
          <input v-model="city" id="city" type="text" />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="postalCode">Postcode:</label>
          <input v-model="postalCode" id="postalCode" type="text" />
        </div>
        <div class="column">
          <label for="country">Land:</label>
          <input v-model="country" id="country" type="text" />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="contactEmail">Contact E-mail:</label>
          <input v-model="contactEmail" id="contactEmail" type="email" />
        </div>
        <div class="column">
          <label for="contactPhone">Contact Telefoon:</label>
          <input v-model="contactPhone" id="contactPhone" type="tel" />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="subscriptionPackage">Pakket:</label>
          <select
            v-model="subscriptionPackage"
            id="subscriptionPackage"
            required
          >
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
          </select>
        </div>
      </div>

      <button type="submit" class="btn active">Voeg Partner Toe</button>
    </form>
  </div>
</template>

<style scoped>
/* Voeg hier je stijlen toe */
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
