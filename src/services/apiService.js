/* Algemeen API-beheer */
import axios from "axios";
import { useRouter } from "vue-router";
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";
const router = useRouter();

export const fetchPartnerData = async (partnerId, jwtToken) => {
  try {
    if (!partnerId) {
      console.error("Partner ID (companyId) is not available in the token.");
      router.push("/login");
      return;
    }

    const response = await axios.get(`${baseURL}/partners/${partnerId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    const partner = response.data?.data?.partner;
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
