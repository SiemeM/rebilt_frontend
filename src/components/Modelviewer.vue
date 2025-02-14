<script setup>
import { onMounted, ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import "webxr-polyfill"; // Laad de polyfill om WebXR-ondersteuning op oudere browsers te verbeteren

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
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

  // 3D-model laden met DRACO-ondersteuning
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  // WebXR configuratie
  if (navigator.xr) {
    // Start een AR sessie wanneer de gebruiker AR op zijn apparaat ondersteunt
    navigator.xr
      .requestSession("immersive-ar", {
        requiredFeatures: ["hit-test", "local-floor"],
      })
      .then((session) => {
        const gl = renderer.getContext();
        const xrLayer = new XRWebGLLayer(session, gl);
        session.updateRenderState({ baseLayer: xrLayer });

        // Vraag om een "local" reference space, wat de ruimte van het apparaat zelf is
        session.requestReferenceSpace("local").then((referenceSpace) => {
          session.requestAnimationFrame((time, frame) => {
            const pose = frame.getViewerPose(referenceSpace);

            // Controleer of het frame de juiste pose heeft
            if (pose) {
              // Update camera en render de scène
              camera.matrixAutoUpdate = false;
              camera.matrix.fromArray(pose.transform.matrix);
              renderer.render(scene, camera);
            }
          });
        });

        // Model laden wanneer de AR sessie begint
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
      })
      .catch((error) => {
        console.error("Fout bij het starten van AR-sessie:", error);
      });
  } else {
    console.log("WebXR wordt niet ondersteund op dit apparaat.");
  }

  // Animatielus voor normale weergave zonder AR
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
  position: absolute; /* Dit zorgt ervoor dat de 3D-scène bovenop de pagina komt */
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh; /* Zorgt ervoor dat de scene de volledige hoogte van het scherm gebruikt */
  overflow: hidden;
  z-index: 10; /* Zet een hoge z-index om ervoor te zorgen dat het boven andere inhoud ligt */
}
</style>
