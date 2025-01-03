<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

const sizes = ref([]);
const materials = ref([]);
const layers = ref([]);
const partnerConfigurationsCount = ref(0);
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
const isLoading = ref(true);
const error = ref(null);
const logoUrl = ref("");

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const partnerName = ref("");
const partnerPackage = ref("");
let scene, camera, renderer;
const objLoader = new OBJLoader();
let isModelLoaded = false;
let model = null;

function onWindowResize() {
  const container = document.querySelector(".model");
  if (container && renderer) {
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
  }
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function load3DModel() {
  if (!renderer) {
    console.error("Renderer not initialized. Cannot load model.");
    return;
  }

  objLoader.load(
    "/models/ring.obj",
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

  const layerIndex = layers.value.indexOf(layerName);
  if (layerIndex !== -1) {
    layersColors.value[layerIndex] = color;
  }

  scene.traverse((child) => {
    if (child.isMesh && child.material.name === layerName) {
      applyColorToMaterial(child.material, color);
    }
  });
}

function selectColor(color, layerName) {
  selectedColor.value = color;
  highlightSelectedItem(color, "row-class-name");

  applyColorToSpecificLayer(color, layerName);
}

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

const partnerConfigurations = ref([]);
const configurations = ref([]);

async function fetchPartnerConfigurations(partnerId) {
  try {
    // Fetch all partner configurations
    const response = await fetch(`${baseURL}/partnerConfigurations`);
    if (!response.ok) throw new Error("Unable to fetch partner configurations");

    const data = await response.json();

    // Filter only the configurations that match the provided partnerId
    const partnerConfigs = data.data.filter(
      (config) => config.partnerId === partnerId
    );

    if (partnerConfigs.length === 0) {
      return;
    }
    partnerConfigurations.value = partnerConfigs;
    // Fetch and collect the field names of each relevant configuration
    for (const partnerConfig of partnerConfigs) {
      const configResponse = await fetch(
        `${baseURL}/configurations/${partnerConfig.configurationId}`
      );
      if (!configResponse.ok)
        throw new Error(
          `Unable to fetch configuration details for ID: ${partnerConfig.configurationId}`
        );

      const configData = await configResponse.json();
      const config = configData.data;

      // Add field name to the configurations array only if it's not already present
      if (!configurations.value.includes(config.fieldName)) {
        configurations.value.push(config.fieldName);
      }
    }
  } catch (err) {
    console.error("Error fetching partner configurations:", err);
  }
}

async function fetchProductData(code) {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await fetch(`${baseURL}/products/${code}`);
    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    productData.value = {
      productName: data.data.product.productName,
      productCode: data.data.product.productCode,
      productPrice: data.data.product.productPrice,
      productImages: data.data.product.images,
      selectedImage: data.data.product.images[0],
    };

    colors.value = data.data.product.colors || [];
    productImages.value = data.data.product.images;
    selectedImage.value = data.data.product.images[0];
    setDefaultActiveColor();

    const partnerId = data.data.product.partnerId;
    if (partnerId) {
      await fetchPartnerName(partnerId);
      await fetchPartnerPackage(partnerId);
      await fetchNumberOfPartnerConfigurations(partnerId);
      await fetchPartnerConfigurations(partnerId);
      await fetchLogoUrl(partnerId);
    } else {
      console.warn("No partner ID found in product data.");
    }
  } catch (err) {
    console.error("Error fetching product data:", err);
    error.value = "Unable to fetch product information.";
  } finally {
    isLoading.value = false;
  }
}

function setDefaultActiveColor() {
  if (colors.value.length > 0 && !selectedColor.value) {
    selectedColor.value = colors.value[0];
    highlightSelectedItem(colors.value[0], "row-class-name");
  }
}

function highlightSelectedItem(color, part) {
  const elements = document.querySelectorAll(`.${part}`);
  elements.forEach((element) => {
    element.classList.remove("selected", "active");
  });

  const selectedElement = Array.from(elements).find(
    (element) => element.dataset.color === color
  );

  if (selectedElement) {
    selectedElement.classList.add("selected", "active");
  }
}

async function nextPage() {
  const overview = document.querySelector(".overview");
  const summary = document.querySelector(".summary");
  const pages = document.querySelectorAll(".config-ui__page");

  if (!pages || pages.length === 0) {
    console.warn("No config-ui__page elements found.");
    return;
  }

  if (overview && overview.style.display !== "none") {
    overview.style.display = "none";
    currentPageIndex.value = 0;
    pages.forEach((page) => page.classList.remove("active"));
    pages[currentPageIndex.value].classList.add("active");
  } else {
    pages[currentPageIndex.value].classList.remove("active");

    if (currentPageIndex.value < pages.length - 1) {
      currentPageIndex.value++;
      pages[currentPageIndex.value].classList.add("active");
    } else {
      // Show the summary if there are multiple configurations
      const count = await fetchNumberOfPartnerConfigurations(partnerId.value);
      if (count > 1) {
        summary.style.display = "flex";
        document.querySelector(".nextButton").style.visibility = "hidden";
      }
    }
  }
}

async function previousPage() {
  const pages = document.querySelectorAll(".config-ui__page");
  const overview = document.querySelector(".overview");
  const summary = document.querySelector(".summary");
  const nextButton = document.querySelector(".nextButton");

  if (!pages || pages.length === 0) {
    console.warn("No config-ui__page elements found.");
    return;
  }

  if (currentPageIndex.value === 0) {
    if (overview) {
      overview.style.display = "flex";
    }
    if (nextButton) {
      nextButton.style.visibility = "visible";
    }
    pages[currentPageIndex.value].classList.remove("active");
    return;
  }

  pages[currentPageIndex.value].classList.remove("active");

  if (currentPageIndex.value > 0) {
    currentPageIndex.value--;
    pages[currentPageIndex.value].classList.add("active");
  }

  if (summary) {
    summary.style.display = "none";
  }
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

onMounted(async () => {
  initializeScene();
  if (route.params.productId) {
    productId.value = route.params.productId;
    await fetchProductData(productId.value);
  }
});

function initializeScene() {
  try {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 40);
    camera.lookAt(0, 0, 0);

    const container = document.querySelector(".model");
    if (!container) {
      console.error("3D container element not found!");
      return;
    }

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);

    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(10, 10, 10);
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    container.addEventListener("mousedown", onMouseDown, false);
    window.addEventListener("mousemove", onMouseMove, false);
    window.addEventListener("mouseup", onMouseUp, false);

    animate();
    window.addEventListener("resize", onWindowResize, false);
  } catch (err) {
    console.error("Error during scene initialization:", err);
  }
}

