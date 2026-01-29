export async function captureWebGLCanvasTo2D(
  sourceCanvas: HTMLCanvasElement,
  targetCtx: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number
): Promise<void> {
  // Wait for at least one paint so we capture the latest frame
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const gl =
    (sourceCanvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
    (sourceCanvas.getContext('webgl') as WebGLRenderingContext | null);

  // If we can't access WebGL context, fallback to drawImage (may be lower fidelity)
  if (!gl) {
    targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return;
  }

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const pixels = new Uint8Array(srcW * srcH * 4);

  try {
    gl.readPixels(0, 0, srcW, srcH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  } catch {
    // Some browsers can block readPixels depending on context state
    targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return;
  }

  // Flip Y axis (WebGL is bottom-left origin)
  const imageData = new ImageData(srcW, srcH);
  for (let y = 0; y < srcH; y++) {
    const srcRow = (srcH - 1 - y) * srcW * 4;
    const dstRow = y * srcW * 4;
    imageData.data.set(pixels.subarray(srcRow, srcRow + srcW * 4), dstRow);
  }

  const tmp = document.createElement('canvas');
  tmp.width = srcW;
  tmp.height = srcH;
  const tmpCtx = tmp.getContext('2d');
  if (!tmpCtx) {
    targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return;
  }
  tmpCtx.putImageData(imageData, 0, 0);

  targetCtx.imageSmoothingEnabled = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (targetCtx as any).imageSmoothingQuality = 'high';
  targetCtx.drawImage(tmp, 0, 0, targetWidth, targetHeight);
}
