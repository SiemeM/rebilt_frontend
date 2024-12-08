<script setup>
import { ref, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import QRCode from "qrcode";

const lacesColors = ref([]);
const lacesTextures = ref([]);
const solesBottomColors = ref([]);
const solesBottomTextures = ref([]);
const solesTopColors = ref([]);
const solesTopTextures = ref([]);
const insideColors = ref([]);
const insideTextures = ref([]);
const outside1Colors = ref([]);
const outside1Textures = ref([]);
const outside2Colors = ref([]);
const outside2Textures = ref([]);
const outside3Colors = ref([]);
const outside3Textures = ref([]);
const firstName = ref("");
const lastName = ref("");
const email = ref("");
const street = ref("");
const houseNumber = ref("");
const postalCode = ref("");
const city = ref("");
const message = ref("");

const selectedColor = ref(null);
const selectedTexture = ref(null);
const selectedLacesColor = ref(null);
const selectedLacesTexture = ref(null);
const selectedSoleBottomColor = ref(null);
const selectedSoleBottomTexture = ref(null);
const selectedSoleTopColor = ref(null);
const selectedSoleTopTexture = ref(null);
const selectedInsideColor = ref(null);
const selectedInsideTexture = ref(null);
const selectedOutside1Color = ref(null);
const selectedOutside1Texture = ref(null);
const selectedOutside2Color = ref(null);
const selectedOutside2Texture = ref(null);
const selectedOutside3Color = ref(null);
const selectedOutside3Texture = ref(null);

const route = useRoute();
const productId = ref(null);
const productData = ref({ productName: "", productCode: "", productPrice: 0 });

const isLoading = ref(true);
const error = ref(null);
const canCheckout = ref(false); // Controleer of de partner een "Pro" pakket heeft

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
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
    };

    productCode = data.data.product.productName;

    lacesColors.value = data.data.product.lacesColor || [];
    lacesTextures.value = data.data.product.lacesTexture || [];
    solesBottomColors.value = data.data.product.soleBottomColor || [];
    solesBottomTextures.value = data.data.product.soleBottomTexture || [];

    solesTopColors.value = data.data.product.soleTopColor || [];
    solesTopTextures.value = data.data.product.soleTopTexture || [];

    insideColors.value = data.data.product.insideColor || [];
    insideTextures.value = data.data.product.insideTexture || [];

    outside1Colors.value = data.data.product.outside1Color || [];
    outside1Textures.value = data.data.product.outside1Texture || [];

    outside2Colors.value = data.data.product.outside2Color || [];
    outside2Textures.value = data.data.product.outside2Texture || [];

    outside3Colors.value = data.data.product.outside3Color || [];
    outside3Textures.value = data.data.product.outside3Texture || [];

    const partnerId = data.data.product.partnerId;

    // Haal de package van de partner op
    await fetchPartnerPackage(partnerId); // Wacht totdat de package is opgehaald
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

// Kleurselectiefuncties
function selectColorForLaces(color) {
  if (!color) {
    console.error("Color is invalid");
    return;
  }

  selectedColor.value = color;
  selectedLacesColor.value = color;

  if (window.laces && window.laces.material) {
    window.laces.material.color.set(color);
  } else {
    console.warn("Laces object or material is not available");
  }

  // Markeer de geselecteerde kleur in de UI
  highlightSelectedItem(color, "lacesColor");
}

function selectColorForBottomSole(color) {
  selectedColor.value = color;
  selectedSoleBottomColor.value = color;

  if (window.sole_bottom && window.sole_bottom.material) {
    window.sole_bottom.material.color.set(color);
  } else {
    console.error("Sole object or its material not found");
  }

  highlightSelectedItem(color, "soleBottomColor");
}

function selectColorForTopSole(color) {
  selectedColor.value = color;
  selectedSoleTopColor.value = color;

  if (window.sole_top && window.sole_top.material) {
    window.sole_top.material.color.set(color);
  } else {
    console.error("Sole object or its material not found");
  }

  highlightSelectedItem(color, "soleTopColor");
}

function selectColorForInside(color) {
  selectedColor.value = color;
  selectedInsideColor.value = color;

  if (window.inside && window.inside.material) {
    window.inside.material.color.set(color);
  } else {
    console.error("Inside object or its material not found");
  }

  highlightSelectedItem(color, "insideColor");
}

// Toevoegen voor buitenste lagen
function selectColorForOutside1(color) {
  selectedColor.value = color;
  selectedOutside1Color.value = color;

  if (window.outside1 && window.outside1.material) {
    window.outside1.material.color.set(color);
  } else {
    console.error("Outside object or its material not found");
  }

  highlightSelectedItem(color, "outside1Color");
}

function selectColorForOutside2(color) {
  selectedColor.value = color;
  selectedOutside2Color.value = color;

  if (window.outside2 && window.outside2.material) {
    window.outside2.material.color.set(color);
  } else {
    console.error("Outside object or its material not found");
  }

  highlightSelectedItem(color, "outside2Color");
}

function selectColorForOutside3(color) {
  selectedColor.value = color;
  selectedOutside3Color.value = color;

  if (window.outside3 && window.outside3.material) {
    window.outside3.material.color.set(color);
  } else {
    console.error("Outside object or its material not found");
  }

  highlightSelectedItem(color, "outside3Color");
}

