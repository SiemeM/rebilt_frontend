<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Navigation from "../../components/navComponent.vue";

// Basis-URL afhankelijk van de omgeving
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Router en route-instellingen
const router = useRouter();
const route = useRoute();
const jwtToken = localStorage.getItem("jwtToken");

if (!jwtToken) {
  router.push("/login");
}

// Verkrijg de partnerId uit de routeparameter
const partnerId = route.params.id; // Haal partnerId uit de route

// Partnergegevens en andere variabelen
const partnerData = ref({
  name: "",
  address: {
    street: "",
    city: "",
    postal_code: "",
    country: "",
  },
  contact_email: "",
  contact_phone: "",
  package: "standard", // Default package value is "Standard"
});

const fetchPartnerData = async () => {
  if (!partnerId) {
    console.error("Geen partnerId beschikbaar.");
    alert("Geen partnerId beschikbaar.");
    return;
  }

  try {
    const response = await fetch(`${baseURL}/partners/${partnerId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    partnerData.value = {
      ...data.data.partner,
      address: {
        ...data.data.partner.address,
      },
    }; // Vul partnergegevens in
  } catch (error) {
    console.error("Error fetching partner data:", error);
    alert("Er is een fout opgetreden bij het ophalen van de partnergegevens.");
  }
};

onMounted(() => {
  fetchPartnerData();
});

// Partnergegevens bijwerken
const updatePartner = async () => {
  if (!partnerData.value.name || !partnerData.value.package) {
    alert("Naam en Pakket zijn verplicht.");
    return;
  }

  try {
    const response = await fetch(`${baseURL}/partners/${partnerId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: partnerData.value.name,
        address: partnerData.value.address, // Verstuur het volledige adresobject
        contact_email: partnerData.value.contact_email,
        contact_phone: partnerData.value.contact_phone,
        package: partnerData.value.package, // Verstuur het geselecteerde pakket
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    router.push("/admin/partners"); // Redirect na succesvolle update
  } catch (error) {
    console.error("Error updating partner:", error);
    alert("Er is een fout opgetreden bij het bijwerken van de partner.");
  }
};
</script>

<template>
  <Navigation />
  <div class="content">
    <h1>Partner Bewerken</h1>
    <form v-if="partnerData" @submit.prevent="updatePartner">
      <div class="row">
        <div class="column">
          <label for="name">Naam:</label>
          <input v-model="partnerData.name" type="text" id="name" required />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="street">Straat:</label>
          <input v-model="partnerData.address.street" type="text" id="street" />
        </div>
        <div class="column">
          <label for="city">Stad:</label>
          <input v-model="partnerData.address.city" type="text" id="city" />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="postal_code">Postcode:</label>
          <input
            v-model="partnerData.address.postal_code"
            type="text"
            id="postal_code"
          />
        </div>
        <div class="column">
          <label for="country">Land:</label>
          <input
            v-model="partnerData.address.country"
            type="text"
            id="country"
          />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="contact_email">Contact Email:</label>
          <input
            v-model="partnerData.contact_email"
            type="email"
            id="contact_email"
          />
        </div>
        <div class="column">
          <label for="contact_phone">Contact Telefoon:</label>
          <input
            v-model="partnerData.contact_phone"
            type="tel"
            id="contact_phone"
          />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="package">Pakket:</label>
          <!-- Dropdown voor package -->
          <select v-model="partnerData.package" id="package" required>
            <option value="" disabled>Kies een pakket</option>
            <option value="standard">standard</option>
            <option value="pro">pro</option>
          </select>
        </div>
      </div>
      <button type="submit" class="btn active">Bewerk Partner</button>
    </form>
  </div>
</template>

<style scoped>
/* Stijlen voor je formulier en pagina */
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
