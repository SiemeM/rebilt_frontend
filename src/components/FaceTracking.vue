<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement"></canvas>
    <div class="overlay">AR Overlay Active</div>
  </div>
</template>

<script>
import * as THREE from "three";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export default {
  data() {
    return {
      video: null,
      faceMesh: null,
      animationFrameId: null,
      scene: null,
      threeCamera: null,
      renderer: null,
      facePoints: [],
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

  methods: {
    async initCamera() {
      console.log("🌍 Initializing camera...");
      this.video = this.$refs.videoElement;
      const constraints = { video: { facingMode: "user" } };
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = stream;
        this.video.play();
        console.log("📹 Camera initialized");
      } catch (error) {
        console.error("🚨 Camera error:", error);
      }
    },

    initFaceMesh() {
      console.log("👁️ Initializing FaceMesh...");
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
      console.log("🎮 Initializing Three.js...");
      const canvas = this.$refs.canvasElement;
      this.scene = new THREE.Scene();
      this.threeCamera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.threeCamera.position.z = 2;
      this.renderer = new THREE.WebGLRenderer({ alpha: true, canvas });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);
      console.log("🎮 Three.js initialized");
      this.createFacePoints();
      this.animate();
    },

    createFacePoints() {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.PointsMaterial({ color: 0xff0000, size: 0.02 });
      this.facePoints = new THREE.Points(geometry, material);
      this.scene.add(this.facePoints);
    },

    onFaceMeshResults(results) {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
      const landmarks = results.multiFaceLandmarks[0];
      const positions = new Float32Array(landmarks.length * 3);

      landmarks.forEach((point, index) => {
        positions[index * 3] = (point.x - 0.5) * 3;
        positions[index * 3 + 1] = -(point.y - 0.5) * 3;
        positions[index * 3 + 2] = -1;
      });

      this.facePoints.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      this.facePoints.geometry.attributes.position.needsUpdate = true;
    },

    onResize() {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.threeCamera.aspect = window.innerWidth / window.innerHeight;
      this.threeCamera.updateProjectionMatrix();
    },

    animate() {
      this.animationFrameId = requestAnimationFrame(this.animate);
      this.renderer.render(this.scene, this.threeCamera);
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
