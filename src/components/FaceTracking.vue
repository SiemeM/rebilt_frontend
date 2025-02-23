<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement" width="640" height="480"></canvas>
  </div>
</template>

<script>
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { FACEMESH_TESSELATION } from "@mediapipe/face_mesh";

export default {
  name: "FaceTracking",

  data() {
    return {
      video: null,
      faceMesh: null,
      canvas: null,
      ctx: null,
      camera: null
    };
  },

  mounted() {
    console.log("[FaceTracking] Component is mounted.");
    this.initCamera();
  },

  methods: {
    async initCamera() {
      console.log("[FaceTracking] initCamera() called.");
      try {
        console.log("[FaceTracking] Requesting user camera access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        this.video = this.$refs.videoElement;
        this.video.srcObject = stream;
        console.log("[FaceTracking] Stream obtained, setting video srcObject.");

        // Wanneer de videometadata geladen is, kunnen we beginnen met FaceMesh:
        this.video.onloadedmetadata = () => {
          console.log("[FaceTracking] Video metadata loaded. Starting video and initializing FaceMesh...");
          this.video.play();
          this.initFaceMesh();
        };
      } catch (error) {
        console.error("[FaceTracking] Camera error:", error);
      }
    },

    initFaceMesh() {
      console.log("[FaceTracking] initFaceMesh() called.");

      // We gebruiken een custom locateFile, zodat de NON-SIMD wasm wordt geladen
      // in plaats van face_mesh_solution_simd_wasm_bin.js
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          if (file === "face_mesh_solution_simd_wasm_bin.js") {
            console.log("[FaceTracking] Replacing SIMD WASM with non-SIMD WASM -> face_mesh_solution_wasm_bin.js");
            return "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh_solution_wasm_bin.js";
          }
          console.log(`[FaceTracking] Loading other file from CDN: ${file}`);
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
        },
      });

      // Stel opties in
      console.log("[FaceTracking] Setting FaceMesh options...");
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      // Koppel de onResults callback
      console.log("[FaceTracking] Attaching faceMesh.onResults()");
      this.faceMesh.onResults(this.onFaceMeshResults);

      // Maak de camera aan via Mediapipe's Camera helper
      console.log("[FaceTracking] Creating Mediapipe Camera instance...");
      this.camera = new Camera(this.$refs.videoElement, {
        onFrame: async () => {
          // Hier sturen we elke frame naar FaceMesh
          console.log("[FaceTracking] onFrame -> sending video frame to FaceMesh...");
          await this.faceMesh.send({ image: this.$refs.videoElement });
        },
        width: 640,
        height: 480,
      });
      console.log("[FaceTracking] Starting camera...");
      this.camera.start();
    },

    onFaceMeshResults(results) {
      console.log("[FaceTracking] onFaceMeshResults() triggered. Received results:", results);

      if (!this.canvas) {
        console.log("[FaceTracking] Grabbing canvas reference...");
        this.canvas = this.$refs.canvasElement;
      }
      if (!this.ctx) {
        console.log("[FaceTracking] Creating 2D context from canvas...");
        this.ctx = this.canvas.getContext("2d");
      }

      // Clear het canvas
      console.log("[FaceTracking] Clearing canvas...");
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Teken de video-image op het canvas
      console.log("[FaceTracking] Drawing video image on canvas...");
      this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

      // Teken de gezichtslandmarks
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        console.log(`[FaceTracking] Detected faces: ${results.multiFaceLandmarks.length}. Drawing landmarks...`);
        for (const landmarks of results.multiFaceLandmarks) {
          console.log("[FaceTracking] Landmarks object:", landmarks);
          drawConnectors(this.ctx, landmarks, FACEMESH_TESSELATION, {
            color: "#00FF00",
            lineWidth: 1,
          });
          drawLandmarks(this.ctx, landmarks, { color: "#FF0000", radius: 2 });
        }
      } else {
        console.log("[FaceTracking] No face landmarks detected.");
      }
    },
  },
};
</script>

<style scoped>
.ar-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000; /* Eventueel zodat je ziet of het canvas/video wel of niet gevuld is */
}

video {
  width: 100%;
  height: 100%;
  position: absolute;
  transform: scaleX(-1); /* Spiegelt de camera, komt natuurlijker over voor een front-cam */
  object-fit: cover;
}

canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  pointer-events: none; /* Maakt canvas 'klikdoorlatend' */
}
</style>
