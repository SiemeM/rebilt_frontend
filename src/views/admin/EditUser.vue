<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Navigation from "../../components/navComponent.vue";

// Bepaal de basis-URL op basis van de hostname
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const route = useRoute();
const router = useRouter();
const jwtToken = localStorage.getItem("jwtToken");

if (!jwtToken) {
  router.push("/login");
}

const firstname = ref("");
const lastname = ref("");
const email = ref("");
const password = ref("");
const role = ref("customer");
const status = ref("active");
const company = ref(""); // Bedrijf
const bio = ref(""); // Bio
const country = ref(""); // Land
const city = ref(""); // Stad
const postalCode = ref(""); // Postcode
const profileImage = ref(null); // Dit blijft hetzelfde

// Functie voor bestandshantering
const handleFileChange = (event) => {
  const file = event.target.files[0]; // Haal het eerste bestand op
  profileImage.value = file; // Sla het bestand op in de profileImage variabele
};

const userData = ref(null);
const userId = route.params.id;

const isValidEmail = (email) => {
  // Controleer eerst of het emailadres leeg is
  if (!email || typeof email !== "string") {
    return false;
  }

  // Reguliere expressie voor e-mailvalidatie
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Test de e-mail tegen de reguliere expressie
  return emailPattern.test(email);
};

const fetchUserData = async () => {
  try {
    const response = await fetch(`${baseURL}/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json(); // JSON-parsing hier
    userData.value = data.data.user; // Wijzig hier naar 'userData.value' i.p.v. 'userData'

    // Vul de form velden met de ontvangen data
    if (userData.value) {
      firstname.value = userData.value.firstname;
      lastname.value = userData.value.lastname;
      email.value = userData.value.email;
      role.value = userData.value.role;
      status.value = userData.value.activeUnactive;
      country.value = userData.value.country; // Nieuw toegevoegd
      city.value = userData.value.city; // Nieuw toegevoegd
      postalCode.value = userData.value.postalCode; // Nieuw toegevoegd
      profileImage.value = userData.value.profileImage; // Nieuw toegevoegd
      bio.value = userData.value.bio; // Nieuw toegevoegd
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
};

onMounted(() => {
  fetchUserData();
});

const updateUser = async () => {
  if (
    !firstname.value ||
    !lastname.value ||
    !email.value ||
    !role.value ||
    !status.value
  ) {
    alert("Vul alle velden in.");
    return;
  }

  if (!isValidEmail(email.value)) {
    alert("Voer een geldig e-mailadres in.");
    return;
  }

  try {
    const payload = {
      user: {
        firstname: firstname.value,
        lastname: lastname.value,
        email: email.value,
        password: password.value, // Voeg hier de password toe als je het wilt bijwerken
        role: role.value,
        activeUnactive: status.value,
        company: company.value,
        bio: bio.value,
        country: country.value,
        city: city.value,
        postalCode: postalCode.value,
      },
    };

    const response = await fetch(`${baseURL}/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`, // Als je token nodig hebt voor authenticatie
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    router.push("/admin/users");
  } catch (error) {
    console.error("Error updating user:", error);
    alert("Er is een fout opgetreden bij het bijwerken van de gebruiker.");
  }
};
</script>

<template>
  <Navigation />
  <div class="content">
    <h1>Edit user</h1>
    <form v-if="userData" @submit.prevent="updateUser">
      <div class="row">
        <div class="column">
          <label for="firstname">Voornaam:</label>
          <input v-model="firstname" id="firstname" type="text" required />
        </div>
        <div class="column">
          <label for="lastname">Achternaam:</label>
          <input v-model="lastname" id="lastname" type="text" required />
        </div>
      </div>
      <div class="column">
        <label for="email">E-mail:</label>
        <input v-model="email" id="email" type="email" required />
      </div>
      <div class="row">
        <div class="column">
          <label for="role">Rol:</label>
          <select v-model="role" id="role">
            <option value="customer">Customer</option>
            <option value="partner_admin">Partner Admin</option>
            <option value="partner_owner">Partner Owner</option>
            <option value="platform_admin">Platform Admin</option>
          </select>
        </div>
        <div class="column">
          <label for="status">Status:</label>
          <select v-model="status" id="status">
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
          </select>
        </div>
      </div>

      <!-- Nieuwe velden toegevoegd -->
      <div class="column">
        <label for="company">Bedrijf:</label>
        <input v-model="company" id="company" type="text" />
      </div>
      <div class="column">
        <label for="bio">Bio:</label>
        <textarea v-model="bio" id="bio" rows="4"></textarea>
      </div>
      <div class="row">
        <div class="column">
          <label for="country">Land:</label>
          <input v-model="country" id="country" type="text" />
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
          <label for="profileImage">Profielafbeelding:</label>
          <input type="file" id="profileImage" @change="handleFileChange" />
        </div>
      </div>

      <button type="submit" class="btn active">Save</button>
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
