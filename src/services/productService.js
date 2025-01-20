/* Productgerelateerde functies */
import { ref } from "vue";
import axios from "axios";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

// Setup loaders
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
const objLoader = new OBJLoader();

// Export loaders
export { objLoader, gltfLoader, dracoLoader };
let scene, camera, renderer, model;

const selectedType = ref("");
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";
const errorMessage = ref("");
const colors = ref([]);
const jwtToken = localStorage.getItem("jwtToken");
const tokenPayload = jwtToken ? JSON.parse(atob(jwtToken.split(".")[1])) : {};
const partnerId = tokenPayload.companyId;
const filteredProducts = ref([]); // Correct initialiseren als lege array

export const filterProductsByType = (
  partnerId,
  selectedType,
  filteredProductsRef
) => {
  // Access the value of filteredProductsRef (which is a ref)
  const filteredProducts = filteredProductsRef.value; // Correctly access the value of the ref
  console.log("filteredProducts before filtering:", filteredProducts);

  if (!Array.isArray(filteredProducts)) {
    console.error(
      "filteredProducts is not properly initialized or is not an array."
    );
    return []; // Return an empty array if it's not properly initialized
  }

  // Continue with filtering
  let filteredResults = [...filteredProducts]; // Make a copy of filteredProducts

  if (selectedType) {
    filteredResults = filteredResults.filter(
      (product) => product.productType === selectedType
    );
  }

  console.log("filteredProducts after filtering:", filteredResults);

  return filteredResults;
};

export const fetchProducts = async (partnerId) => {
  // Controleer of partnerId bestaat
  if (!partnerId) {
    console.error("partnerId is undefined or null!");
    return []; // Return een lege array als partnerId ontbreekt
  }

  try {
    const partnerResponse = await axios.get(`${baseURL}/partners/${partnerId}`);

    const partnerName = partnerResponse.data.data.partner.name;

    if (!partnerName) {
      throw new Error("Partner name not found");
    }

    const apiUrl = `${baseURL}/products?partnerName=${partnerName}`;

    const productResponse = await axios.get(apiUrl);

    const products = productResponse.data?.data?.products || [];
    return products; // Return de producten als alles goed gaat
  } catch (error) {
    console.error("Error fetching products:", error);
    return []; // Return een lege array als er iets misgaat
  }
};

export const fetchProductTypes = async (partnerId) => {
  // Controleer of partnerId bestaat
  if (!partnerId) {
    console.error("partnerId is undefined or null!");
    return []; // Return een lege array als partnerId ontbreekt
  }

  try {
    // Haal partnergegevens op via partnerId
    const partnerResponse = await axios.get(`${baseURL}/partners/${partnerId}`);

    // Haal de partnernaam op uit het antwoord
    const partnerName = partnerResponse.data?.data?.partner?.name;

    if (!partnerName) {
      throw new Error("Partner name not found");
    }

    // Bouw de API URL om producten op te halen op basis van de partnernaam
    const apiUrl = `${baseURL}/products?partnerName=${partnerName}`;

    // Haal producten op via de API
    const productResponse = await axios.get(apiUrl);

    // Haal de producten op uit het antwoord
    const products = productResponse.data?.data?.products || [];

    // Haal alleen de unieke productType's uit de productenlijst
    const productTypesSet = new Set(
      products.map((product) => product.productType)
    );

    // Convert the Set to an array before returning
    const productTypes = Array.from(productTypesSet);

    console.log(productTypes); // Optioneel: om de productTypes te loggen

    // Return de productTypes (Altijd als array)
    return productTypes || []; // Ensure it returns an array, even if no product types are found
  } catch (error) {
    console.error("Error fetching products:", error);
    return []; // Return een lege array als er iets misgaat
  }
};

