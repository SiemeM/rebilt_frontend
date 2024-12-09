<script setup>
import { ref, watch } from "vue";
import { useRoute } from "vue-router";

const colors = ref([]);
const selectedColor = ref(null);

const productImages = ref([]);
const selectedImage = ref(null);

const route = useRoute();
const productId = ref(null);
const productData = ref({ productName: "", productCode: "", productPrice: 0 });

const isLoading = ref(true);
const error = ref(null);
const canCheckout = ref(false); // Controleer of de partner een "Pro" pakket heeft

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Functie om de package van de partner op te halen
async function fetchPartnerPackage(partnerId) {
  try {
    const response = await fetch(`${baseURL}/partners/${partnerId}`);
    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    const partnerPackage = data.data.partner.package;

    // Controleer of het pakket "Pro" is en pas de canCheckout waarde aan
    canCheckout.value = partnerPackage === "Pro";
  } catch (err) {
    console.error("Error fetching partner data:", err);
    canCheckout.value = false; // Zet het op false bij een fout
  }
}

let productCode = "";
let productName = "";
// Functie om productgegevens op te halen
async function fetchProductData(code) {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await fetch(`${baseURL}/products/${code}`);
    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    productData.value = {
      productName: data.data.product.productName,
      productCode: data.data.product.productCode,
      productPrice: data.data.product.productPrice,
      productImages: data.data.product.images,
      selectedImage: data.data.product.images[0],
    };

    productCode = data.data.product.productCode;
    productName = data.data.product.productName;
    productImages.value = data.data.product.images;
    selectedImage.value = data.data.product.images[0];
    colors.value = data.data.product.colors || [];
    setDefaultActiveColor();
    const partnerId = data.data.product.partnerId;

    // Fetch partner package
    await fetchPartnerPackage(partnerId);
  } catch (err) {
    console.error("Error occurred:", err);
    error.value = "Unable to fetch product information.";
  } finally {
    isLoading.value = false;
  }
}

// Kijkt naar de route en haalt productgegevens op bij wijziging
watch(
  () => route.params.productId,
  (newCode) => {
    if (newCode && newCode !== productId.value) {
      productId.value = newCode;
      fetchProductData(newCode);
    }
  },
  { immediate: true }
);

function setDefaultActiveColor() {
  if (colors.value.length > 0) {
    selectedColor.value = colors.value[0];
    highlightSelectedItem(colors.value[0], "row-class-name"); // Pas de naam van de rijklasse aan
  }
}

function selectColor(color) {
  selectedColor.value = color;
  const index = colors.value.indexOf(color);
  if (index !== -1 && productImages.value[index]) {
    selectedImage.value = productImages.value[index];
  }
  highlightSelectedItem(color, "part-class-name");
}

function highlightSelectedItem(color, part) {
  // Zoek de container voor de geselecteerde laag
  const elements = document.querySelectorAll(`.${part}`);

  // Verwijder de 'selected' klasse van alle elementen
  elements.forEach((element) => {
    element.classList.remove("selected");
  });

  // Zoek het element dat overeenkomt met de geselecteerde kleur
  const selectedElement = Array.from(elements).find(
    (element) => element.dataset.color === color
  );

  // Voeg de 'selected' klasse toe aan het geselecteerde item
  if (selectedElement) {
    selectedElement.classList.add("selected");
  }
}
</script>

