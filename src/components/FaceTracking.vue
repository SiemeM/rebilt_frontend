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

/**
 * Eventuele console.debug(...) of console.log(...) staan uitgebreid
 * in de code om precies te kunnen volgen waar iets eventueel misgaat.
 */
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

        // Koppel stream aan video
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
        /**
         * We overschrijven locateFile om de NON-SIMD wasm te laden (face_mesh_solution_wasm_bin.*)
         * i.p.v. face_mesh_solution_simd_wasm_bin.js.
         *
         * Let op: De bestandsnamen in @mediapipe/face_mesh@0.8.1 zijn:
         *   - face_mesh_solution_packed_assets_loader.js
         *   - face_mesh_solution_wasm_bin.js
         *   - face_mesh_solution_wasm_bin.wasm
         */
        locateFile: (file) => {
          console.debug("[FaceTracking] FaceMesh is requesting file:", file);

          // Als er om de SIMD versie gevraagd wordt:
          if (file === "face_mesh_solution_simd_wasm_bin.js") {
            console.warn("[FaceTracking] Replacing SIMD WASM with NON-SIMD => face_mesh_solution_wasm_bin.js");
            return "/node_modules/@mediapipe/face_mesh/face_mesh_solution_wasm_bin.js";
          }

          // Anders: Laat alle andere files naar de non-SIMD folder wijzen.
          // (Je kunt deze paths aanpassen of dynamisch genereren; het gaat erom dat
          //  je in je bundel of je dev-server de 'node_modules' folder serveert.)
          return `/node_modules/@mediapipe/face_mesh/${file}`;
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
          // Stuur elke frame door naar FaceMesh
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

      // Canvas schoonmaken
      ctx.clearRect(0, 0, canvasElement.value.width, canvasElement.value.height);

      // Teken de 'image' op het canvas
      ctx.drawImage(results.image, 0, 0, canvasElement.value.width, canvasElement.value.height);

      // Als er landmarks zijn, tekenen we ze
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        console.log(`[FaceTracking] Detected ${results.multiFaceLandmarks.length} face(s). Drawing landmarks...`);
        for (const landmarks of results.multiFaceLandmarks) {
          drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {
            color: "#00FF00",
            lineWidth: 1,
          });
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
  transform: scaleX(-1); /* Gespiegeld voor front-facing camera */
  object-fit: cover;
}

canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  pointer-events: none;
}
</style>
