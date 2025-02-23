<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement"></canvas>
  </div>
</template>

<script>
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { FACEMESH_TESSELATION } from "@mediapipe/face_mesh";

export default {
  data() {
    return {
      video: null,
      faceMesh: null,
      canvas: null,
      ctx: null,
    };
  },

  mounted() {
    this.init();
  },

  methods: {
    async init() {
      this.video = this.$refs.videoElement;
      this.canvas = this.$refs.canvasElement;
      this.ctx = this.canvas.getContext("2d");

      // Start de camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        this.video.srcObject = stream;
        this.video.onloadedmetadata = () => {
          this.video.play();
          this.initFaceMesh();
        };
      } catch (error) {
        console.error("Camera error:", error);
      }
    },

    async initFaceMesh() {
      // Initialiseer FaceMesh
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        },
      });

      // Stel opties in voor FaceMesh
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      // Verwerk de resultaten
      this.faceMesh.onResults(this.onFaceMeshResults);

      // Start de camera en FaceMesh
      new Camera(this.video, {
        onFrame: async () => {
          await this.faceMesh.send({ image: this.video });
        },
        width: 640,
        height: 480,
      }).start();
    },

    onFaceMeshResults(results) {
      // Teken de resultaten op het canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          drawConnectors(this.ctx, landmarks, FACEMESH_TESSELATION, {
            color: "#00FF00",
            lineWidth: 1,
          });
          drawLandmarks(this.ctx, landmarks, { color: "#FF0000", radius: 2 });
        }
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
  pointer-events: none;
}
</style>