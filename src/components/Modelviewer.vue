<script setup>
import { onMounted, ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const sceneContainer = ref(null);

onMounted(() => {
  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  sceneContainer.value.appendChild(renderer.domElement);

  // Licht toevoegen
  const light = new THREE.AmbientLight(0xffffff, 1);
  scene.add(light);

  // DRACO Loader instellen
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/"); // Gebruik Google's DRACO decoder

  // 3D-model laden met DRACO ondersteuning
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader); // Voeg DRACOLoader toe aan GLTFLoader

  loader.load(
    "https://res.cloudinary.com/dzempjvto/raw/upload/v1739183774/Products/222233/b0yi0rxa6kwcdq5act6i.glb",
    (gltf) => {
      scene.add(gltf.scene);
    },
    undefined,
    (error) => {
      console.error("Fout bij laden van model:", error);
    }
  );

  // Animatielus
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
});
</script>

<template>
  <div ref="sceneContainer" class="scene-container"></div>
</template>

<style scoped>
.scene-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
