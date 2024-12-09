<script setup>
import { ref, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const colors = ref([]);
const selectedColor = ref(null);
const productImages = ref([]);
const selectedImage = ref(null);
const route = useRoute();
const productId = ref(null);
const productData = ref({ productName: "", productCode: "", productPrice: 0 });
const isLoading = ref(true);
const error = ref(null);
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const partnerPackage = ref("");

// Functie om de package van de partner op te halen
async function fetchPartnerPackage(partnerId) {
  try {
    const response = await fetch(`${baseURL}/partners/${partnerId}`);
    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    partnerPackage.value = data.data.partner.package; // Gebruik .value om de ref te updaten
    console.log(partnerPackage.value); // Verplaats de log naar hier, zodat je de juiste waarde krijgt
  } catch (err) {
    console.error("Error fetching partner data:", err);
  }
}

let productCode = "";
let productName = "";

function highlightSelectedItem(color, part) {
  // Zoek de container voor de geselecteerde laag
  const elements = document.querySelectorAll(`.${part}`);

  // Verwijder de 'selected' klasse van alle elementen
  elements.forEach((element) => {
    element.classList.remove("selected");
  });

  // Zoek het element dat overeenkomt met de geselecteerde kleur
  const selectedElement = Array.from(elements).find(
    (element) => element.dataset.color === color
  );

  // Voeg de 'selected' klasse toe aan het geselecteerde item
  if (selectedElement) {
    selectedElement.classList.add("selected");
  }
}

function setDefaultActiveColor() {
  if (colors.value.length > 0) {
    selectedColor.value = colors.value[0];
    highlightSelectedItem(colors.value[0], "row-class-name"); // Pas de naam van de rijklasse aan
  }
}

// Functie om productgegevens op te halen
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

    productCode = data.data.product.productCode;
    productName = data.data.product.productName;
    productImages.value = data.data.product.images;
    selectedImage.value = data.data.product.images[0];
    colors.value = data.data.product.colors || [];
    setDefaultActiveColor();

    const partnerId = data.data.product.partnerId;
    if (partnerId) {
      // Fetch partner package
      await fetchPartnerPackage(partnerId);
    } else {
      console.error(
        "Partner ID is undefined or missing from the product data."
      );
    }
  } catch (err) {
    console.error("Error occurred:", err);
    error.value = "Unable to fetch product information.";
  } finally {
    isLoading.value = false;
  }
}

// Kijkt naar de route en haalt productgegevens op bij wijziging
watch(
  () => route.params.productId,
  (newCode) => {
    if (newCode && newCode !== productId.value) {
      productId.value = newCode;
      fetchProductData(newCode);
    }
  },
  { immediate: true }
);

// Watch voor partnerPackage en handel alleen als het pro-pakket is
watch(partnerPackage, (newPackage) => {
  console.log("Partner package value is now:", newPackage); // Kijk of deze waarde correct wordt opgehaald.
  if (newPackage === "pro") {
    console.log("3D scene is being initialized");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer();
    const container = document.querySelector(".model");
    console.log("Container:", container); // Log om te controleren of de container goed is gevonden
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

    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/assets/draco/");
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(
      "/models/Shoe_compressed.glb",
      (gltf) => {
        console.log("3D model loaded successfully"); // Log om te controleren of het model geladen is
        gltf.scene.scale.set(50, 50, 50);
        scene.add(gltf.scene);
        gltf.scene.traverse((child) => {
          if (child.name === "laces") window.laces = child;
          if (child.name === "sole_bottom") window.sole_bottom = child;
          if (child.name === "sole_top") window.sole_top = child;
          if (child.name === "inside") window.inside = child;
          if (child.name === "outside_1") window.outside1 = child;
          if (child.name === "outside_2") window.outside2 = child;
          if (child.name === "outside_3") window.outside3 = child;
        });

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.enableZoom = true;
        controls.target.set(0, 0, 0);
        controls.update();

        function animate() {
          requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        }

        animate();
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error); // Log als er een fout is met het laden van het model
      }
    );

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
  } else {
    console.log("Partner package is not 'pro', skipping 3D model.");
  }
});
</script>

<template>
  <div class="container">
    <div class="logo"></div>
    <div class="model">
      <div
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
      <div class="icon">
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
    <div class="rotate-informer">
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
      <div class="elements">
        <div class="overviewConfig">
          <div class="config-ui__page page1 colorsItem">
            <div class="top">
              <h3>{{ productName }}</h3>
              <router-link :to="`/`">change model</router-link>
            </div>
            <h2>Choose the color of the frame</h2>
            <div class="row">
              <div
                v-for="(color, index) in colors"
                :key="index"
                :class="{ active: selectedColor === color }"
                :data-color="color"
                :style="{ backgroundColor: color }"
                @click="selectColor(color)"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="../assets/css/detailsProduct.css"></style>
