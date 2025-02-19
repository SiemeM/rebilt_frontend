/* Productgerelateerde functies */
import { ref, toRaw } from "vue";
import axios from "axios";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { useRouter } from "vue-router";
import { uploadFileToCloudinary } from "./fileService"; // Assuming the path is correct

const router = useRouter();

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
const partnerConfigurations = ref([]);
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

export const fetchProductById = async (id) => {
  if (!id) {
    console.error("Product ID is required!");
    return null; // Return null if no ID is provided
  }

  try {
    // Gebruik baseURL voor productie of lokaal
    const response = await axios.get(`${baseURL}/products/${id}`);

    if (response.status === 200) {
      return response.data?.data || null; // Return the product data or null if not found
    } else {
      console.error("Failed to fetch product:", response.status);
      return null;
    }
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return null; // Return null in case of an error
  }
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

// Functies voor touch-events
export function onTouchStart(event) {
  event.preventDefault(); // Voorkomt scrollen bij touch
  isMouseDown = true;
  const touch = event.touches ? event.touches[0] : event;
  prevMouseX = touch.clientX;
  prevMouseY = touch.clientY;
}

export function onTouchMove(event) {
  if (!isMouseDown) return;

  const touch = event.touches ? event.touches[0] : event;
  const deltaX = touch.clientX - prevMouseX;
  const deltaY = touch.clientY - prevMouseY;

  if (model) {
    model.rotation.y += deltaX * rotationSpeed;
    model.rotation.x += deltaY * rotationSpeed;
  }

  prevMouseX = touch.clientX;
  prevMouseY = touch.clientY;
}

export function onTouchEnd() {
  isMouseDown = false;
}

// Functies voor muis-events (Desktop)
export function onMouseDown(event) {
  isMouseDown = true;
  prevMouseX = event.clientX;
  prevMouseY = event.clientY;
}

export function onMouseMove(event) {
  if (!isMouseDown) return;

  const deltaX = event.clientX - prevMouseX;
  const deltaY = event.clientY - prevMouseY;

  if (model) {
    model.rotation.y += deltaX * rotationSpeed;
    model.rotation.x += deltaY * rotationSpeed;
  }

  prevMouseX = event.clientX;
  prevMouseY = event.clientY;
}

export function onMouseUp() {
  isMouseDown = false;
}

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
    fetchedColors.value = selectedOptions.map((option) => {
      return {
        optionId: option.optionId || "",
        name: option.color || "Unnamed Color",
        images: option.images || [], // Ensure images are assigned here
      };
    });
  } catch (error) {
    console.error("❌ Fout in fetchcolors:", error);
  }
};

export const addProductType = (productTypes, newType) => {
  if (!Array.isArray(productTypes)) {
    console.error("productTypes is not an array", productTypes);
    return;
  }

  if (!productTypes.includes(newType)) {
    productTypes.push(newType);
  } else {
    console.warn("This product type already exists!");
  }
};

import { v4 as uuidv4 } from "uuid";

