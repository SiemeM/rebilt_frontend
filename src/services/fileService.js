/* Bestandsbeheer, zoals bestanduploads */
import { ref } from "vue";

// Voeg foutmeldingen en status toe aan de data
const uploadError = ref("");
const uploadStatus = ref("");

export const uploadFileToCloudinary = async (
  file,
  productName,
  partnerName
) => {
  try {
    // Controleer of het bestand en de naam aanwezig zijn
    if (!file || !file.name) {
      throw new Error("No file provided or file name is missing.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ycy4zvmj");
    formData.append("cloud_name", "dzempjvto");

    const sanitizeFolderName = (name) => name.replace(/[^a-zA-Z0-9/_-]/g, "");

    const folderName = sanitizeFolderName(
      `${partnerName || "DefaultFolder"}/products/${productName}`
    );
    formData.append("folder", folderName);

    // Bepaal het uploadEndpoint op basis van het bestandstype
    const fileExtension = file.name.split(".").pop().toLowerCase();
    let uploadEndpoint;

    if (
      ["jpg", "jpeg", "svg", "png", "gif", "bmp", "webp"].includes(
        fileExtension
      )
    ) {
      uploadEndpoint = "https://api.cloudinary.com/v1_1/dzempjvto/image/upload"; // Afbeelding upload
    } else if (["glb", "obj", "gltf"].includes(fileExtension)) {
      uploadEndpoint = "https://api.cloudinary.com/v1_1/dzempjvto/raw/upload"; // 3D-bestand upload
    } else {
      throw new Error("Unsupported file type");
    }

    // Upload bestand naar Cloudinary
    const response = await fetch(uploadEndpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error("No secure_url found in Cloudinary response");
    }

    // Retourneer de secure_url van de upload
    return data.secure_url;
  } catch (error) {
    // Fout wordt naar de console gelogd en de foutmelding wordt gegooid
    console.error("Error uploading file:", error);
    throw error;
  }
};
