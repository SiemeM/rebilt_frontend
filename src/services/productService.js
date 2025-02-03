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
let isMouseDown = false;
let prevMouseX = 0;
let prevMouseY = 0;

export const filterProductsByType = (
  partnerId,
  selectedType,
  filteredProductsRef
) => {
  // Access the value of filteredProductsRef (which is a ref)
  const filteredProducts = filteredProductsRef.value; // Correctly access the value of the ref

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

    // Return de productTypes (Altijd als array)
    return productTypes || []; // Ensure it returns an array, even if no product types are found
  } catch (error) {
    console.error("Error fetching products:", error);
    return []; // Return een lege array als er iets misgaat
  }
};

export async function getcolors(partnerId) {
  try {
    const configResponse = await axios.get(
      `${baseURL}/partnerConfigurations?partnerId=${partnerId}`
    );

    if (configResponse.data.status !== "success" || !configResponse.data.data) {
      throw new Error("❌ Geen configuraties gevonden voor deze partner.");
    }

    const configurations = configResponse.data.data;

    const selectedColors = [];

    configurations.forEach((config) => {
      if (config.options.length > 0) {
        config.options.forEach((option) => {
          const optionId = option.optionId?._id;
          const colorName = option.optionId?.name; // Naam of hex-waarde van de kleur

          if (
            optionId &&
            !selectedColors.some((o) => o.optionId === optionId)
          ) {
            selectedColors.push({
              optionId,
              color: colorName || "Unnamed Color",
            });
          }
        });
      }
    });

    return selectedColors;
  } catch (error) {
    console.error("❌ Fout in getcolors:", error);
    return []; // Retourneer een lege array bij een fout
  }
}

const fetchedColors = ref([]); // Gebruik een ref voor reactieve kleuren

// Zorg ervoor dat `fetchcolors` de `colors.value` goed bijwerkt:
export const fetchcolors = async (partnerId) => {
  try {
    const selectedOptions = await getcolors(partnerId);

    if (
      !selectedOptions ||
      !Array.isArray(selectedOptions) ||
      selectedOptions.length === 0
    ) {
      console.error("❌ Geen geldige kleuren ontvangen");
      return;
    }

    // Ensure that fetchedColors.value is properly updated
    fetchedColors.value = selectedOptions.map((option) => ({
      optionId: option.optionId || "",
      name: option.color || "Unnamed Color",
      images: option.images || [],
    }));
  } catch (error) {
    console.error("❌ Fout in fetchcolors:", error);
  }
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

// Voorbeeld van wat de handlers kunnen doen
export function onTouchStart(event) {
  // Zorg ervoor dat we de initiële positie van de aanrakingen vastleggen
  event.preventDefault();
  const touches = event.changedTouches;
  if (touches.length === 1) {
    // Verwerk de aanraking voor de rotatie
    // Bijvoorbeeld de hoek vastleggen op basis van de eerste aanraking
    this.touchStart = {
      x: touches[0].clientX,
      y: touches[0].clientY,
    };
  }
}

export function onTouchMove(event) {
  event.preventDefault();

  if (this.touchStart) {
    const touches = event.changedTouches;
    const deltaX = touches[0].clientX - this.touchStart.x;
    const deltaY = touches[0].clientY - this.touchStart.y;

    // Hier roep je de rotateModel functie aan met de juiste context
    if (this.rotateModel) {
      this.rotateModel(deltaX, deltaY);
    }

    // Werk de touch start positie bij voor de volgende beweging
    this.touchStart = { x: touches[0].clientX, y: touches[0].clientY };
  }
}

export function onTouchEnd(event) {
  event.preventDefault();
  // Hier kun je stoppen met rotatie of resetten van touch posities
  this.touchStart = null;
}

export function onMouseDown(event) {
  event.preventDefault();
  this.mouseStart = {
    x: event.clientX,
    y: event.clientY,
  };
}

export function onMouseMove(event) {
  event.preventDefault();
  if (this.mouseStart) {
    const deltaX = event.clientX - this.mouseStart.x;
    const deltaY = event.clientY - this.mouseStart.y;

    this.rotateModel(deltaX, deltaY);

    // Werk de muis start positie bij
    this.mouseStart = { x: event.clientX, y: event.clientY };
  }
}

export function onMouseUp(event) {
  event.preventDefault();
  this.mouseStart = null;
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
      config.selectedOptions.forEach((option) => {});
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
  } catch (error) {
    console.error("Error adding product:", error);
    throw error; // Rethrow de fout zodat hij kan worden opgevangen in handleSubmit
  }
};
