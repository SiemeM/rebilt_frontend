/* Configuratiegerelateerde logica */
import axios from "axios";
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

export const fetchPartnerConfigurations = async (partnerId, jwtToken) => {
  if (!partnerId) {
    console.warn("No partnerId provided.");
    return [];
  }

  try {
    // Haal de partner configuraties op
    const partnerResponse = await axios.get(
      `${baseURL}/partnerConfigurations`,
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
        params: { partnerId },
      }
    );

    // Haal de algemene configuraties op
    const configurationsResponse = await axios.get(
      `${baseURL}/configurations`,
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
      }
    );

    const partnerConfigs = partnerResponse.data?.data || [];
    const configurations = configurationsResponse.data?.data || [];

    // Haal gedetailleerde configuraties op voor elke configurationId in partnerConfigs
    const partnerConfigsWithDetails = await Promise.all(
      partnerConfigs.map(async (config) => {
        const configurationId = config.configurationId._id;
        try {
          const configDetailsResponse = await axios.get(
            `${baseURL}/configurations/${configurationId}`,
            {
              headers: { Authorization: `Bearer ${jwtToken}` },
            }
          );
          const configDetails = configDetailsResponse.data?.data || {};
          return { ...config, configurationDetails: configDetails };
        } catch (error) {
          console.error(
            `Error fetching configuration details for ${configurationId}:`,
            error
          );
          return { ...config, configurationDetails: {} };
        }
      })
    );

    console.log(partnerConfigsWithDetails);
    console.log(configurations);

    // Return both partner configurations with details and general configurations
    return { partnerConfigs: partnerConfigsWithDetails, configurations };
  } catch (error) {
    console.error("Error fetching partner configurations:", error);
    return [];
  }
};

export const fetchOptionNames = async (optionsData) => {
  try {
    const validOptions = optionsData.filter(
      (option) => option.optionId && option.optionId !== "undefined"
    );

    if (validOptions.length === 0) {
      return optionsData.map(() => ({ name: "Unknown" }));
    }

    const responses = await Promise.all(
      validOptions.map((option) =>
        axios.get(`${baseURL}/options/${option.optionId._id}`, {
          headers: { Authorization: `Bearer ${jwtToken}` },
        })
      )
    );

    return responses.map((res, index) => {
      const optionData = res.data?.data;
      return {
        optionId: validOptions[index].optionId,
        name: optionData?.name,
      };
    });
  } catch (error) {
    console.error("Error fetching option names:", error);
    return optionsData.map(() => ({ name: "Unknown" }));
  }
};

export const addNewColor = async (config, fieldName) => {
  const configId = config.configurationId._id;

  if (
    !newColorName.value[configId] ||
    newColorName.value[configId].trim() === ""
  ) {
    return; // Geen lege kleuren toevoegen
  }

  const newColor = {
    name: newColorName.value[configId].trim(),
    type: "kleur", // Aangeven dat het een kleur is
    price: 0, // Stel hier een prijs in, als nodig
  };

  try {
    // Verstuur een POST-verzoek naar de server om de kleur op te slaan
    const response = await fetch(`${baseURL}/options`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newColor), // Verstuur de nieuwe kleur
    });

    const data = await response.json();
    console.log("Nieuw kleurobject:", newColor); // Log het kleurobject
    console.log("Server Response:", data); // Log de volledige response

    // Controleer of 'data.data' en 'data.data._id' bestaan
    if (data && data.data && data.data._id) {
      console.log("Geldige _id ontvangen:", data.data._id);

      // Voeg de nieuwe kleur toe aan de geselecteerde kleuren (selectedColors)
      const color = {
        optionId: data.data._id,
        name: newColor.name,
        images: [], // Voeg hier een lege array voor afbeeldingen toe
      };
      selectedColors.value.push(color); // Voeg toe aan selectedColors

      // Voeg de nieuwe kleur toe aan de beschikbare kleuren (colors)
      colors.value.push(color); // Voeg toe aan colors

      // Voeg de nieuwe kleur toe aan de opties in config
      config.options.push({
        optionId: data.data._id, // Gebruik het ontvangen _id van de server
        name: newColor.name,
      });

      // Voeg de nieuwe kleur toe aan de beschikbare kleuren array
      availableNewColors.value.push({
        optionId: data.data._id,
        name: newColor.name,
      });

      // Reset het invoerveld
      newColorName.value[configId] = "";

      console.log("Updated selectedColors:", selectedColors.value); // Log de bijgewerkte selectedColors
      console.log("Updated colors:", colors.value); // Log de bijgewerkte colors
    } else {
      console.error(
        "Fout bij het toevoegen van de kleur: geen _id ontvangen",
        data
      );
    }
  } catch (error) {
    console.error(
      "Er is een fout opgetreden bij het versturen van de kleur:",
      error
    );
  }
};
