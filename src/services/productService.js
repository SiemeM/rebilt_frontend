/* Productgerelateerde functies */
import { ref } from "vue";
import axios from "axios";
const selectedType = ref("");
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";
const errorMessage = ref("");
const colors = ref([]);

export async function fetchProducts(partnerId) {
  const partnerResponse = await axios.get(`${baseURL}/partners/${partnerId}`);

  const partnerName = partnerResponse.data.data.partner.name;

  if (!partnerName) {
    throw new Error("Partner name not found");
  }

  const apiUrl = `${baseURL}/products?partnerName=${partnerName}`;

  const productResponse = await axios.get(apiUrl);

  const products = productResponse.data?.data?.products || [];

  return products;
}

export const filterProductsByType = () => {
  if (selectedType.value) {
    filteredProducts.value = filteredProducts.value.filter(
      (product) => product.productType === selectedType.value
    );
  } else {
    fetchProducts();
  }
};

export const add2DProduct = async () => {
  if (!productName.value || !productPrice.value) {
    errorMessage.value = "Product name and price are required.";
    return;
  }

  const colorsWithImages = await Promise.all(
    colors.value.map(async (colorItem, index) => {
      const uploadedImages = await Promise.all(
        (colorUploads.value[index]?.images || []).map((file) =>
          uploadFileToCloudinary(file, `${productName.value}-${index}`)
        )
      );

      return {
        color: colorItem,
        images: uploadedImages,
      };
    })
  );

  const configurations = [];

  for (const config of partnerConfigurations.value) {
    const selectedOptions = [];

    if (config.fieldType === "color" && colors.value.length > 0) {
      for (const selectedColor of colors.value) {
        const selectedOptionId = selectedColor._id || selectedColor;

        if (!selectedOptionId) {
          console.warn(
            "Skipping color with undefined optionId:",
            selectedColor
          );
          continue;
        }

        const optionResponse = await axios.get(
          `${baseURL}/options/${selectedOptionId}`
        );

        const option = optionResponse.data;

        const images =
          colorsWithImages.find((color) => color.color._id === selectedOptionId)
            ?.images || [];

        selectedOptions.push({
          optionId: option.data._id,
          images,
          _id: `${option.data._id}-${Date.now()}`,
        });
      }
    }

    if (selectedOptions.length > 0) {
      configurations.push({
        configurationId: config.configurationId._id,
        selectedOptions,
      });
    }
  }

  const productData = {
    productCode: productCode.value,
    productName: productName.value,
    productType: selectedType.value || "sunglasses",
    brand: brand.value,
    description: description.value,
    productPrice: productPrice.value,
    activeInactive: "active",
    partnerId,
    configurations,
  };

  const response = await axios.post(`${baseURL}/products`, productData, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 201) {
    router.push("/admin");
  } else {
    errorMessage.value = "Failed to add product.";
  }
};

export const add3DProduct = async () => {
  if (!productName.value || !productPrice.value) {
    errorMessage.value = "Product name and price are required.";
    return;
  }

  const configurations = [];

  for (const config of partnerConfigurations.value) {
    const selectedOptions = [];

    if (config.fieldType === "color" && colors.value.length > 0) {
      const selectedColor = colors.value[0];
      const selectedOptionId = selectedColor.optionId || selectedColor;

      if (!selectedOptionId) {
        console.warn("Skipping color with undefined optionId:", selectedColor);
        continue;
      }

      const optionResponse = await axios.get(
        `${baseURL}/options/${selectedOptionId}`
      );

      const option = optionResponse.data;

      const images = color3DImages.value.map((image) => image);

      selectedOptions.push({
        optionId: option.data._id,
        images,
        _id: `${option.data._id}-${Date.now()}`,
      });
    }

    if (selectedOptions.length > 0) {
      configurations.push({
        configurationId: config.configurationId._id,
        selectedOptions,
      });
    }
  }

  const productData = {
    productCode: productCode.value,
    productName: productName.value,
    productType: selectedType.value || "sunglasses",
    brand: brand.value,
    description: description.value,
    productPrice: productPrice.value,
    activeInactive: "active",
    partnerId,
    configurations,
  };

  const response = await axios.post(`${baseURL}/products`, productData, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 201) {
    router.push("/admin");
  } else {
    errorMessage.value = "Failed to add product.";
  }
};

export const handleColorImageUploadFor2D = (event, index) => {
  if (!event?.target?.files) {
    console.warn(
      "Geen geldig event object gevonden bij handleColorImageUpload"
    );
    return;
  }

  if (!colorUploads.value[index]) {
    colorUploads.value[index] = { images: [] };
  }

  const files = Array.from(event.target.files).filter(
    (file) => file instanceof File
  );

  if (files.length > 0) {
    const file = files[0];
    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (
      partnerPackage.value === "Standard" &&
      ["glb", "gltf"].includes(fileExtension)
    ) {
      console.warn("GLB bestanden zijn alleen toegestaan voor Pro-gebruikers.");
      alert(
        "GLB bestanden zijn alleen toegestaan voor Pro-gebruikers. Je kunt alleen afbeeldingen uploaden."
      );
      return;
    }

    colorUploads.value[index].images.push(...files);
  }
};

export const handleColorImageUploadFor3D = async (event, index) => {
  const files = event.target.files;
  if (files.length === 0) return;

  const newImages = Array.from(files);

  const uploaded3DImages = await Promise.all(
    newImages.map((file) =>
      uploadFileToCloudinary(
        file,
        `${productName.value}-3D-${index}`,
        partnerName.value
      )
    )
  );

  color3DImages.value[index] = uploaded3DImages;
};

export async function getcolors(partnerId) {
  try {
    const partnerResponse = await axios.get(`${baseURL}/partners/${partnerId}`);
    const partnerName = partnerResponse.data.data.partner.name;

    if (!partnerName) {
      throw new Error("Partner name not found");
    }

    const apiUrl = `${baseURL}/products?partnerName=${partnerName}`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (data.status !== "success" || !data.data.products) {
      throw new Error("Ongeldige API-reactie of geen producten gevonden.");
    }

    const products = data.data.products;
    const selectedOptions = products.flatMap((product) =>
      product.configurations.flatMap((configuration) =>
        configuration.selectedOptions.map((option) => ({
          optionId: option.optionId,
          images: option.images,
        }))
      )
    );

    const detailedOptions = Array.from(
      new Map(
        await Promise.all(
          selectedOptions.map(async (option) => {
            const optionResponse = await axios.get(
              `${baseURL}/options/${option.optionId}`
            );
            const optionData = optionResponse.data;

            return [
              option.optionId,
              {
                ...option,
                name: optionData.data.name,
                color: optionData.data.name,
              },
            ];
          })
        )
      ).values()
    );

    console.log("Detailed Options:", detailedOptions);
    return detailedOptions;
  } catch (error) {
    console.error("Error in getcolors:", error);
    return [];
  }
}

export const fetchcolors = async (partnerName) => {
  const selectedOptions = await getcolors(partnerName);
  colors.value = selectedOptions.map((option) => ({
    optionId: option.optionId,
    name: option.name || "Unnamed Color",
    images: option.images || [],
  }));
  console.log(colors.value);
};
