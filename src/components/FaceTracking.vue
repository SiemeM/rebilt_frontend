<template>
  <div class="ar-container">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement"></canvas>
    <div class="overlay">AR Overlay Active</div>
  </div>
</template>

<script>
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export default {
  data() {
    return {
      video: null,
      faceMesh: null,
      animationFrameId: null, // Keep non-Three.js properties here
      model: null, // Model will be stored here
      scene: null, // Three.js scene
      threeCamera: null, // Three.js camera
      renderer: null, // Three.js renderer
      isMouseDown: false,
      prevMouseX: 0,
      prevMouseY: 0,
      rotationSpeed: 0.01, // Rotation speed for mouse interaction
    };
  },

  mounted() {
    console.log("🔄 Component geladen");

    // Start camera and face mesh initialization
    this.initCamera()
      .then(() => {
        this.initFaceMesh();
        this.initThreeJS();
      })
      .catch((error) => console.error("🚨 Fout bij initialisatie:", error));

    window.addEventListener("resize", this.onResize);
  },

  methods: {
    // Initialize the camera
    async initCamera() {
      console.log("🌍 Initializing camera...");
      this.video = this.$refs.videoElement;

      // Media setup for the camera
      const constraints = {
        video: {
          facingMode: "user",
        },
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = stream;
        this.video.play();
        console.log("📹 Camera initialized");
      } catch (error) {
        console.error("🚨 Camera error:", error);
      }
    },

    // Initialize FaceMesh and start processing
    initFaceMesh() {
      console.log("👁️ Initializing FaceMesh...");
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        },
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // Setup the callback for the face mesh results
      this.faceMesh.onResults(this.onFaceMeshResults);
      console.log("👁️ FaceMesh initialized");
    },

    // Initialize the Three.js scene, camera, and renderer
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
      this.loadModel();
      this.animate();
    },

    // Handle FaceMesh results and update the model position
    onFaceMeshResults(results) {
      console.log("👁️ Face mesh results received...");
      if (
        !results.multiFaceLandmarks ||
        results.multiFaceLandmarks.length === 0
      )
        return;

      const nose = results.multiFaceLandmarks[0][1]; // Nose landmark (index 1)
      if (this.model) {
        // Set the position of the 3D model based on the nose landmark
        this.model.position.set((nose.x - 0.5) * 2, -(nose.y - 0.5) * 2, 0);
        console.log("👟 Model position updated:", this.model.position);
      }
    },

    // Load model based on file extension
    loadModel() {
      console.log("🔄 Loading 3D model...");

      const modelUrl =
        "https://res.cloudinary.com/dzempjvto/raw/upload/v1738865945/Products/5899/q9nsjuimaaarbzhgwx03.obj";

      // Get file extension from the URL
      const fileExtension = modelUrl.split(".").pop().toLowerCase();

      // Check the extension and load the appropriate model
      if (fileExtension === "obj") {
        this.loadOBJModel(modelUrl); // Handle OBJ files
      } else if (fileExtension === "glb" || fileExtension === "gltf") {
        this.loadGLTFModel(modelUrl); // Handle GLTF/GLB files
      } else {
        console.error("🚨 Unsupported file type:", fileExtension);
      }
    },

    // Load OBJ model
    loadOBJModel(url) {
      console.log("🔄 Loading OBJ model...");
      const loader = new OBJLoader();
      loader.load(
        url,
        (object) => {
          console.log("🔄 OBJ model loaded successfully!");
          this.model = object;
          this.model.scale.set(0.5, 0.5, 0.5);
          this.scene.add(this.model);
        },
        undefined,
        (error) => {
          console.error("🚨 Error loading OBJ model:", error);
        }
      );
    },

    // Load GLTF/GLB model with DRACOLoader
    loadGLTFModel(url) {
      console.log("🔄 Loading GLTF/GLB model...");
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
      loader.setDRACOLoader(dracoLoader);

      loader.load(
        url,
        (gltf) => {
          console.log("🔄 GLTF/GLB model loaded with DRACOLoader!");
          this.model = gltf.scene;
          this.model.scale.set(0.5, 0.5, 0.5);
          this.scene.add(this.model);
        },
        undefined,
        (error) => {
          console.error(
            "🚨 Error loading GLTF/GLB model with DRACOLoader:",
            error
          );
        }
      );
    },

    // Handle resizing of the canvas when window is resized
    onResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.threeCamera.aspect = width / height;
      this.threeCamera.updateProjectionMatrix();
      this.renderer.setSize(width, height);

      console.log("📐 Canvas resized:", width, height);
    },

    // Animation loop for rendering the 3D scene
    animate() {
      this.animationFrameId = requestAnimationFrame(this.animate);

      if (this.model) {
        this.model.rotation.y += 0.01;
        this.model.updateMatrix(); // Manually update the model's matrix
        console.log("🔄 Model rotation:", this.model.rotation);
      }

      this.renderer.render(this.scene, this.threeCamera);
    },

    // Mouse interaction for model rotation (Desktop)
    onMouseDown(event) {
      this.isMouseDown = true;
      this.prevMouseX = event.clientX;
      this.prevMouseY = event.clientY;
    },

    onMouseMove(event) {
      if (!this.isMouseDown) return;

      const deltaX = event.clientX - this.prevMouseX;
      const deltaY = event.clientY - this.prevMouseY;

      if (this.model) {
        this.model.rotation.y += deltaX * this.rotationSpeed;
        this.model.rotation.x += deltaY * this.rotationSpeed;
      }

      this.prevMouseX = event.clientX;
      this.prevMouseY = event.clientY;
    },

    onMouseUp() {
      this.isMouseDown = false;
    },

    // Touch interaction for model rotation (Mobile)
    onTouchStart(event) {
      event.preventDefault(); // Prevent scrolling
      this.isMouseDown = true;
      const touch = event.touches[0];
      this.prevMouseX = touch.clientX;
      this.prevMouseY = touch.clientY;
    },

    onTouchMove(event) {
      if (!this.isMouseDown) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - this.prevMouseX;
      const deltaY = touch.clientY - this.prevMouseY;

      if (this.model) {
        this.model.rotation.y += deltaX * this.rotationSpeed;
        this.model.rotation.x += deltaY * this.rotationSpeed;
      }

      this.prevMouseX = touch.clientX;
      this.prevMouseY = touch.clientY;
    },

    onTouchEnd() {
      this.isMouseDown = false;
    },
  },

  beforeDestroy() {
    // Clean up event listeners to prevent memory leaks
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("touchstart", this.onTouchStart);
    document.removeEventListener("touchmove", this.onTouchMove);
    document.removeEventListener("touchend", this.onTouchEnd);
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
