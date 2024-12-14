<script setup>
import { reactive, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();
const token = localStorage.getItem("jwtToken");

if (!token) {
  console.log("Geen token gevonden, doorsturen naar login.");
  router.push("/login");
}

// Functie om de huisstijl op te halen
const getHouseStyleFromDatabase = async (userId) => {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/v1/houseStyles/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const huisstijlData = response.data;

    // Stel de root CSS-variabelen in op basis van de opgehaalde huisstijl
    document.documentElement.style.setProperty(
      "--primary-color",
      huisstijlData.primary_color
    );
    document.documentElement.style.setProperty(
      "--secondary-color",
      huisstijlData.secondary_color
    );
    document.documentElement.style.setProperty(
      "--text-color",
      huisstijlData.text_color
    );
    document.documentElement.style.setProperty(
      "--titles-color",
      huisstijlData.titles_color
    );
    document.documentElement.style.setProperty(
      "--background-image",
      `url(${huisstijlData.logo_url})`
    );
  } catch (error) {
    console.error("Fout bij het ophalen van huisstijl:", error);
  }
};

// Haal de userId uit de JWT-token
const tokenPayload = JSON.parse(atob(token.split(".")[1]));
const userId = tokenPayload?.userId;

onMounted(() => {
  if (userId) {
    getHouseStyleFromDatabase(userId);
  }
});
</script>

<template>
  <!-- Deze component is verantwoordelijk voor het dynamisch instellen van de root CSS-variabelen -->
  <div></div>
  <!-- Deze component doet verder niets visueel -->
</template>

<style scoped>
/* Standaard CSS-variabelen voor fallback */
:root {
  --primary-color: #9747ff;
  --secondary-color: #000000;
  --text-color: #ffffff;
  --titles-color: #0071e3;
  --background-image: url("/path/to/your/image.jpg");
}
</style>
