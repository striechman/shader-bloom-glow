

# Domain Warping + Smootherstep + Premium Presets

## Overview

Implementing Gemini's three core recommendations to upgrade the gradient engine from "lava lamp" aesthetics to Apple/OpenAI-level fluid visuals:

1. **Smootherstep** - Replace `smoothstep` with Ken Perlin's 6th-degree polynomial for buttery-smooth color transitions
2. **Domain Warping** - Warp noise coordinates through a second noise layer to create silk/smoke flow instead of circular blobs
3. **4 New Premium Presets** - Cognitive Aura, Fluid Silk, Ambient Edge, Prismatic Glass

## What Changes

### 1. Smootherstep Function (All Modes)

Add a `smootherstep` GLSL function and use it in Plane, Water, Conic, and Waves blending blocks. This gives smoother acceleration/deceleration at color boundaries -- the difference is subtle but removes any remaining "notch" feeling at transition edges.

### 2. Domain Warping (Mesh + Aurora Only)

The "amoeba" effect comes from directly using Simplex noise for blob distortion. Domain Warping feeds one noise field into another's coordinates, producing stretched, flowing shapes like silk or smoke.

- Add a `meshWarpStrength` parameter to `GradientConfig` (range 0-3, default 1.2)
- In the Mesh/Aurora shader block, warp the distortion coordinates through a secondary noise pass before computing blob distances
- Expose as "Warp" slider in Fine Tune section (only for Mesh/Aurora)
- Higher values = more fluid/silk look, lower values = classic blob look

### 3. Four New Full Presets

| Preset | Effect | Key Idea |
|--------|--------|----------|
| **Cognitive Aura** | Mesh (Center, Inward) | Pulsing center energy on dark bg, 2-3 colors, high blur, high base weight (65%) |
| **Fluid Silk** | Mesh (Flow) | High warp strength (2.0), low frequency, slow speed -- silk/smoke feel |
| **Ambient Edge** | Glow (Scattered) | Colors pushed to edges via large spread + center offset, clean center for text |
| **Prismatic Glass** | Plane (Linear) | Base color 85%, other colors at 2-5% each -- subtle light refraction strips |

## Technical Details

### File: `src/types/gradient.ts`
- Add `meshWarpStrength: number` to `GradientConfig` interface (after `meshStretch`)
- Add default value `meshWarpStrength: 1.2` to `defaultGradientConfig`

### File: `src/components/Custom4ColorGradient.tsx`

**Add smootherstep function** (in fragment shader, before `main()`):
```glsl
float smootherstep(float edge0, float edge1, float x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}
```

**Replace all `smoothstep` calls** in Plane blending block (lines 682-685) and Other Modes block (lines 713-716) with `smootherstep`.

**Add Domain Warping to Mesh mode** (lines ~469-480):
- Add uniform `uWarpStrength`
- Before computing distorted distances, warp the sample UV:
```glsl
// Domain Warping: feed noise into noise coordinates for fluid shapes
vec2 warpOffset;
warpOffset.x = snoise(vec3(sampleUv * noiseScale * 0.7, t * 0.2));
warpOffset.y = snoise(vec3(sampleUv * noiseScale * 0.7 + 5.2, t * 0.2));
vec2 warpedUv = sampleUv + warpOffset * uWarpStrength * 0.08;
```
- Use `warpedUv` instead of `sampleUv` for the distortion noise sampling (lines 471-474)
- This transforms circular blobs into flowing, silk-like shapes

**Add uniform declaration and wiring**:
- Declare `uniform float uWarpStrength;` in shader
- Add to uniforms object and useFrame update block

### File: `src/components/CustomMeshGradient.tsx`
- Add `uWarpStrength` uniform (same as Custom4ColorGradient)
- Apply same domain warping logic in the light source position calculations

### File: `src/components/ControlPanel.tsx`

**Add Warp slider** to Fine Tune section (visible for Mesh/Aurora only):
- Label: "Warp" 
- Range: 0 to 3, step 0.1
- Maps to `meshWarpStrength`

**Add 4 new presets** to `colorPresets` array:
```
Cognitive Aura: Magenta + Violet on deep black (65% base), Mesh Center Inward, high blur
Fluid Silk: Blue + Magenta, Mesh Flow, warpStrength 2.0, low frequency, slow speed
Ambient Edge: Coral + Gold, Glow Scattered, large spread, offset to edges
Prismatic Glass: Gold at 85% base + 5% Magenta + 5% Violet + 5% Blue, Plane Linear
```

**Update effect presets** for Mesh and Aurora to include default `meshWarpStrength: 1.2`

