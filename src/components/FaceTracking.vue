<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement" width="640" height="480"></canvas>
  </div>
</template>

<script>
/**
 * LET OP:
 *  - We importeren expliciet face_mesh, camera_utils en drawing_utils.
 *  - We overschrijven 'locateFile' zodat bij het laden van de WASM niet de simd-bestanden
 *    worden gebruikt, maar de NON-SIMD versie.
 */
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { FACEMESH_TESSELATION } from "@mediapipe/face_mesh";

export default {
  name: 'FaceTracking',

  data() {
    return {
      video: null,
      faceMesh: null,
      canvas: null,
      ctx: null,
    };
  },

  mounted() {
    this.initCamera();
  },

  methods: {
    async initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        this.video = this.$refs.videoElement;
        this.video.srcObject = stream;

        // Als de metadata geladen is (video breedte/hoogte etc.), start FaceMesh-initialisatie
        this.video.onloadedmetadata = () => {
          this.video.play();
          this.initFaceMesh();
        };
      } catch (error) {
        console.error("Camera error:", error);
      }
    },

    initFaceMesh() {
      // We gaan expliciet de wasm-bestanden herdefiniëren, zodat we de NON-SIMD versie pakken
      // in plaats van face_mesh_solution_simd_wasm_bin.js.
      // Let op versie: gebruik bij voorkeur de meest recente @mediapipe/face_mesh-versie.
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          // Controle: als de lib de simd-versie zoekt, vervangen we het door de non-simd wasm:
          if (file === 'face_mesh_solution_simd_wasm_bin.js') {
            return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh_solution_wasm_bin.js';
          }
          // Anders laat je het gewoon naar hetzelfde pad verwijzen:
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
        },
      });

      // Stel FaceMesh-opties in (eventueel tweaken naar wens)
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      // Koppel je onResults-callback
      this.faceMesh.onResults(this.onFaceMeshResults);

      // Start de Mediapipe Camera helper
      const camera = new Camera(this.$refs.videoElement, {
        onFrame: async () => {
          await this.faceMesh.send({ image: this.$refs.videoElement });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    },

    onFaceMeshResults(results) {
      // Context pakken
      if (!this.canvas) this.canvas = this.$refs.canvasElement;
      if (!this.ctx) this.ctx = this.canvas.getContext("2d");

      // Canvas legen
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // De (door FaceMesh bewerkte) image terugzetten
      this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

      // Teken de gezichtslandmarks (optioneel)
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

<style scoped>
.ar-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  /* Zet eventueel een zwarte achtergrond om te debuggen */
  background: #000;
}

video {
  width: 100%;
  height: 100%;
  position: absolute;
  transform: scaleX(-1); /* Front-facing camera lijkt hierdoor realistischer */
  object-fit: cover;
}

canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  pointer-events: none;
}
</style>