// Textureselectiefuncties

function selectTextureForLaces(texture) {
  if (!texture) {
    console.error("Texture is invalid");
    return;
  }

  selectedTexture.value = texture;
  selectedLacesTexture.value = texture;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  // Laad de texture
  loader.load(
    texture, // De URL van de texture
    (loadedTexture) => {
      if (loadedTexture) {
        // Zorg ervoor dat de texture wordt toegepast op het juiste object
        if (window.laces && window.laces.material) {
          window.laces.material.map = loadedTexture; // Pas de texture toe
          window.laces.material.needsUpdate = true; // Zorg ervoor dat de material wordt geüpdatet
          console.log("Texture successfully applied to laces!");
        } else {
          console.warn("Laces object or material is not available");
        }
      } else {
        console.error(
          "Failed to load texture: loadedTexture is null or undefined"
        );
      }
    },
    undefined,
    (error) => {
      // Logging de volledige foutinformatie als de texture niet geladen kan worden
      console.error("Error loading texture:", error);
      console.error("Error details:", error.target);
    }
  );

  // Markeer de geselecteerde texture in de UI
  highlightSelectedItem(texture, "lacesTexture");
}

function selectTextureForBottomSole(texture) {
  if (!texture) {
    console.error("Texture is invalid");
    return;
  }

  selectedTexture.value = texture;
  selectedSoleBottomTexture.value = texture;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  // Laad de texture
  loader.load(
    texture, // De URL van de texture
    (loadedTexture) => {
      if (loadedTexture) {
        // Zorg ervoor dat de texture wordt toegepast op het juiste object
        if (window.sole_bottom && window.sole_bottom.material) {
          window.sole_bottom.material.map = loadedTexture; // Pas de texture toe
          window.sole_bottom.material.needsUpdate = true; // Zorg ervoor dat de material wordt geüpdatet
          console.log("Texture successfully applied to laces!");
        } else {
          console.warn("Laces object or material is not available");
        }
      } else {
        console.error(
          "Failed to load texture: loadedTexture is null or undefined"
        );
      }
    },
    undefined,
    (error) => {
      // Logging de volledige foutinformatie als de texture niet geladen kan worden
      console.error("Error loading texture:", error);
      console.error("Error details:", error.target);
    }
  );

  // Markeer de geselecteerde texture in de UI
  highlightSelectedItem(texture, "soleBottomTexture");
}

function selectTextureForTopSole(texture) {
  if (!texture) {
    console.error("Texture is invalid");
    return;
  }

  selectedTexture.value = texture;
  selectedSoleTopTexture.value = texture;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  // Laad de texture
  loader.load(
    texture, // De URL van de texture
    (loadedTexture) => {
      if (loadedTexture) {
        // Zorg ervoor dat de texture wordt toegepast op het juiste object
        if (window.sole_top && window.sole_top.material) {
          window.sole_top.material.map = loadedTexture; // Pas de texture toe
          window.sole_top.material.needsUpdate = true; // Zorg ervoor dat de material wordt geüpdatet
          console.log("Texture successfully applied to laces!");
        } else {
          console.warn("Laces object or material is not available");
        }
      } else {
        console.error(
          "Failed to load texture: loadedTexture is null or undefined"
        );
      }
    },
    undefined,
    (error) => {
      // Logging de volledige foutinformatie als de texture niet geladen kan worden
      console.error("Error loading texture:", error);
      console.error("Error details:", error.target);
    }
  );

  // Markeer de geselecteerde texture in de UI
  highlightSelectedItem(texture, "soleTopTexture");
}

function selectTextureForInside(texture) {
  if (!texture) {
    console.error("Texture is invalid");
    return;
  }

  selectedTexture.value = texture;
  selectedInsideTexture.value = texture;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  // Laad de texture
  loader.load(
    texture, // De URL van de texture
    (loadedTexture) => {
      if (loadedTexture) {
        // Zorg ervoor dat de texture wordt toegepast op het juiste object
        if (window.inside && window.inside.material) {
          window.inside.material.map = loadedTexture; // Pas de texture toe
          window.inside.material.needsUpdate = true; // Zorg ervoor dat de material wordt geüpdatet
          console.log("Texture successfully applied to laces!");
        } else {
          console.warn("Laces object or material is not available");
        }
      } else {
        console.error(
          "Failed to load texture: loadedTexture is null or undefined"
        );
      }
    },
    undefined,
    (error) => {
      // Logging de volledige foutinformatie als de texture niet geladen kan worden
      console.error("Error loading texture:", error);
      console.error("Error details:", error.target);
    }
  );

  // Markeer de geselecteerde texture in de UI
  highlightSelectedItem(texture, "insideTexture");
}

