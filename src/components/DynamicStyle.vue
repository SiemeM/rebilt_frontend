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

// Definieer fallback stijlen
const fallbackStyle = {
  primary_color: "rgb(151, 71, 255)", // Correcte RGB-notatie
  secondary_color: "rgb(26, 26, 26)", // Correcte RGB-notatie
  text_color: "rgb(255, 255, 255)", // Correcte RGB-notatie
  titles_color: "rgb(0, 113, 227)", // Correcte RGB-notatie
  background_color: "rgb(0, 0, 0)", // Correcte RGB-notatie
  logo_url: "../assets/images/REBILT-logo-white.svg",
  fontFamilyTitles: "Arial, sans-serif",
  fontFamilyBodyText: "Arial, sans-serif",
};

// Functie om de huisstijl op te halen, inclusief fonts
const getHouseStyleFromDatabase = async (partnerId) => {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/v1/partners/${partnerId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const huisstijlData = response.data.data.partner || fallbackStyle;
    console.log("Huisstijl data:", huisstijlData); // Log de huisstijl data

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
      "--background-color",
      huisstijlData.background_color
    );
    document.documentElement.style.setProperty(
      "--background-image",
      `url(${huisstijlData.logo_url})`
    );
    document.documentElement.style.setProperty(
      "--title-font",
      huisstijlData.fontFamilyTitles
    );
    document.documentElement.style.setProperty(
      "--body-font",
      huisstijlData.fontFamilyBodyText
    );

    // Laad en stel de fonts in voor body en titels
    loadFonts(huisstijlData.fontFamilyBodyText, huisstijlData.fontFamilyTitles);
  } catch (error) {
    console.error("Fout bij het ophalen van huisstijl:", error);
    // Als de API-aanroep mislukt, stel de fallback stijl in
    applyFallbackStyles();
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

// Functie om de fallback stijlen toe te passen
const applyFallbackStyles = () => {
  document.documentElement.style.setProperty(
    "--primary-color",
    fallbackStyle.primary_color
  );
  document.documentElement.style.setProperty(
    "--secondary-color",
    fallbackStyle.secondary_color
  );
  document.documentElement.style.setProperty(
    "--text-color",
    fallbackStyle.text_color
  );
  document.documentElement.style.setProperty(
    "--titles-color",
    fallbackStyle.titles_color
  );
  document.documentElement.style.setProperty(
    "--background-color",
    fallbackStyle.background_color
  );
  document.documentElement.style.setProperty(
    "--background-image",
    `url(${fallbackStyle.logo_url})`
  );
  document.documentElement.style.setProperty(
    "--title-font",
    fallbackStyle.fontFamilyTitles
  );
  document.documentElement.style.setProperty(
    "--body-font",
    fallbackStyle.fontFamilyBodyText
  );
  loadFonts(fallbackStyle.fontFamilyBodyText, fallbackStyle.fontFamilyTitles);
};

// Haal de partnerId uit de JWT-token (verander userId naar partnerId)
const tokenPayload = JSON.parse(atob(token.split(".")[1]));
const partnerId = tokenPayload?.companyId || null;

onMounted(() => {
  if (partnerId) {
    getHouseStyleFromDatabase(partnerId); // Gebruik partnerId hier
  } else {
    applyFallbackStyles(); // Pas fallback stijl toe als geen partnerId beschikbaar is
  }
});
</script>

<template>
  <!-- Deze component is verantwoordelijk voor het dynamisch instellen van de root CSS-variabelen -->
  <div></div>
  <!-- Deze component doet verder niets visueel -->
</template>

<style scoped>
:root {
  --primary-color: #9747ff;
  --secondary-color: #111111;
  --text-color: #ffffff;
  --titles-color: #0071e3;
  --background-image: url("/path/to/your/image.jpg");
  --background-color: #000000;
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
