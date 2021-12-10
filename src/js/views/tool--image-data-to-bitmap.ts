export async function convertImage(
  context: CanvasRenderingContext2D,
  array: Uint8ClampedArray
) {
  const widthFromRender = Math.sqrt(array.length / 4);

  const image = context.createImageData(widthFromRender, widthFromRender);

  image.data.set(array);

  return await createImageBitmap(image, 0, 0, widthFromRender, widthFromRender);
}
