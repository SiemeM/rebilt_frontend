<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement"></canvas>
  </div>
</template>

<script>
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { FaceMesh } from "@mediapipe/face_mesh";

export default {
  server: {
    proxy: {
      "/mediapipe": {
        target: "https://www.gstatic.com/mediapipe",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mediapipe/, ""),
      },
    },
  },
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
    window.addEventListener("resize", this.onResize);
  },
  methods: {
    async initializeCamera() {
      this.video = this.$refs.videoElement;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        this.video.srcObject = stream;
      } catch (error) {
        console.error("Fout bij het starten van de camera:", error);
      }
    },

    async setupFaceMesh() {
      window.Module = window.Module || {}; // Fix voor WebAssembly fout

      this.canvas = this.$refs.canvasElement;
      this.faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://www.gstatic.com/mediapipe/face_mesh/${file}`,
      });

      this.faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true });
      this.faceMesh.onResults(this.onFaceMeshResults);

      try {
        await this.faceMesh.initialize();
        this.detectFaces();
      } catch (error) {
        console.error("Fout bij het initialiseren van FaceMesh:", error);
      }
    },

    async detectFaces() {
      if (!this.video || !this.faceMesh) return;

      try {
        await this.faceMesh.send({ image: this.video });
      } catch (error) {
        console.error("Fout bij gezichtsdetectie:", error);
      }

      requestAnimationFrame(() => this.detectFaces());
    },

    onFaceMeshResults(results) {
      if (
        !results.multiFaceLandmarks ||
        results.multiFaceLandmarks.length === 0
      )
        return;
      const landmarks = results.multiFaceLandmarks[0];
      this.updateModelPosition(landmarks);
    },

    setup3DScene() {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      // Set up DRACOLoader to decode Draco compressed models
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/threejs/r121/draco/");

      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader); // Link DRACOLoader with GLTFLoader

      loader.load(
        "https://res.cloudinary.com/dzempjvto/raw/upload/v1739183774/Products/222233/k4du4mi1q2uvou11dfvy.glb",
        (gltf) => {
          this.model = gltf.scene;
          this.scene.add(this.model);
        },
        undefined,
        (error) => {
          console.error("Fout bij het laden van het 3D-model:", error);
        }
      );

      this.camera.position.z = 1;
    },

    updateModelPosition(landmarks) {
      const nose = landmarks[1]; // Neusbrug als referentiepunt
      if (this.model) {
        this.model.position.set(nose.x - 0.5, nose.y - 0.5, 0);
      }
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
}

video {
  width: 100%;
  height: 100%;
  position: absolute;
  transform: scaleX(-1);
}

canvas {
  width: 100%;
  height: 100%;
  position: absolute;
}
</style>
