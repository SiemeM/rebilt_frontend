<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement"></canvas>
  </div>
</template>

<script>
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export default {
  data() {
    return {
      video: null,
      faceMesh: null,
      scene: null,
      camera: null,
      renderer: null,
      model: null,
      threeCanvas: null,
    };
  },

  mounted() {
    console.log("FaceTracking component gemonteerd");
    this.initializeCamera();
    this.setupFaceMesh();
    this.setupThreeJS();
    window.addEventListener("resize", this.onResize);
  },

  methods: {
    async setupCamera() {
      this.video = this.$refs.videoElement;
      console.log("📸 Camera setup gestart...");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        this.video.srcObject = stream;
        console.log("✅ Camera succesvol gestart!");
      } catch (error) {
        console.error("🚨 Fout bij het starten van de camera:", error);
      }
    },

    async setupFaceMesh() {
      console.log("🧠 FaceMesh setup gestart...");

      this.faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.faceMesh.onResults(this.onFaceMeshResults);

      console.log("🎥 MediaPipe Camera setup gestart...");

      try {
        const camera = new Camera(this.video, {
          onFrame: async () => {
            console.log("🔄 FaceMesh krijgt nieuwe frame...");
            await this.faceMesh.send({ image: this.video });
          },
          width: 640,
          height: 480,
        });

        camera.start();
        console.log("✅ FaceMesh gestart!");
      } catch (error) {
        console.error("🚨 Fout bij het starten van FaceMesh:", error);
      }
    },

    setupThreeJS() {
      console.log("🔧 Three.js setup gestart...");

      this.threeCanvas = this.$refs.canvasElement;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.camera.position.z = 1;

      this.renderer = new THREE.WebGLRenderer({ alpha: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      console.log("🎨 Three.js renderer aangemaakt!");

      if (this.threeCanvas) {
        this.threeCanvas.replaceWith(this.renderer.domElement);
      } else {
        console.warn("⚠️ Canvas element niet gevonden in template!");
      }

      // 3D Model Loader instellen
      console.log("📦 Laden van 3D-model...");

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/threejs/r121/draco/");

      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);

      loader.load(
        "https://res.cloudinary.com/dzempjvto/raw/upload/v1739183774/Products/222233/k4du4mi1q2uvou11dfvy.glb",
        (gltf) => {
          console.log("✅ Model succesvol geladen!");
          this.model = gltf.scene;
          this.scene.add(this.model);
          this.model.scale.set(0.1, 0.1, 0.1);
        },
        undefined,
        (error) => {
          console.error("🚨 Fout bij het laden van het 3D-model:", error);
        }
      );

      this.animate();
    },

    onFaceMeshResults(results) {
      console.log("🧑‍🦰 FaceMesh resultaten ontvangen...");
      if (
        !results.multiFaceLandmarks ||
        results.multiFaceLandmarks.length === 0
      ) {
        console.warn("⚠️ Geen gezichtslandmarks gedetecteerd!");
        return;
      }

      console.log(
        "🎯 Gezichtslandmarks gevonden:",
        results.multiFaceLandmarks[0]
      );
      this.updateModelPosition(results.multiFaceLandmarks[0]);
    },

    updateModelPosition(landmarks) {
      if (!this.model) {
        console.warn("⚠️ Model nog niet geladen, kan geen positie bijwerken!");
        return;
      }

      const nose = landmarks[1]; // Neusbrug als referentiepunt

      if (!nose) {
        console.warn("⚠️ Neuslandmark niet gevonden!");
        return;
      }

      // Coördinaten omzetten
      const x = (nose.x - 0.5) * 2;
      const y = -(nose.y - 0.5) * 2;

      console.log(`🔄 Model verplaatsen naar: X=${x}, Y=${y}`);

      this.model.position.set(x, y, 0);
    },

    animate() {
      requestAnimationFrame(this.animate);
      this.renderer.render(this.scene, this.camera);
    },

    onResize() {
      console.log("📏 Vensterresolutie veranderd!");
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
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
  overflow: hidden;
}

video {
  width: 100%;
  height: 100%;
  position: absolute;
  transform: scaleX(-1);
  object-fit: cover;
}

canvas {
  width: 100%;
  height: 100%;
  position: absolute;
}
</style>
