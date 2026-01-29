
# Plan: Fix Export Quality - Match Screen Preview

## Summary
The exported image has lower quality color transitions compared to the on-screen preview because the export uses `drawImage` scaling with bilinear interpolation, which degrades the gradient quality when scaling up from a small source canvas to a large target resolution.

---

## Root Cause Analysis

### The Problem

**On Screen:**
- WebGL shader renders at high pixel density (2x via `pixelDensity={2}`)
- Simplex 3D noise with multiple octaves creates smooth organic transitions
- GPU-accelerated rendering with floating-point precision

**In Export:**
- `captureVisibleWebGLCanvasToCanvas` captures the current WebGL canvas (which may be only ~400-800px)
- Then scales it UP to target resolution (e.g., 3508x4961 for A3)
- Scaling uses `imageSmoothingQuality: 'high'` but this is still basic bilinear interpolation
- Result: blurry transitions, visible banding, loss of organic noise detail

### Visual Example
```text
Screen (shader): [smooth organic transitions with noise detail]
         ↓ capture at 800px
Export canvas: [800px snapshot]
         ↓ scale up to 3508px
Final image: [blurry, banded, quality loss]
```

---

## Solution: Render at Target Resolution

Instead of capturing a small canvas and scaling up, we should **render the gradient directly at export resolution** using the shader math. This approach:

1. Creates a canvas at the exact target dimensions
2. Runs the same Simplex noise algorithm used in the shader
3. Applies identical color blending and weight logic
4. Produces pixel-perfect output at any resolution

### Option A: Pure JavaScript Render (Recommended)
Implement the exact shader logic in JavaScript, rendering pixel-by-pixel at full resolution.

**Pros:**
- Matches shader output exactly
- Works at any resolution (4K, 8K, print)
- No scaling artifacts

**Cons:**
- Slower for very large images (but can be parallelized with Web Workers)

### Option B: Offscreen WebGL Canvas
Create a hidden WebGL canvas at target resolution and render the shader there.

**Pros:**
- GPU-accelerated, fast

**Cons:**
- WebGL context limits (max texture size ~4096-16384px depending on device)
- More complex implementation

---

## Implementation Plan

### Step 1: Update `renderGradientToCanvas` for High-Fidelity Output

The function already exists but needs improvements to match the actual shader:

**Current Issues:**
1. Only uses 2D Simplex noise (shader uses 3D noise with time component)
2. Noise scale doesn't match shader parameters
3. Missing multi-octave noise with correct weights

**Required Changes:**
- Implement 3D Simplex noise (matching `snoise(vec3 v)` in shader)
- Match noise octave weights: `n1 * 0.5 + n2 * (0.20 + 0.10 * density) + n3 * (0.10 + 0.06 * density)`
- Use correct normalization: `noise / 1.375`
- Apply strength: `pow(noise, 1.0 + strength * 0.18)`
- Match blur factor: `blurFactor = meshBlur * 0.5`

### Step 2: Choose Render Path Based on Mode

```typescript
if (config.wireframe) {
  // Mesh mode: use JS Simplex render (matches CustomMeshGradient shader exactly)
  await renderMeshGradientHighQuality(ctx, targetWidth, targetHeight, config);
} else {
  // Sphere/Plane mode: capture WebGL + apply overlays
  await captureVisibleWebGLCanvasToCanvas(sourceCanvas, ctx, targetWidth, targetHeight);
}
```

### Step 3: Implement Simplex 3D Noise in JavaScript

Port the exact GLSL implementation to JavaScript:

```typescript
function simplexNoise3D(x: number, y: number, z: number): number {
  // Full 3D Simplex implementation matching the shader
  const F3 = 1.0 / 3.0;
  const G3 = 1.0 / 6.0;
  // ... (full implementation)
}
```

### Step 4: Parallel Rendering with Web Workers (Optional)

For very large exports (4K+), split the image into tiles and render in parallel using Web Workers:

```typescript
// Split into 4 quadrants for parallel processing
const workers = [
  new Worker('gradientWorker.js'),
  new Worker('gradientWorker.js'),
  new Worker('gradientWorker.js'),
  new Worker('gradientWorker.js'),
];
```

---

## Implementation Steps

### Step 1: Add 3D Simplex Noise Function
**File**: `src/components/ExportModal.tsx`

Add complete 3D Simplex noise implementation that matches the GLSL shader.

### Step 2: Create High-Quality Mesh Render Function
**File**: `src/components/ExportModal.tsx`

