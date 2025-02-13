<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement"></canvas>
  </div>
</template>

<script>
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"; // Import de GLTFLoader
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as faceMeshModule from "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.3/face_mesh.js";

export default {
  data() {
    return {
      video: null,
      canvas: null,
      faceMesh: null,
      scene: null,
      camera: null,
      renderer: null,
      model: null,
    };
  },
  mounted() {
    this.initializeCamera();
    this.setupFaceMesh();
    this.setup3DScene();
  },
  methods: {
    async initializeCamera() {
      this.video = this.$refs.videoElement;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.video.srcObject = stream;
    },
    async setupFaceMesh() {
      this.canvas = this.$refs.canvasElement;
      this.faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      this.faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true });
      this.faceMesh.onResults(this.onResults);

      await this.faceMesh.initialize();
      this.detectFaces();
    },
    async detectFaces() {
      if (!this.video || !this.faceMesh) return;
      await this.faceMesh.send({ image: this.video });
      requestAnimationFrame(this.detectFaces);
    },
    onResults(results) {
      console.log("Gezichtslandmarks:", results.multiFaceLandmarks);
      if (results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        this.updateModelPosition(landmarks);
      }
    },
    setup3DScene() {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      // Laad het brilmodel via GLTFLoader met Draco-gecomprimeerd model
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(
        "https://www.gstatic.com/draco/version_5.0.0/"
      );

      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);

      loader.load(
        "https://res.cloudinary.com/dzempjvto/raw/upload/v1739183774/Products/222233/k4du4mi1q2uvou11dfvy.glb",
        (gltf) => {
          this.model = gltf.scene;
          this.scene.add(this.model);
        },
        undefined,
        (error) => {
          console.error(
            "Er is een fout opgetreden bij het laden van het model:",
            error
          );
        }
      );

      this.camera.position.z = 1; // Zet de camera op een redelijke afstand van het object
    },
    updateModelPosition(landmarks) {
      // Gebruik de gezichtslandmarks om de positie van het model aan te passen
      const noseBridge = landmarks[1]; // Dit is een voorbeeld: neem de neusbrug als referentiepunt
      if (this.model) {
        this.model.position.set(noseBridge.x - 0.5, noseBridge.y - 0.5, 0);
      }

      // Render de scene met de camera
      this.renderer.render(this.scene, this.camera);
    },
  },
};
</script>

<style>
.ar-container {
  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
}

video {
  width: 100%;
  height: 100%;
  position: absolute;
  transform: scaleX(-1); /* Spiegelt de camera */
}

canvas {
  width: 100%;
  height: 100%;
  position: absolute;
}

@media (min-width: 1024px) {
  .ar-container {
    width: 50vw; /* Breedte op 50% van het scherm */
    left: 12%; /* Links uitgelijnd */
    height: 100vh;
  }
}
</style>
