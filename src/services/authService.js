/* Functies voor authenticatie (checkToken) */
import { ref } from "vue";
const jwtToken = localStorage.getItem("jwtToken");
const tokenPayload = JSON.parse(atob(jwtToken.split(".")[1]));
const partnerId = tokenPayload.companyId;
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";
const partnerPackage = ref("");

export const checkToken = () => {
  if (!jwtToken) {
    router.push("/login");
  }
};

export async function fetchPartnerPackage() {
  try {
    const response = await fetch(`${baseURL}/partners/${partnerId}`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    partnerPackage.value = data.data.partner.package || "";
  } catch (err) {
    console.error("Error fetching partner package:", err);
  }
}
