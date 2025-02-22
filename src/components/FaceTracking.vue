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
      threeCamera: null,
      renderer: null,
      model: null,
      animationFrameId: null,
    };
  },

  mounted() {
    console.log("🔄 FaceTracking component gemonteerd");

    this.setupCamera()
      .then(() => this.setupFaceMesh())
      .then(() => this.setupThreeJS())
      .catch((err) => console.error("🚨 Fout bij initialisatie:", err));

    window.addEventListener("resize", this.onResize);
  },

  beforeUnmount() {
    console.log("🛑 Component wordt verwijderd, cleanup!");
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener("resize", this.onResize);
  },

  methods: {
    async setupCamera() {
      console.log("📸 Camera setup gestart...");
      this.video = this.$refs.videoElement;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.video.srcObject = stream;
        console.log("✅ Camera succesvol gestart!");
      } catch (error) {
        console.error("🚨 Fout bij het starten van de camera:", error);
      }
    },

    async setupFaceMesh() {
      console.log("🧠 FaceMesh setup gestart...");

      this.faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      this.faceMesh.onResults(this.onFaceMeshResults);

      console.log("🎥 MediaPipe Camera setup gestart...");
      const camera = new Camera(this.video, {
        onFrame: async () => {
          await this.faceMesh.send({ image: this.video });
        },
        width: 640,
        height: 480,
      });

      camera.start();
      console.log("✅ FaceMesh gestart!");
    },

    setupThreeJS() {
      console.log("🔧 Three.js setup gestart...");

      const canvas = this.$refs.canvasElement;
      this.scene = new THREE.Scene();
      this.threeCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.threeCamera.position.z = 2;

      this.renderer = new THREE.WebGLRenderer({ alpha: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      canvas.replaceWith(this.renderer.domElement);

      console.log("🎨 Three.js renderer aangemaakt!");

      this.loadModel();
      this.animate();
    },

    loadModel() {
      console.log("📦 3D-model laden...");

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/threejs/r121/draco/");
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);

      loader.load(
        "https://res.cloudinary.com/dzempjvto/raw/upload/v1739183774/Products/222233/k4du4mi1q2uvou11dfvy.glb",
        (gltf) => {
          console.log("✅ Model succesvol geladen!");
          this.model = gltf.scene;
          this.model.scale.set(0.1, 0.1, 0.1);
          this.scene.add(this.model);
        },
        undefined,
        (error) => console.error("🚨 Fout bij laden 3D-model:", error)
      );
    },

    onFaceMeshResults(results) {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        console.warn("⚠️ Geen gezichtslandmarks gedetecteerd!");
        return;
      }

      const landmarks = results.multiFaceLandmarks[0];
      this.updateModelPosition(landmarks);
    },

    updateModelPosition(landmarks) {
      if (!this.model) {
        console.warn("⚠️ Model nog niet geladen, kan geen positie updaten!");
        return;
      }

      const nose = landmarks[1];
      if (!nose) {
        console.warn("⚠️ Neuslandmark niet gevonden!");
        return;
      }

      const x = (nose.x - 0.5) * 2;
      const y = -(nose.y - 0.5) * 2;
      this.model.position.set(x, y, 0);

      console.log(`🔄 Model verplaatst naar: X=${x}, Y=${y}`);
    },

    animate() {
      this.animationFrameId = requestAnimationFrame(this.animate);
      this.renderer.render(this.scene, this.threeCamera);
    },

    onResize() {
      console.log("📏 Vensterresolutie veranderd!");
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.threeCamera.aspect = window.innerWidth / window.innerHeight;
      this.threeCamera.updateProjectionMatrix();
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
