<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import DynamicStyle from "../components/DynamicStyle.vue";

const sizes = ref([]);
const materials = ref([]);
const layers = ref([]);
const layersColors = ref([]);
const selectedThingsInLayers = ref([]);
const colors = ref([]);
const selectedColor = ref(null);
const currentPageIndex = ref(0);
const productImages = ref([]);
const selectedImage = ref(null);
const route = useRoute();
const router = useRouter();
const productId = ref(null);
const productData = ref({ productName: "", productCode: "", productPrice: 0 });
const productName = ref("");
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
let scene, camera, renderer;
const objLoader = new OBJLoader();
let isModelLoaded = false;
let model = null;
const selectedOption = ref(0);
const selectedOptionName = ref(null);
const optionNames = ref([]);
const selectedItems = ref([]);
const productConfigs = ref([]);
let isMouseDown = false;
let prevMouseX = 0;
let prevMouseY = 0;
const rotationSpeed = 0.005;
let isSceneInitialized = false; // Flag to track scene initialization
let isRendererInitialized = false; // Flag to track renderer initialization
const partnerConfigurationsCount = ref([]);
let rendererMobile, rendererDesktop;

/* ---- 3D ---- */

onMounted(() => {
  // Initialize the renderer, scene, and camera only once
  if (!isSceneInitialized) {
    initializeScene();
    isSceneInitialized = true;
  }

  // Start the animation loop only if the renderer is initialized
  if (isRendererInitialized) {
    animate();
  }

  // Add resize event listener to update the canvas size on window resize
  window.addEventListener("resize", onWindowResize);
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener("resize", onWindowResize); // Don't forget to remove the listener
});

function onWindowResize() {
  const container = document.querySelector(".model");
  if (container && renderer) {
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
  }
}

let animationId;

function animate() {
  // Check if either of the renderers is initialized
  if (rendererMobile || rendererDesktop) {
    // Choose the appropriate renderer based on the device (mobile or desktop)
    const rendererToUse =
      window.innerWidth <= 768 ? rendererMobile : rendererDesktop;

    // Ensure the chosen renderer is initialized
    if (rendererToUse) {
      animationId = requestAnimationFrame(animate);
      rendererToUse.render(scene, camera);
    } else {
      console.error("Renderer is not initialized yet!");
    }
  } else {
    console.error("Neither renderer is initialized yet!");
  }
}

function load3DModel() {
  if (!isSceneInitialized) {
    console.error("Scene is not initialized.");
    return;
  }

  objLoader.load(
    "../../public/models/ring.obj", // Correct path to public assets folder
    (object) => {
      const box = new THREE.Box3().setFromObject(object);
      object.position.set(0, -12, 0);
      object.scale.set(10, 10, 10);
      scene.add(object);
      model = object;
      isModelLoaded = true;
      extractMaterials(object);
    },
    (xhr) => {},
    (error) => {
      console.error("Error loading 3D model:", error);
    }
  );
}

onMounted(() => {
  // Initialize the renderer, scene, and camera only once
  if (!isSceneInitialized) {
    initializeScene();
  }
});

