<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement"></canvas>
    <div class="overlay">AR Overlay Active</div>
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
    this.initCamera()
      .then(() => {
        this.initFaceMesh();
        this.initThreeJS();
      })
      .catch((error) => console.error("🚨 Fout bij initialisatie:", error));
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        this.$refs.videoElement.srcObject = stream;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        this.video.srcObject = stream;
        console.log("✅ Camera gestart!");
      } catch (error) {
        console.error("🚨 Camera fout:", error);
      }
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

.overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 20px;
  font-size: 20px;
  border-radius: 10px;
}
</style>
