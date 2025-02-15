/* Functies voor authenticatie (checkToken) */
import { ref } from "vue";
import router from "../router"; // Zorg ervoor dat de router correct is geïmporteerd
import axios from "axios";

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";
const partnerPackage = ref("");

export const checkToken = () => {
  if (!jwtToken || !tokenPayload) {
    console.warn("Geen geldig JWT token gevonden. Doorverwijzen naar login...");
    router.push("/login");
  }
};

export async function fetchPartnerPackage(partnerId) {
  try {
    const response = await fetch(`${baseURL}/partners/${partnerId}`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    const packageData = data.data?.partner?.package || null; // Verifieer de structuur
    return packageData; // Retourneer het partner package
  } catch (err) {
    console.error("Error fetching partner package:", err);
    return null; // Zorg voor een fallback
  }
}

export async function fetchPartnerByName(partnerName) {
  if (!partnerName || typeof partnerName !== "string") {
    console.error("Partnernaam is ongeldig of ontbreekt.");
    return null;
  }

  try {
    const response = await axios.get(
      `${baseURL}/partners/partner/${partnerName}`, // We zoeken op naam
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200) {
      const partner = response.data?.data || null; // Haal het gehele partnerobject op

      if (partner) {
        return partner; // Hier geven we de partner met de ID terug
      } else {
        console.warn("Geen partner gevonden met deze naam.");
        return null;
      }
    } else {
      console.error(`Onverwachte statuscode ontvangen: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error("Fout tijdens het ophalen van de partner:", error.message);
    return null;
  }
}

export async function fetchPartnerById(partnerId) {
  if (!partnerId || typeof partnerId !== "string") {
    console.error("Partner ID is ongeldig of ontbreekt.");
    return null;
  }

  try {
    const response = await axios.get(
      `${baseURL}/partners/${partnerId}`, // Hier gebruiken we het partner-ID om de gegevens op te halen
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200) {
      const partner = response.data?.data || null; // Haal het gehele partnerobject op

      if (partner) {
        return partner; // Return de partner
      } else {
        console.warn("Geen partner gevonden met dit ID.");
        return null;
      }
    } else {
      console.error(`Onverwachte statuscode ontvangen: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error("Fout tijdens het ophalen van de partner:", error.message);
    return null;
  }
}
