export async function uploadToCloudinary(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "SEU_UPLOAD_PRESET");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/SEU_CLOUD_NAME/image/upload",
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    throw new Error("Erro ao enviar imagem para Cloudinary");
  }

  const data = await res.json();
  return data.secure_url as string;
}
