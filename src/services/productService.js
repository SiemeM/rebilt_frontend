/* Productgerelateerde functies */
import { ref, toRaw } from "vue";
import axios from "axios";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { useRouter } from "vue-router";
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

// Functie voor het starten van een muis/touch-interactie
export function onTouchStart(event) {
  event.preventDefault(); // Voorkomt scrollen bij touch
  isMouseDown = true;
  prevMouseX = event.touches ? event.touches[0].clientX : event.clientX;
  prevMouseY = event.touches ? event.touches[0].clientY : event.clientY;
}

// Functie voor muis/touchbewegingen
export function onTouchMove(event) {
  if (!isMouseDown) return;

  const deltaX =
    (event.touches ? event.touches[0].clientX : event.clientX) - prevMouseX;
  const deltaY =
    (event.touches ? event.touches[0].clientY : event.clientY) - prevMouseY;

  if (model) {
    model.rotation.y += deltaX * rotationSpeed;
    model.rotation.x += deltaY * rotationSpeed;
  }

  prevMouseX = event.touches ? event.touches[0].clientX : event.clientX;
  prevMouseY = event.touches ? event.touches[0].clientY : event.clientY;
}

// Functie voor het beëindigen van de muis/touch-interactie
export function onTouchEnd() {
  isMouseDown = false;
}

// Functies voor muisinteractie (voor desktop)
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

async function uploadImage(file) {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await axios.post("/upload-endpoint", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data && response.data.imageUrl) {
      return response.data.imageUrl; // Zorg ervoor dat de URL correct wordt geretourneerd
    } else {
      console.error("❌ Geen geldige URL teruggekregen bij upload.");
      return null;
    }
  } catch (error) {
    console.error("❌ Fout bij het uploaden van de afbeelding:", error);
    return null;
  }
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

export async function add2DProduct(
  images,
  selectedConfigurationId,
  productData
) {
  try {
    if (!selectedConfigurationId) {
      throw new Error("❌ selectedConfigurationId is niet gedefinieerd!");
    }

    if (!Array.isArray(images) || images.length === 0) {
      throw new Error("❌ Geen afbeeldingen om te uploaden!");
    }

    const processedImages = images.map((imageUrl) => ({
      url: imageUrl,
      configurationId: selectedConfigurationId,
    }));

    const configuration = productData.configurations.find((config) => {
      const configId = config.configurationId?._id || config.configurationId; // Fix voor ID-structuur
      return configId === selectedConfigurationId;
    });

    if (!configuration) {
      console.error(
        `❌ Configuratie met ID ${selectedConfigurationId} niet gevonden!`
      );
      return;
    }

    if (
      !configuration.selectedOptions ||
      !Array.isArray(configuration.selectedOptions)
    ) {
      console.warn(
        `⚠️ selectedOptions ontbreekt of is geen array. Voeg lege array toe.`
      );
      configuration.selectedOptions = [];
    }

    let optionId = configuration.options?.[0]?._id; // Pak de eerste optie als default

    if (!optionId) {
      console.error(
        `❌ Geen optionId gevonden voor configuratie ID: ${selectedConfigurationId}`
      );
      return;
    }

    let existingOption = configuration.selectedOptions.find(
      (opt) => opt.optionId === optionId
    );

    if (!existingOption) {
      existingOption = {
        _id: uuidv4(),
        optionId: optionId,
        images: [],
      };
      configuration.selectedOptions.push(existingOption);
    }

    existingOption.images.push(...processedImages.map((img) => img.url));

    const formattedProductData = {
      productCode: productData.productCode,
      productName: productData.productName,
      productType: productData.productType,
      productPrice: productData.productPrice,
      description: productData.description,
      brand: productData.brand,
      activeInactive: productData.activeInactive,
      partnerId: productData.partnerId,
      configurations: productData.configurations.map((config) => ({
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

    // ✅ **Stap 2: Stuur de data correct naar de backend**
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

    // Lees de response.body maar één keer
    const responseBody = await response.json(); // ✅ Verwijder de dubbele json-aanroep

    return responseBody;
  } catch (error) {
    console.error("❌ Algemene fout:", error.message);
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
  file, // URL van de 3D-file
}) => {
  try {
    // **FIX: Extract de juiste string-URL uit Proxy(Array)**
    const imageUrl = file && Array.isArray(file) ? file[0] : String(file);

    if (!imageUrl.startsWith("https://")) {
      console.error("❌ Ongeldige bestands-URL na extractie:", imageUrl);
      return;
    }

    let validConfigurations = [];

    for (const config of configurations) {
      let selectedOptions = [];

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
          images: [imageUrl], // ✅ Nu correct ingevuld
          _id: `${optionId}-${Date.now()}`,
        };
      });

      if (selectedOptions.length > 0) {
        validConfigurations.push({
          configurationId: config.configurationId?._id || "onbekend-config-id",
          selectedOptions,
        });
      }
    }

    if (validConfigurations.length === 0) {
      console.error("❌ Geen geldige configuraties gevonden");
      return;
    }

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
    };
  } catch (error) {
    console.error("❌ Algemene fout in add3DProduct:", error);
  }
};

// Een voorbeeld van een manier om afbeeldingen aan de configuratie toe te voegen.
const addImagesToConfiguration = (configurationId, imageUrls) => {
  const updatedConfigurations = configurations.map((config) => {
    if (config.configurationId === configurationId) {
      return {
        ...config,
        selectedOptions: config.selectedOptions.map((option) => ({
          ...option,
          images: imageUrls, // Voeg de juiste afbeeldings-URLs hier toe
        })),
      };
    }
    return config;
  });

  // Update de configuraties
  setConfigurations(updatedConfigurations);
};

function addImageToConfigurations(imageUrl, configurations) {
  if (!imageUrl) {
    console.warn("⚠️ Geen geldige afbeelding URL om toe te voegen.");
    return;
  }

  configurations.forEach((config) => {
    if (!config.selectedOptions || config.selectedOptions.length === 0) {
      console.warn(
        `⚠️ Geen geselecteerde opties voor configuratie: ${config.configurationId}`
      );
      return;
    }

    config.selectedOptions.forEach((option) => {
      if (!option.images) {
        option.images = []; // Zorg ervoor dat images een array is
      }
      option.images.push(imageUrl); // Voeg de afbeelding toe
    });
  });
}
