<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";

// Variabelen voor e-mail, verificatiecode en foutmeldingen
const email = ref("");
const verificationCode = ref("");
const errorMessage = ref("");
const router = useRouter();
const route = useRoute();

// Functie voor e-mailvalidatie
const isValidEmail = (email) => {
  if (!email || typeof email !== "string") {
    return false;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

// Haal de 'email' queryparameter op via Vue Router
onMounted(() => {
  const routeEmail = route.query.email;
  if (routeEmail) {
    email.value = routeEmail;
    console.log("Email from query parameter:", routeEmail);
  }
});

// Controle of we in de productieomgeving draaien
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1" // Zorg dat dit HTTPS is voor productie
  : "http://localhost:3000/api/v1"; // Gebruik HTTP voor lokaal

// Functie om de e-mail te versturen naar de backend
const sendMail = async () => {
  if (!isValidEmail(email.value)) {
    errorMessage.value = "Voer een geldig e-mailadres in.";
    return;
  }

  try {
    const response = await axios.post(`${baseURL}/users/forgot-password`, {
      email: email.value,
    });

    // Controleer of het antwoord succesvol is
    if (response && response.status >= 200 && response.status < 300) {
      errorMessage.value = "";
      router.push({ path: "/verificationCode", query: { email: email.value } });
    } else {
      errorMessage.value = "Er is een onverwachte fout opgetreden.";
    }
  } catch (error) {
    // Specifieke foutmelding voor een 404 of andere netwerkfouten
    if (error.response) {
      if (error.response.status === 404) {
        errorMessage.value = "Gebruiker niet gevonden.";
      } else if (error.response.status === 500) {
        errorMessage.value =
          "Er is een serverfout opgetreden. Probeer het later opnieuw.";
        console.error("500 Error:", error.response.data);
      } else {
        errorMessage.value = "Er is een onbekende fout opgetreden.";
      }
    } else {
      errorMessage.value = "Er is een probleem met het netwerk.";
    }
  }
};
</script>

<template>
  <div class="container">
    <div class="overlay">
      <div class="elements">
        <h1>Forgot password</h1>
        <form @submit.prevent="sendMail">
          <div class="column">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="johndoe@gmail.com"
              required
            />
          </div>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

          <button class="submitBtn active" type="submit">Send mail</button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS-stijlen voor je formulier */
.container {
  position: relative;
  background-image: url("../assets/images/background.jpg");
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  width: 100%;
  height: 100vh;
}

.overlay {
  background-color: rgba(0, 0, 0, 0.6);
  width: 100%;
  height: 100vh;
}

.elements {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  width: 50%;
  background-color: rgba(0, 0, 0, 0.32);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 48px;
  padding: 48px;
  border-radius: 8px;
  margin: 48px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.error {
  color: #d34848;
}

.submitBtn {
  background-color: #403754;
  color: var(--white);
  border: none;
  border-radius: 4px;
  padding: 8px;
}

input {
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 4px 8px;
  border-radius: 8px;
  color: var(--white);
}
</style>