let isMouseDown = false;
let prevMouseX = 0;
let prevMouseY = 0;
const rotationSpeed = 0.005;

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
</script>

<template>
  <div class="container">
    <div class="logo" :style="{ backgroundImage: `url(${logoUrl})` }"></div>
    <div class="model">
      <div
        v-if="partnerPackage === 'standard'"
        class="image"
        :style="{ backgroundImage: `url(${selectedImage})` }"
      ></div>
    </div>
    <div class="icons">
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
    <div class="rotate-informer" v-if="partnerPackage === 'pro'">
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
    <div class="config-wrapper">
      <div class="overview" v-if="partnerConfigurationsCount > 1">
        <h2>Overview</h2>
        <ul>
          <li v-for="(fieldName, index) in configurations" :key="index">
            {{ fieldName }}
            <i class="fa fa-angle-right"></i>
          </li>
        </ul>
      </div>

      <div
        v-for="(layer, index) in layers"
        :key="index"
        class="config-ui__page"
        v-show="currentPageIndex === index"
      >
        <h2>Choose the color for {{ layer }}</h2>
        <div class="row">
          <div
            v-for="(color, colorIndex) in colors"
            :key="colorIndex"
            :class="{ active: selectedColor === color }"
            :data-color="color"
            :style="{ backgroundColor: color }"
            @click="selectColor(color, layer)"
          ></div>
        </div>
      </div>

      <div class="summary display" v-if="partnerConfigurationsCount > 1">
        <h2>Summary</h2>
        <div class="configurations">
          <div
            v-for="(color, index) in layersColors"
            :key="index"
            class="config-item"
          >
            <p>Color of {{ layers[index] }}</p>
            <div v-if="selectedColor" class="row">
              <p
                :style="{
                  backgroundColor: color || 'transparent',
                }"
              ></p>
            </div>
          </div>
        </div>
        <h3>Personal info</h3>
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
