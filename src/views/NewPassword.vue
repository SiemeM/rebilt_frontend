<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";

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
  ? "https://glint-backend-admin.onrender.com/api/v1"
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

          <button class="submitBtn" type="submit">Wachtwoord instellen</button>
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

button {
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
