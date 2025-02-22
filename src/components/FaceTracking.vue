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
    this.setupCamera();
    this.setupFaceMesh();
    this.setupThreeJS();
    window.addEventListener("resize", this.onResize);
  },
  methods: {
    async setupCamera() {
      this.video = this.$refs.videoElement;
      console.log("test camera setup");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.video.srcObject = stream;
      } catch (error) {
        console.error("Fout bij het starten van de camera:", error);
      }
    },

    async setupFaceMesh() {
      this.faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.faceMesh.onResults(this.onFaceMeshResults);

      const camera = new Camera(this.video, {
        onFrame: async () => {
          await this.faceMesh.send({ image: this.video });
        },
        width: 640,
        height: 480,
      });

      camera.start();
    },

    setupThreeJS() {
      this.threeCanvas = this.$refs.canvasElement;

      // Three.js scene opzetten
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.camera.position.z = 1;

      this.renderer = new THREE.WebGLRenderer({ alpha: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.threeCanvas.replaceWith(this.renderer.domElement); // Vervang canvas in Vue template

      // 3D Model Loader instellen
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/threejs/r121/draco/");
      
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);

      loader.load(
        "https://res.cloudinary.com/dzempjvto/raw/upload/v1739183774/Products/222233/k4du4mi1q2uvou11dfvy.glb",
        (gltf) => {
          this.model = gltf.scene;
          this.scene.add(this.model);
          this.model.scale.set(0.1, 0.1, 0.1); // Model verkleinen als nodig
        },
        undefined,
        (error) => {
          console.error("Fout bij het laden van het 3D-model:", error);
        }
      );

      this.animate();
    },

    onFaceMeshResults(results) {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
      
      const landmarks = results.multiFaceLandmarks[0];
      this.updateModelPosition(landmarks);
    },

    updateModelPosition(landmarks) {
      if (!this.model) return;

      // MediaPipe gebruikt genormaliseerde waarden (0 - 1), Three.js gebruikt absolute coördinaten
      const nose = landmarks[1]; // Neusbrug als referentiepunt

      // Omgerekend naar een passend Three.js coördinatenstelsel
      const x = (nose.x - 0.5) * 2; // van 0-1 naar -1 tot 1
      const y = -(nose.y - 0.5) * 2; // Y-as omdraaien voor correcte orientatie

      this.model.position.set(x, y, 0);
    },

    animate() {
      requestAnimationFrame(this.animate);
      this.renderer.render(this.scene, this.camera);
    },

    onResize() {
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
