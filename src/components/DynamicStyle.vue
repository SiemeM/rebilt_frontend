<script setup>
import { reactive, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

// Router en JWT-token ophalen
const router = useRouter();
const token = localStorage.getItem("jwtToken");

// Controleer of een token aanwezig is, anders doorsturen naar login
if (!token) {
  router.push("/login");
}

// JWT Token Parsing
const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error parsing JWT:", error);
    return null;
  }
};

// JWT Payload uitlezen
const tokenPayload = parseJwt(token);
const userId = tokenPayload?.userId;
let partnerId = tokenPayload?.companyId || null;

// Fallback PartnerId ophalen via API
const fetchPartnerId = async () => {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/v1/users/${userId}/partner`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.partnerId;
  } catch (error) {
    console.error("Error fetching partnerId:", error);
    return null;
  }
};

// Functie om huisstijlgegevens op te halen
const getHouseStyleFromDatabase = async (partnerId) => {
  // Fallback kleurenpalet
  const fallbackStyle = {
    primary_color: "#9747ff",
    secondary_color: "#000000",
    text_color: "#ffffff",
    titles_color: "#0071e3",
    background_color: "#000000",
    logo_url: "",
    fontFamilyTitles: "Syne, serif",
    fontFamilyBodyText: "DM Sans, sans-serif",
  };

  try {
    const response = await axios.get(
      `http://localhost:3000/api/v1/houseStyles/${partnerId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const huisstijlData = response.data || fallbackStyle;

    // CSS Variabelen toepassen
    applyStyles(huisstijlData);
  } catch (error) {
    applyStyles(fallbackStyle); // Gebruik fallback als de API faalt
  }
};

// CSS Variabelen toepassen
const applyStyles = (style) => {
  document.documentElement.style.setProperty(
    "--primary-color",
    style.primary_color
  );
  document.documentElement.style.setProperty(
    "--secondary-color",
    style.secondary_color
  );
  document.documentElement.style.setProperty("--text-color", style.text_color);
  document.documentElement.style.setProperty(
    "--titles-color",
    style.titles_color
  );
  document.documentElement.style.setProperty(
    "--background-color",
    style.background_color
  );
  document.documentElement.style.setProperty(
    "--background-image",
    style.logo_url ? `url(${style.logo_url})` : ""
  );
  document.documentElement.style.setProperty(
    "--title-font",
    style.fontFamilyTitles
  );
  document.documentElement.style.setProperty(
    "--body-font",
    style.fontFamilyBodyText
  );

  // Fonts laden
  loadFonts(style.fontFamilyBodyText, style.fontFamilyTitles);
};

// Functie om fonts te laden
const loadFonts = (bodyFont, titleFont) => {
  if (bodyFont) {
    const bodyFontUrl = `https://fonts.googleapis.com/css2?family=${bodyFont.replace(
      / /g,
      "+"
    )}:wght@400;700&display=swap`;
    addFontToDocument(bodyFontUrl);
  }

  if (titleFont) {
    const titleFontUrl = `https://fonts.googleapis.com/css2?family=${titleFont.replace(
      / /g,
      "+"
    )}:wght@400;700&display=swap`;
    addFontToDocument(titleFontUrl);
  }
};

// Functie om een font-link toe te voegen aan het document
const addFontToDocument = (fontUrl) => {
  if (!document.querySelector(`link[href="${fontUrl}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);
  }
};

// onMounted: Huisstijl ophalen
onMounted(async () => {
  if (!partnerId) {
    partnerId = await fetchPartnerId();
  }

  if (partnerId) {
    getHouseStyleFromDatabase(partnerId);
  } else {
    console.error(
      "Partner ID is niet beschikbaar. Fallback-stijl wordt toegepast."
    );
    getHouseStyleFromDatabase(null);
  }
});
</script>

<template>
  <!-- Component voor dynamische CSS-variabelen -->
  <div></div>
</template>

<style scoped>
/* Fallback CSS-variabelen */
:root {
  --primary-color: #9747ff;
  --secondary-color: #000000;
  --text-color: #ffffff;
  --titles-color: #0071e3;
  --background-color: #ffffff;
  --background-image: none;
  --body-font: "Arial", sans-serif;
  --title-font: "Arial", sans-serif;
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