function selectTextureForOutside1(texture) {
  if (!texture) {
    console.error("Texture is invalid");
    return;
  }

  selectedTexture.value = texture;
  selectedOutside1Texture.value = texture;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  // Laad de texture
  loader.load(
    texture, // De URL van de texture
    (loadedTexture) => {
      if (loadedTexture) {
        // Zorg ervoor dat de texture wordt toegepast op het juiste object
        if (window.outside1 && window.outside1.material) {
          window.outside1.material.map = loadedTexture; // Pas de texture toe
          window.outside1.material.needsUpdate = true; // Zorg ervoor dat de material wordt geüpdatet
          console.log("Texture successfully applied to laces!");
        } else {
          console.warn("Laces object or material is not available");
        }
      } else {
        console.error(
          "Failed to load texture: loadedTexture is null or undefined"
        );
      }
    },
    undefined,
    (error) => {
      // Logging de volledige foutinformatie als de texture niet geladen kan worden
      console.error("Error loading texture:", error);
      console.error("Error details:", error.target);
    }
  );

  // Markeer de geselecteerde texture in de UI
  highlightSelectedItem(texture, "outside1Texture");
}

function selectTextureForOutside2(texture) {
  if (!texture) {
    console.error("Texture is invalid");
    return;
  }

  selectedTexture.value = texture;
  selectedOutside2Texture.value = texture;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  // Laad de texture
  loader.load(
    texture, // De URL van de texture
    (loadedTexture) => {
      if (loadedTexture) {
        // Zorg ervoor dat de texture wordt toegepast op het juiste object
        if (window.outside2 && window.outside2.material) {
          window.outside2.material.map = loadedTexture; // Pas de texture toe
          window.outside2.material.needsUpdate = true; // Zorg ervoor dat de material wordt geüpdatet
          console.log("Texture successfully applied to laces!");
        } else {
          console.warn("Laces object or material is not available");
        }
      } else {
        console.error(
          "Failed to load texture: loadedTexture is null or undefined"
        );
      }
    },
    undefined,
    (error) => {
      // Logging de volledige foutinformatie als de texture niet geladen kan worden
      console.error("Error loading texture:", error);
      console.error("Error details:", error.target);
    }
  );

  // Markeer de geselecteerde texture in de UI
  highlightSelectedItem(texture, "outside2Texture");
}

function selectTextureForOutside3(texture) {
  if (!texture) {
    console.error("Texture is invalid");
    return;
  }

  selectedTexture.value = texture;
  selectedOutside3Texture.value = texture;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  // Laad de texture
  loader.load(
    texture, // De URL van de texture
    (loadedTexture) => {
      if (loadedTexture) {
        // Zorg ervoor dat de texture wordt toegepast op het juiste object
        if (window.outside3 && window.outside3.material) {
          window.outside3.material.map = loadedTexture; // Pas de texture toe
          window.outside3.material.needsUpdate = true; // Zorg ervoor dat de material wordt geüpdatet
          console.log("Texture successfully applied to laces!");
        } else {
          console.warn("Laces object or material is not available");
        }
      } else {
        console.error(
          "Failed to load texture: loadedTexture is null or undefined"
        );
      }
    },
    undefined,
    (error) => {
      // Logging de volledige foutinformatie als de texture niet geladen kan worden
      console.error("Error loading texture:", error);
      console.error("Error details:", error.target);
    }
  );

  // Markeer de geselecteerde texture in de UI
  highlightSelectedItem(texture, "outside3Texture");
}

// Scene setup
onMounted(() => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 15);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer();
  const container = document.querySelector(".model");
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  container.appendChild(renderer.domElement);
  const envTextureLoader = new THREE.CubeTextureLoader();
  const environmentMap = envTextureLoader.load([
    "/textures/px.png",
    "/textures/nx.png",
    "/textures/py.png",
    "/textures/ny.png",
    "/textures/pz.png",
    "/textures/nz.png",
  ]);
  scene.background = environmentMap;
  scene.environment = environmentMap;
  const light = new THREE.PointLight(0xffffff, 1, 100);
  light.position.set(10, 10, 10);
  scene.add(light);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const gltfLoader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/assets/draco/");
  gltfLoader.setDRACOLoader(dracoLoader);

  gltfLoader.load(
    "/models/Shoe_compressed.glb",
    (gltf) => {
      gltf.scene.scale.set(50, 50, 50);
      scene.add(gltf.scene);

      gltf.scene.traverse((child) => {
        if (child.name === "laces") window.laces = child;
        if (child.name === "sole_bottom") window.sole_bottom = child;
        if (child.name === "sole_top") window.sole_top = child;
        if (child.name === "inside") window.inside = child;
        if (child.name === "outside_1") window.outside1 = child;
        if (child.name === "outside_2") window.outside2 = child;
        if (child.name === "outside_3") window.outside3 = child;
      });

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.enableZoom = true;
      controls.target.set(0, 0, 0);
      controls.update();

      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }

      animate();
    },
    undefined,
    (error) => console.error("Error loading model:", error)
  );
});

