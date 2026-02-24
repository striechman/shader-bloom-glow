

# Plane Mode Smoothing + Spotlight/Sunset Differentiation

## Problem 1: Plane Mode Transitions Too Sharp

The current Plane blending code (lines 668-686 in `Custom4ColorGradient.tsx`) has two issues causing harsh transitions:

1. **Blending in Linear RGB** - Plane is the only mode that blends colors in linear space then converts to sRGB at the end (line 723-725). All other modes (Mesh, Glow, Water, Conic, Waves) blend in sRGB for smoother perceptual results.

2. **Narrow transition widths** - The `transitionWidth` calculation uses `spreadMult` range of 0.008-0.12 which is too tight. Compare with the "Other Modes" block which uses 0.10 base + 0.20 blur factor. The Plane transitions are roughly 2-3x narrower.

3. **Asymmetric first transition only on one side** - `blend01` uses `threshold0` to `threshold0 + transitionWidth * 2.0` (one-sided), while blends 12/23/34 use symmetric ranges. This creates inconsistency.

### Fix:
- Convert colors to sRGB before blending (like all other modes)
- Widen the transition widths significantly - use a base of ~0.08 minimum with wider blur influence
- Make all transitions symmetric and generous
- Remove the separate linearToSrgb conversion for Plane at line 723

## Problem 2: Spotlight and Sunset Are Nearly Identical

Current presets comparison:

| | Spotlight | Sunset |
|---|---|---|
| Color 1 | #E8920D (amber) | #FDB515 (gold) |
| Color 2 | #F06030 (orange) | #F2665F (coral) |
| Color 3 | #EC008C (magenta) | #EC008C (magenta) |
| Weight 0 | 55% | 30% |

Both are warm analogous chains ending in magenta. Too similar.

### Fix: Differentiate Sunset
Rethink **Sunset** to represent a true sky sunset feel - shift it toward pink/purple tones that evoke dusk sky rather than warm spotlight:

- **Sunset** -> Change to: color1: `#FF6B6B` (warm red-pink), color2: `#FDB515` (golden sun), color3: `#6A00F4` (deep purple horizon)
- weight0: 35% (more color showing than Spotlight's 55%)
- This creates a warm-to-cool transition (red -> gold -> purple) that reads as "sunset sky" vs Spotlight's concentrated warm glow

Alternatively, since **Spotlight** is already a full preset locked to Glow mode, we can make **Sunset** a full preset too but for **Plane** mode - a horizontal gradient that actually looks like a sunset horizon.

## Technical Details

### File: `src/components/Custom4ColorGradient.tsx`

**Plane blending block (lines 668-686)** - Replace with:

```glsl
// PLANE MODE: Weighted Segments with Smooth Fading
vec3 sColor0 = linearToSrgb(uColor0);
vec3 sColor1 = linearToSrgb(uColor1);
vec3 sColor2 = linearToSrgb(uColor2);
vec3 sColor3 = linearToSrgb(uColor3);
vec3 sColor4 = linearToSrgb(uColor4);

float spreadMult = mix(0.05, 0.18, uPlaneSpread);
float transitionWidth = spreadMult + blurFactor * 0.22;
transitionWidth = max(transitionWidth, 0.06);

float blend01 = smoothstep(threshold0 - transitionWidth * 0.5, threshold0 + transitionWidth * 1.5, noise);
float blend12 = smoothstep(threshold1 - transitionWidth, threshold1 + transitionWidth, noise);
float blend23 = smoothstep(threshold2 - transitionWidth, threshold2 + transitionWidth, noise);
float blend34 = smoothstep(threshold3 - transitionWidth, threshold3 + transitionWidth, noise);

finalColor = sColor0;
finalColor = mix(finalColor, sColor1, blend01);
finalColor = mix(finalColor, sColor2, blend12);
finalColor = mix(finalColor, sColor3, blend23);
if (uHasColor4) {
  finalColor = mix(finalColor, sColor4, blend34);
}
```

**Remove Plane-only sRGB conversion (lines 723-725)** - Remove the `if (uGradientType == 2)` block since Plane now blends in sRGB like everything else.

### File: `src/components/ControlPanel.tsx`

**Sunset preset (line 105)** - Change colors and make it a full preset for Plane mode:

```
{
  name: 'Sunset',
  color1: '#FF6B6B',  // warm pink-red sky
  color2: '#FDB515',  // golden sun
  color3: '#6A00F4',  // deep purple horizon
  weight0: 35, weight1: 30, weight2: 25, weight3: 10,
  recommendedFor: ['plane', 'waves'],
  fullPreset: {
    type: 'plane', planeAngle: 90, planeRadial: false,
    planeSpread: 60, planeWave: 0,
    animate: false, frozenTime: 3.0, grain: false,
  }
}
```

Also fix **Spotlight** preset: line 102 still has `grain: true` - change to `grain: false` to match the default.

