/* Bestandsbeheer, zoals bestanduploads */
import { ref } from "vue";
const partnerPackage = ref("");

export const uploadFileToCloudinary = async (
  file,
  productName,
  partnerName
) => {
  try {
    console.log("File received:", file); // Voeg deze regel toe voor debugging

    // Controleer of het bestand is meegegeven
    if (file === null || !file.name) {
      throw new Error("No file provided or file name is missing.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ycy4zvmj");
    formData.append("cloud_name", "dzempjvto");

    const folderName = `${
      partnerName || "DefaultFolder"
    }/products/${productName}`;
    formData.append("folder", folderName);

    let uploadEndpoint;
    const fileExtension = file.name.split(".").pop().toLowerCase();

    // Check het pakket van de partner (Pro of Standard)
    if (partnerPackage.value === "pro") {
      if (
        ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileExtension)
      ) {
        uploadEndpoint =
          "https://api.cloudinary.com/v1_1/dzempjvto/image/upload"; // Afbeelding upload
      } else if (["glb", "gltf"].includes(fileExtension)) {
        uploadEndpoint = "https://api.cloudinary.com/v1_1/dzempjvto/raw/upload"; // 3D-bestand upload
      } else {
        throw new Error("Unsupported file type");
      }
    } else if (partnerPackage.value === "standard") {
      if (
        ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileExtension)
      ) {
        uploadEndpoint =
          "https://api.cloudinary.com/v1_1/dzempjvto/image/upload"; // Afbeelding upload
      } else {
        // Toon foutmelding voor Standard gebruikers die een niet-ondersteund bestand proberen te uploaden
        document.querySelector(".errorMessage").innerHTML =
          "Standard plan users can only upload images.";
        return; // Stop verdere verwerking
      }
    } else {
      throw new Error("Invalid partner package");
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

    // Return de secure URL als de upload succesvol is
    return data.secure_url;
  } catch (error) {
    // Log de fout naar de console
    console.error("Error uploading file:", error);

    // Toon de foutmelding in de frontend
    document.querySelector(".errorMessage").innerHTML =
      error.message || "Er is een onbekende fout opgetreden."; // Toon generieke foutmelding als er geen specifieke fout is

    // Gooi de fout verder om de aanroepende functie te informeren over het probleem
    throw error;
  }
};