// Pagina navigatie en functionaliteit voor de knoppen
onMounted(() => {
  const listItems = document.querySelectorAll(".overview ul li");
  const pages = document.querySelectorAll(".config-ui__page");
  const overview = document.querySelector(".overview");
  const summary = document.querySelector(".summary");
  const overviewButton = document.querySelector(
    ".config-wrapper .overviewButton"
  );

  const backButton = document.querySelector(".config-wrapper .backButton");
  const nextButton = document.querySelector(".config-wrapper .nextButton");
  const summaryButton = document.querySelector(
    ".config-wrapper .summaryButton"
  );

  let currentPageIndex = -1;

  function updateButtonVisibility() {
    backButton?.style.setProperty(
      "visibility",
      currentPageIndex === -1 ? "hidden" : "visible"
    );

    nextButton?.style.setProperty(
      "visibility",
      currentPageIndex >= pages.length - 1 ? "hidden" : "visible"
    );

    overviewButton?.style.setProperty(
      "visibility",
      currentPageIndex === -1 ? "hidden" : "visible"
    );
  }

  listItems.forEach((li, index) => {
    li.addEventListener("click", () => {
      if (overview) {
        overview.style.display = "none";
      }

      pages.forEach((page) => (page.style.display = "none"));
      if (pages[index]) {
        pages[index].style.display = "flex";
      }

      currentPageIndex = index;
      updateButtonVisibility();
    });

    const bullets = document.querySelectorAll(".bullet");
    const pages = document.querySelectorAll(".config-ui__page"); // Alle pagina's
    let currentPageIndex = 0; // Houd bij welke pagina momenteel zichtbaar is

    // Voeg een click-event toe aan elke bullet
    bullets.forEach((bullet, index) => {
      bullet.addEventListener("click", () => {
        document.querySelector(".overview").style.display = "none";
        document.querySelector(".summary").style.display = "none";
        document.querySelector(".backButton").style.display = "flex";
        document.querySelector(".nextButton").style.display = "flex";
        // Verberg alle pagina's
        pages.forEach((page) => {
          page.style.display = "none"; // Zet display op 'none' voor alle pagina's
        });

        // Toon de pagina die overeenkomt met de aangeklikte bullet
        if (pages[index]) {
          pages[index].style.display = "flex"; // Zet display op 'flex' voor de gekozen pagina
        }

        // Verwijder de 'active' class van alle bullets en voeg het toe aan de aangeklikte bullet
        bullets.forEach((b) => b.classList.remove("active")); // Verwijder 'active' van alle bullets
        bullet.classList.add("active"); // Voeg 'active' toe aan de aangeklikte bullet

        // Update de currentPageIndex
        currentPageIndex = index;

        // Update de zichtbaarheid van knoppen, als dat nodig is (optioneel)
        updateButtonVisibility();
      });
    });

    const configurations = document.querySelectorAll(".config-item"); // Verkrijg alle configuratie-items

    configurations.forEach((configItem, index) => {
      configItem.addEventListener("click", () => {
        // Verberg overview en summary
        document.querySelector(".overview").style.display = "none";
        document.querySelector(".summary").style.display = "none";

        // Toon knoppen
        document.querySelector(".backButton").style.display = "flex";
        document.querySelector(".nextButton").style.display = "none";
        document.querySelector(".nextButton").style.visibility = "none";
        document.querySelector(".summaryButton").style.display = "flex";

        // Verberg alle pagina's
        pages.forEach((page) => {
          page.style.display = "none"; // Verberg alle pagina's
        });

        // Toon de pagina die overeenkomt met de aangeklikte configuratie
        if (pages[index]) {
          pages[index].style.display = "flex"; // Toon de geselecteerde pagina
        }

        // Verwijder de 'active' klasse van alle bullets en voeg het toe aan de geselecteerde bullet
        bullets.forEach((b) => b.classList.remove("active"));
        if (bullets[index]) {
          bullets[index].classList.add("active"); // Voeg de 'active' klasse toe aan de aangeklikte bullet
        }

        // Optioneel: Update de zichtbaarheid van de knoppen
      });
    });

    // Functie om een bullet als 'done' te markeren
    function markBulletAsDone(index) {
      const bullet = bullets[index];
      bullet.classList.remove("active"); // Verwijder 'active' van de bullet
      bullet.classList.add("done"); // Voeg 'done' toe om te markeren dat deze voltooid is
    }

    // Stel dat je een kleur of materiaal hebt geselecteerd
    const colorOrMaterialSelectors =
      document.querySelectorAll(".color, .material"); // Pas selectors aan voor je kleur- of materiaalkeuzes

    colorOrMaterialSelectors.forEach((selector) => {
      selector.addEventListener("change", (e) => {
        // Stel je voor dat de bullet 3 (page3) de huidige actieve bullet is
        if (currentPageIndex === 2) {
          // Omdat de index 0-based is, is 2 de derde bullet (page3)
          markBulletAsDone(2); // Markeer bullet 3 als 'done'
        }
        // Voeg hier extra logica toe om andere bullets als 'done' te markeren, afhankelijk van je logica.
      });
    });
  });

  nextButton?.addEventListener("click", () => {
    if (currentPageIndex === -1) {
      currentPageIndex = 0;
      overview.style.display = "none";
      pages[currentPageIndex]?.style.setProperty("display", "flex");
      document.querySelector(".summaryButton").style.display = "none";
    } else if (currentPageIndex < pages.length - 1) {
      pages[currentPageIndex]?.style.setProperty("display", "none");
      currentPageIndex++;
      pages[currentPageIndex]?.style.setProperty("display", "flex");
      document.querySelector(".summaryButton").style.display = "none";
    }

    if (currentPageIndex == pages.length - 1) {
      document.querySelector(".summaryButton").style.display = "flex";
    }
    updateButtonVisibility();
  });

  summaryButton?.addEventListener("click", () => {
    // Verberg alle div's binnen .overviewConfig
    document.querySelector(".config-wrapper .bullets").style.display = "none";

    document.querySelectorAll(".overviewConfig .colorsItem").forEach((div) => {
      div.style.display = "none";
    });

    // Verberg de backButton en summaryButton
    document.querySelector(".backButton").style.display = "none";
    document.querySelector(".summaryButton").style.display = "none";

    // Toon de .summary sectie
    document.querySelector(".summary").style.display = "flex";
  });

  backButton?.addEventListener("click", () => {
    if (currentPageIndex === pages.length) {
      summary.style.display = "none";
      currentPageIndex = pages.length - 1;
      pages[currentPageIndex]?.style.setProperty("display", "flex");
    } else if (currentPageIndex > 0) {
      pages[currentPageIndex]?.style.setProperty("display", "none");
      currentPageIndex--;
      pages[currentPageIndex]?.style.setProperty("display", "flex");
    } else if (currentPageIndex === 0) {
      currentPageIndex = -1;
      overview.style.display = "flex";
      pages.forEach((page) => (page.style.display = "none"));
    }
    updateButtonVisibility();
  });

  overviewButton?.addEventListener("click", () => {
    currentPageIndex = -1;
    overview.style.display = "flex";
    summary.style.display = "none";
    pages.forEach((page) => (page.style.display = "none"));
    updateButtonVisibility();
  });

  if (currentPageIndex === -1) {
    overview.style.display = "flex";
    pages.forEach((page) => (page.style.display = "none"));
    backButton?.style.setProperty("visibility", "hidden");
    nextButton?.style.setProperty("visibility", "visible");
  }

  updateButtonVisibility();
});

