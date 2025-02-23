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
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { FACEMESH_TESSELATION } from "@mediapipe/face_mesh";

export default {
  data() {
    return {
      video: null,
      faceMesh: null,
      canvas: null,
      ctx: null,
      camera: null,
    };
  },

  mounted() {
    this.initCamera();
  },

  methods: {
    async initCamera() {
      this.video = this.$refs.videoElement;
      this.canvas = this.$refs.canvasElement;
      this.ctx = this.canvas.getContext("2d");
      this.canvas.width = 640;
      this.canvas.height = 480;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
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
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        },
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      this.faceMesh.onResults(this.onFaceMeshResults);

      this.camera = new Camera(this.video, {
        onFrame: async () => {
          await this.faceMesh.send({ image: this.video });
        },
        width: 640,
        height: 480,
      });

      this.camera.start();
    },

    onFaceMeshResults(results) {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0)
        return;

      const landmarks = results.multiFaceLandmarks[0];
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

      drawConnectors(this.ctx, landmarks, FACEMESH_TESSELATION, {
        color: "#00FF00",
        lineWidth: 1,
      });
      drawLandmarks(this.ctx, landmarks, { color: "#FF0000", radius: 2 });
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