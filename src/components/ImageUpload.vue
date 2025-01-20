<template>
  <div class="color-upload-section">
    <input
      type="file"
      :id="'images-' + index"
      style="display: none"
      multiple
      @change="handleColorImageUpload($event, index)"
    />

    <div
      class="uploadImage"
      @click="() => (isModelLoaded ? null : triggerFileInput(index))"
      :style="{
        justifyContent: colorUploads[index]?.images?.length
          ? 'flex-start'
          : 'center',
      }"
    >
      <div v-if="!colorUploads[index]?.images?.length" class="text">
        <img src="../assets/icons/image-add.svg" alt="image-add" />
        <p>Bestanden toevoegen</p>
      </div>

      <div
        v-for="(previewUrl, imgIndex) in previewImages(
          colorUploads[index]?.images
        )"
        :key="imgIndex"
        class="image-preview"
      >
        <img
          v-if="isImageFile(previewUrl)"
          :src="previewUrl"
          alt="Uploaded file preview"
          width="100"
        />
        <div v-else>
          <p>3D bestand geüpload:</p>
          <div class="threejs-container" :id="'threejs-' + imgIndex" />
          <!-- Upload 3D Model Button -->
          <button
            @click="triggerFileInput(index)"
            v-if="isModelLoaded"
            class="btn active"
          >
            Upload 3D model
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { nextTick } from "vue";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { uploadFileToCloudinary } from "../services/fileService"; // Cloudinary upload function
import {
  loadGLBModel,
  loadOBJModel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMouseDown,
  onMouseMove,
  onMouseUp,
} from "../services/productService";
import { markRaw } from "vue";

let model;
const objLoader = new OBJLoader();
const dracoLoader = new DRACOLoader();
const gltfLoader = new GLTFLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
gltfLoader.setDRACOLoader(dracoLoader);

