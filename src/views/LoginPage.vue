<script setup>
import { ref } from "vue";
import router from "../router";

const email = ref("");
const password = ref("");
const errorMessage = ref("");

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const login = () => {
  errorMessage.value = "";

  if (!email.value || !password.value) {
    errorMessage.value = "Gelieve alle velden in te vullen.";
    return;
  }

  fetch(`${baseURL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.value,
      password: password.value,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Login failed");
      }
      return response.json();
    })
    .then((data) => {
      console.log("API Response:", data); // Voeg deze regel toe om de volledige response te bekijken
      if (data.status === "success") {
        localStorage.setItem("jwtToken", data.data.token);
        const decodedToken = JSON.parse(atob(data.data.token.split(".")[1]));
        const userRole = decodedToken.role;
        if (
          userRole === "partner_admin" ||
          userRole === "partner_owner" ||
          userRole === "platform_admin"
        ) {
          router.push("/admin");
        } else {
          errorMessage.value = "Geen toegang tot de admin sectie.";
        }
      } else {
        errorMessage.value = data.message || "Inloggen mislukt.";
      }
    })
    .catch((error) => {
      errorMessage.value = "Er is een fout opgetreden. Probeer het opnieuw.";
    });
};
</script>

<template>
  <div class="container">
    <div class="overlay">
      <div class="elements">
        <h1>Welcome back</h1>
        <form>
          <div class="column">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="email"
              type="text"
              placeholder="johndoe@gmail.com"
            />
          </div>

          <div class="column">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="●●●●●●●●"
              @focus="showPlaceholder = false"
              @blur="showPlaceholder = password === ''"
            />
          </div>

          <div class="row">
            <div class="rememberMe">
              <i class="fa fa-square-o"></i>
              <p>Remember me</p>
            </div>
            <router-link exact to="./ForgotPassword">
              Forgot password?
            </router-link>
          </div>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

          <button class="submitBtn" type="submit" @click.prevent="login">
            Login
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Je bestaande CSS-stijlen hier */
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

.row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
}

.row .rememberMe {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.row .rememberMe i,
.row a {
  color: rgba(255, 255, 255, 0.4);
}

.row a {
  text-decoration: underline;
}

label,
input {
  color: var(--white);
}

input {
  border: 1px solid rgba(255, 255, 255, 0.4);
  background-color: transparent;
  padding: 4px 16px;
  border-radius: 8px;
  width: 100%;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
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
</style>
