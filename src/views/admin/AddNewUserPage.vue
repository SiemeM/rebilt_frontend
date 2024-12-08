<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import Navigation from "../../components/navComponent.vue";

// Bepaal de basis-URL op basis van de omgeving
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const jwtToken = localStorage.getItem("jwtToken");
const router = useRouter();

// Redirect naar login als er geen token is
if (!jwtToken) {
  router.push("/login");
}

const firstname = ref("");
const lastname = ref("");
const email = ref("");
const password = ref("");
const role = ref("customer"); // Standaardwaarde aangepast
const status = ref("active");
const company = ref("");
const country = ref("");
const city = ref("");
const postalCode = ref("");
const profileImage = ref("");
const bio = ref("");

const isValidEmail = (email) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

const addUser = async () => {
  if (
    !firstname.value ||
    !lastname.value ||
    !email.value ||
    !password.value ||
    !role.value ||
    !status.value
  ) {
    alert("Vul alle velden in.");
    return;
  }

  if (!isValidEmail(email.value)) {
    alert("Vul een geldig e-mailadres in.");
    return;
  }

  try {
    const userPayload = {
      user: {
        firstname: firstname.value,
        lastname: lastname.value,
        email: email.value,
        password: password.value,
        role: role.value,
        activeUnactive: status.value, // activeUnactive wordt gebruikt i.p.v. status
      },
    };

    // Voeg alleen optionele velden toe als ze niet leeg zijn
    if (company.value) userPayload.user.company = company.value;
    if (country.value) userPayload.user.country = country.value;
    if (city.value) userPayload.user.city = city.value;
    if (postalCode.value) userPayload.user.postalCode = postalCode.value;
    if (profileImage.value) userPayload.user.profileImage = profileImage.value;
    if (bio.value) userPayload.user.bio = bio.value;

    console.log("Gebruiker payload:", JSON.stringify(userPayload, null, 2)); // Voeg dit toe om te zien wat je verzendt

    const userResponse = await fetch(`${baseURL}/users/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(userPayload),
    });

    if (!userResponse.ok) {
      const errorDetail = await userResponse.json();
      throw new Error(
        `Fout bij het toevoegen van de gebruiker: ${errorDetail.message}`
      );
    }

    const userResult = await userResponse.json();
    console.log("Gebruiker succesvol aangemaakt:", userResult);

    // Huisstijl toevoegen (optioneel)
    const userId = userResult.data.user.id;

    // Plaats de houseStyle gegevens binnen de 'houseStyle' sleutel
    const houseStylePayload = {
      houseStyle: {
        primary_color: "#0071e3",
        secondary_color: "#9747ff",
        background_color: "#e5e5e5",
        text_color: "#000000",
        fontFamilyBodyText: "DM Sans",
        fontFamilyTitles: "Syne",
        logo_url: "assets/images/logo.png",
        userId: userId,
      },
    };

    const houseStyleResponse = await fetch(`${baseURL}/housestyle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(houseStylePayload), // Verzend de gegevens binnen 'houseStyle' sleutel
    });

    if (!houseStyleResponse.ok) {
      const errorDetail = await houseStyleResponse.json();
      throw new Error(
        `Fout bij het toevoegen van de huisstijl: ${errorDetail.message}`
      );
    }

    // Navigeer naar gebruikerspagina
    router.push("/admin/users");
  } catch (error) {
    console.error("Error adding user or creating house style:", error.message);
    alert(
      "Er is een fout opgetreden bij het toevoegen van de gebruiker of het aanmaken van de huisstijl. Controleer de console voor details."
    );
  }
};
</script>

<template>
  <Navigation />
  <div class="content">
    <h1>Add New User</h1>
    <form @submit.prevent="addUser">
      <!-- Vereiste velden -->
      <div class="row">
        <div class="column">
          <label for="firstname">First Name:</label>
          <input v-model="firstname" id="firstname" type="text" required />
        </div>
        <div class="column">
          <label for="lastname">Last Name:</label>
          <input v-model="lastname" id="lastname" type="text" required />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="email">Email:</label>
          <input v-model="email" id="email" type="email" required />
        </div>
        <div class="column">
          <label for="password">Password:</label>
          <input v-model="password" id="password" type="password" required />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="role">Role:</label>
          <select v-model="role" id="role" required>
            <option value="customer">Customer</option>
            <option value="partner_admin">Partner Admin</option>
            <option value="partner_owner">Partner Owner</option>
            <option value="platform_admin">Platform Admin</option>
          </select>
        </div>
        <div class="column">
          <label for="status">Status:</label>
          <select v-model="status" id="status" required>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <!-- Optionele velden -->
      <div class="row">
        <div class="column">
          <label for="company">Company (optioneel):</label>
          <input v-model="company" id="company" type="text" />
        </div>
        <div class="column">
          <label for="country">Country (optioneel):</label>
          <input v-model="country" id="country" type="text" />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="city">City (optioneel):</label>
          <input v-model="city" id="city" type="text" />
        </div>
        <div class="column">
          <label for="postalCode">Postal Code (optioneel):</label>
          <input v-model="postalCode" id="postalCode" type="text" />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="profileImage">Profile Image URL (optioneel):</label>
          <input v-model="profileImage" id="profileImage" type="text" />
        </div>
        <div class="column">
          <label for="bio">Bio (optioneel):</label>
          <textarea v-model="bio" id="bio" rows="4"></textarea>
        </div>
      </div>

      <!-- Submit button -->
      <button type="submit" class="btn active">Add User</button>
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
