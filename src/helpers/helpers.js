/* Algemene hulpfuncties zoals handleSubmit */
export const handleSubmit = async (partnerPackage) => {
  if (partnerPackage === "standard") {
    add2DProduct();
  } else {
    add3DProduct();
  }
};
