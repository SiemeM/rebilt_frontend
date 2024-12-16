<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

// Router en JWT-token ophalen
const router = useRouter();
const token = localStorage.getItem("jwtToken");

if (!token) {
  router.push("/login");
}

const getHouseStyleFromDatabase = async (partnerId) => {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/v1/houseStyles/${partnerId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("API Response:", response); // Log the entire response object
    const huisstijlData = response.data;
    console.log("Huisstijl Data:", huisstijlData); // Log the actual house style data

    if (!huisstijlData) {
      console.error("No house style data found!");
      return;
    }

    // Apply dynamic styles
    document.documentElement.style.setProperty(
      "--primary-color",
      huisstijlData.primary_color || "#9747ff" // Default if not provided
    );
    document.documentElement.style.setProperty(
      "--secondary-color",
      huisstijlData.secondary_color || "#000000" // Default if not provided
    );
    document.documentElement.style.setProperty(
      "--text-color",
      huisstijlData.text_color || "#ffffff" // Default if not provided
    );
    document.documentElement.style.setProperty(
      "--titles-color",
      huisstijlData.titles_color || "#0071e3" // Default if not provided
    );
    document.documentElement.style.setProperty(
      "--background-color",
      huisstijlData.background_color || "#ffffff" // Default if not provided
    );
    document.documentElement.style.setProperty(
      "--background-image",
      huisstijlData.logo_url ? `url(${huisstijlData.logo_url})` : "" // Default if not provided
    );
    document.documentElement.style.setProperty(
      "--title-font",
      huisstijlData.fontFamilyTitles || "Arial, sans-serif"
    );
    document.documentElement.style.setProperty(
      "--body-font",
      huisstijlData.fontFamilyBodyText || "Arial, sans-serif"
    );

    // Load and apply fonts
    loadFonts(huisstijlData.fontFamilyBodyText, huisstijlData.fontFamilyTitles);
  } catch (error) {
    console.error("Error fetching house style:", error);
  }
};

// Functie om de fonts van Google Fonts te laden en in te stellen
const loadFonts = (bodyFont, titleFont) => {
  // Als de body font is ingesteld, laad die
  if (bodyFont) {
    const bodyFontUrl = `https://fonts.googleapis.com/css2?family=${bodyFont.replace(
      / /g,
      "+"
    )}:wght@400;700&display=swap`;
    addFontToDocument(bodyFontUrl);
  }

  // Als de title font is ingesteld, laad die
  if (titleFont) {
    const titleFontUrl = `https://fonts.googleapis.com/css2?family=${titleFont.replace(
      / /g,
      "+"
    )}:wght@400;700&display=swap`;
    addFontToDocument(titleFontUrl);
  }
};

// Functie om een font-link toe te voegen aan de document head
const addFontToDocument = (fontUrl) => {
  const existingLink = document.head.querySelector(`link[href="${fontUrl}"]`);
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);
  }
};

// Haal de partnerId uit de JWT-token (verander userId naar partnerId)
const tokenPayload = JSON.parse(atob(token.split(".")[1]));
const partnerId = tokenPayload?.companyId; // Change from userId to partnerId

onMounted(() => {
  console.log("Component mounted");
  console.log(partnerId);
  if (partnerId) {
    getHouseStyleFromDatabase(partnerId); // Use partnerId here
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
  --body-font: "Arial", sans-serif; /* Standaard body font */
  --title-font: "Arial", sans-serif; /* Standaard title font */
}

body {
  font-family: var(--body-font);
  color: var(--text-color);
  background-color: var(--background-color);
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: var(--title-font);
  color: var(--titles-color);
}
</style>
