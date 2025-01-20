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
      @click="() => triggerFileInput(index)"
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
import { loadGLBModel, loadOBJModel } from "../services/productService";

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
          // Restrict Pro users to uploading only 3D models
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
          // Restrict Standard users to uploading only 2D images
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

    initializeScene() {
      if (this.isSceneInitialized) {
        console.log("Scene already initialized");
        return Promise.resolve(); // Return a resolved Promise
      }

      return new Promise((resolve, reject) => {
        nextTick(() => {
          const container = document.getElementById(`threejs-${this.index}`);
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
          this.camera.position.set(0, 5, 15);
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
          console.log("Scene initialized:", this.scene);

          resolve();
        });
      });
    },

    addModelToScene(model) {
      if (model && model instanceof THREE.Object3D) {
        this.scene.add(model);
        this.renderer.render(this.scene, this.camera);
      } else {
        console.error("Invalid model:", model);
      }
    },

    render3DModel(url, containerId, fileExtension) {
      console.log("Rendering 3D model:", url);
      this.initializeScene()
        .then(() => {
          if (fileExtension === "obj") {
            loadOBJModel(url)
              .then((object) => {
                model = object;
                this.addModelToScene(model);
              })
              .catch((error) => {
                console.error("Error loading OBJ model:", error);
              });
          } else if (["gltf", "glb"].includes(fileExtension)) {
            loadGLBModel(url)
              .then((object) => {
                model = object;
                this.addModelToScene(model);
              })
              .catch((error) => {
                console.error("Error loading GLB model:", error);
              });
          } else {
            console.error("Unsupported file type:", fileExtension);
          }
        })
        .catch((error) => {
          console.error("Error initializing scene:", error);
        });
    },

    isImageFile(fileUrl) {
      return /\.(jpeg|jpg|png|gif)$/i.test(fileUrl);
    },

    previewImages(images) {
      return images || [];
    },
  },
};
</script>

<style scoped>
.color-upload-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  height: 500px;
}
</style>
