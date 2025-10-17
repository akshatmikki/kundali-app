export async function svgToBase64PNG(svg: string, width: number, height: number) {
  return new Promise<string>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png").split(",")[1]); // only base64
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
  });
}
