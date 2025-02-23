<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement"></canvas>
    <div class="overlay">AR Overlay Active</div>
  </div>
</template>

<script>
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import * as drawingUtils from "@mediapipe/drawing_utils";

export default {
  data() {
    return {
      video: null,
      faceMesh: null,
      canvas: null,
      ctx: null
    };
  },

  mounted() {
    console.log("🔄 Component geladen");
    this.initCamera()
      .then(() => {
        this.initFaceMesh();
      })
      .catch((error) => console.error("🚨 Fout bij initialisatie:", error));
  },

  methods: {
    async initCamera() {
      console.log("🌍 Initializing camera...");
      this.video = this.$refs.videoElement;
      this.canvas = this.$refs.canvasElement;
      this.ctx = this.canvas.getContext("2d");

      this.canvas.width = 640;
      this.canvas.height = 480;
      
      const constraints = { video: { facingMode: "user", width: 640, height: 480 } };
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

    onFaceMeshResults(results) {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
      const landmarks = results.multiFaceLandmarks[0];

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.strokeStyle = "#00FF00";
      this.ctx.lineWidth = 1;
      this.ctx.fillStyle = "#FF0000";
      
      for (let i = 0; i < landmarks.length; i++) {
        const point = landmarks[i];
        this.ctx.beginPath();
        this.ctx.arc(point.x * this.canvas.width, point.y * this.canvas.height, 2, 0, 2 * Math.PI);
        this.ctx.fill();
      }
      
      drawingUtils.drawConnectors(this.ctx, landmarks, FaceMesh.FACEMESH_TESSELATION, { color: '#00FF00' });
      drawingUtils.drawConnectors(this.ctx, landmarks, FaceMesh.FACEMESH_CONTOURS, { color: '#0000FF' });
    }
  }
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
