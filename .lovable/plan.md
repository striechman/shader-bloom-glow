# Plan: Fix Export Quality - Match Screen Preview

## ✅ COMPLETED

**Implementation Date:** 2026-01-29

---

## Summary

Implemented high-fidelity export for Mesh mode by porting the exact GLSL shader logic to JavaScript. Exports now render at target resolution with pixel-perfect quality matching the on-screen preview.

---

## What Was Implemented

### 1. 3D Simplex Noise in JavaScript
- Full port of the GLSL `snoise(vec3 v)` function
- Matching helper functions: `mod289`, `permute`, `taylorInvSqrt`
- Produces identical noise patterns to the shader

### 2. High-Quality Mesh Render Function
- `renderMeshGradientHighQuality()` renders pixel-by-pixel at target resolution
- Uses exact shader parameters: noise scale, frequency, density, strength
- Matches multi-octave noise weights: `n1 * 0.5 + n2 * (0.20 + 0.10 * density) + n3 * (0.10 + 0.06 * density)`
- Applies correct normalization and edge fade
- Supports grain effect

### 3. Updated Export Logic
- Mesh mode: Uses JS render (no WebGL capture, no scaling artifacts)
- Sphere/Plane/Water modes: Continue using WebGL capture with corner healing

---

## Key Code Changes

**File:** `src/components/ExportModal.tsx`

1. Added `simplexNoise3D()` - full 3D Simplex noise implementation
2. Added `renderMeshGradientHighQuality()` - pixel-perfect mesh gradient renderer
3. Updated `handleExport()` to choose render path based on mode:
   ```typescript
   if (isMeshMode) {
     await renderMeshGradientHighQuality(ctx, targetWidth, targetHeight, config);
   } else {
     // WebGL capture for other modes
   }
   ```

---

## Expected Results

✅ Mesh Mode exports match screen preview exactly at any resolution
✅ Smooth color transitions with no banding
✅ Multi-octave noise detail preserved at all scales
✅ Grain effect works correctly in export
✅ Clean edges with proper fade-to-background