export async function add2DProduct({
  productCode,
  productName,
  productType,
  productPrice,
  description,
  brand,
  file,
  configurationId,
  configurations, // Je ontvangt nu een reguliere array van configuraties
  images,
}) {
  try {
    // Log de ontvangen gegevens voor debugging
    console.log(
      "Received selectedConfigurationId in add2DProduct:",
      configurationId
    );
    console.log("Received configurations:", productCode); // Debug de ontvangen configuraties
    console.log("Received images:", images); // Debug de ontvangen afbeeldingen

    // Controleer of configurations correct is gedefinieerd
    if (!configurations || configurations.length === 0) {
      console.error("❌ Geen geldige configuraties ontvangen in add2DProduct!");
      return;
    }

    // Controleer of selectedConfigurationId geldig is
    if (!configurationId) {
      console.error("❌ selectedConfigurationId is niet gedefinieerd!");
      throw new Error("❌ selectedConfigurationId is niet gedefinieerd!");
    }

    // Verwerk de afbeeldingen naar een array indien nodig
    let imageArray = [];
    if (Array.isArray(images)) {
      imageArray = images;
    } else if (typeof images === "string" && images.trim()) {
      imageArray = [images]; // Maak een array met de enkele afbeelding
    }

    // Controleer of er afbeeldingen zijn en of ze geldig zijn
    if (imageArray.length === 0) {
      console.error("❌ Geen afbeeldingen om te uploaden!");
      throw new Error("❌ Geen afbeeldingen om te uploaden!");
    }

    // Verwerk de 2D afbeeldingen naar een formaat met URL en configuratie ID
    const processedImages = imageArray.map((imageUrl) => ({
      url: imageUrl,
      configurationId: configurationId,
    }));

    // Zoek naar de juiste configuratie in de ontvangen configuraties
    const configuration = configurations.find((config) => {
      const configId = config.configurationId?._id || config.configurationId;
      return configId === configurationId;
    });

    if (!configuration) {
      console.error(`❌ Configuratie met ID ${configurationId} niet gevonden!`);
      return;
    }

    // Controleer of de geselecteerde opties een array zijn
    if (
      !configuration.selectedOptions ||
      !Array.isArray(configuration.selectedOptions)
    ) {
      console.warn(
        "⚠️ selectedOptions ontbreekt of is geen array. Voeg lege array toe."
      );
      configuration.selectedOptions = [];
    }

    // Gebruik de eerste optie als default
    let optionId = configuration.options?.[0]?._id;

    if (!optionId) {
      console.error(
        `❌ Geen optionId gevonden voor configuratie ID: ${configurationId}`
      );
      return;
    }

    let existingOption = configuration.selectedOptions.find(
      (opt) => opt.optionId === optionId
    );

    if (!existingOption) {
      existingOption = { _id: uuidv4(), optionId: optionId, images: [] };
      configuration.selectedOptions.push(existingOption);
    }

    // Voeg de nieuwe afbeeldingen toe aan de geselecteerde optie
    if (existingOption.images) {
      existingOption.images.push(...processedImages.map((img) => img.url));
    } else {
      existingOption.images = [...processedImages.map((img) => img.url)];
    }

    // Format de productdata voor verzending
    const formattedProductData = {
      productCode: productCode || "",
      productName: productName || "",
      productType: productType || "",
      productPrice: productPrice || 0,
      description: description || "",
      brand: brand || "",
      activeInactive: "active", // Default waarde
      partnerId,
      configurations: configurations.map((config) => ({
        _id: uuidv4(),
        configurationId: config.configurationId._id,
        selectedOptions: Array.isArray(config.selectedOptions)
          ? config.selectedOptions.map((opt) => ({
              _id: opt._id || uuidv4(),
              optionId: opt.optionId,
              images: opt.images || [],
            }))
          : [],
      })),
    };

    // Verstuur de data naar de backend
    const token = localStorage.getItem("jwtToken") || null;
    const response = await fetch(`${baseURL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formattedProductData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Server response error:", errorData);
      throw new Error(errorData.message || "Onbekende serverfout");
    }

    // Verwerk de serverrespons
    const responseBody = await response.json();
    return responseBody;
  } catch (error) {
    console.error("❌ Algemene fout:", error.message);
    console.error("Fout in add2DProduct:", error);
  }
}

export const add3DProduct = async ({
  productCode,
  productName,
  productType,
  productPrice,
  description,
  brand,
  activeInactive,
  partnerId,
  configurations,
  file, // 3D file (in File object format)
  thumbnail, // Thumbnail image (in File object format)
}) => {
  try {
    // Upload de bestanden naar Cloudinary en verkrijg de URL's
    const modelUrl = await uploadFileToCloudinary(file, productName, partnerId);
    const thumbnailUrl = await uploadFileToCloudinary(
      thumbnail,
      productName,
      partnerId
    );

    // Stap 3: Valideer de URLs
    if (!modelUrl || !modelUrl.startsWith("https://")) {
      console.error("❌ Ongeldige 3D-model URL:", modelUrl);
      return;
    }

    if (!thumbnailUrl || !thumbnailUrl.startsWith("https://")) {
      console.error("❌ Ongeldige thumbnail URL:", thumbnailUrl);
      return;
    }

    // Stap 4: Verwerk de configuraties
    let validConfigurations = [];

    for (const config of configurations) {
      let selectedOptions = [];

      // Controleer of de configuratie opties aanwezig zijn
      if (!Array.isArray(config.options) || config.options.length === 0) {
        console.warn(
          "⚠️ Geen opties beschikbaar voor configuratie:",
          config.configurationId
        );
        continue;
      }

      selectedOptions = config.options.map((option) => {
        const optionId = option.optionId?._id || "onbekend-option-id";

        return {
          optionId,
          images: [modelUrl], // De 3D model URL wordt hier opgeslagen
          _id: `${optionId}-${Date.now()}`, // Unieke ID voor elke optie
        };
      });

      if (selectedOptions.length > 0) {
        validConfigurations.push({
          configurationId: config.configurationId?._id || "onbekend-config-id",
          selectedOptions,
        });
      }
    }

    // Als er geen geldige configuraties zijn, stop
    if (validConfigurations.length === 0) {
      console.error("❌ Geen geldige configuraties gevonden");
      return;
    }

    // Stap 5: Maak het productdata object
    const productData = {
      productCode,
      productName,
      productType,
      brand,
      description,
      productPrice,
      activeInactive,
      partnerId,
      configurations: validConfigurations,
      modelFile: modelUrl, // De model file URL wordt hier opgeslagen
      thumbnail: thumbnailUrl, // De thumbnail URL wordt hier opgeslagen
    };

    // Stap 6: Verstuur de data naar de server
    const token = localStorage.getItem("jwtToken") || null;

    const response = await fetch(`${baseURL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productData), // De juiste productdata wordt verzonden
    });

    // Foutcontrole op de server respons
    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Server response error:", errorData);
      throw new Error(errorData.message || "Onbekende serverfout");
    }

    // Ontvang en verwerk de serverresponse
    const responseBody = await response.json();
    return responseBody;
  } catch (error) {
    console.error("❌ Algemene fout in add3DProduct:", error);
  }
};
