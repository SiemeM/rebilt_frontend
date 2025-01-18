/* Algemeen API-beheer */
import axios from "axios";
import router from "../router"; // Importeer hier de router-instantie

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

export const fetchPartnerData = async (partnerId, jwtToken) => {
  try {
    if (!partnerId) {
      console.error("Partner ID (companyId) is not available in the token.");
      router.push("/login"); // Gebruik hier de geïmporteerde router
      return;
    }

    const response = await axios.get(`${baseURL}/partners/${partnerId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    const partner = response.data?.data?.partner;
    console.log(partner);
    if (partner) {
      return partner;
    } else {
      console.error("Partner data not found in response");
      return null;
    }
  } catch (error) {
    console.error("Error fetching partner data:", error.response || error);
    return null;
  }
};
