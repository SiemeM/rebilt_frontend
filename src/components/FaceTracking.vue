<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement"></canvas>
  </div>
</template>

<script>
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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
    console.log("🔄 Component geladen");
    this.initCamera().then(() => {
      this.initFaceMesh();
      this.initThreeJS();
    }).catch(error => console.error("🚨 Fout bij initialisatie:", error));
    window.addEventListener("resize", this.onResize);
  },

  beforeUnmount() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener("resize", this.onResize);
  },

  methods: {
    async initCamera() {
      this.video = this.$refs.videoElement;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.video.srcObject = stream;
        console.log("✅ Camera gestart!");
      } catch (error) {
        console.error("🚨 Camera fout:", error);
      }
    },

    initFaceMesh() {
      this.faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
      this.faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
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

    initThreeJS() {
      const canvas = this.$refs.canvasElement;
      this.scene = new THREE.Scene();
      this.threeCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.threeCamera.position.z = 2;

      this.renderer = new THREE.WebGLRenderer({ alpha: true, canvas });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);

      this.loadModel();
      this.animate();
    },

    loadModel() {
      const loader = new GLTFLoader();
      loader.load(
        "https://res.cloudinary.com/dzempjvto/raw/upload/v1739183774/Products/222233/k4du4mi1q2uvou11dfvy.glb",
        (gltf) => {
          this.model = gltf.scene;
          this.model.scale.set(0.1, 0.1, 0.1);
          this.scene.add(this.model);
        },
        undefined,
        (error) => console.error("🚨 Model fout:", error)
      );
    },

    onFaceMeshResults(results) {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
      const nose = results.multiFaceLandmarks[0][1];
      if (this.model) {
        this.model.position.set((nose.x - 0.5) * 2, -(nose.y - 0.5) * 2, 0);
      }
    },

    animate() {
      this.animationFrameId = requestAnimationFrame(this.animate);
      this.renderer.render(this.scene, this.threeCamera);
    },

    onResize() {
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
