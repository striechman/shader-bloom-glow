/**
 * Capture a WebGL canvas and draw it to a 2D context at target resolution.
 * 
 * This function ensures pixel-perfect parity between the on-screen preview
 * and the exported image by:
 * 1. Reading raw pixels from the WebGL framebuffer
 * 2. Flipping Y-axis (WebGL uses bottom-left origin)
 * 3. Compositing onto an opaque background to prevent transparency artifacts
 */
export async function captureWebGLCanvasTo2D(
  sourceCanvas: HTMLCanvasElement,
  targetCtx: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number
): Promise<void> {
  // Wait for at least two animation frames to ensure the latest render is flushed
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  // Try to get WebGL context (preserveDrawingBuffer should be true on the source)
  const gl =
    (sourceCanvas.getContext('webgl2', { preserveDrawingBuffer: true }) as WebGL2RenderingContext | null) ||
    (sourceCanvas.getContext('webgl', { preserveDrawingBuffer: true }) as WebGLRenderingContext | null);

  // If we can't access WebGL context, fallback to drawImage
  if (!gl) {
    console.warn('[webglCapture] No WebGL context available, using drawImage fallback');
    targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return;
  }

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const pixels = new Uint8Array(srcW * srcH * 4);

  try {
    // Force a flush before reading
    gl.finish();
    gl.readPixels(0, 0, srcW, srcH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  } catch (e) {
    console.warn('[webglCapture] readPixels failed, using drawImage fallback:', e);
    targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return;
  }

  // Flip Y axis (WebGL is bottom-left origin, Canvas2D is top-left)
  const imageData = new ImageData(srcW, srcH);
  for (let y = 0; y < srcH; y++) {
    const srcRow = (srcH - 1 - y) * srcW * 4;
    const dstRow = y * srcW * 4;
    imageData.data.set(pixels.subarray(srcRow, srcRow + srcW * 4), dstRow);
  }

  // Create temp canvas at source resolution
  const tmp = document.createElement('canvas');
  tmp.width = srcW;
  tmp.height = srcH;
  const tmpCtx = tmp.getContext('2d');
  if (!tmpCtx) {
    console.warn('[webglCapture] Could not create temp context, using drawImage fallback');
    targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return;
  }
  tmpCtx.putImageData(imageData, 0, 0);

  // Fill target with opaque background first (prevents white haze from transparency)
  // Use black for dark gradients - matches what users typically expect
  targetCtx.save();
  targetCtx.fillStyle = 'rgb(0,0,0)';
  targetCtx.fillRect(0, 0, targetWidth, targetHeight);
  targetCtx.restore();

  // Draw the captured image scaled to target resolution
  targetCtx.imageSmoothingEnabled = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (targetCtx as any).imageSmoothingQuality = 'high';
  targetCtx.drawImage(tmp, 0, 0, targetWidth, targetHeight);
}