<template>
  <div class="container">
    <div class="logo"></div>
    <div class="model">
      <div
        class="image"
        :style="{ backgroundImage: `url(${selectedImage})` }"
      ></div>
    </div>
    <div class="icons">
      <router-link :to="`/`">
        <div class="icon">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="26"
              height="26"
              viewBox="0 0 256 256"
            >
              <path
                d="M104,216V152h48v64h64V120a8,8,0,0,0-2.34-5.66l-80-80a8,8,0,0,0-11.32,0l-80,80A8,8,0,0,0,40,120v96Z"
                fill="none"
                stroke="white"
                stroke-width="8"
              ></path>
            </svg>
          </div>
          <p>Home</p>
        </div>
      </router-link>
      <div class="icon">
        <div @click="generateQRCode" class="AR">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="M11.98 2.36a.75.75 0 00-.33.1L8.3 4.11H8.3a.08.08 0 00-.01.01.76.76 0 00-.31 1c.09.18.24.31.43.38.19.06.4.05.57-.04l2.26-1.13v2.7c0 .2.08.39.22.53a.76.76 0 001.08 0 .76.76 0 00.22-.54V4.34L15 5.47h.01a.76.76 0 001.03-.91.75.75 0 00-.34-.42l-.01-.01a.08.08 0 00-.01 0l-3.34-1.68a.75.75 0 00-.37-.09zm-5.57 2.8a.76.76 0 00-.34.08L2.72 6.9a.76.76 0 00-.42.7v3.9c0 .2.08.39.22.53a.76.76 0 001.07 0 .76.76 0 00.22-.54V8.81l2.26 1.13a.76.76 0 001.05-.91.76.76 0 00-.35-.42.08.08 0 00-.02-.02l-2-1 2-1c.3-.16.48-.52.4-.85a.77.77 0 00-.74-.58zm11.18 0a.77.77 0 00-.73.58c-.08.32.08.67.37.83l.02.02 2 1-2 1a.08.08 0 00-.02.02c-.17.1-.3.24-.35.42a.76.76 0 00.47.95c.19.06.4.05.58-.04l2.26-1.13v2.7c0 .2.08.39.22.53a.76.76 0 001.07 0 .76.76 0 00.22-.54V7.6a.76.76 0 00-.42-.69l-3.35-1.67a.76.76 0 00-.34-.08zm-2.24 4.47a.75.75 0 00-.33.08L12 11.2l-3.02-1.5a.76.76 0 00-1.05.91c.06.18.2.33.36.42a.08.08 0 000 .01h.01a.08.08 0 000 .01l2.94 1.47v2.89c0 .2.08.39.22.53a.76.76 0 001.08 0 .76.76 0 00.22-.53v-2.9l2.93-1.46.02-.02c.3-.16.45-.5.37-.83a.77.77 0 00-.73-.58zM3.01 14.11a.75.75 0 00-.7.75v3.9c-.01.29.15.56.41.69l3.35 1.67a.76.76 0 001.05-.91.76.76 0 00-.34-.42.08.08 0 00-.03-.02l-2-1 2-1 .02-.02c.17-.1.3-.24.35-.42a.76.76 0 00-.47-.95.77.77 0 00-.58.04l-2.26 1.13v-2.7c0-.2-.08-.4-.24-.55a.76.76 0 00-.56-.2zm17.88 0a.76.76 0 00-.7.75v2.69l-2.26-1.13a.76.76 0 00-1.05.91c.06.18.18.33.35.42a.08.08 0 00.01 0v.02a.08.08 0 00.01 0l2 1-2 1h-.01a.08.08 0 000 .01h-.01a.76.76 0 00.13 1.37c.18.07.39.06.57-.03l3.35-1.67c.26-.13.42-.4.42-.69v-3.9a.76.76 0 00-.8-.75zm-8.94 4.47a.08.08 0 00-.03 0 .75.75 0 00-.47.23.76.76 0 00-.2.52v2.69l-2.26-1.13a.08.08 0 00-.01 0 .76.76 0 00-1.03.91c.05.18.18.33.34.42l.01.01a.08.08 0 00.01.01l3.34 1.67c.22.12.49.11.7 0l3.34-1.67.02-.01a.76.76 0 00.31-1 .76.76 0 00-1-.34l-2.26 1.13v-2.7a.76.76 0 00-.8-.74z"
            ></path>
          </svg>
        </div>
        <p>AR</p>
      </div>
    </div>
    <!-- <div class="QR_code" ref="qrCodeContainer">
      <img v-if="qrCodeUrl" :src="qrCodeUrl" class="image" alt="QR Code" />
    </div> -->
    <div class="rotate-informer">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="#ffffff"
        viewBox="0 0 256 256"
      >
        <path
          d="M232,48V88a8,8,0,0,1-16,0V56H184a8,8,0,0,1,0-16h40A8,8,0,0,1,232,48ZM72,200H40V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16Zm152-40a8,8,0,0,0-8,8v32H184a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,224,160ZM32,96a8,8,0,0,0,8-8V56H72a8,8,0,0,0,0-16H32a8,8,0,0,0-8,8V88A8,8,0,0,0,32,96ZM188,167l-56,32a8,8,0,0,1-7.94,0L68,167A8,8,0,0,1,64,160V96a8,8,0,0,1,4-7l56-32a8,8,0,0,1,7.94,0l56,32a8,8,0,0,1,4,7v64A8,8,0,0,1,188,167ZM88.12,96,128,118.79,167.88,96,128,73.21ZM80,155.36l40,22.85V132.64L80,109.79Zm96,0V109.79l-40,22.85v45.57Z"
        ></path>
      </svg>
      <p>Drag to rotate</p>
    </div>
    <div class="config-wrapper">
      <div class="elements">
        <div class="overviewConfig">
          <div class="config-ui__page page1 colorsItem">
            <div class="top">
              <h3>{{ productName }}</h3>
              <router-link :to="`/`">change model</router-link>
            </div>
            <h2>Choose the color of the frame</h2>
            <div class="row">
              <div
                v-for="(color, index) in colors"
                :key="index"
                :class="{ active: selectedColor === color }"
                :data-color="color"
                :style="{ backgroundColor: color }"
                @click="selectColor(color)"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 896px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.logo {
  background-image: url("../assets/images/REBILT-logo-white.svg");
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  width: 80px;
  height: 32px;
  position: fixed;
  top: 24px;
  left: 24px;
  z-index: 10;
}

