<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement" width="640" height="480"></canvas>
  </div>
</template>

<script>
import { onMounted, ref } from "vue";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { FACEMESH_TESSELATION } from "@mediapipe/face_mesh";

export default {
  name: "FaceTracking",
  setup() {
    const videoElement = ref(null);
    const canvasElement = ref(null);
    let ctx = null;

    onMounted(() => {
      console.log("[FaceTracking] Component is mounted, starting initCamera()...");
      initCamera();
    });

    async function initCamera() {
      console.log("[FaceTracking] Requesting user camera access...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        console.log("[FaceTracking] Camera stream granted.");

        videoElement.value.srcObject = stream;
        videoElement.value.onloadedmetadata = () => {
          console.log("[FaceTracking] Video metadata loaded, playing video & init FaceMesh...");
          videoElement.value.play();
          initFaceMesh();
        };
      } catch (err) {
        console.error("[FaceTracking] Camera error:", err);
      }
    }

    function initFaceMesh() {
      console.log("[FaceTracking] initFaceMesh() called.");

      const faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
        },
      });

      console.log("[FaceTracking] Setting FaceMesh options...");
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      console.log("[FaceTracking] Binding onResults() callback...");
      faceMesh.onResults(onResults);

      console.log("[FaceTracking] Creating Camera instance...");
      const camera = new Camera(videoElement.value, {
        onFrame: async () => {
          console.debug("[FaceTracking] onFrame -> sending frame to FaceMesh...");
          await faceMesh.send({ image: videoElement.value });
        },
        width: 640,
        height: 480,
      });

      console.log("[FaceTracking] Starting camera...");
      camera.start();
    }

    function onResults(results) {
      console.debug("[FaceTracking] onResults() got results:", results);

      if (!ctx) {
        console.debug("[FaceTracking] Creating 2D context...");
        ctx = canvasElement.value.getContext("2d");
      }

      ctx.clearRect(0, 0, canvasElement.value.width, canvasElement.value.height);
      ctx.drawImage(results.image, 0, 0, canvasElement.value.width, canvasElement.value.height);

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        console.log(`[FaceTracking] Detected ${results.multiFaceLandmarks.length} face(s). Drawing landmarks...`);
        for (const landmarks of results.multiFaceLandmarks) {
          drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, { color: "#00FF00", lineWidth: 1 });
          drawLandmarks(ctx, landmarks, { color: "#FF0000", radius: 2 });
        }
      } else {
        console.debug("[FaceTracking] No face landmarks detected on this frame.");
      }
    }

    return {
      videoElement,
      canvasElement,
    };
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
  background: #000;
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
