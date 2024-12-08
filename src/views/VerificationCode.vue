<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";

const email = ref("");
const verificationCode = ref("");
const successMessage = ref("");
const errorMessage = ref("");
const router = useRouter();
const route = useRoute();

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

const isValidCode = (code) => {
  // Controleer of de code een geldige string is
  if (typeof code !== "string") {
    return false;
  }

  // Trim de string en controleer of deze niet leeg is
  return code.trim().length > 0;
};

onMounted(() => {
  const emailQuery = route.query.email;

  if (typeof emailQuery === "string") {
    email.value = emailQuery;
  } else if (emailQuery) {
    console.warn("Unexpected email query type:", typeof emailQuery);
  }
});

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const sendMail = async () => {
  if (!isValidEmail(email.value)) {
    errorMessage.value = "Voer een geldig e-mailadres in.";
    return;
  }

  try {
    const response = await axios.post(`${baseURL}/users/forgot-password`, {
      email: email.value,
    });

    if (response && response.status >= 200 && response.status < 300) {
      errorMessage.value = "";
      router.push({ path: "/verificationCode", query: { email: email.value } });
    } else {
      errorMessage.value = "Er is een onverwachte fout opgetreden.";
    }
    successMessage.value = "De mail is succesvol opnieuw verstuurd.";
  } catch (error) {
    if (error.response && error.response.status === 404) {
      errorMessage.value = "Gebruiker niet gevonden.";
    } else {
      errorMessage.value =
        "Er is een fout opgetreden bij het versturen van de e-mail.";
    }
  }
};

const verifyCode = async () => {
  if (!isValidCode(verificationCode.value)) {
    errorMessage.value = "Voer een geldige verificatiecode in.";
    return;
  }

  try {
    const response = await axios.post(`${baseURL}/users/verify-code`, {
      code: verificationCode.value,
      email: email.value,
    });

    if (response.status === 200) {
      router.push({ path: "/newPassword", query: { email: email.value } });
    } else {
      errorMessage.value = "De verificatiecode is ongeldig.";
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      switch (error.response.status) {
        case 400:
          errorMessage.value = "Ongeldige verificatiecode.";
          break;
        case 404:
          errorMessage.value = "Verificatiecode niet gevonden.";
          break;
        default:
          errorMessage.value =
            "Er is een fout opgetreden bij het verifiëren van de code.";
          break;
      }
    } else {
      errorMessage.value = "Er is een netwerkfout opgetreden.";
    }
  }
};
</script>

<template>
  <div class="container">
    <div class="overlay">
      <div class="elements">
        <h1>Forgot password</h1>
        <form @submit.prevent="verifyCode">
          <div class="column">
            <label for="verificationCode">Verification code</label>
            <input
              id="verificationCode"
              v-model="verificationCode"
              type="text"
              placeholder="HFDQ2FDQL4"
              required
            />
          </div>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
          <p v-if="successMessage" class="success">{{ successMessage }}</p>

          <button class="submitBtn" type="button" @click="sendMail">
            Send mail again
          </button>
          <button class="submitBtn active" type="submit">Verify code</button>
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

.success {
  color: #008000;
}

.error {
  color: #d34848;
}

.submitBtn {
  border: 1px solid var(--white);
  background-color: transparent;
  color: var(--white);
  border-radius: 4px;
  padding: 8px;
}

.submitBtn.active {
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
