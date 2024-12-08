<script setup>
import { ref, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "dat.gui";

const route = useRoute();
const productCode = (ref < string) | (undefined > undefined);
let productData = {
  productName: "",
  productPrice: 0,
};

const isLoading = ref < boolean > true;
const error = (ref < string) | (null > null);
const selectedShape = ref < string > "square";
const activeMenu = ref < string > "shape";

watch(
  () => route.params.productCode,
  (newCode) => {
    if (typeof newCode === "string" && newCode.trim()) {
      productCode.value = newCode;
      fetchProductData(newCode);
    } else if (newCode === undefined || newCode === null) {
      console.error("Product code is undefined or null.");
    } else {
      console.warn("Invalid product code type:", newCode);
    }
  },
  { immediate: true }
);

function fetchProductData(code) {
  isLoading.value = true;
  error.value = null;
  fetch(`http://localhost:3000/api/v1/products/${code}`)
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((data) => {
      productData.value = {
        productName: data.data.product.productName,
        productPrice: data.data.product.productPrice,
      };
    })
    .catch((err) => {
      console.error("Error occurred:", err);
      error.value = "Unable to fetch product information.";
    })
    .finally(() => {
      isLoading.value = false;
    });
}

function selectMenu(menu) {
  activeMenu.value = menu;
}

function selectShape(shape) {
  selectedShape.value = shape;
}

onMounted(() => {
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
  const container = document.querySelector(".image-container");

  if (!(container instanceof HTMLElement)) {
    throw new Error(
      "Element with class 'image-container' not found or is not an HTMLElement."
    );
  }
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  container.appendChild(renderer.domElement);

  const cubeTextureLoader = new THREE.CubeTextureLoader();
  const environmentMap = cubeTextureLoader.load([
    "/textures/px.png",
    "/textures/nx.png",
    "/textures/py.png",
    "/textures/ny.png",
    "/textures/pz.png",
    "/textures/nz.png",
  ]);
  scene.background = environmentMap;

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
  dracoLoader.setDecoderPath("/node_modules/three/examples/jsm/libs/draco/");
  gltfLoader.setDRACOLoader(dracoLoader);

  gltfLoader.load(
    "/models/Shoe_compressed.glb",
    (gltf) => {
      gltf.scene.scale.set(50, 50, 50);
      gltf.scene.position.set(0, 0, 0);

      gltf.scene.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshStandardMaterial
        ) {
          child.material.envMap = environmentMap;
          child.material.needsUpdate = true;
        }
      });

      scene.add(gltf.scene);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.enableZoom = true;
      controls.target.set(0, 0, 0);

      controls.update();

      animate();
    },
    undefined,
    (error) => {
      console.error("Error loading GLB file:", error);
    }
  );

  function animate() {
    requestAnimationFrame(animate);

    if (scene.children.length > 0) {
      const model = scene.children[0];
      model.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
  });

  animate();

  const gui = new GUI();
  gui.domElement.style.position = "absolute";
  gui.domElement.style.top = "10px";
  gui.domElement.style.right = "10px";
  document.body.appendChild(gui.domElement);

  const params = {
    lightIntensity: light.intensity,
    ambientLightIntensity: ambientLight.intensity,
  };

  gui.add(params, "lightIntensity", 0, 2).onChange((value) => {
    light.intensity = value;
  });
  gui.add(params, "ambientLightIntensity", 0, 1).onChange((value) => {
    ambientLight.intensity = value;
  });
});
</script>

<template>
  <div class="container">
    <header>
      <h1>GLINT</h1>
      <nav class="menu">
        <span
          class="menu-item"
          :class="{ active: activeMenu === 'shape' }"
          @click="selectMenu('shape')"
          >1. SHAPE</span
        >
        <span
          class="menu-item"
          :class="{ active: activeMenu === 'material' }"
          @click="selectMenu('material')"
          >2. MATERIAL</span
        >
        <span
          class="menu-item"
          :class="{ active: activeMenu === 'colour' }"
          @click="selectMenu('colour')"
          >3. COLOUR</span
        >
        <span
          class="menu-item"
          :class="{ active: activeMenu === 'overview' }"
          @click="selectMenu('overview')"
          >4. OVERVIEW</span
        >
      </nav>
    </header>

    <div class="content">
      <div class="btns">
        <div>
          <p>Undo</p>
          <img src="../assets/icons/undo.svg" alt="Undo" />
        </div>
        <div>
          <p>Redo</p>
          <img src="../assets/icons/redo.svg" alt="Redo" />
        </div>
      </div>

      <div class="image-container"></div>

      <div class="shape-options" v-if="activeMenu === 'shape'">
        <div
          class="shape-option"
          :class="{ selected: selectedShape === 'square' }"
          @click="selectShape('square')"
        >
          <p class="square"></p>
          <p>Square</p>
        </div>
        <div
          class="shape-option"
          :class="{ selected: selectedShape === 'rectangle' }"
          @click="selectShape('rectangle')"
        >
          <p class="rectangle"></p>
          <p>Rectangle</p>
        </div>
        <div
          class="shape-option"
          :class="{ selected: selectedShape === 'oval' }"
          @click="selectShape('oval')"
        >
          <p class="oval"></p>
          <p>Oval</p>
        </div>
        <div
          class="shape-option"
          :class="{ selected: selectedShape === 'circle' }"
          @click="selectShape('circle')"
        >
          <p class="circle"></p>
          <p>Circle</p>
        </div>
      </div>
    </div>

    <footer class="product-info">
      <div class="product-details">
        <div>
          <p>Product name</p>
          <h2 v-if="productData" class="product-name">
            {{ productData.productName }}
          </h2>
          <p v-else>Loading...</p>
        </div>
        <div>
          <p>Total</p>
          <h3 v-if="productData" class="product-price">
            &euro; {{ productData.productPrice.toFixed(2) }}
          </h3>
          <p v-else>Loading...</p>
        </div>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </footer>
  </div>
