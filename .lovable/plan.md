

# Mesh Gradient Rewrite - Normalized Weight Blending

## The Core Problem
The mesh shader has two fundamental issues that explain both "too black" and "not black at all":

### Bug 1: Dead Code
The mesh logic is computed **twice** in the shader:
- **Lines 191-325**: First computation (where all luminance guarding and energy fixes were added) -- but this block only sets `noise = 0.5` and its results are THROWN AWAY
- **Lines 520-611**: Second computation that actually renders to screen -- this block has NONE of the fixes

Every fix we've been making was going into dead code.

### Bug 2: Wrong Blending Model
The current approach uses **Screen Blending** (additive light):
```text
finalColor = base + light1 * (1 - base)
finalColor = finalColor + light2 * (1 - finalColor)  // light2 gets LESS space
finalColor = finalColor + light3 * (1 - finalColor)  // light3 gets even LESS
```
This is order-dependent (Color1 always dominates), creates muddy blends, and requires complex "energy conservation" + "haze" hacks that oscillate between "too dark" and "too bright."

## What Professional Mesh Gradients Do (from GitHub research)

Both `ben-fornefeld/mesh-gradient` and Apple's `MeshingKit` use a fundamentally different approach: **Normalized Weight Blending**.

```text
Current (Additive):          Professional (Normalized):
                             
  Color1 ──┐                   Color1 ──┐
  Color2 ──┼──> ADD on black    Color2 ──┤
  Color3 ──┘    (order matters) Color3 ──┼──> WEIGHTED AVG (order-free)
                                Black ───┘    (always sums to 1.0)
```

Key differences:
- Each color has a **noise-driven affinity** at each pixel
- All affinities are **normalized to sum to 1.0** -- no over-brightening possible
- Black participates as an equal player, not as a background being "painted over"
- No energy conservation or haze hacks needed
- Weight accuracy is automatic

## The Solution: Normalized Affinity Blending

### Algorithm
```text
For each pixel:
  1. Generate independent noise field for each color (n1, n2, n3, n4)
  2. Compute affinity: aff_i = pow(noise_i, sharpness) * weight_i * calibration
  3. Black affinity: aff_black = weight_black (constant baseline)
  4. Normalize: all affinities / sum(all affinities)  
  5. Final color = sum(color_i * normalized_aff_i)
```

### Sharpness Calibration
```text
sharpness = mix(1.0, 4.0, 1.0 - blur)

blur=0%   --> sharpness=4.0 --> distinct color blobs with clear boundaries
blur=50%  --> sharpness=2.5 --> soft but visible separation  
blur=100% --> sharpness=1.0 --> very smooth, creamy transitions

calibration = sharpness + 1.0  (compensates for pow() reducing average values)
```

### Why This Fixes Both Problems:
- **"Too black" preset (Aurora)**: Black gets exactly its 30% weight, not amplified by haze
- **"Not black at all" preset**: Black's constant affinity always ensures presence proportional to its weight
- **"Lava lamp" effect**: Normalized blending creates distinct regions instead of muddy additive overlap
- **Color3 = Black**: Naturally adds to dark areas (same as base), doesn't "steal" from other colors

## Changes to Make

### File: `src/components/Custom4ColorGradient.tsx`

**1. Remove dead first mesh block (lines 191-325)**

Replace the entire first `if (uGradientType == 0)` block with just a placeholder:
```glsl
if (uGradientType == 0) {
    noise = 0.5; // Mesh mode computes color directly below
}
```

**2. Rewrite second mesh block (lines 520-611) with normalized blending**

Replace the current screen-blend approach with:
```glsl
if (uGradientType == 0) {
    // Recompute noise fields (same as before)
    float t = uTime * 0.15;
    vec2 sampleUv = vUv;
    // ... Aurora stretch logic stays same ...
    
    // Independent noise per color
    float n1 = snoise(pos1) * 0.5 + 0.5;
    float n2 = snoise(pos2) * 0.5 + 0.5;
    float n3 = snoise(pos3) * 0.5 + 0.5;
    float n4 = snoise(pos4) * 0.5 + 0.5;
    
    // Sharpness from blur (smooth 1.0 to sharp 4.0)
    float sharpness = mix(1.0, 4.0, 1.0 - uBlur);
    float calibration = sharpness + 1.0;
    
    // Weighted affinities (noise^sharpness creates concentrated islands)
    float aff1 = pow(clamp(n1,0.0,1.0), sharpness) * w1 * calibration;
    float aff2 = pow(clamp(n2,0.0,1.0), sharpness) * w2 * calibration;
    float aff3 = pow(clamp(n3,0.0,1.0), sharpness) * w3 * calibration;
    float aff4 = pow(clamp(n4,0.0,1.0), sharpness) * w4 * calibration;
    
    // Black gets constant baseline (fills gaps between blobs)
    float aff0 = uWeight0 / 100.0;
    
    // Normalize -- all weights sum to 1.0
    float totalAff = aff0 + aff1 + aff2 + aff3 + aff4;
    aff0 /= totalAff;
    aff1 /= totalAff;
    aff2 /= totalAff;
    aff3 /= totalAff;
    aff4 /= totalAff;
    
    // Direct weighted blend (order-independent, naturally balanced)
    finalColor = uColor0 * aff0 + uColor1 * aff1 + uColor2 * aff2 + uColor3 * aff3;
    if (uHasColor4) finalColor += uColor4 * aff4;
    
    // Subtle edge fade for floating look
    finalColor = mix(uColor0, finalColor, edgeFade);
}
```

**3. No more energy conservation, haze, or screen blend**

All these are removed -- the normalization handles everything automatically.

### File: `src/components/GradientDebugOverlay.tsx`

Update derived values display:
- Replace "Blend Mode: Radial Light" with "Blend Mode: Normalized"
- Update sharpness calculation to match new range (1.0-4.0)
- Remove references to haze and energy conservation

## Expected Results

| Scenario | Before | After |
|----------|--------|-------|
| Initial preset (Yellow/Pink/Black, blur=95%) | Single muddy color | Distinct yellow + pink blobs on black |
| 30% black weight | Too black (haze) | Exactly ~30% black area |
| 77% black weight | Colors too dim | Colors visible but small (~23% total) |
| Mesh preset (blur=70%) | Lava lamp effect | Clean, separated color regions |
| Color3 = Black | Steals light budget | Naturally adds to dark areas |

## Verification Steps
1. Load initial preset (Aurora) - confirm yellow and pink are visible as distinct blobs
2. Switch to Mesh preset (70% blur) - confirm colors are separated, not lava lamp
3. Drag black weight to 77% - confirm gradual darkening, colors shrink but stay vivid
4. Drag black weight back to 30% - confirm colors return to full size
5. All other modes (Plane, Water, Conic, etc.) should be completely unaffected

