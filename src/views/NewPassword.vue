<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";
import DynamicStyle from "../components/DynamicStyle.vue";

const email = ref("");
const newPassword = ref("");
const repeatNewPassword = ref("");
const errorMessage = ref("");
const router = useRouter();
const route = useRoute();

onMounted(() => {
  const emailQuery = route.query.email;

  if (typeof emailQuery === "string") {
    email.value = emailQuery;
  } else if (emailQuery) {
    console.warn("Email query parameter is not a string:", emailQuery);
  } else {
    console.info("No email query parameter provided.");
  }
});

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const updatePassword = async () => {
  if (newPassword.value !== repeatNewPassword.value) {
    errorMessage.value = "Wachtwoorden komen niet overeen.";
    return;
  }

  if (newPassword.value.length < 8) {
    errorMessage.value = "Het wachtwoord moet minimaal 8 tekens lang zijn.";
    return;
  }

  try {
    const response = await axios.post(`${baseURL}/users/reset-password`, {
      email: email.value,
      newPassword: newPassword.value,
    });

    if (response.status === 200) {
      router.push("/login");
    } else {
      errorMessage.value = "Er is een onverwachte fout opgetreden.";
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      switch (error.response.status) {
        case 400:
          errorMessage.value = "Ongeldig verzoek.";
          break;
        case 404:
          errorMessage.value = "Gebruiker niet gevonden.";
          break;
        default:
          errorMessage.value =
            "Er is een fout opgetreden bij het instellen van het wachtwoord.";
          break;
      }
    } else {
      errorMessage.value = "Netwerkfout.";
    }
  }
};
</script>

<template>
  <DynamicStyle />
  <div class="container">
    <div class="overlay">
      <div class="elements">
        <h1>Nieuw wachtwoord instellen</h1>
        <form @submit.prevent="updatePassword">
          <div class="column">
            <label for="newPassword">Nieuw wachtwoord</label>
            <input
              id="newPassword"
              v-model="newPassword"
              type="password"
              placeholder="●●●●●●●●"
              required
            />
          </div>
          <div class="column">
            <label for="repeatNewPassword">Herhaal nieuw wachtwoord</label>
            <input
              id="repeatNewPassword"
              v-model="repeatNewPassword"
              type="password"
              placeholder="●●●●●●●●"
              required
            />
          </div>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

          <button class="btn active" type="submit">Wachtwoord instellen</button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Jouw bestaande CSS-stijlen */
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
  background-color: rgba(0, 0, 0, 0.4);
  width: 100%;
  height: 100vh;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.elements {
  background-color: rgba(0, 0, 0, 0.32);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

input {
  border: 1px solid rgba(255, 255, 255, 0.4);
  background-color: transparent;
  padding: 0.25rem 1rem;
  border-radius: 4px;
  width: 100%;
}
</style>