function initializeScene() {
  if (isRendererInitialized) return; // Prevent re-initialization

  try {
    console.log("Initializing scene...");

    // Initialize the scene
    scene = new THREE.Scene();

    // Initialize the camera
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 40);
    camera.lookAt(0, 0, 0);

    // Get both containers (model inside mobileElements and model desktop)
    const containerModelMobile = document.querySelector(
      ".mobileElements .model"
    );
    const containerModelDesktop = document.querySelector(".model.desktop");

    if (!containerModelMobile) {
      console.error("Mobile 3D container element not found!");
      return;
    }

    if (!containerModelDesktop) {
      console.error("Desktop 3D container element not found!");
      return;
    }

    // Initialize the renderer for mobile (only if not already initialized)
    if (!rendererMobile) {
      rendererMobile = new THREE.WebGLRenderer();
      rendererMobile.setSize(
        containerModelMobile.offsetWidth,
        containerModelMobile.offsetHeight
      );
      if (!containerModelMobile.contains(rendererMobile.domElement)) {
        containerModelMobile.appendChild(rendererMobile.domElement);
      }
    }

    // Initialize the renderer for desktop (only if not already initialized)
    if (!rendererDesktop) {
      rendererDesktop = new THREE.WebGLRenderer();
      rendererDesktop.setSize(
        containerModelDesktop.offsetWidth,
        containerModelDesktop.offsetHeight
      );
      if (!containerModelDesktop.contains(rendererDesktop.domElement)) {
        containerModelDesktop.appendChild(rendererDesktop.domElement);
      }
    }

    // Add lights
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

    // Add mouse and touch event listeners for both containers
    containerModelMobile.addEventListener("mousedown", onMouseDown, false);
    containerModelDesktop.addEventListener("mousedown", onMouseDown, false);

    containerModelMobile.addEventListener("touchstart", onTouchStart, false);
    containerModelDesktop.addEventListener("touchstart", onTouchStart, false);

    window.addEventListener("mousemove", onMouseMove, false);
    window.addEventListener("touchmove", onTouchMove, false);
    window.addEventListener("mouseup", onMouseUp, false);
    window.addEventListener("touchend", onTouchEnd, false);

    // Set the flag for renderer initialization
    isRendererInitialized = true;

    // Start the animation loop after initialization
    animate();

    console.log("Scene initialized successfully.");
  } catch (err) {
    console.error("Error during scene initialization:", err);
  }
}

function onTouchStart(event) {
  event.preventDefault(); // Prevents touch scrolling
  isMouseDown = true;
  prevMouseX = event.touches[0].clientX;
  prevMouseY = event.touches[0].clientY;
}

function onTouchMove(event) {
  if (!isMouseDown) return;

  const deltaX = event.touches[0].clientX - prevMouseX;
  const deltaY = event.touches[0].clientY - prevMouseY;

  if (model) {
    model.rotation.y += deltaX * rotationSpeed;
    model.rotation.x += deltaY * rotationSpeed;
  }

  prevMouseX = event.touches[0].clientX;
  prevMouseY = event.touches[0].clientY;
}

function onTouchEnd() {
  isMouseDown = false;
}

function extractMaterials(object) {
  materials.value = [];
  layers.value = [];
  layersColors.value = [];

  object.traverse((child) => {
    if (child.isMesh) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => {
          materials.value.push(material);
          if (!layers.value.includes(material.name)) {
            layers.value.push(material.name);
            layersColors.value.push("#ffffff");
          }
        });
      } else {
        materials.value.push(child.material);
        if (!layers.value.includes(child.material.name)) {
          layers.value.push(child.material.name);
          layersColors.value.push("#ffffff");
        }
      }
    }
  });

  layers.value = [...new Set(layers.value)];
}

function applyColorToMaterial(material, color, opacity = 1) {
  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshBasicMaterial
  ) {
    material.color.set(color);
    material.opacity = opacity;
    material.transparent = opacity < 1;
  } else if (material instanceof THREE.ShaderMaterial) {
    if (material.uniforms && material.uniforms.color) {
      material.uniforms.color.value.set(color);
    }
  } else {
    material.emissive.set(color);
  }
}

function applyColorToSpecificLayer(color, layerName) {
  const material = materials.value.find((mat) => mat.name === layerName);

  if (material) {
    applyColorToMaterial(material, color);
  } else {
    console.warn(`Material with name ${layerName} not found.`);
  }

  // Update layersColors array with new color
  const layerIndex = layers.value.indexOf(layerName);
  if (layerIndex !== -1) {
    layersColors.value[layerIndex] = color;
  }

  // Apply color to all matching materials in the scene
  scene.traverse((child) => {
    if (child.isMesh && child.material.name === layerName) {
      applyColorToMaterial(child.material, color);
    }
  });
}

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

/* ---- 2D ---- */
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
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    partnerPackage.value = data.data.partner.package || "";
    console.log(partnerPackage.value);
  } catch (err) {
    console.error("Error fetching partner package:", err);
  }
}

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
      console.log("productConfigs", productConfigs.value);
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
    console.log(existing);
    if (!existing) {
      optionNames.value.push({ optionId, name: data.data.name }); // Push the optionId and name pair
    }

    return data.data.name; // Return the name for use
  } catch (error) {
    console.error("Error fetching option by ID:", error);
    return null; // Return null in case of an error
  }
}