export async function getcolors(partnerId) {
  try {
    // Verkrijg partnerinformatie
    const partnerResponse = await axios.get(`${baseURL}/partners/${partnerId}`);
    const partnerName = partnerResponse.data.data.partner.name;

    if (!partnerName) {
      throw new Error("Partner name not found");
    }

    // Verkrijg producten van de partner
    const apiUrl = `${baseURL}/products?partnerName=${partnerName}`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (data.status !== "success" || !data.data.products) {
      throw new Error("Ongeldige API-reactie of geen producten gevonden.");
    }

    // Verkrijg geselecteerde opties voor elk product en verwijder duplicaten
    const products = data.data.products;

    const selectedOptions = [];

    // Verzamel alle geselecteerde opties zonder duplicaten
    products.forEach((product) => {
      product.configurations.forEach((configuration) => {
        configuration.selectedOptions.forEach((option) => {
          // Voeg optie toe als deze nog niet bestaat in de lijst van geselecteerde opties
          if (
            option.optionId &&
            !selectedOptions.some((o) => o.optionId === option.optionId)
          ) {
            selectedOptions.push({
              optionId: option.optionId,
              images: option.images || [],
            });
          }
        });
      });
    });

    console.log("Selected Options without duplicates:", selectedOptions);

    // Controleer of optionId bestaat voordat je de optie probeert op te halen
    const detailedOptions = await Promise.all(
      selectedOptions.map(async (option) => {
        if (!option.optionId) {
          console.warn(
            "Optie zonder geldige optionId, wordt overgeslagen:",
            option
          );
          return null; // Skip optie als optionId ontbreekt
        }

        try {
          const optionResponse = await axios.get(
            `${baseURL}/options/${option.optionId}`
          );

          if (optionResponse.data.status !== "success") {
            console.warn(`Geen geldige optie gevonden voor ${option.optionId}`);
            return null;
          }

          const optionData = optionResponse.data.data;

          return {
            optionId: option.optionId,
            name: optionData.name,
            color: optionData.name, // Dit kan eventueel worden aangepast naar de kleur
            images: option.images, // Voeg de afbeeldingen toe
          };
        } catch (optionError) {
          console.error(
            `Fout bij ophalen van optie ${option.optionId}:`,
            optionError
          );
          return null; // Retourneer null als er een probleem is met deze optie
        }
      })
    );

    // Filter null-waarden (verwijder ongeldige opties)
    const validOptions = detailedOptions.filter((option) => option !== null);

    console.log("Valid Options:", validOptions);

    return validOptions;
  } catch (error) {
    console.error("Error in getcolors:", error);
    return []; // Retourneer een lege array in geval van fout
  }
}

export const fetchcolors = async (partnerName) => {
  const selectedOptions = await getcolors(partnerName);
  colors.value = selectedOptions.map((option) => ({
    optionId: option.optionId,
    name: option.name || "Unnamed Color",
    images: option.images || [],
  }));
  console.log(colors.value);
};

export const load3DModel = async (filePath) => {
  if (!isSceneInitialized) {
    console.error("Scene is not initialized.");
    return;
  }

  const fileExtension = filePath.split(".").pop().toLowerCase();

  if (fileExtension === "obj") {
    loadOBJModel(filePath); // Laad .obj bestand
  } else if (fileExtension === "glb" || fileExtension === "gltf") {
    loadGLBModel(filePath); // Laad .glb of .gltf bestand
  } else {
    console.error("Unsupported file type:", fileExtension);
  }
};

// In productService.js
export function loadOBJModel(url) {
  return new Promise((resolve, reject) => {
    const loader = new OBJLoader();
    loader.load(
      url,
      (object) => {
        resolve(object); // Retourneer het geladen model
      },
      undefined,
      (error) => {
        reject(error); // Foutafhandeling
      }
    );
  });
}

export function loadGLBModel(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader().setDRACOLoader(dracoLoader);
    loader.load(
      url,
      (gltf) => {
        resolve(gltf.scene); // Retourneer de scène van het GLTF-model
      },
      undefined,
      (error) => {
        reject(error); // Foutafhandeling
      }
    );
  });
}

export const addProduct = async ({
  productCode,
  productName,
  productType,
  productPrice,
  description,
  brand,
  activeInactive,
  partnerId,
  configurations,
}) => {
  try {
    // Log de configuraties om te zien of de afbeeldingen zijn toegevoegd
    configurations.forEach((config) => {
      config.selectedOptions.forEach((option) => {
        console.log("Configuration ID:", config.configurationId);
        console.log("Option ID:", option.optionId);
        console.log("Images for this option:", option.images);
      });
    });

    // Verstuur de POST-aanroep naar de /products endpoint met de juiste data structuur
    const response = await axios.post(baseURL + "/products", {
      productCode,
      productName,
      productType,
      productPrice,
      description,
      brand,
      activeInactive,
      partnerId,
      configurations, // Dit is nu de geformatteerde configuraties met afbeeldingen
    });

    console.log("Product added successfully:", response.data);
  } catch (error) {
    console.error("Error adding product:", error);
    throw error; // Rethrow de fout zodat hij kan worden opgevangen in handleSubmit
  }
};