</template>

<style scoped>
.container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #fff;
  background-color: #000;
  padding: 64px;
  box-sizing: border-box;
  font-family: "Arial, sans-serif";
}

header {
  display: flex;
  justify-content: space-between;
  padding: 0 40px;
  margin-bottom: 40px;
}

header h1 {
  font-size: 1.5rem;
  color: #ffffff;
  letter-spacing: 1px;
}

.menu {
  display: flex;
  gap: 30px;
  margin: 0 auto;
  text-align: center;
}

.menu-item {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: color 0.3s;
}

.menu-item:hover,
.menu-item.active {
  color: #aa91de;
}

.content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-grow: 1;
  padding: 0 2rem;
  width: 100%;
}

.btns {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btns div {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.btns div img {
  width: 32px;
  height: 32px;
}

.image-container {
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  width: 80vh;
  height: 60vh;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border: 1px solid #ddd;
}

.display {
  display: none !important;
}

.shape-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.shape-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.shape-option .square {
  width: 64px;
  height: 64px;
  border: 4px solid #a2a2a2;
  background-color: transparent;
}

.shape-option .oval {
  width: 82px;
  height: 64px;
  background-color: transparent;
  border: 4px solid #a2a2a2;
  border-radius: 50%;
}

.shape-option .circle {
  width: 64px;
  height: 64px;
  background-color: transparent;
  border: 4px solid #a2a2a2;
  border-radius: 50%;
}

.shape-option .rectangle {
  width: 91px;
  height: 64px;
  border: 4px solid #a2a2a2;
  background-color: transparent;
}

.shape-label {
  color: #888;
  font-size: 1.1rem;
}

.shape-option.selected p {
  border-color: #aa91de;
  color: #aa91de;
}

.product-info {
  width: 100%;
  padding: 20px 40px;
  box-sizing: border-box;
}

.product-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-details div {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-size: 1rem;
}

.product-name,
.product-price {
  color: #aa91de;
  font-size: 1.5rem;
}

.primaryAndSecondaryMaterials,
.primaryAndSecondaryColors {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.primaryAndSecondaryMaterials .primary,
.primaryAndSecondaryMaterials .secondary,
.primaryAndSecondaryColors .primary,
.primaryAndSecondaryColors .secondary {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

.primaryAndSecondaryMaterials .primary .colors,
.primaryAndSecondaryMaterials .secondary .colors,
.primaryAndSecondaryColors .primary .colors,
.primaryAndSecondaryColors .secondary .colors {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
}

.primaryAndSecondaryMaterials .primary .colors .color,
.primaryAndSecondaryMaterials .secondary .colors .color,
.primaryAndSecondaryColors .primary .colors .color,
.primaryAndSecondaryColors .secondary .colors .color,
.overview .color {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.overview .color {
  align-items: flex-start;
}

.primaryAndSecondaryMaterials .primary .colors .color div,
.primaryAndSecondaryMaterials .secondary .colors .color div,
.primaryAndSecondaryColors .primary .colors .color div,
.primaryAndSecondaryColors .secondary .colors .color div,
.overview .color div {
  background-color: var(--purple);
  border-radius: 50%;
  height: 24px;
  width: 24px;
}

.primaryAndSecondaryMaterials .primary .colors .color div.selected,
.primaryAndSecondaryMaterials .secondary .colors .color div.selected,
.primaryAndSecondaryColors .primary .colors .color div.selected,
.primaryAndSecondaryColors .secondary .colors .color div.selected,
.overview .color div.selected {
  position: relative;
  border-radius: 50%;
  overflow: hidden;
}

.primaryAndSecondaryMaterials .primary .colors .color div.selected::after,
.primaryAndSecondaryMaterials .secondary .colors .color div.selected::after,
.primaryAndSecondaryColors .primary .colors .color div.selected::after,
.primaryAndSecondaryColors .secondary .colors .color div.selected::after,
.overview .color div.selected::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  right: 3px;
  bottom: 3px;
  border: 1px solid var(--white);
  border-radius: 50%;
  background-color: yellow;
}

.colors .color p {
  font-size: 12px;
  width: 100%;
}

.overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.overview .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