function selectOption(optionName) {
  const productId = route.params.productId;

  if (!productId) {
    console.error("productId is undefined!");
    return;
  }

  // Update de geselecteerde optie met de kleurwaarde (optionName)
  selectedOption.value = optionName;
  selectedOptionName.value = optionName; // Update selectedOptionName

  let selectedOptionImages = [];

  fetch(`${baseURL}/products/${productId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then(async (result) => {
      const product = result.data.product;
      const configurations = product.configurations || [];

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
            console.log(configResult);

            const options = configResult.data.options || [];

            // Zoek de geselecteerde optie op basis van optionName
            const selectedOptionData = config.selectedOptions.find(
              (option) => option.optionId?.name === optionName
            );

            let optionNameFromApi = selectedOptionData?.name || optionName;

            if (!optionNameFromApi && selectedOptionData?.optionId) {
              // Haal de naam op via de aparte API-call
              const optionUrl = `${baseURL}/options/${selectedOptionData.optionId._id}`;
              try {
                const optionResponse = await fetch(optionUrl, {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  },
                });

                if (!optionResponse.ok) {
                  throw new Error(
                    `Option fetch error! Status: ${optionResponse.status}`
                  );
                }

                const optionResult = await optionResponse.json();
                optionNameFromApi = optionResult.data?.name || optionName;
              } catch (err) {
                console.error(
                  `Error fetching option name for optionId ${selectedOptionData.optionId._id}:`,
                  err.message
                );
              }
            }

            if (selectedOptionData?.images) {
              selectedOptionImages = selectedOptionData.images;
              console.log(selectedOptionImages);
            } else {
              selectedOptionImages = [];
            }

            // Update selectedItems
            const existingConfigIndex = selectedItems.value.findIndex(
              (item) => item.configurationId === selectedConfigId
            );

            if (existingConfigIndex !== -1) {
              selectedItems.value[existingConfigIndex].selectedItem = {
                optionName: optionNameFromApi,
                images: selectedOptionImages,
              };
            } else {
              selectedItems.value.push({
                configurationId: selectedConfigId,
                selectedItem: {
                  optionName: optionNameFromApi,
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

      // Zet de geselecteerde afbeeldingen in productImages
      productImages.value = selectedOptionImages;

      // Zet de eerste afbeelding als selectedImage
      if (selectedOptionImages.length > 0) {
        selectedImage.value = selectedOptionImages[0];
      }

      // Update productData
      productData.value = {
        productName: product.productName,
        productCode: product.productCode,
        productPrice: product.productPrice,
        images: selectedOptionImages,
        configurations: enrichedConfigurations,
      };

      const partnerId = product.partnerId;
      if (partnerId) {
        await fetchPartnerName(partnerId);
        await fetchPartnerPackage(partnerId);
        await fetchNumberOfPartnerConfigurations(partnerId);
        await fetchLogoUrl(partnerId);
        await fetchPartnerConfigurations(partnerId, product);
      }
    })
    .catch((err) => {
      console.error("Error fetching product data:", err.message);
      error.value =
        "Er is een fout opgetreden bij het ophalen van de productgegevens.";
    })
    .finally(() => {
      isLoading.value = false;
    });
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

    // Haal productgegevens op
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
    productName.value = product.productName;

    // Haal de configuraties voor dit product op
    const configurations = product.configurations || []; // Default to an empty array if configurations is missing

    // Maak een aparte array voor de namen van de opties
    optionNames.value = [];

    // Verzamel de afbeeldingen van de geselecteerde opties
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

          // Gebruik de geselecteerde optie (bijvoorbeeld de eerste geselecteerde optie)
          const selectedOptionData = config.selectedOptions[0]; // Hier kiezen we de eerste geselecteerde optie

          let optionName = selectedOptionData?.name;

          if (!optionName && selectedOptionData?.optionId) {
            // Haal de naam op via de aparte API-call
            const optionUrl = `${baseURL}/options/${selectedOptionData.optionId._id}`;
            try {
              const optionResponse = await fetch(optionUrl, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              });

              if (!optionResponse.ok) {
                throw new Error(
                  `Option fetch error! Status: ${optionResponse.status}`
                );
              }

              const optionResult = await optionResponse.json();
              optionName = optionResult.data?.name || `Option 1`; // Fallback naam
            } catch (err) {
              console.error(
                `Error fetching option name for optionId ${selectedOptionData.optionId._id}:`,
                err.message
              );
            }
          }

          // Haal de afbeeldingen van de geselecteerde optie
          if (selectedOptionData?.images) {
            selectedOptionImages = selectedOptionData.images;
            console.log("Selected option images:", selectedOptionImages);
          } else {
            selectedOptionImages = [];
          }

          // Update de geselecteerde configuratie met de geselecteerde optie
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

    // Update de productImages met de afbeeldingen van de geselecteerde optie
    productImages.value = selectedOptionImages;

    // Stel de eerste afbeelding in als selectedImage
    if (selectedOptionImages.length > 0) {
      selectedImage.value = selectedOptionImages[0]; // De eerste afbeelding als geselecteerde afbeelding
    }

    // Update productData met de geselecteerde afbeeldingen en configuraties
    productData.value = {
      productName: product.productName,
      productCode: product.productCode,
      productPrice: product.productPrice,
      images: selectedOptionImages, // Alleen de geselecteerde afbeeldingen van de eerste optie
      configurations: enrichedConfigurations, // Voeg de verrijkte configuraties toe
    };

    // Werk de opties en geselecteerde items bij
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

watch(partnerPackage, (newPackage) => {
  if (newPackage === "pro" && !isModelLoaded) {
    load3DModel();
  }
});

onMounted(() => {
  const container = document.querySelector(".model");
  if (container) {
    initializeScene();
  } else {
    console.error("3D container not found!");
  }
});
</script>

<template>
  <DynamicStyle />
  <div class="container">
    <div
      class="logoConfigurator"
      :style="{ backgroundImage: `url(${logoUrl})` }"
    ></div>
    <div class="carousel" v-if="partnerPackage === 'standard'">
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

    <div class="model desktop"></div>
    <div class="icons desktop">
      <router-link :to="`/`">
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
      </router-link>
      <div class="icon" v-if="partnerPackage === 'pro'">
        <div @click="generateQRCode" class="AR">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="M11.98 2.36a.75.75 0 00-.33.1L8.3 4.11H8.3a.08.08 0 00-.01.01.76.76 0 00-.31 1c.09.18.24.31.43.38.19.06.4.05.57-.04l2.26-1.13v2.7c0 .2.08.39.22.53a.76.76 0 001.08 0 .76.76 0 00.22-.54V4.34L15 5.47h.01a.76.76 0 001.03-.91.75.75 0 00-.34-.42l-.01-.01a.08.08 0 00-.01 0l-3.34-1.68a.75.75 0 00-.37-.09zm-5.57 2.8a.76.76 0 00-.34.08L2.72 6.9a.76.76 0 00-.42.7v3.9c0 .2.08.39.22.53a.76.76 0 001.07 0 .76.76 0 00.22-.54V8.81l2.26 1.13a.76.76 0 001.05-.91.76.76 0 00-.35-.42.08.08 0 00-.02-.02l-2-1 2-1c.3-.16.48-.52.4-.85a.77.77 0 00-.74-.58zm11.18 0a.77.77 0 00-.73.58c-.08.32.08.67.37.83l.02.02 2 1-2 1a.08.08 0 00-.02.02c-.17.1-.3.24-.35.42a.76.76 0 00.47.95c.19.06.4.05.58-.04l2.26-1.13v2.7c0 .2.08.39.22.53a.76.76 0 001.07 0 .76.76 0 00.22-.54V7.6a.76.76 0 00-.42-.69l-3.35-1.67a.76.76 0 00-.34-.08zm-2.24 4.47a.75.75 0 00-.33.08L12 11.2l-3.02-1.5a.76.76 0 00-1.05.91c.06.18.2.33.36.42a.08.08 0 000 .01h.01a.08.08 0 000 .01l2.94 1.47v2.89c0 .2.08.39.22.53a.76.76 0 001.08 0 .76.76 0 00.22-.53v-2.9l2.93-1.46.02-.02c.3-.16.45-.5.37-.83a.77.77 0 00-.73-.58zM3.01 14.11a.75.75 0 00-.7.75v3.9c-.01.29.15.56.41.69l3.35 1.67a.76.76 0 001.05-.91.76.76 0 00-.34-.42.08.08 0 00-.03-.02l-2-1 2-1 .02-.02c.17-.1.3-.24.35-.42a.76.76 0 00-.47-.95.77.77 0 00-.58.04l-2.26 1.13v-2.7c0-.2-.08-.4-.24-.55a.76.76 0 00-.56-.2zm17.88 0a.76.76 0 00-.7.75v2.69l-2.26-1.13a.76.76 0 00-1.05.91c.06.18.18.33.35.42a.08.08 0 00.01 0v.02a.08.08 0 00.01 0l2 1-2 1h-.01a.08.08 0 000 .01h-.01a.76.76 0 00.13 1.37c.18.07.39.06.57-.03l3.35-1.67c.26-.13.42-.4.42-.69v-3.9a.76.76 0 00-.8-.75zm-8.94 4.47a.08.08 0 00-.03 0 .75.75 0 00-.47.23.76.76 0 00-.2.52v2.69l-2.26-1.13a.08.08 0 00-.01 0 .76.76 0 00-1.03.91c.05.18.18.33.34.42l.01.01a.08.08 0 00.01.01l3.34 1.67c.22.12.49.11.7 0l3.34-1.67.02-.01a.76.76 0 00.31-1 .76.76 0 00-1-.34l-2.26 1.13v-2.7a.76.76 0 00-.8-.74z"
            ></path>
          </svg>
        </div>
        <p>AR</p>
      </div>
    </div>
    <div class="rotate-informer desktop" v-if="partnerPackage === 'pro'">
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
            <div @click="generateQRCode" class="AR">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M11.98 2.36a.75.75 0 00-.33.1L8.3 4.11H8.3a.08.08 0 00-.01.01.76.76 0 00-.31 1c.09.18.24.31.43.38.19.06.4.05.57-.04l2.26-1.13v2.7c0 .2.08.39.22.53a.76.76 0 001.08 0 .76.76 0 00.22-.54V4.34L15 5.47h.01a.76.76 0 001.03-.91.75.75 0 00-.34-.42l-.01-.01a.08.08 0 00-.01 0l-3.34-1.68a.75.75 0 00-.37-.09zm-5.57 2.8a.76.76 0 00-.34.08L2.72 6.9a.76.76 0 00-.42.7v3.9c0 .2.08.39.22.53a.76.76 0 001.07 0 .76.76 0 00.22-.54V8.81l2.26 1.13a.76.76 0 001.05-.91.76.76 0 00-.35-.42.08.08 0 00-.02-.02l-2-1 2-1c.3-.16.48-.52.4-.85a.77.77 0 00-.74-.58zm11.18 0a.77.77 0 00-.73.58c-.08.32.08.67.37.83l.02.02 2 1-2 1a.08.08 0 00-.02.02c-.17.1-.3.24-.35.42a.76.76 0 00.47.95c.19.06.4.05.58-.04l2.26-1.13v2.7c0 .2.08.39.22.53a.76.76 0 001.07 0 .76.76 0 00.22-.54V7.6a.76.76 0 00-.42-.69l-3.35-1.67a.76.76 0 00-.34-.08zm-2.24 4.47a.75.75 0 00-.33.08L12 11.2l-3.02-1.5a.76.76 0 00-1.05.91c.06.18.2.33.36.42a.08.08 0 000 .01h.01a.08.08 0 000 .01l2.94 1.47v2.89c0 .2.08.39.22.53a.76.76 0 001.08 0 .76.76 0 00.22-.53v-2.9l2.93-1.46.02-.02c.3-.16.45-.5.37-.83a.77.77 0 00-.73-.58zM3.01 14.11a.75.75 0 00-.7.75v3.9c-.01.29.15.56.41.69l3.35 1.67a.76.76 0 001.05-.91.76.76 0 00-.34-.42.08.08 0 00-.03-.02l-2-1 2-1 .02-.02c.17-.1.3-.24.35-.42a.76.76 0 00-.47-.95.77.77 0 00-.58.04l-2.26 1.13v-2.7c0-.2-.08-.4-.24-.55a.76.76 0 00-.56-.2zm17.88 0a.76.76 0 00-.7.75v2.69l-2.26-1.13a.76.76 0 00-1.05.91c.06.18.18.33.35.42a.08.08 0 00.01 0v.02a.08.08 0 00.01 0l2 1-2 1h-.01a.08.08 0 000 .01h-.01a.76.76 0 00.13 1.37c.18.07.39.06.57-.03l3.35-1.67c.26-.13.42-.4.42-.69v-3.9a.76.76 0 00-.8-.75zm-8.94 4.47a.08.08 0 00-.03 0 .75.75 0 00-.47.23.76.76 0 00-.2.52v2.69l-2.26-1.13a.08.08 0 00-.01 0 .76.76 0 00-1.03.91c.05.18.18.33.34.42l.01.01a.08.08 0 00.01.01l3.34 1.67c.22.12.49.11.7 0l3.34-1.67.02-.01a.76.76 0 00.31-1 .76.76 0 00-1-.34l-2.26 1.13v-2.7a.76.76 0 00-.8-.74z"
                ></path>
              </svg>
            </div>
            <p>AR</p>
          </div>
        </div>
      </div>
      <div class="model"></div>
      <div class="bigImageWithImages" v-if="partnerPackage === 'standard'">
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
            :class="{ active: image.url === selectedImage }"
            :style="{ backgroundImage: `url(${image})` }"
            @click="setSelectedImage(image)"
          ></div>
        </div>
      </div>

      <div class="rotate-informer desktop" v-if="partnerPackage === 'pro'">
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
        <h2>
          {{
            configuration.fieldType === "Color"
              ? "Choose the color for"
              : "Choose an option for"
          }}
          {{ configuration.configurationId?.fieldName }}
        </h2>

        <div class="row">
          <div
            v-for="(selectedOption, index) in configuration.selectedOptions"
            :key="index"
            :class="{
              active:
                selectedOption.optionId?.name === selectedOptionName ||
                (index === 0 && !selectedOptionName),
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

        <!-- Personal info form -->
        <h3>Personal info</h3>
        <!-- <form @submit.prevent="submitOrder">
          <p style="display: none">{{ productCode }}</p>
          <div class="row">
            <div class="column">
              <label for="firstname">First Name</label>
              <input
                type="text"
                id="firstname"
                name="firstname"
                v-model="firstName"
                placeholder="John"
                required
              />
            </div>
            <div class="column">
              <label for="lastname">Last Name</label>
              <input
                type="text"
                id="lastname"
                name="lastname"
                v-model="lastName"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div class="row">
            <div class="column">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                v-model="email"
                placeholder="johndoe@gmail.com"
                required
              />
            </div>
          </div>

          <div class="row">
            <div class="column">
              <label for="street">Street</label>
              <input
                type="text"
                id="street"
                name="street"
                v-model="street"
                placeholder="Grote markt"
                required
              />
            </div>
            <div class="column">
              <label for="house-number">House Number</label>
              <input
                type="text"
                id="house-number"
                name="house-number"
                v-model="houseNumber"
                placeholder="1"
                required
              />
            </div>
          </div>

          <div class="row">
            <div class="column">
              <label for="postalcode">Postal Code</label>
              <input
                type="text"
                id="postalcode"
                name="postalcode"
                v-model="postalCode"
                placeholder="2800"
                required
              />
            </div>
            <div class="column">
              <label for="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                v-model="city"
                placeholder="Mechelen"
                required
              />
            </div>
          </div>

          <div class="row">
            <div class="column">
              <label for="message">Message</label>
              <input
                type="text"
                id="message"
                name="message"
                v-model="message"
                placeholder="Your message"
              />
            </div>
          </div>

          <button type="submit" class="btn active">Checkout</button>
          <p class="errorMessage"></p>
          <p class="successMessage"></p>
        </form> -->
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