.model {
  width: 100%;
  height: 100%;
  z-index: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.model div {
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  width: 100%;
  height: 280px;
}

.rotate-informer {
  position: absolute;
  top: 55%;
  left: calc(75% / 2 - 12px);
  z-index: 999;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 4px;
  background-color: #1a1a1a;
  box-shadow: 0 0 8px #0006;
  transition: transform 0.5s;
}

.icons {
  position: absolute;
  top: 48%;
  left: calc(75% / 2 - 12px);
  z-index: 999;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.icons .icon {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
}

.icons .icon div {
  border-radius: 100%;
  background-color: #1a1a1a;
  box-shadow: 0 0 8px #0006;
  transition: transform 0.5s;
  width: 40px;
  height: 40px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.icons .icon p {
  background-color: #1a1a1a;
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 14px;
  margin: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
  letter-spacing: 1px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.icons .icon:hover p {
  opacity: 1;
}

.icons div svg {
  width: 24px;
  height: 24px;
  fill: #fff;
}

.rotate-informer p {
  color: var(--white);
}

.QR_code {
  position: absolute;
  left: 6%;
  top: 75%;
  transform: translate(-50%, -50%);
  background-color: #1a1a1a;
  border-radius: 1rem;
  padding: 1rem;
  height: 120px;
  width: 120px;
  display: none;
  justify-content: center;
  align-items: center;
}

.QR_code .image {
  height: 80px;
  width: 80px;
}

.config-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 24px;
  background: linear-gradient(to bottom, #000000, #473c5d);
  top: 55%;
  right: 0;
  width: 100%;
  height: 45%;
  padding: 16px 52px 24px;
}

.config-wrapper .configurations,
.config-wrapper form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-wrapper a {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.config-wrapper a p {
  font-size: 0.8em;
  text-transform: uppercase;
  color: var(--white);
}

.config-wrapper a svg,
li svg {
  text-transform: uppercase;
  color: var(--black);
  width: 10px;
  height: 10px;
  fill: #9b9b9b;
  transform: translateY(-2px);
}

.config-wrapper .links {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}

.config-wrapper .elements {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
  width: 100%;
}

.config-wrapper .elements .overviewConfig {
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: space-between;
  height: 100%;
  width: 100%;
}

.config-wrapper .elements .bullets {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.config-wrapper .bullets .bullet {
  opacity: 0.4;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 29.54px;
  border: 1px solid var(--white);
  color: var(--white);
  border-radius: 100%;
  font-size: 11px;
}

.config-wrapper .bullets .bullet.active {
  opacity: 1;
  border: 1px solid var(--white);
}

.config-wrapper .bullets .bullet.done {
  opacity: 1;
  background-color: var(--white);
}

.config-wrapper .bullets .border {
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  width: 16px;
}

.config-wrapper .overview,
.config-wrapper .summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.config-wrapper .summary {
  display: none;
}

.config-wrapper .summary .fontweight {
  color: var(--white);
}

.config-wrapper h2 {
  text-align: center;
}

.config-wrapper .overview ul li,
.config-wrapper .summary .configurations div {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.config-wrapper .summary .configurations div {
  gap: 48px;
}

.config-wrapper .summary .configurations div .row {
  display: flex;
  flex-direction: row;
  gap: 16px;
  border: none;
  width: auto;
}

.config-wrapper .summary .configurations div .row p {
  width: 24px;
  height: 24px;
  border: 1px solid var(--white);
  border-radius: 50%;
}

.config-wrapper form .row {
  display: flex;
  flex-direction: row;
  gap: 24px;
  justify-content: space-between;
  width: 100%;
}

.config-wrapper form .row .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.config-wrapper form .row .column input {
  color: var(--white);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding-left: 8px;
  width: 100%;
}

.config-ui__page .top {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
}

.config-ui__page .top a {
  opacity: 0.6;
  text-decoration: underline;
  text-transform: uppercase;
  color: var(--white);
  font-size: 12px;
}

.colorsItem {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.colorsItem .row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16px;
}

.colorsItem .row .texture {
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.colorsItem .row div {
  width: 64px;
  height: 64px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.colorsItem .row div.active,
.colorsItem .row div.selected {
  border: 3px solid var(--purple);
}

.colorsItem .row div p {
  display: none;
}

.config-wrapper .display {
  display: none;
}

.config-wrapper .visibility {
  visibility: hidden;
}

.btn {
  color: var(--white);
  margin-top: 1rem;
}

.errorMessage {
  color: red;
}

.successMessage {
  color: green;
}

.backButton {
  padding-bottom: 16px;
}

@media (min-width: 1200px) {
  .container {
    flex-direction: row;
    height: 100vh;
    width: 100%;
    justify-content: space-between;
  }

  .model {
    width: 75%;
    height: 100%;
  }

  .icons {
    top: 50%;
    left: 24px;
    flex-direction: column;
    align-items: flex-start;
  }

  .rotate-informer {
    top: 90%;
  }

  .config-wrapper {
    padding: 32px;
    gap: 48px;
    top: 0;
    width: 25%;
    height: 100%;
    right: 0;
    position: absolute;
    overflow-y: auto;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .config-wrapper h2 {
    text-align: left;
  }
}
</style>