export default {
  name: "ImageUpload",
  props: {
    color: Object,
    index: Number,
    colorUploads: Array,
    partnerName: String,
    partnerPackage: String,
  },
  data() {
    return {
      isSceneInitialized: false,
      renderer: null,
      scene: null,
      camera: null,
      isModelLoaded: false,
      startMouseX: null,
      startMouseY: null,
      isMouseDown: false,
    };
  },

  methods: {
    triggerFileInput(index) {
      const fileInput = document.getElementById(`images-${index}`);
      if (fileInput) {
        fileInput.click();
      } else {
        console.warn("File input not found");
      }
    },

    async handleColorImageUpload(event, index) {
      const files = event.target.files;
      if (!files.length) return;

      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExtension = file.name.split(".").pop().toLowerCase();

        if (this.partnerPackage === "pro") {
          if (["png", "jpg", "jpeg", "webp"].includes(fileExtension)) {
            alert("Pro-gebruikers kunnen alleen 3D-bestanden uploaden.");
            return;
          }

          if (["glb", "gltf", "obj"].includes(fileExtension)) {
            try {
              const secureUrl = await uploadFileToCloudinary(
                file,
                this.color.name,
                this.partnerName
              );
              this.colorUploads[index] = this.colorUploads[index] || {
                images: [],
              };
              this.colorUploads[index].images.push(secureUrl);
              uploadedUrls.push(secureUrl);

              // Trigger 3D model rendering after uploading
              this.render3DModel(secureUrl, `threejs-${index}`, fileExtension);
            } catch (error) {
              console.error("Error uploading to Cloudinary:", error);
            }
          }
        } else {
          if (["glb", "gltf", "obj"].includes(fileExtension)) {
            alert(
              "Standaard-gebruikers kunnen alleen 2D-afbeeldingen uploaden."
            );
            return;
          }

          if (["png", "jpg", "jpeg", "webp"].includes(fileExtension)) {
            const imageUrl = URL.createObjectURL(file);
            uploadedUrls.push(imageUrl);
            this.colorUploads[index] = this.colorUploads[index] || {
              images: [],
            };
            this.colorUploads[index].images.push(imageUrl);
          }
        }
      }
    },

    loadModel(url, fileExtension) {
      if (fileExtension === "obj") {
        loadOBJModel(url)
          .then((object) => {
            model = object;
            this.addModelToScene(model);
            this.isModelLoaded = true;
          })
          .catch((error) => {
            console.error("Error loading OBJ model:", error);
          });
      } else if (["gltf", "glb"].includes(fileExtension)) {
        loadGLBModel(url)
          .then((object) => {
            model = object;
            this.addModelToScene(model);
            this.isModelLoaded = true;
          })
          .catch((error) => {
            console.error("Error loading GLB model:", error);
          });
      } else {
        console.error("Unsupported file type:", fileExtension);
      }
    },

    render3DModel(url, containerId, fileExtension) {
      if (!this.isSceneInitialized) {
        this.initializeScene()
          .then(() => {
            this.loadModel(url, fileExtension);
          })
          .catch((error) => {
            console.error("Error initializing scene:", error);
          });
      } else {
        this.loadModel(url, fileExtension);
      }
    },

    initializeScene() {
      if (this.isSceneInitialized) {
        return Promise.resolve(); // Return a resolved Promise to avoid reinitialization
      }

      return new Promise((resolve, reject) => {
        // Gebruik nextTick om te wachten tot de DOM is bijgewerkt
        nextTick(() => {
          const container = document.getElementById(`threejs-${this.index}`);
          console.log(container);
          if (!container) {
            console.error(
              "3D container element not found:",
              `threejs-${this.index}`
            );
            return reject(new Error("3D container not found"));
          }

          this.scene = new THREE.Scene();
          this.camera = new THREE.PerspectiveCamera(
            75,
            container.offsetWidth / container.offsetHeight,
            0.1,
            1000
          );
          this.camera.position.set(0, 5, 30); // Zet de camera verder weg
          this.camera.lookAt(0, 0, 0);

          this.renderer = new THREE.WebGLRenderer();
          this.renderer.setSize(container.offsetWidth, container.offsetHeight);
          container.appendChild(this.renderer.domElement);

          const pointLight = new THREE.PointLight(0xffffff, 1, 100);
          pointLight.position.set(50, 50, 50);
          this.scene.add(pointLight);

          const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
          directionalLight.position.set(-10, 10, 10).normalize();
          this.scene.add(directionalLight);

          const ambientLight = new THREE.AmbientLight(0x404040, 1);
          this.scene.add(ambientLight);

          this.isSceneInitialized = true;

          // Voeg event listeners toe nadat de container is gevonden
          this.addEventListeners(container);
          console.log(container);
          resolve();
        });
      });
    },

    addEventListeners(container) {
      console.log("Hier ben ik");

      // Zoek het canvas-element in de container (renderer domElement is het canvas)
      const canvas = this.renderer.domElement;
      console.log(canvas);
      if (!canvas) {
        console.error("Canvas element not found.");
        return;
      }

      // Voeg de event listeners toe aan het canvas-element
      canvas.addEventListener("mousedown", (event) => this.onMouseDown(event));
      canvas.addEventListener("mousemove", (event) => this.onMouseMove(event));
      canvas.addEventListener("mouseup", (event) => this.onMouseUp(event));

      canvas.addEventListener(
        "touchstart",
        (event) => this.onTouchStart(event),
        {
          passive: false,
        }
      );
      canvas.addEventListener("touchmove", (event) => this.onTouchMove(event), {
        passive: false,
      });
      canvas.addEventListener("touchend", (event) => this.onTouchEnd(event), {
        passive: false,
      });
    },

    addModelToScene(model) {
      const rawModel = markRaw(model); // Mark model as non-reactive

      // Bereken de bounding box van het model
      const boundingBox = new THREE.Box3().setFromObject(rawModel);
      const size = new THREE.Vector3();
      boundingBox.getSize(size);

      // Bepaal de schaalfactor
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scaleFactor = 30 / maxDimension;
      rawModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Zorg ervoor dat het model gecentreerd is
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      rawModel.position.sub(center);

      // Voeg het model toe aan de scène
      this.scene.add(rawModel);

      // Zet de camera op een positie die het model zichtbaar maakt
      this.camera.position.set(0, 5, 30); // Zet de camera verder weg zodat je het model goed kunt zien
      this.camera.lookAt(0, 0, 0);

      // Render de scène
      this.renderer.render(this.scene, this.camera);
    },

    isImageFile(fileUrl) {
      return /\.(jpeg|jpg|png|gif)$/i.test(fileUrl);
    },

    previewImages(images) {
      return images || [];
    },

    rotateModel(deltaX, deltaY) {
      if (model) {
        // Bijwerken van de rotatie van het model
        model.rotation.y += deltaX * 0.005; // X-beweging zorgt voor rotatie om de Y-as
        model.rotation.x += deltaY * 0.005; // Y-beweging zorgt voor rotatie om de X-as

        // Na het aanpassen van de rotatie, moet de scène opnieuw gerenderd worden
        this.renderer.render(this.scene, this.camera);
      }
    },

    // Begin rotatie bij muisklik
    onMouseDown(event) {
      this.isMouseDown = true;
      this.startMouseX = event.clientX;
      this.startMouseY = event.clientY;
      console.log(
        `Mouse down at X: ${this.startMouseX}, Y: ${this.startMouseY}`
      );
    },

    onMouseUp(event) {
      this.isMouseDown = false;
      console.log(`Mouse up - Rotation stopped`);
    },

    onMouseMove(event) {
      if (this.isMouseDown) {
        const deltaX = event.clientX - this.startMouseX;
        const deltaY = event.clientY - this.startMouseY;

        console.log(
          `Mouse move detected - deltaX: ${deltaX}, deltaY: ${deltaY}`
        );
        console.log("hier ben ik");
        this.rotateModel(deltaX, deltaY);

        // Update startposities
        this.startMouseX = event.clientX;
        this.startMouseY = event.clientY;
      }
    },

    // Voor touch events
    onTouchStart(event) {
      this.startTouchX = event.touches[0].clientX;
      this.startTouchY = event.touches[0].clientY;
    },

    onTouchMove(event) {
      if (this.startTouchX && this.startTouchY) {
        const deltaX = event.touches[0].clientX - this.startTouchX;
        const deltaY = event.touches[0].clientY - this.startTouchY;
        console.log("hier ben ik");
        this.rotateModel(deltaX, deltaY);
        this.startTouchX = event.touches[0].clientX;
        this.startTouchY = event.touches[0].clientY;
      }
    },

    onTouchEnd(event) {
      this.startTouchX = null;
      this.startTouchY = null;
    },
  },
};
</script>

<style scoped>
.color-upload-section,
.image-preview div {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.uploadImage {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.25rem;
  width: 100%;
  background-color: var(--gray-700);
}

.uploadImage .text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.image-preview {
  width: 100%;
}

.image-preview img {
  width: 50px;
  height: 50px;
  object-fit: cover;
}

.image-preview div {
  width: 100%;
}

.threejs-container {
  width: 100%;
  height: 400px;
}
</style>
