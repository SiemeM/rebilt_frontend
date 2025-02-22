<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import DynamicStyle from "../components/DynamicStyle.vue";

import FaceTracking from "../components/FaceTracking.vue";
import ModelViewer from "../components/ModelViewer.vue";

const showModel = ref(false);
const isFaceTrackingVisible = ref(false); // Zorg ervoor dat deze reactive is

// Functie die de zichtbaarheid van FaceTracking toggelt
function toggleFaceTracking() {
  isFaceTrackingVisible.value = !isFaceTrackingVisible.value; // Toggle de waarde
}

// Functies voor touch-events
function onTouchStart(event) {
  event.preventDefault(); // Voorkomt scrollen bij touch
  isMouseDown = true;
  const touch = event.touches ? event.touches[0] : event;
  prevMouseX = touch.clientX;
  prevMouseY = touch.clientY;
}

function onTouchMove(event) {
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

function onTouchEnd() {
  isMouseDown = false;
}

// Functies voor muis-events (Desktop)
function onMouseDown(event) {
  isMouseDown = true;
  prevMouseX = event.clientX;
  prevMouseY = event.clientY;
}

function onMouseMove(event) {
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

function onMouseUp() {
  isMouseDown = false;
}

const sizes = ref([]);
const materials = ref([]);
const layers = ref([]);
const layersColors = ref([]);
const selectedThingsInLayers = ref([]);
const colors = ref([]);
const selectedLayerColor = ref(null);
const currentPageIndex = ref(0);
const productImages = ref([]);
const selectedImage = ref(null);
const route = useRoute();
const router = useRouter();
const productId = ref(null);
const productData = ref({
  productName: "",
  productCode: "",
  productPrice: 0,
  productModelFile: "",
});
const productName = ref("");
const productModelFile = ref("");

const isLoading = ref(true);
const error = ref(null);
const logoUrl = ref("");
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";
const options = computed(() => optionNames.value);
const partnerName = ref("");
const partnerPackage = ref("");
let scene = new THREE.Scene();

let camera, rendererMobile, rendererDesktop;
const objLoader = new OBJLoader();
const dracoLoader = new DRACOLoader();
const gltfLoader = new GLTFLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
gltfLoader.setDRACOLoader(dracoLoader);
const fieldName = ref(null);
let isModelLoaded = false;
let model = null;
let isSceneInitialized = false;
let isRendererInitialized = false;
let isMouseDown = false;
let prevMouseX = 0;
let prevMouseY = 0;
const rotationSpeed = 0.005;
const selectedOption = ref(0);
const selectedOptionName = ref(null);
const optionNames = ref([]);
const selectedItems = ref([]);
const productConfigs = ref([]);
const partnerConfigurationsCount = ref([]);

async function fetchPartnerName(partnerId) {
  try {
    const response = await fetch(`${baseURL}/partners/${partnerId}`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    partnerName.value = data.data.partner.name || "";
  } catch (err) {
    console.error("Error fetching partner package:", err);
  }
}

async function fetchPartnerPackage(partnerId) {
  try {
    const response = await fetch(`${baseURL}/partners/${partnerId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch partner package");
    }
    const data = await response.json();

    // Controleer eerst of de gegevens beschikbaar zijn voordat je probeert 'package' te lezen
    if (data && data.data && data.data.partner) {
      partnerPackage.value = data.data.partner.package;
    } else {
      console.error("Partner data is incomplete:", data);
    }
  } catch (error) {
    console.error("Error fetching partner package:", error);
  }
}

onUnmounted(() => {
  window.removeEventListener("resize", onWindowResize);
});

function onWindowResize() {
  const container = document.querySelector(".model");
  if (container && rendererDesktop) {
    rendererDesktop.setSize(container.offsetWidth, container.offsetHeight);
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
  }
}

function logSceneLayers() {
  if (!scene) {
    console.error("Scene is niet geïnitialiseerd!");
    return; // Stop als de scene niet bestaat
  }
}

function initializeScene() {
  if (isSceneInitialized) {
    return; // Voorkom herinitialisatie
  }

  try {
    // Initialiseer de scene, camera en renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 40);
    camera.lookAt(0, 0, 0);

    // Verkrijg de container voor mobiel en desktop
    const containerModelMobile = document.querySelector(
      ".mobileElements .model"
    );
    const containerModelDesktop = document.querySelector(".model.desktop");

    if (!containerModelMobile && !containerModelDesktop) {
      console.error("3D container element niet gevonden!");
      return;
    }

    // Renderers alleen toevoegen als ze nog niet bestaan
    if (!rendererMobile && window.innerWidth <= 768 && containerModelMobile) {
      rendererMobile = new THREE.WebGLRenderer();
      rendererMobile.setSize(
        containerModelMobile.offsetWidth,
        containerModelMobile.offsetHeight
      );
      if (!containerModelMobile.contains(rendererMobile.domElement)) {
        containerModelMobile.appendChild(rendererMobile.domElement);
      }
    }

    if (!rendererDesktop && window.innerWidth > 768 && containerModelDesktop) {
      rendererDesktop = new THREE.WebGLRenderer();
      rendererDesktop.setSize(
        containerModelDesktop.offsetWidth,
        containerModelDesktop.offsetHeight
      );
      if (!containerModelDesktop.contains(rendererDesktop.domElement)) {
        containerModelDesktop.appendChild(rendererDesktop.domElement);
      }
    }

    // Voeg lichten toe aan de scene
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(50, 50, 50);
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(10, 20, 10);
    directionalLight.target.position.set(0, 0, 0);
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    // Voeg eventlisteners toe voor zowel mobiele als desktop
    if (containerModelMobile) {
      containerModelMobile.addEventListener("mousedown", onMouseDown, false);
      containerModelMobile.addEventListener("touchstart", onTouchStart, false);
    }

    if (containerModelDesktop) {
      containerModelDesktop.addEventListener("mousedown", onMouseDown, false);
      containerModelDesktop.addEventListener("touchstart", onTouchStart, false);
    }

    window.addEventListener("mousemove", onMouseMove, false);
    window.addEventListener("touchmove", onTouchMove, false);
    window.addEventListener("mouseup", onMouseUp, false);
    window.addEventListener("touchend", onTouchEnd, false);

    // Laad het model (zorg ervoor dat je het juiste pad gebruikt)

    // Initialiseer de scene en renderer
    isRendererInitialized = true;
    isSceneInitialized = true;

    // Start de animatie
    animate();
  } catch (err) {
    console.error("Fout bij initialisatie van de scene:", err);
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (rendererMobile) {
    rendererMobile.render(scene, camera);
  } else if (rendererDesktop) {
    rendererDesktop.render(scene, camera);
  }
}

function extractMaterials(object) {
  materials.value = [];
  layers.value = [];
  layersColors.value = [];

  object.traverse((child) => {
    if (child.isMesh) {
      // Controleer of het een array van materialen is
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => {
          materials.value.push(material);
          if (!layers.value.includes(material.name)) {
            layers.value.push(material.name);
            layersColors.value.push("#ffffff"); // Default kleur voor het materiaal
          }
        });
      } else {
        materials.value.push(child.material);
        if (!layers.value.includes(child.material.name)) {
          layers.value.push(child.material.name);
          layersColors.value.push("#ffffff"); // Default kleur voor het materiaal
        }
      }
    }
  });

  // Verwijder dubbele materialen
  layers.value = [...new Set(layers.value)];
}

function load3DModel(filePath) {
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
}

function loadGLBModel(filePath) {
  gltfLoader.load(
    filePath, // Gebruik het bestandspad voor .glb of .gltf
    (gltf) => {
      const object = gltf.scene;

      // Verplaats het model naar het midden van de scene
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      object.position.set(-center.x, -center.y, -center.z);
      object.scale.set(100, 100, 100); // Vergroot het model

      // Voeg het object toe aan de scene
      scene.add(object);
      model = object;
      isModelLoaded = true;
      extractMaterials(object);

      // Log de lagen na het toevoegen van het model en materialen
      logSceneLayers(); // Verplaats deze lijn hier
    }
  );
}

function loadOBJModel(filePath) {
  objLoader.load(filePath, (object) => {
    object.scale.set(10, 10, 10); // Pas de schaal aan
    scene.add(object);
    model = object;
    isModelLoaded = true;
    extractMaterials(object);
    logSceneLayers(); // Verplaats deze lijn hier
  });
}

// Zoek de kleur voor een bepaalde laag
// Zoek de kleur voor een bepaalde laag
function getColorForLayer(newOption) {
  let productConfigs = productData.value.configurations || [];

  let config = productConfigs.find((config) =>
    config.selectedOptions.some((option) => option.optionId?.name === newOption)
  );

  if (config) {
    const fieldName = config.configurationId?.fieldName;

    const selectedOption = config.selectedOptions.find(
      (option) => option.optionId?.name === newOption
    );

    if (selectedOption) {
      const color = selectedOption.optionId?.name; // Pas eventueel aan op de structuur van je data
      if (color) {
        return color; // Laag is zichtbaar, retourneer kleur
      }
    } else {
      console.warn(`Geen geselecteerde optie gevonden voor ${newOption}`);
    }
  } else {
    console.warn(`Geen configuratie gevonden voor ${newOption}`);
  }

  // Fallback kleur als geen kleur is gevonden
  return "#FFFFFF"; // Standaard kleur
}

// Functie om de kleur toe te passen op de actieve laag
function applyColorToActiveLayer(color) {
  if (!scene) {
    console.error("Scene is niet geïnitialiseerd!");
    return;
  }

  // Zoek de zichtbare config-ui__page (deze heeft de klasse 'active')
  const activePage = document.querySelector(".config-ui__page.active");

  // Als er geen actieve pagina is, stop de functie
  if (!activePage) {
    console.error("Geen actieve pagina gevonden.");
    return;
  }

  // Haal de naam van het veld uit de <h2> van de actieve pagina
  const fieldNameElement = activePage.querySelector("h2.fieldName");
  let fieldName = fieldNameElement.textContent.trim();

  // Gebruik een reguliere expressie om alles vóór "for" te verwijderen
  const match = fieldName.match(/for\s+(.+)/);
  if (match) {
    fieldName = match[1].trim(); // Haal de tekst na "for" en verwijder extra spaties
  }

  if (!fieldName || typeof fieldName !== "string") {
    console.error("Ongeldig fieldName opgegeven.");
    return;
  }

  // Valideer kleur (kleur moet een hex-code zijn)
  const validColor = /^#[0-9A-Fa-f]{6}$/i.test(color);
  if (!validColor) {
    console.warn(`Ongeldige kleur: ${color}, standaardkleur wordt toegepast.`);
    color = "#FFFFFF"; // Gebruik een standaardkleur als de kleur ongeldig is
  }

  let colorApplied = false;

  // Traverse door de scène en zoek naar het juiste object
  scene.traverse((object) => {
    // Controleer of het object overeenkomt met de geselecteerde laag (fieldName)
    if (
      object instanceof THREE.Mesh &&
      object.name.toLowerCase() === fieldName.toLowerCase()
    ) {
      // Zorg ervoor dat we alleen de kleur toepassen als het materiaal geschikt is
      if (object.material) {
        if (object.material instanceof THREE.MeshStandardMaterial) {
          object.material.color.set(color);
          colorApplied = true;
        } else if (Array.isArray(object.material)) {
          object.material.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.color.set(color);
            }
          });
          colorApplied = true;
        } else {
          console.warn(
            `Object '${object.name}' heeft een niet-ondersteund materiaaltype.`
          );
        }
      }
    }
  });

  // Als geen object is gevonden om de kleur toe te passen
  if (!colorApplied) {
    console.warn(
      `Geen object gevonden met naam '${fieldName}' om de kleur toe te passen.`
    );
  }
}

async function selectOption(optionId) {
  const productId = route.params.productId;

  if (!productId) {
    console.error("productId is undefined!");
    return;
  }

  selectedOption.value = optionId;

  try {
    const response = await fetch(`${baseURL}/products/${productId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Product fetch error! Status: ${response.status}`);
    }

    const result = await response.json();
    const product = result.data.product;

    // Haal de configuraties op
    const configurations = product.configurations || [];

    // Zoek de kleur voor de laag op basis van de geselecteerde optie
    const color = getColorForLayer(optionId);
    if (color) {
      applyColorToActiveLayer(color); // Pas de kleur toe op de actieve laag
    }

    productData.value = {
      productName: product.productName,
      productCode: product.productCode,
      productPrice: product.productPrice,
      productModelFile: product.productModelFile,
      configurations: configurations,
    };
  } catch (err) {
    console.error("Error fetching product data:", err.message);
  }
}

function findFieldNameForOption(optionName) {
  const productConfigs = productData.value.configurations || [];

  // Zoek de configuratie die overeenkomt met de optie
  const config = productConfigs.find((config) =>
    config.selectedOptions.some(
      (option) => option.optionId?.name === optionName
    )
  );

  if (config) {
    return config.configurationId?.fieldName || null; // Geef de fieldName terug of null als deze ontbreekt
  }

  console.warn(`Geen fieldName gevonden voor optie: ${optionName}`);
  return null;
}

watch(selectedOptionName, (newOption) => {
  if (newOption) {
    const fieldName = findFieldNameForOption(newOption);
    const color = getColorForLayer(newOption);
    if (color && fieldName) {
      applyColorToActiveLayer(color);
    }
  }
});

onMounted(async () => {
  const productId = route.params.productId; // Verkrijg productId uit route parameters
  if (!productId) return; // Als er geen productId is, doe dan niets

  try {
    isLoading.value = true; // Zet laadtijdindicator aan
    error.value = null; // Reset eventuele foutmeldingen

    // Haal productgegevens op
    await fetchProductData(productId); // Gebruik de fetchProductData functie om productinformatie te laden

    // Controleer of er een partnerId is en haal partnerinformatie op
    const partnerId = productData.value.partnerId;
    if (partnerId) {
      await fetchPartnerPackage(partnerId); // Haal partnerpakket op
    }

    // Als het partnerpakket "pro" is en er een geselecteerde afbeelding is, laad dan het 3D-model
    if (partnerPackage.value === "pro" && selectedImage.value) {
      const container = document.querySelector(".model");

      if (container) {
        initializeScene(); // Initialiseer de scène voor het 3D-model

        const filePath = `${selectedImage.value}`; // Dynamisch pad op basis van geselecteerde afbeelding

        load3DModel(filePath); // Laad het 3D-model met het pad
      } else {
        console.error("3D container not found!"); // Foutmelding als de container niet wordt gevonden
      }
    }
  } catch (err) {
    console.error("Error fetching product data:", err.message);
    error.value = "Error occurred while fetching product data."; // Zet foutmelding
  } finally {
    isLoading.value = false; // Zet laadtijdindicator uit
  }
});

/* ---- 2D ---- */
async function fetchNumberOfPartnerConfigurations(partnerId) {
  try {
    const response = await fetch(`${baseURL}/partnerConfigurations`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();

    const count = data.data.filter(
      (config) => config.partnerId === partnerId
    ).length;

    partnerConfigurationsCount.value = count;
    return count;
  } catch (err) {
    console.error("Error fetching partner configurations:", err);
  }
}

// Aangenomen dat je productgegevens en partnerconfiguraties al hebt

async function fetchPartnerConfigurations(partnerId, product) {
  try {
    // Fetch partner configurations
    const response = await fetch(
      `${baseURL}/partnerConfigurations?partnerId=${partnerId}`
    );

    if (!response.ok) throw new Error("Unable to fetch partner configurations");

    const data = await response.json();

    // Check if the fetched data is an array
    if (!Array.isArray(data.data)) {
      console.error("Fetched data is not an array:", data.data);
      return [];
    }

    const partnerConfigs = data.data.filter(
      (config) => config.partnerId === partnerId
    );

    // Ensure product configurations exist
    if (product.configurations && product.configurations.length > 0) {
      productConfigs.value = product.configurations;
    } else {
      console.error("No configurations available for the product.");
      productConfigs.value = [];
    }

    const productConfigurationId = product.configurations?.[0]?.configurationId;

    if (!productConfigurationId) {
      console.error("ConfigurationId for product is not available.");
      return [];
    }
  } catch (err) {
    console.error("Error fetching partner configurations:", err);
    return [];
  }
}

// Function to fetch the option name by optionId
async function optionNameById(optionId) {
  try {
    const response = await fetch(`${baseURL}/options/${optionId}`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();

    // Check if the name already exists in the optionNames array, if not, push it
    const existing = optionNames.value.find(
      (item) => item.optionId === optionId
    );
    if (!existing) {
      optionNames.value.push({ optionId, name: data.data.name }); // Push the optionId and name pair
    }

    return data.data.name; // Return the name for use
  } catch (error) {
    console.error("Error fetching option by ID:", error);
    return null; // Return null in case of an error
  }
}

// Function to load options for a given configuration ID
async function loadOptionsForConfig(configId) {
  try {
    const response = await fetch(`${baseURL}/configurations/${configId}`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    // For each option in the config, fetch its name
    for (const option of data.data.options) {
      await optionNameById(option.optionId);
    }

    // After fetching all names, log optionNames
    return data.data.options; // Return the fetched options
  } catch (error) {
    console.error("Error fetching configuration options:", error);
    return null;
  }
}

async function fetchProductData(productCode) {
  try {
    isLoading.value = true;
    error.value = null;

    const response = await fetch(`${baseURL}/products/${productCode}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    const product = result.data.product;
    console.log(result.data.product);
    productName.value = product.productName;
    productModelFile.value = product.modelFile;
    console.log(product.modelFile);

    const configurations = product.configurations || [];
    optionNames.value = [];

    let selectedOptionImages = [];

    const enrichedConfigurations = await Promise.all(
      configurations.map(async (config) => {
        let selectedConfigId = config.configurationId;

        if (typeof selectedConfigId === "object" && selectedConfigId._id) {
          selectedConfigId = selectedConfigId._id;
        }

        await loadOptionsForConfig(selectedConfigId);

        const configUrl = `${baseURL}/configurations/${selectedConfigId}`;

        try {
          const configResponse = await fetch(configUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!configResponse.ok) {
            throw new Error(
              `Configuration fetch error! Status: ${configResponse.status}`
            );
          }

          const configResult = await configResponse.json();
          const options = configResult.data.options || [];

          const selectedOptionData = config.selectedOptions[0];

          let optionName = selectedOptionData?.name;

          if (!optionName && selectedOptionData?.optionId) {
            const optionUrl = `${baseURL}/options/${selectedOptionData.optionId._id}`;
            const optionResponse = await fetch(optionUrl);
            const optionResult = await optionResponse.json();
            optionName = optionResult.data?.name || "Option 1";
          }

          // Voeg de geselecteerde afbeeldingen toe aan de array
          if (selectedOptionData?.images) {
            selectedOptionImages.push(...selectedOptionData.images); // voeg toe i.p.v. overschrijven
          }

          const existingConfigIndex = selectedItems.value.findIndex(
            (item) => item.configurationId === selectedConfigId
          );

          if (existingConfigIndex !== -1) {
            selectedItems.value[existingConfigIndex].selectedItem = {
              optionName: optionName,
              images: selectedOptionImages,
            };
          } else {
            selectedItems.value.push({
              configurationId: selectedConfigId,
              selectedItem: {
                optionName: optionName,
                images: selectedOptionImages,
              },
            });
          }

          return {
            ...config,
            options,
          };
        } catch (err) {
          console.error(
            `Error fetching configuration for ID ${selectedConfigId}:`,
            err.message
          );
          return { ...config, options: [] };
        }
      })
    );

    if (selectedOptionImages.length > 0) {
      productImages.value = selectedOptionImages;
      selectedImage.value = selectedOptionImages[0];
    } else {
      console.warn("No images found for the selected option");
    }

    productData.value = {
      productName: product.productName,
      productCode: product.productCode,
      productPrice: product.productPrice,
      productModelFile: product.productModelFile,
      images: selectedOptionImages,
      configurations: enrichedConfigurations,
    };

    const optionNamesList = enrichedConfigurations.flatMap((config) =>
      config.selectedOptions.map((selectedOption) => selectedOption.optionName)
    );
    optionNames.value = optionNamesList;

    const partnerId = product.partnerId;
    if (partnerId) {
      await fetchPartnerName(partnerId);
      await fetchPartnerPackage(partnerId);
      await fetchNumberOfPartnerConfigurations(partnerId);
      await fetchLogoUrl(partnerId);
      await fetchPartnerConfigurations(partnerId, product);
    }
  } catch (err) {
    console.error("Error fetching product data:", err.message);
    error.value =
      "Er is een fout opgetreden bij het ophalen van de productgegevens.";
  } finally {
    isLoading.value = false;
  }
}

async function previousPage() {
  const pages = document.querySelectorAll(".config-ui__page");
  const overview = document.querySelector(".overview");
  const summary = document.querySelector(".summary");
  const nextButton = document.querySelector(".nextButton");
  const backButton = document.querySelector(".backButton");

  // Zorg ervoor dat er pagina's zijn
  if (!pages || pages.length === 0) {
    console.warn("No config-ui__page elements found.");
    return;
  }

  // Als we op de overzichtspagina zitten (pagina 0)
  if (currentPageIndex.value === 0) {
    // Maak de overzichtspagina zichtbaar
    if (overview) {
      overview.style.display = "flex"; // 'overview' wordt zichtbaar
      pages.forEach((page) => page.classList.remove("active"));
    }

    // Maak de 'next' knop zichtbaar
    if (nextButton) {
      nextButton.style.visibility = "visible"; // 'next' knop zichtbaar
    }

    // Verberg de 'back' knop
    if (backButton) {
      backButton.style.visibility = "hidden"; // 'back' knop wordt verborgen
    }

    if (summary && summary.style.display == "flex") {
      overview.style.display = "none"; // 'overview' wordt zichtbaar
      pages.forEach((page) => page.classList.remove("active"));
      pages[currentPageIndex.value].classList.add("active");
      backButton.style.visibility = "visible"; // 'back' knop wordt verborgen
    }

    // Verberg de samenvatting
    if (summary) {
      summary.style.display = "none"; // Verberg summary als we terug naar overview gaan
    }
  }

  // Als we op de summary pagina zitten, verberg de summary en ga naar de vorige pagina
  if (summary) {
    summary.style.display = "none"; // Verberg de summary pagina
    // Log naar de console als we van summary naar configuratiepagina gaan
  }

  // Als we op een configuratiepagina zitten, toon de vorige configuratiepagina
  if (currentPageIndex.value > 0) {
    // Verwijder de 'active' klasse van de huidige configuratiepagina
    pages[currentPageIndex.value].classList.remove("active");

    // Ga naar de vorige pagina
    currentPageIndex.value--;

    // Zet de 'active' klasse op de vorige configuratiepagina
    pages[currentPageIndex.value].classList.add("active");

    // Verberg de overzichtspagina
    if (overview) {
      overview.style.display = "none"; // 'overview' wordt verborgen
    }

    // Maak de 'back' knop zichtbaar
    if (backButton) {
      backButton.style.visibility = "visible"; // Toon de 'back' knop
    }

    // Als we op de eerste configuratiepagina zitten, verberg de 'back' knop
    if (currentPageIndex.value === 0) {
      if (backButton) {
        backButton.style.visibility = "hidden"; // Verberg de 'back' knop op de eerste pagina
      }
    }

    // Maak de 'next' knop zichtbaar (tenzij we op de laatste pagina zitten)
    if (nextButton) {
      nextButton.style.visibility = "visible"; // 'next' knop wordt zichtbaar
    }
  }
}

async function nextPage() {
  const overview = document.querySelector(".overview");
  const summary = document.querySelector(".summary");
  const pages = document.querySelectorAll(".config-ui__page");

  // Controleer of er pagina's zijn
  if (!pages || pages.length === 0) {
    console.warn("No config-ui__page elements found.");
    return;
  }

  // Als we op de overzichtspagina zitten
  if (overview && overview.style.display !== "none") {
    // Verberg overzicht en zet de eerste pagina als actief
    overview.style.display = "none";
    currentPageIndex.value = 0;
    pages.forEach((page) => page.classList.remove("active"));
    pages[currentPageIndex.value].classList.add("active");

    // Maak de back-knop zichtbaar
    document.querySelector(".backButton").style.visibility = "visible";
  } else {
    // Verwijder de 'active' klasse van de huidige pagina
    pages[currentPageIndex.value].classList.remove("active");

    // Verhoog de pagina-index en toon de volgende pagina
    if (currentPageIndex.value < pages.length - 1) {
      currentPageIndex.value++;
      pages[currentPageIndex.value].classList.add("active");
    } else {
      // Haal productId op uit de URL
      const productId = route.params.productId;

      // Controleer of productId beschikbaar is
      if (!productId) {
        console.error("productId is undefined!");
        return;
      }

      try {
        // Haal productgegevens op
        const response = await fetch(`${baseURL}/products/${productId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch product data. Status: ${response.status}`
          );
        }

        const result = await response.json();
        const product = result.data.product; // Zorg ervoor dat 'product' hier wordt gedefinieerd

        // Haal partnerId van het product
        const partnerId = product.partnerId;

        // Haal het aantal configuraties op voor de partner
        const count = await fetchNumberOfPartnerConfigurations(partnerId);

        // Als er meerdere configuraties zijn, toon de samenvatting
        if (count <= 1) {
          summary.style.display = "flex";
          document.querySelector(".nextButton").style.visibility = "hidden";
        }
      } catch (err) {
        console.error("Error fetching product data:", err.message);
      }
    }
  }
}

async function fetchLogoUrl(partnerId) {
  try {
    const response = await fetch(`${baseURL}/partners/${partnerId}`);
    if (!response.ok) throw new Error("Unable to fetch logo URL");
    const data = await response.json();
    if (data?.data?.partner) {
      logoUrl.value = data.data.partner.logo_url;
    } else {
      console.warn("Partner not found in the response.");
    }
  } catch (err) {
    console.error("Error fetching logo URL:", err);
  }
}

function showPreviousImage() {
  const currentIndex = productImages.value.indexOf(selectedImage.value);
  if (currentIndex > 0) {
    selectedImage.value = productImages.value[currentIndex - 1];
  }
}

function showNextImage() {
  const currentIndex = productImages.value.indexOf(selectedImage.value);
  if (currentIndex < productImages.value.length - 1) {
    selectedImage.value = productImages.value[currentIndex + 1];
  }
}

function setSelectedImage(image) {
  selectedImage.value = image; // Zorg dat dit een object is
}

watch(
  () => route.params.productId,
  async (newCode) => {
    if (newCode && newCode !== productId.value) {
      productId.value = newCode;
      await fetchProductData(newCode);
    }
  },
  { immediate: true }
);
</script>

<template>
  <DynamicStyle />
  <div class="container">
    <div
      class="logoConfigurator"
      :style="{ backgroundImage: `url(${logoUrl})` }"
    ></div>

    <div class="carousel" v-if="productModelFile == null">
      <div class="top">
        <div
          class="icon"
          :class="{ disabled: selectedImage === productImages[0] }"
          @click="selectedImage !== productImages[0] && showPreviousImage()"
        >
          <i class="fa fa-angle-left"></i>
        </div>
        <div
          class="image"
          :style="{ backgroundImage: `url(${selectedImage})` }"
        ></div>
        <div
          class="icon"
          :class="{
            disabled: selectedImage === productImages[productImages.length - 1],
          }"
          @click="
            selectedImage !== productImages[productImages.length - 1] &&
              showNextImage()
          "
        >
          <i class="fa fa-angle-right"></i>
        </div>
      </div>
      <div class="processbar">
        <div class="long-bar"></div>
        <div
          class="short-bar"
          :style="{
            width: `${
              ((productImages.indexOf(selectedImage) + 1) /
                productImages.length) *
              100
            }%`,
          }"
        ></div>
      </div>
    </div>
    <div class="model desktop" v-if="productModelFile"></div>
    <div class="icons desktop">
      <a @click="$router.go(-1)">
        <div class="icon">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="26"
              height="26"
              viewBox="0 0 256 256"
            >
              <path
                d="M104,216V152h48v64h64V120a8,8,0,0,0-2.34-5.66l-80-80a8,8,0,0,0-11.32,0l-80,80A8,8,0,0,0,40,120v96Z"
                fill="none"
                stroke="white"
                stroke-width="8"
              ></path>
            </svg>
          </div>
          <p>Home</p>
        </div>
      </a>
      <div class="icon" v-if="partnerPackage === 'pro'">
        <div @click="showModel = !showModel" class="AR">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="M11.98 2.36a.75.75 0 00-.33.1L8.3 4.11H8.3a.08.08 0 00-.01.01.76.76 0 00-.31 1c.09.18.24.31.43.38.19.06.4.05.57-.04l2.26-1.13v2.7c0 .2.08.39.22.53a.76.76 0 001.08 0 .76.76 0 00.22-.54V4.34L15 5.47h.01a.76.76 0 001.03-.91.75.75 0 00-.34-.42l-.01-.01a.08.08 0 00-.01 0l-3.34-1.68a.75.75 0 00-.37-.09zm-5.57 2.8a.76.76 0 00-.34.08L2.72 6.9a.76.76 0 00-.42.7v3.9c0 .2.08.39.22.53a.76.76 0 001.07 0 .76.76 0 00.22-.54V8.81l2.26 1.13a.76.76 0 001.05-.91.76.76 0 00-.35-.42.08.08 0 00-.02-.02l-2-1 2-1c.3-.16.48-.52.4-.85a.77.77 0 00-.74-.58zm11.18 0a.77.77 0 00-.73.58c-.08.32.08.67.37.83l.02.02 2 1-2 1a.08.08 0 00-.02.02c-.17.1-.3.24-.35.42a.76.76 0 00.47.95c.19.06.4.05.58-.04l2.26-1.13v2.7c0 .2.08.39.22.53a.76.76 0 001.07 0 .76.76 0 00.22-.54V7.6a.76.76 0 00-.42-.69l-3.35-1.67a.76.76 0 00-.34-.08zm-2.24 4.47a.75.75 0 00-.33.08L12 11.2l-3.02-1.5a.76.76 0 00-1.05.91c.06.18.2.33.36.42a.08.08 0 000 .01h.01a.08.08 0 000 .01l2.94 1.47v2.89c0 .2.08.39.22.53a.76.76 0 001.08 0 .76.76 0 00.22-.53v-2.9l2.93-1.46.02-.02c.3-.16.45-.5.37-.83a.77.77 0 00-.73-.58zM3.01 14.11a.75.75 0 00-.7.75v3.9c-.01.29.15.56.41.69l3.35 1.67a.76.76 0 001.05-.91.76.76 0 00-.34-.42.08.08 0 00-.03-.02l-2-1 2-1 .02-.02c.17-.1.3-.24.35-.42a.76.76 0 00-.47-.95.77.77 0 00-.58.04l-2.26 1.13v-2.7c0-.2-.08-.4-.24-.55a.76.76 0 00-.56-.2zm17.88 0a.76.76 0 00-.7.75v2.69l-2.26-1.13a.76.76 0 00-1.05.91c.06.18.18.33.35.42a.08.08 0 00.01 0v.02a.08.08 0 00.01 0l2 1-2 1h-.01a.08.08 0 000 .01h-.01a.76.76 0 00.13 1.37c.18.07.39.06.57-.03l3.35-1.67c.26-.13.42-.4.42-.69v-3.9a.76.76 0 00-.8-.75zm-8.94 4.47a.08.08 0 00-.03 0 .75.75 0 00-.47.23.76.76 0 00-.2.52v2.69l-2.26-1.13a.08.08 0 00-.01 0 .76.76 0 00-1.03.91c.05.18.18.33.34.42l.01.01a.08.08 0 00.01.01l3.34 1.67c.22.12.49.11.7 0l3.34-1.67.02-.01a.76.76 0 00.31-1 .76.76 0 00-1-.34l-2.26 1.13v-2.7a.76.76 0 00-.8-.74z"
            ></path>
          </svg>
        </div>
        <p>AR</p>
      </div>

      <ModelViewer v-if="showModel" />

      <!-- FaceTracking Component Tonen -->
      <FaceTracking v-if="isFaceTrackingVisible" @close="toggleFaceTracking" />
    </div>
    <div class="rotate-informer desktop" v-if="productModelFile != null">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="#ffffff"
        viewBox="0 0 256 256"
      >
        <path
          d="M232,48V88a8,8,0,0,1-16,0V56H184a8,8,0,0,1,0-16h40A8,8,0,0,1,232,48ZM72,200H40V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16Zm152-40a8,8,0,0,0-8,8v32H184a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,224,160ZM32,96a8,8,0,0,0,8-8V56H72a8,8,0,0,0,0-16H32a8,8,0,0,0-8,8V88A8,8,0,0,0,32,96ZM188,167l-56,32a8,8,0,0,1-7.94,0L68,167A8,8,0,0,1,64,160V96a8,8,0,0,1,4-7l56-32a8,8,0,0,1,7.94,0l56,32a8,8,0,0,1,4,7v64A8,8,0,0,1,188,167ZM88.12,96,128,118.79,167.88,96,128,73.21ZM80,155.36l40,22.85V132.64L80,109.79Zm96,0V109.79l-40,22.85v45.57Z"
        ></path>
      </svg>
      <p>Drag to rotate</p>
    </div>

    <div class="mobileElements">
      <router-link :to="`/`" class="back">
        <i class="fa fa-angle-left"></i>
        <p>Back to collections</p>
      </router-link>
      <div class="row">
        <p class="name">{{ productName }}</p>
        <div class="icons">
          <div class="icon" v-if="partnerPackage === 'pro'">
            <div @click="showModel = !showModel" class="AR">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M11.98 2.36a.75.75 0 00-.33.1L8.3 4.11H8.3a.08.08 0 00-.01.01.76.76 0 00-.31 1c.09.18.24.31.43.38.19.06.4.05.57-.04l2.26-1.13v2.7c0 .2.08.39.22.53a.76.76 0 001.08 0 .76.76 0 00.22-.54V4.34L15 5.47h.01a.76.76 0 001.03-.91.75.75 0 00-.34-.42l-.01-.01a.08.08 0 00-.01 0l-3.34-1.68a.75.75 0 00-.37-.09zm-5.57 2.8a.76.76 0 00-.34.08L2.72 6.9a.76.76 0 00-.42.7v3.9c0 .2.08.39.22.53a.76.76 0 001.07 0 .76.76 0 00.22-.54V8.81l2.26 1.13a.76.76 0 001.05-.91.76.76 0 00-.35-.42.08.08 0 00-.02-.02l-2-1 2-1c.3-.16.48-.52.4-.85a.77.77 0 00-.74-.58zm11.18 0a.77.77 0 00-.73.58c-.08.32.08.67.37.83l.02.02 2 1-2 1a.08.08 0 00-.02.02c-.17.1-.3.24-.35.42a.76.76 0 00.47.95c.19.06.4.05.58-.04l2.26-1.13v2.7c0 .2.08.39.22.53a.76.76 0 001.07 0 .76.76 0 00.22-.54V7.6a.76.76 0 00-.42-.69l-3.35-1.67a.76.76 0 00-.34-.08zm-2.24 4.47a.75.75 0 00-.33.08L12 11.2l-3.02-1.5a.76.76 0 00-1.05.91c.06.18.2.33.36.42a.08.08 0 000 .01h.01a.08.08 0 000 .01l2.94 1.47v2.89c0 .2.08.39.22.53a.76.76 0 001.08 0 .76.76 0 00.22-.53v-2.9l2.93-1.46.02-.02c.3-.16.45-.5.37-.83a.77.77 0 00-.73-.58zM3.01 14.11a.75.75 0 00-.7.75v3.9c-.01.29.15.56.41.69l3.35 1.67a.76.76 0 001.05-.91.76.76 0 00-.34-.42.08.08 0 00-.03-.02l-2-1 2-1 .02-.02c.17-.1.3-.24.35-.42a.76.76 0 00-.47-.95.77.77 0 00-.58.04l-2.26 1.13v-2.7c0-.2-.08-.4-.24-.55a.76.76 0 00-.56-.2zm17.88 0a.76.76 0 00-.7.75v2.69l-2.26-1.13a.76.76 0 00-1.05.91c.06.18.18.33.35.42a.08.08 0 00.01 0v.02a.08.08 0 00.01 0l2 1-2 1h-.01a.08.08 0 000 .01h-.01a.76.76 0 00.13 1.37c.18.07.39.06.57-.03l3.35-1.67c.26-.13.42-.4.42-.69v-3.9a.76.76 0 00-.8-.75zm-8.94 4.47a.08.08 0 00-.03 0 .75.75 0 00-.47.23.76.76 0 00-.2.52v2.69l-2.26-1.13a.08.08 0 00-.01 0 .76.76 0 00-1.03.91c.05.18.18.33.34.42l.01.01a.08.08 0 00.01.01l3.34 1.67c.22.12.49.11.7 0l3.34-1.67.02-.01a.76.76 0 00.31-1 .76.76 0 00-1-.34l-2.26 1.13v-2.7a.76.76 0 00-.8-.74z"
                ></path>
              </svg>
            </div>
            <p>AR</p>
          </div>

          <ModelViewer v-if="showModel" />
          <!-- FaceTracking Component Tonen -->
           <FaceTracking
            v-if="isFaceTrackingVisible"
            @close="toggleFaceTracking"
          /> 
        </div>
      </div>

      <div class="model" v-if="productModelFile != null"></div>
      <div class="bigImageWithImages" v-if="productModelFile == null">
        <!-- Big Image Display -->
        <div
          class="bigImage"
          :style="{ backgroundImage: `url(${selectedImage})` }"
        ></div>

        <!-- Thumbnail Images -->
        <div class="images">
          <div
            v-for="(image, index) in productImages"
            :key="image._id"
            class="image"
            :class="{ active: image === selectedImage }"
            :style="{ backgroundImage: `url(${image})` }"
            @click="setSelectedImage(image)"
          ></div>
        </div>
      </div>

      <div class="rotate-informer desktop" v-if="productModelFile != null">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="#ffffff"
          viewBox="0 0 256 256"
        >
          <path
            d="M232,48V88a8,8,0,0,1-16,0V56H184a8,8,0,0,1,0-16h40A8,8,0,0,1,232,48ZM72,200H40V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16Zm152-40a8,8,0,0,0-8,8v32H184a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,224,160ZM32,96a8,8,0,0,0,8-8V56H72a8,8,0,0,0,0-16H32a8,8,0,0,0-8,8V88A8,8,0,0,0,32,96ZM188,167l-56,32a8,8,0,0,1-7.94,0L68,167A8,8,0,0,1,64,160V96a8,8,0,0,1,4-7l56-32a8,8,0,0,1,7.94,0l56,32a8,8,0,0,1,4,7v64A8,8,0,0,1,188,167ZM88.12,96,128,118.79,167.88,96,128,73.21ZM80,155.36l40,22.85V132.64L80,109.79Zm96,0V109.79l-40,22.85v45.57Z"
          ></path>
        </svg>
        <p>Drag to rotate</p>
      </div>
    </div>
    <div class="config-wrapper">
      <div class="overview">
        <h2>Overview</h2>
        <ul v-if="productConfigs.length > 0">
          <li v-for="(configuration, index) in productConfigs" :key="index">
            <p>
              {{ configuration.configurationId?.fieldName }}
            </p>
            <i class="fa fa-angle-right"></i>
          </li>
        </ul>

        <p v-else>No configurations found for this product.</p>
      </div>
      <div
        v-for="(configuration, index) in productConfigs"
        :key="index"
        class="config-ui__page"
        v-show="currentPageIndex === index"
      >
        <h2 class="fieldName">
          {{
            configuration.configurationId?.fieldType === "color"
              ? "Choose the color for"
              : "Choose an option for"
          }}
          {{ configuration.configurationId?.fieldName || `Layer ${index}` }}
        </h2>

        <div class="row">
          <div
            v-for="(selectedOption, index) in configuration.selectedOptions"
            :key="index"
            :class="{
              active: selectedOption.optionId?.name === selectedOptionName,
            }"
            @click="selectOption(selectedOption.optionId?.name)"
            :style="{ backgroundColor: selectedOption.optionId?.name }"
          ></div>
        </div>
      </div>

      <div class="summary">
        <h2>Summary</h2>
        <ul v-if="productConfigs.length > 0">
          <li
            v-for="(configuration, index) in productConfigs"
            :key="index"
            class="borderBottom"
          >
            <p>{{ configuration.configurationId?.fieldName }}</p>

            <!-- Controleer of er geselecteerde items zijn -->
            <ul>
              <li
                v-if="
                  selectedItems.length > 0 &&
                  selectedItems.some(
                    (item) =>
                      item.configurationId ===
                      configuration.configurationId?._id
                  )
                "
                v-for="(item, index) in selectedItems"
                :key="index"
              >
                <p
                  class="border"
                  :style="{
                    backgroundColor:
                      item.selectedItem?.optionName || 'transparent',
                  }"
                ></p>
              </li>

              <!-- Als er geen geselecteerde optie is, toon dan een transparante border met configuratienaam -->
              <li v-else>
                <p class="border" style="background-color: transparent">
                  <span>No option selected</span>
                </p>
              </li>
            </ul>
          </li>
        </ul>
      </div>
      <div class="links">
        <a
          href="#"
          class="backButton"
          @click="previousPage"
          style="visibility: hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 320 512"
            style="transform: rotate(180deg)"
          >
            <path
              d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
            ></path>
          </svg>
          <p>Back</p>
        </a>

        <a class="nextButton" @click="nextPage" style="visibility: visible">
          <p>Next</p>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
            <path
              d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
            ></path>
          </svg>
        </a>

        <a href="#" class="summaryButton" style="display: none">
          <p>Summary</p>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
            <path
              d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
            ></path>
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>

<style src="../assets/css/detailsProduct.css"></style>