```typescript
async function renderMeshGradientHighQuality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: GradientConfig
): Promise<void> {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  const color1 = parseColor(config.color1);
  const color2 = parseColor(config.color2);
  const color3 = parseColor(config.color3);
  
  const noiseScale = config.meshNoiseScale ?? 1.0;
  const blurFactor = ((config.meshBlur ?? 50) / 100) * 0.5;
  const time = config.frozenTime ?? 0;
  const freq = Math.max(0.1, config.uFrequency);
  const density = Math.max(0, config.uDensity);
  const strength = Math.max(0, config.uStrength);
  
  const w1 = config.colorWeight1 / 100;
  const w2 = config.colorWeight2 / 100;
  const threshold1 = w1;
  const threshold2 = w1 + w2;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      
      // Multi-octave 3D noise (matching shader)
      const noisePos = {
        x: u * noiseScale * freq,
        y: v * noiseScale * freq,
        z: time * 0.5
      };
      
      const n1 = simplexNoise3D(noisePos.x, noisePos.y, noisePos.z) * 0.5 + 0.5;
      const n2 = simplexNoise3D(noisePos.x * 2 + 100, noisePos.y * 2 + 100, noisePos.z) * (0.20 + 0.10 * density);
      const n3 = simplexNoise3D(noisePos.x * 4 + 200, noisePos.y * 4 + 200, noisePos.z) * (0.10 + 0.06 * density);
      
      let noise = (n1 + n2 + n3) / 1.375;
      noise = Math.pow(Math.max(0, Math.min(1, noise)), 1.0 + strength * 0.18);
      
      // Edge fade (matching shader)
      const centeredU = u - 0.5;
      const centeredV = v - 0.5;
      const edgeDistX = 1.0 - Math.abs(centeredU) * 2.0;
      const edgeDistY = 1.0 - Math.abs(centeredV) * 2.0;
      const edgeDist = Math.min(edgeDistX, edgeDistY);
      const edgeFade = smoothstep(0.0, 0.3, edgeDist);
      
      // Color mixing
      const edge1 = smoothstep(threshold1 - blurFactor, threshold1 + blurFactor, noise);
      const edge2 = smoothstep(threshold2 - blurFactor, threshold2 + blurFactor, noise);
      
      let r = lerp(color1.r, color2.r, edge1);
      let g = lerp(color1.g, color2.g, edge1);
      let b = lerp(color1.b, color2.b, edge1);
      
      r = lerp(r, color3.r, edge2);
      g = lerp(g, color3.g, edge2);
      b = lerp(b, color3.b, edge2);
      
      // Apply edge fade
      r = lerp(color3.r, r, edgeFade);
      g = lerp(color3.g, g, edgeFade);
      b = lerp(color3.b, b, edgeFade);
      
      const idx = (y * width + x) * 4;
      data[idx] = Math.round(r);
      data[idx + 1] = Math.round(g);
      data[idx + 2] = Math.round(b);
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}
```

### Step 3: Update Export Logic
**File**: `src/components/ExportModal.tsx`

Modify `handleExport` to use high-quality render for Mesh mode:

```typescript
const isMeshMode = config.wireframe === true;

if (isMeshMode) {
  // Mesh mode: render at full resolution using JS
  await renderMeshGradientHighQuality(ctx, targetWidth, targetHeight, config);
} else {
  // Sphere/Plane mode: capture WebGL
  await captureVisibleWebGLCanvasToCanvas(sourceCanvas, ctx, targetWidth, targetHeight);
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ExportModal.tsx` | Add 3D Simplex noise, high-quality render function, update export logic |

---

## Expected Results

1. **Mesh Mode**: Exported images will have identical quality to on-screen preview at any resolution
2. **Color Transitions**: Smooth, organic transitions with no banding or blur
3. **Noise Detail**: Multi-octave noise preserved at all scales
4. **Edge Handling**: Clean edges with proper fade-to-background

---

## Performance Notes

- For a 4K image (3840x2160), rendering ~8.3M pixels takes approximately 2-4 seconds on modern hardware
- For A3 print (3508x4961), rendering ~17.4M pixels takes approximately 4-8 seconds
- A progress indicator can be added for user feedback during large exports

---

## Testing Checklist

- [ ] Export Instagram Post (1080x1080) in Mesh mode - verify smooth transitions
- [ ] Export A3 Print (3508x4961) in Mesh mode - verify no banding at full resolution
- [ ] Compare screen preview to exported image side-by-side
- [ ] Export with different presets and verify colors match exactly
- [ ] Test with grain enabled - verify grain appears correctly in export