function validateColors() {
  const colors = [
    selectedLacesColor.value,
    selectedSoleBottomColor.value,
    selectedSoleTopColor.value,
    selectedInsideColor.value,
    selectedOutside1Color.value,
    selectedOutside2Color.value,
    selectedOutside3Color.value,
  ];

  return colors.every((color) => color); // Controleer of elke kleur aanwezig is
}

async function submitOrder() {
  // Valideer kleurkeuzes
  if (!validateColors()) {
    const errorMessageElement = document.querySelector(".errorMessage");
    if (errorMessageElement) {
      errorMessageElement.innerHTML = "Please select a color for every part!";
    }
    return;
  }

  // Verzamelen van formulierdata inclusief kleurkeuzes en productCode
  const orderData = {
    productCode,
    lacesColor: selectedLacesColor.value,
    lacesTexture: selectedLacesTexture.value,
    soleBottomColor: selectedSoleBottomColor.value,
    soleBottomTexture: selectedSoleBottomTexture.value,
    soleTopColor: selectedSoleTopColor.value,
    soleTopTexture: selectedSoleTopTexture.value,
    insideColor: selectedInsideColor.value,
    insideTexture: selectedInsideTexture.value,
    outside1Color: selectedOutside1Color.value,
    outside1Texture: selectedOutside1Texture.value,
    outside2Color: selectedOutside2Color.value,
    outside2Texture: selectedOutside2Texture.value,
    outside3Color: selectedOutside3Color.value,
    outside3Texture: selectedOutside3Texture.value,
    firstName: firstName.value,
    lastName: lastName.value,
    email: email.value,
    street: street.value,
    houseNumber: houseNumber.value,
    postalCode: postalCode.value,
    city: city.value,
    message: message.value || "", // Zet lege waarde voor 'message' als deze niet ingevuld is
  };

  // Log de data die je verstuurt naar de server
  console.log("Submitting order data:", orderData);

  try {
    // Verstuur het formulier naar de server
    const response = await fetch(`${baseURL}/orders/${productId.value}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Zorg ervoor dat het type 'application/json' is
      },
      body: JSON.stringify(orderData), // Verzend de gegevens in JSON-formaat
    });

    // Controleer of de server een succesvolle reactie heeft gegeven
    if (!response.ok) {
      const errorResponse = await response.json();
      console.error("Server error response:", errorResponse);
      throw new Error(errorResponse.message || "Failed to submit the order");
    }

    // Ontvang de succesvolle serverresponse
    const result = await response.json();
    console.log("Order submitted successfully:", result);

    // Succesbericht tonen
    document.querySelector(".errorMessage").innerHTML = ""; // Verwijder eventuele foutmeldingen
    document.querySelector(".successMessage").innerHTML =
      "Order submitted successfully!";
  } catch (error) {
    console.error("Error submitting order:", error);
    const errorMessageElement = document.querySelector(".errorMessage");
    if (errorMessageElement) {
      errorMessageElement.innerHTML =
        "There was an error submitting your order. Please try again.";
    }
  }
}

// Maak een ref voor het device
const device = ref("");

// Detecteer apparaat op basis van gebruikersagent en viewport-breedte
function detectDevice() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const screenWidth = window.innerWidth; // Controleer de viewport-breedte

  // Android detectie (telefoon of tablet)
  if (/android/i.test(userAgent)) {
    if (/mobile/i.test(userAgent)) {
      return "Android Phone"; // Android telefoon
    } else {
      return "Android Tablet"; // Android tablet
    }
  }

  // iOS detectie (iPhone, iPad, iPod)
  if (/iPad/.test(userAgent)) {
    return "iPad"; // iPad
  }

  if (/iPhone|iPod/.test(userAgent)) {
    return "iPhone"; // iPhone of iPod
  }

  // Desktop detectie (vooral voor Mac, Windows, en andere)
  if (/Macintosh|Windows|Linux/i.test(userAgent)) {
    // Controleer of het scherm groter is dan een bepaalde breedte om een laptop/desktop te onderscheiden
    if (screenWidth >= 1024) {
      return "Laptop/Desktop"; // Laptop of Desktop
    } else {
      return "Mobile Laptop"; // Kleinere laptops zoals MacBook Air
    }
  }

  // Als geen van de bovenstaande gevallen van toepassing is, geef Desktop terug
  return "Desktop";
}

const qrCodeUrl = ref(null);

function generateQRCode() {
  // Controleer of het apparaat geen iPhone is
  const isIphone = /iPhone/i.test(navigator.userAgent);

  // Als het een iPhone is, doen we niets en stoppen we de functie
  if (isIphone) {
    return;
  }

  // Zoek de QR_code container
  const qrCodeContainer = document.querySelector(".QR_code");

  // Zorg ervoor dat de container zichtbaar is
  qrCodeContainer.style.display = "flex"; // Stel de container in op 'flex' zodat deze zichtbaar wordt

  // Verkrijg de productID van de juiste bron
  const qrCodeText = `https://jouwwebsite.com/ar/${productId.value}`; // Zorg ervoor dat productId goed is gedefinieerd

  // Genereer de QR-code URL
  QRCode.toDataURL(qrCodeText, { errorCorrectionLevel: "H" }, (err, url) => {
    if (err) {
      console.error("Fout bij het genereren van QR-code:", err);
      return;
    }

    // Maak een nieuw <img> element en stel de QR-code URL in als de bron
    const qrCodeImage = document.createElement("img");
    qrCodeImage.src = url;
    qrCodeImage.alt = "QR Code"; // Optioneel, voor toegankelijkheid

    // Voeg de stijl direct toe aan de afbeelding
    qrCodeImage.style.height = "80px";
    qrCodeImage.style.width = "80px";

    // Voeg het <img> element toe aan de QR_code container
    qrCodeContainer.innerHTML = ""; // Zorg ervoor dat de container leeg is voor de nieuwe afbeelding
    qrCodeContainer.appendChild(qrCodeImage);
  });
}

// AR knop: op component mounten, detecteer device
onMounted(() => {
  device.value = detectDevice();
});
</script>

<template>
  <div class="container">
    <h3 class="logo">REBILT</h3>
    <div class="model"></div>
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
    <div class="QR_code" ref="qrCodeContainer">
      <img v-if="qrCodeUrl" :src="qrCodeUrl" class="image" alt="QR Code" />
    </div>
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
        <div class="bullets">
          <div class="bullet active" data-target="page1">1</div>
          <div class="border"></div>
          <div class="bullet" data-target="page2">2</div>
          <div class="border"></div>
          <div class="bullet" data-target="page3">3</div>
          <div class="border"></div>
          <div class="bullet" data-target="page4">4</div>
          <div class="border"></div>
          <div class="bullet" data-target="page5">5</div>
          <div class="border"></div>
          <div class="bullet" data-target="page6">6</div>
          <div class="border"></div>
          <div class="bullet" data-target="page7">7</div>
        </div>
        <div class="overviewConfig">
          <div class="overview">
            <h2>Overview</h2>
            <ul>
              <li>
                <p>1. Choose the color/texture of the laces</p>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                  <path
                    d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
                  ></path>
                </svg>
              </li>
              <li>
                <p>2. Choose the color/texture of the sole bottom</p>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                  <path
                    d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
                  ></path>
                </svg>
              </li>
              <li>
                <p>3. Choose the color/texture of the sole top</p>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                  <path
                    d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
                  ></path>
                </svg>
              </li>
              <li>
                <p>4. Choose the color/texture of the outside 1</p>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                  <path
                    d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
                  ></path>
                </svg>
              </li>
              <li>
                <p>5. Choose the color/texture of the outside 2</p>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                  <path
                    d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
                  ></path>
                </svg>
              </li>
              <li>
                <p>6. Choose the color/texture of the outside 3</p>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                  <path
                    d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
                  ></path>
                </svg>
              </li>
              <li>
                <p>7. Choose the color/texture of the inside</p>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                  <path
                    d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
                  ></path>
                </svg>
              </li>
            </ul>
          </div>
          <div class="config-ui__page page1 colorsItem display">
            <h2>Choose the color/texture of the laces</h2>
            <h3>Colors</h3>
            <div class="row">
              <div
                v-for="color in lacesColors"
                :key="color"
                :class="{ active: selectedLacesColor === color }"
                :data-color="color"
                :style="{ backgroundColor: color }"
                @click="selectColorForLaces(color)"
              ></div>
            </div>
            <h3>Textures</h3>
            <div class="row">
              <div
                v-for="texture in lacesTextures"
                :key="texture"
                :class="[
                  'texture',
                  { active: selectedLacesTexture === texture },
                ]"
                @click="selectTextureForLaces(texture)"
                :style="{ backgroundImage: 'url(' + texture + ')' }"
              ></div>
            </div>
          </div>
          <div class="config-ui__page page2 colorsItem">
            <h2>Choose the color/texture of the bottom sole</h2>
            <h3>Colors</h3>
            <div class="row">
              <div
                v-for="color in solesBottomColors"
                :key="color"
                :class="{ active: selectedSoleBottomColor === color }"
                @click="selectColorForBottomSole(color)"
                :style="{ backgroundColor: color }"
              ></div>
            </div>
            <h3>Textures</h3>
            <div class="row">
              <div
                v-for="texture in solesBottomTextures"
                :key="texture"
                :class="[
                  'texture',
                  { active: selectedSoleBottomTexture === texture },
                ]"
                @click="selectTextureForBottomSole(texture)"
                :style="{ backgroundImage: 'url(' + texture + ')' }"
              ></div>
            </div>
          </div>
          <div class="config-ui__page page3 colorsItem">
            <h2>Choose the color/texture of the top sole</h2>
            <h3>Colors</h3>
            <div class="row">
              <div
                v-for="color in solesTopColors"
                :key="color"
                :class="{ active: selectedSoleTopColor === color }"
                @click="selectColorForTopSole(color)"
                :style="{ backgroundColor: color }"
              ></div>
            </div>
            <h3>Textures</h3>
            <div class="row">
              <div
                v-for="texture in solesTopTextures"
                :key="texture"
                :class="[
                  'texture',
                  { active: selectedSoleTopTexture === texture },
                ]"
                @click="selectTextureForTopSole(texture)"
                :style="{ backgroundImage: 'url(' + texture + ')' }"
              ></div>
            </div>
          </div>
          <div class="config-ui__page page4 colorsItem">
            <h2>Choose the color/texture of the outside 1</h2>
            <h3>Colors</h3>
            <div class="row">
              <div
                v-for="color in outside1Colors"
                :key="color"
                :class="{ active: selectedOutside1Color === color }"
                @click="selectColorForOutside1(color)"
                :style="{ backgroundColor: color }"
              ></div>
            </div>
            <h3>Textures</h3>
            <div class="row">
              <div
                v-for="texture in selectedOutside1Texture"
                :key="texture"
                :class="['texture', { active: selectedTexture === texture }]"
                @click="selectTextureForOutside1(texture)"
                :style="{ backgroundImage: 'url(' + texture + ')' }"
              ></div>
            </div>
          </div>
          <div class="config-ui__page page5 colorsItem">
            <h2>Choose the color/texture of the outside 2</h2>
            <h3>Colors</h3>
            <div class="row">
              <div
                v-for="color in outside2Colors"
                :key="color"
                :class="{ active: selectedOutside2Color === color }"
                @click="selectColorForOutside2(color)"
                :style="{ backgroundColor: color }"
              ></div>
            </div>
            <h3>Textures</h3>
            <div class="row">
              <div
                v-for="texture in outside2Textures"
                :key="texture"
                :class="[
                  'texture',
                  { active: selectedOutside2Texture === texture },
                ]"
                @click="selectTextureForOutside2(texture)"
                :style="{ backgroundImage: 'url(' + texture + ')' }"
              ></div>
            </div>
          </div>
          <div class="config-ui__page page6 colorsItem">
            <h2>Choose the color/texture of the outside 3</h2>
            <h3>Colors</h3>
            <div class="row">
              <div
                v-for="color in outside3Colors"
                :key="color"
                :class="{ active: selectedOutside3Color === color }"
                @click="selectColorForOutside3(color)"
                :style="{ backgroundColor: color }"
              ></div>
            </div>
            <h3>Textures</h3>
            <div class="row">
              <div
                v-for="texture in outside3Textures"
                :key="texture"
                :class="[
                  'texture',
                  { active: selectedOutside3Texture === texture },
                ]"
                @click="selectTextureForOutside3(texture)"
                :style="{ backgroundImage: 'url(' + texture + ')' }"
              ></div>
            </div>
          </div>
          <div class="config-ui__page page7 colorsItem">
            <h2>Choose the color/texture of the inside</h2>
            <h3>Colors</h3>
            <div class="row">
              <div
                v-for="color in insideColors"
                :key="color"
                :class="{ active: selectedInsideColor === color }"
                @click="selectColorForInside(color)"
                :style="{ backgroundColor: color }"
              ></div>
            </div>
            <h3>Textures</h3>
            <div class="row">
              <div
                v-for="texture in insideTextures"
                :key="texture"
                :class="{ active: selectedInsideTexture === texture }"
                @click="selectTextureForInside(texture)"
                :style="{ backgroundImage: 'url(' + texture + ')' }"
              ></div>
            </div>
          </div>
          <div class="summary display">
            <h2>Summary</h2>
            <div class="configurations">
              <div class="config-item">
                <p>Color/texture of the laces</p>
                <div class="row">
                  <p
                    :style="{
                      backgroundColor: selectedLacesColor || 'transparent',
                    }"
                  ></p>
                  <p
                    :style="{
                      backgroundImage: selectedLacesTexture
                        ? 'url(' + selectedLacesTexture + ')'
                        : 'none',
                    }"
                  ></p>
                </div>
              </div>
              <div class="config-item">
                <p>Color/texture of the bottom sole</p>
                <div class="row">
                  <p
                    :style="{
                      backgroundColor: selectedSoleBottomColor || 'transparent',
                    }"
                  ></p>
                  <p
                    :style="{
                      backgroundImage: selectedSoleBottomTexture
                        ? 'url(' + selectedSoleBottomTexture + ')'
                        : 'none',
                    }"
                  ></p>
                </div>
              </div>
              <div class="config-item">
                <p>Color/texture of the top sole</p>
                <div class="row">
                  <p
                    :style="{
                      backgroundColor: selectedSoleTopColor || 'transparent',
                    }"
                  ></p>
                  <p
                    :style="{
                      backgroundImage: selectedSoleTopTexture
                        ? 'url(' + selectedSoleTopTexture + ')'
                        : 'none',
                    }"
                  ></p>
                </div>
              </div>
              <div class="config-item">
                <p>Color/texture of the outside 1</p>
                <div class="row">
                  <p
                    :style="{
                      backgroundColor: selectedOutside1Color || 'transparent',
                    }"
                  ></p>
                  <p
                    :style="{
                      backgroundImage: selectedOutside1Texture
                        ? 'url(' + selectedOutside1Texture + ')'
                        : 'none',
                    }"
                  ></p>
                </div>
              </div>
              <div class="config-item">
                <p>Color/texture of the outside 2</p>
                <div class="row">
                  <p
                    :style="{
                      backgroundColor: selectedOutside2Color || 'transparent',
                    }"
                  ></p>
                  <p
                    :style="{
                      backgroundImage: selectedOutside2Texture
                        ? 'url(' + selectedOutside2Texture + ')'
                        : 'none',
                    }"
                  ></p>
                </div>
              </div>
              <div class="config-item">
                <p>Color/texture of the outside 3</p>
                <div class="row">
                  <p
                    :style="{
                      backgroundColor: selectedOutside3Color || 'transparent',
                    }"
                  ></p>
                  <p
                    :style="{
                      backgroundImage: selectedOutside3Texture
                        ? 'url(' + selectedOutside3Texture + ')'
                        : 'none',
                    }"
                  ></p>
                </div>
              </div>
              <div class="config-item">
                <p>Color/texture of the inside</p>
                <div class="row">
                  <p
                    :style="{
                      backgroundColor: selectedInsideColor || 'transparent',
                    }"
                  ></p>
                  <p
                    :style="{
                      backgroundImage: selectedInsideTexture
                        ? 'url(' + selectedInsideTexture + ')'
                        : 'none',
                    }"
                  ></p>
                </div>
              </div>
            </div>
            <!-- Personal info form -->
            <h3>Personal info</h3>
            <form @submit.prevent="submitOrder">
              <p style="display: none">{{ productCode }}</p>
              <div class="row">
                <div class="column">
                  <label for="firstname">First Name</label>
                  <input
                    type="text"
                    id="firstname"
                    name="firstname"
                    v-model="firstName"
                    placeholder="John"
                    required
                  />
                </div>
                <div class="column">
                  <label for="lastname">Last Name</label>
                  <input
                    type="text"
                    id="lastname"
                    name="lastname"
                    v-model="lastName"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div class="row">
                <div class="column">
                  <label for="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    v-model="email"
                    placeholder="johndoe@gmail.com"
                    required
                  />
                </div>
              </div>

              <div class="row">
                <div class="column">
                  <label for="street">Street</label>
                  <input
                    type="text"
                    id="street"
                    name="street"
                    v-model="street"
                    placeholder="Grote markt"
                    required
                  />
                </div>
                <div class="column">
                  <label for="house-number">House Number</label>
                  <input
                    type="text"
                    id="house-number"
                    name="house-number"
                    v-model="houseNumber"
                    placeholder="1"
                    required
                  />
                </div>
              </div>

              <div class="row">
                <div class="column">
                  <label for="postalcode">Postal Code</label>
                  <input
                    type="text"
                    id="postalcode"
                    name="postalcode"
                    v-model="postalCode"
                    placeholder="2800"
                    required
                  />
                </div>
                <div class="column">
                  <label for="city">City</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    v-model="city"
                    placeholder="Mechelen"
                    required
                  />
                </div>
              </div>

              <div class="row">
                <div class="column">
                  <label for="message">Message</label>
                  <input
                    type="text"
                    id="message"
                    name="message"
                    v-model="message"
                    placeholder="Your message"
                  />
                </div>
              </div>

              <button type="submit" class="btn active">Checkout</button>
              <p class="errorMessage"></p>
              <p class="successMessage"></p>
            </form>
          </div>
          <div class="links">
            <a href="#" class="backButton" style="visibility: hidden">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 320 512"
                style="transform: rotate(180deg)"
              >
                <path
                  d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
                ></path>
              </svg>
              <p>Back</p>
            </a>

            <a href="#" class="nextButton" style="visibility: visible">
              <p>Next</p>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                <path
                  d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
                ></path>
              </svg>
            </a>

            <a href="#" class="summaryButton" style="display: none">
              <p>Summary</p>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                <path
                  d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
                ></path>
              </svg>
            </a>
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
  position: fixed;
  top: 24px;
  left: 24px;
  z-index: 10;
  font-size: 1.5rem;
  color: #ffffff;
  text-transform: uppercase;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 8px;
}

.model {
  width: 100%;
  height: 100%;
  z-index: 0;
  position: relative;
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
    padding: 16px 52px 24px;
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
