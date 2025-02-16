<script setup>
import { onMounted, ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import "webxr-polyfill"; // WebXR polyfill voor bredere ondersteuning

const sceneContainer = ref(null);

onMounted(() => {
  // Basis scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  sceneContainer.value.appendChild(renderer.domElement);

  // Licht toevoegen
  const light = new THREE.AmbientLight(0xffffff, 1);
  scene.add(light);

  // DRACO Loader instellen
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

  // 3D-model loader
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  // Controleer WebXR-ondersteuning
  console.log(navigator.xr);
  if (navigator.xr) {
    navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
      if (supported) {
        console.log("✅ WebXR AR wordt ondersteund");
      } else {
        console.log("❌ WebXR AR wordt niet ondersteund");
      }
    });

    document.addEventListener("click", () => {
      navigator.xr
        .requestSession("immersive-ar") // Vereenvoudigde AR-sessie zonder extra features
        .then((session) => {
          renderer.xr.setSession(session);
          session.addEventListener("end", () =>
            console.log("AR-sessie beëindigd")
          );

          // Model laden in AR
          loader.load(
            "https://res.cloudinary.com/dzempjvto/raw/upload/v1739183774/Products/222233/b0yi0rxa6kwcdq5act6i.glb",
            (gltf) => {
              scene.add(gltf.scene);
              console.log("3D-model geladen");
            },
            undefined,
            (error) => {
              console.error("Fout bij laden van model:", error);
            }
          );
        })
        .catch((error) => {
          console.error("Fout bij het starten van AR-sessie:", error);
        });
    });
  } else {
    console.log("WebXR wordt niet ondersteund op dit apparaat.");
  }

  // Animatielus
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // Console logs naar scherm
  function logMessage(message) {
    const logContainer = document.getElementById("log-container");
    if (logContainer) {
      logContainer.innerHTML += message + "<br>";
    }
  }
  console.log = logMessage;
  console.error = logMessage;
  window.onerror = function (message, source, lineno, colno, error) {
    logMessage(
      `❌ Error: ${message} <br>📌 Bestand: ${source}:${lineno}:${colno}`
    );
  };
});
</script>

<template>
  <div ref="sceneContainer" class="scene-container"></div>
  <div
    id="log-container"
    style="
      position: fixed;
      bottom: 10px;
      left: 10px;
      width: 90%;
      color: white;
      padding: 10px;
      font-size: 12px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 9999;
    "
  ></div>
</template>

<style scoped>
.scene-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  z-index: 10;
}
</style>
