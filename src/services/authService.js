/* Functies voor authenticatie (checkToken) */
import { ref } from "vue";
import router from "../router"; // Zorg ervoor dat de router correct is geïmporteerd
import axios from "axios";

const jwtToken = localStorage.getItem("jwtToken");
let tokenPayload = null;

if (jwtToken && jwtToken.split(".").length === 3) {
  try {
    tokenPayload = JSON.parse(atob(jwtToken.split(".")[1]));
  } catch (error) {
    console.error("Invalid JWT token:", error);
  }
} else {
  console.warn("JWT token ontbreekt of is ongeldig.");
}

const partnerId = tokenPayload?.companyId || null;
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
    if (!partnerId) {
      console.error("Partner ID ontbreekt. Doorverwijzen naar login...");
      router.push("/login");
      return null;
    }

    const response = await fetch(`${baseURL}/partners/${partnerId}`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    const packageData = data.data?.partner?.package || null; // Verifieer de structuur
    console.log("Fetched partner package:", packageData);
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
      `${baseURL}/partners/partner/${partnerName}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200) {
      const partner = response.data?.data || null; // Haal het gehele partnerobject op
      console.log("Gevonden partner:", partner); // Controleer de waarde van partner

      if (partner) {
        return partner;
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
