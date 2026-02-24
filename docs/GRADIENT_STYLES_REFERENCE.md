# 🎨 Gradient Engine — Complete Style & Technical Reference

> **Last Updated:** February 2026  
> **Purpose:** מסמך עזר מלא למפתחים — כל סגנון, לוגיקה, מתמטיקה, פריסטים ואופציות.

---

## 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Color System](#2-color-system)
3. [Shared Infrastructure](#3-shared-infrastructure)
4. [Gradient Styles (Effects)](#4-gradient-styles)
   - [4.1 Sphere](#41-sphere)
   - [4.2 Mesh](#42-mesh)
   - [4.3 Aurora](#43-aurora)
   - [4.4 Plane](#44-plane)
   - [4.5 Glow (Luminous Glow)](#45-glow-luminous-glow)
   - [4.6 Conic](#46-conic)
   - [4.7 Waves](#47-waves)
   - [4.8 Water](#48-water)
5. [Color Presets (Palettes)](#5-color-presets)
6. [Effect Presets (Default Parameters)](#6-effect-presets)
7. [Built-in Full Presets](#7-built-in-full-presets)
8. [Anti-Banding (Dithering)](#8-anti-banding)
9. [Film Grain](#9-film-grain)
10. [Export System](#10-export-system)
11. [Parameter Reference](#11-parameter-reference)

---

## 1. Architecture Overview

### Rendering Paths

The engine has **two** rendering paths, selected in `GradientCanvas.tsx`:

| Path | Used For | Engine | Max Colors |
|------|----------|--------|------------|
| **Custom Shader** (`Custom4ColorGradient.tsx`) | Plane, Mesh, Aurora, Glow, Conic, Waves, Water | Custom GLSL on Three.js `<shaderMaterial>` | 5 (Color 0–4) |
| **ShaderGradient** (3rd-party library) | Sphere only | `@shadergradient/react` | 3 |

```
GradientCanvas.tsx
├── use4ColorMode === true  → <Canvas> + <Custom4ColorGradient>
│   Handles: mesh, plane, glow, conic, waves, waterPlane, wireframe
└── use4ColorMode === false → <ShaderGradientCanvas> + <ShaderGradient>
    Handles: sphere
```

### Key Files

| File | Role |
|------|------|
| `src/components/Custom4ColorGradient.tsx` | Main custom GLSL shader — all modes except Sphere |
| `src/components/GradientCanvas.tsx` | Path selector, aspect ratio, grain overlay, debug UI |
| `src/components/ControlPanel.tsx` | UI controls, color/effect presets, weight logic |
| `src/types/gradient.ts` | `GradientConfig` type definition + defaults |
| `src/config/presets.ts` | Built-in full presets (Dark Sunrise, Neon Nights, etc.) |
| `src/lib/noise.ts` | JavaScript Simplex Noise (for export renderer) |
| `src/lib/webglCapture.ts` | WebGL canvas capture for export |
| `src/components/ExportModal.tsx` | Export rendering (Canvas 2D) |

---

## 2. Color System

### Hierarchy (5 Colors)

| Color | Role | Default Weight | Editable? | Notes |
|-------|------|---------------|-----------|-------|
| **Color 0** | Theme base | 30% (min 30%, max 100%) | No | `#000000` in Dark Mode, `#FFFFFF` in Light Mode |
| **Color 1** | Primary brand | 25% | Yes | Main accent color |
| **Color 2** | Secondary brand | 25% | Yes | Supporting color |
| **Color 3** | Tertiary brand | 20% | Yes | Accent/contrast |
| **Color 4** | Optional 4th | 0% (off) | Yes | Enabled manually, `null` when off |

### Brand Colors (Amdocs Palette)

```
Magenta:  #EC008C
Violet:   #6A00F4
Blue:     #00C2FF
Coral:    #F2665F
Gold:     #FDB515
```

### Weight Algorithm

```typescript
// When Color 0 weight changes, brand colors redistribute proportionally:
const remainingWeight = 100 - baseWeight;
const totalBrandWeights = w1 + w2 + w3 + w4;
newW1 = Math.round((w1 / totalBrandWeights) * remainingWeight);
// ... same for w2, w3, w4
```

### Color Space Pipeline

```
User picks HEX color
  → Three.js auto-converts to Linear RGB (sRGB→Linear)
    → Shader receives Linear values in uniforms
      → Shader converts BACK to sRGB: linearToSrgb()
        → Blending happens in sRGB (perceptual space)
          → Bayer dithering applied
            → gl_FragColor output (sRGB)
```

**Why sRGB blending?** All modes blend in sRGB for perceptual accuracy. Blending in Linear RGB causes dark colors to appear muddy and shifts hue during transitions.

### GLSL Conversion Functions

```glsl
// Linear → sRGB (gamma encoding)
vec3 linearToSrgb(vec3 linear) {
  vec3 low = linear * 12.92;
  vec3 high = 1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(0.0031308, linear));
}

// sRGB → Linear (gamma decoding)
vec3 srgbToLinear(vec3 srgb) {
  vec3 low = srgb / 12.92;
  vec3 high = pow((srgb + 0.055) / 1.055, vec3(2.4));
  return mix(low, high, step(0.04045, srgb));
}
```

---

## 3. Shared Infrastructure

### 3.1 Simplex Noise (GLSL)

All organic effects use Stefan Gustavson's **3D Simplex Noise** (`snoise(vec3)`). Returns values in range `[-1, 1]`.

Used for:
- Noise-based color distribution (Mesh, Water, Conic)
- Wave distortion (Plane, Waves)
- Organic shape distortion (Glow orbs, Mesh blobs)
- Film grain

### 3.2 Global Rotation

All effects support `gradientRotation` (0–360°). Applied by rotating UV coordinates around center before any effect computation:

```glsl
float cosR = cos(uRotation);
float sinR = sin(uRotation);
vec2 rotatedUv = vec2(
  (vUv.x - 0.5) * cosR - (vUv.y - 0.5) * sinR + 0.5,
  (vUv.x - 0.5) * sinR + (vUv.y - 0.5) * cosR + 0.5
);
```

### 3.3 Edge Vignette (Mesh Mode Only)

Prevents harsh canvas edges on Mesh/Aurora by fading to base color:

```glsl
float edgeDist = length(centeredUv) * 2.0;
float edgeFade = 1.0 - smoothstep(0.85, 1.25, edgeDist);
```

### 3.4 Threshold System (Weight → Noise Mapping)

All threshold-based modes (Plane, Conic, Waves, Water) convert color weights to cumulative thresholds:

```glsl
float threshold0 = w0;              // e.g. 0.30
float threshold1 = w0 + w1;         // e.g. 0.55
float threshold2 = w0 + w1 + w2;    // e.g. 0.80
float threshold3 = w0 + w1 + w2 + w3; // e.g. 1.00
```

The noise value (0–1) determines which color "wins" at each pixel. `smoothstep` creates soft transitions between segments.

---

## 4. Gradient Styles

---

### 4.1 Sphere

**Type ID:** `sphere` | **Shader:** `@shadergradient/react` (3rd-party) | **uGradientType:** N/A

**Description:** 3D sphere with smooth organic color blending. Uses the external ShaderGradient library — the only mode not rendered by the custom shader.

**Unique Characteristics:**
- Only supports 3 colors (Color 1–3, no Color 0 or Color 4)
- Has its own 3D lighting and mesh deformation
- Parameters `uStrength`, `uDensity`, `uFrequency` control the 3D mesh deformation
- Cannot use wireframe mode (handled separately)

**How it works:**
The ShaderGradient library renders a deformed 3D sphere with color blending based on vertex position and noise. The sphere's surface deforms based on noise parameters, creating an organic blob shape.

**User Controls:**
| Parameter | Range | Effect |
|-----------|-------|--------|
| `uStrength` | 0–10 | Mesh deformation intensity |
| `uDensity` | 0–5 | Noise density on sphere surface |
| `uFrequency` | 0–10 | Noise frequency (detail level) |
| `speed` | 0–2 | Animation speed |
| `grain` | on/off | Film grain (handled by library) |

**When to use:** Best for organic, blob-like 3D visuals. Good for hero sections needing depth.

---

### 4.2 Mesh

**Type ID:** `mesh` (internally `uGradientType == 0`) | **Shader:** Custom GLSL

**Description:** Gaussian Radial Glow model — each color is a positioned light source with smooth falloff. Black (Color 0) fills all gaps naturally as "absence of light."

**Mathematical Model:**

Each color `i` has a center position `ci`, a noise-distorted distance `di`, and a Gaussian radius `ri`:

```
orb_i = exp(-di² / ri²) × glowBoost × weightFactor_i
```

Where:
- `di = |sampleUv - ci| + noise_distortion`
- `ri = softness × (0.3 + wi × 0.4)` — radius proportional to weight
- `glowBoost = 4.0 + uStrength × 1.5`
- `weightFactor = mix(0.5, 1.0, clamp(wi × 3.0, 0.0, 1.0))` — soft weight floor

**Normalization:** All contributions (including dark base) sum to 1.0:

```glsl
float darkBase = w0 * 1.8;  // Boosted black presence
float total = darkBase + g1 + g2 + g3 + g4;
float a0 = darkBase / total;
float a1 = g1 / total;
// ...
finalColor = sColor0 * a0 + sColor1 * a1 + sColor2 * a2 + ...;
```

**Center Positions (3 Styles):**

| Style | `meshStyle` | Behavior |
|-------|-------------|----------|
| **Organic** | `0` | Colors at well-spread positions with gentle animation orbits |
| **Flow** | `1` | Colors aligned along `meshFlowAngle` direction with perpendicular wobble |
| **Center** | `2` | Colors either cluster inward (`meshCenterInward: true`) or sit at corners |

**Noise Distortion:** Makes blobs organic (non-circular):
```glsl
float distort = snoise(vec3(sampleUv * distortScale, t * 0.3)) * 0.12;
float d1 = length(sampleUv - c1) + distort;
```

**Blur (Softness):**
```glsl
float softness = mix(0.18, 0.65, uBlur);  // uBlur is meshBlur/100
```

**User Controls:**
| Parameter | Range | Effect |
|-----------|-------|--------|
| `meshNoiseScale` | 0.1–10 | Size of color blobs (lower = larger) |
| `meshBlur` | 0–100 | Softness of edges between blobs |
| `meshStyle` | organic/flow/center | Blob arrangement |
| `meshFlowAngle` | 0–360° | Direction for flow style |
| `meshCenterInward` | bool | Inward vs outward for center style |
| `uStrength` | 0–10 | Glow intensity boost |

**When to use:** Best for abstract backgrounds with soft, organic color blobs. Great for behind-text sections.

---

### 4.3 Aurora

**Type ID:** `aurora` (internally same as Mesh, `uGradientType == 0`, with `meshStretch: true`)

**Description:** Stretched curtain effect — vertical light columns resembling northern lights. Technically it's Mesh mode with vertical stretching enabled.

**How Stretching Works:**

```glsl
if (uMeshStretch) {
  sampleUv.y = (sampleUv.y - 0.5) / uMeshStretchAmount + 0.5;  // Vertical compression
  sampleUv.x += sin(sampleUv.y * 4.0 + t) * 0.08;              // Horizontal wave
}
```

This compresses the noise field vertically, making circular blobs into tall vertical curtains, and adds a sinusoidal horizontal drift for organic swaying.

**Recommended Settings:**
- `meshBlur: 95` — near-maximum for silky transitions
- `meshNoiseScale: 0.3` — very low = huge smooth areas
- `speed: 0.15` — slow dreamy movement
- `uStrength: 0.5`, `uFrequency: 2.0` — reduced for smoothness

**When to use:** Hero backgrounds that need elegant, flowing light curtains.

---

### 4.4 Plane

**Type ID:** `plane` | **uGradientType:** `2`

**Description:** Linear or radial gradient with precise weight-to-area mapping. The most "structural" mode — designed for clean, predictable color distribution along a direction.

**Key Architectural Differences from Mesh:**

| Aspect | Mesh | Plane |
|--------|------|-------|
| Blending model | Radial Glow (Gaussian) | Weighted Segments (threshold) |
| Histogram equalization | S-curve stretching | None (linear mapping) |
| Noise character | Multi-octave organic | Monotonic + optional wave |
| Strength parameter | Affects glow boost | Disconnected (no effect) |

**Noise Computation:**

*Linear mode:*
```glsl
vec2 direction = vec2(cos(uPlaneAngle), sin(uPlaneAngle));
float dotProduct = dot(centeredUv, direction);
float maxDot = abs(direction.x) * 0.5 + abs(direction.y) * 0.5;
baseNoise = (dotProduct / maxDot) * 0.5 + 0.5;  // Full 0→1 range

// Subtle time drift (animation even when Wave=0)
baseNoise += sin(uTime * 0.20) * 0.025;
```

*Radial mode:*
```glsl
vec2 drift = vec2(sin(uTime * 0.22), cos(uTime * 0.18)) * 0.02;
offsetCenter = centeredUv - uPlaneOffset + drift;
baseNoise = length(offsetCenter) * 2.0;  // 0 at center → 1+ at edges
```

*Wave distortion (optional):*
```glsl
if (uPlaneWave > 0.01) {
  float waveNoise = snoise(vec3(rotatedUv * 3.0, uTime * 0.3)) * uPlaneWave * 0.25;
  baseNoise += waveNoise;
}
```

**Color Blending (sRGB):**

```glsl
// Convert to sRGB BEFORE blending
vec3 sColor0 = linearToSrgb(uColor0);
// ... sColor1, sColor2, sColor3, sColor4

// Transition width: wider spread = wider + blur adds more
float spreadMult = mix(0.05, 0.18, uPlaneSpread);
float transitionWidth = spreadMult + blurFactor * 0.22;
transitionWidth = max(transitionWidth, 0.06);  // Minimum smoothness

// First transition: slightly asymmetric (preserves solid base area)
float blend01 = smoothstep(threshold0 - transitionWidth * 0.5,
                           threshold0 + transitionWidth * 1.5, noise);
// Remaining transitions: symmetric
float blend12 = smoothstep(threshold1 - transitionWidth,
                           threshold1 + transitionWidth, noise);
float blend23 = smoothstep(threshold2 - transitionWidth,
                           threshold2 + transitionWidth, noise);
float blend34 = smoothstep(threshold3 - transitionWidth,
                           threshold3 + transitionWidth, noise);

// Progressive mix
finalColor = sColor0;
finalColor = mix(finalColor, sColor1, blend01);
finalColor = mix(finalColor, sColor2, blend12);
finalColor = mix(finalColor, sColor3, blend23);
if (uHasColor4) {
  finalColor = mix(finalColor, sColor4, blend34);
}
```

**Important Design Decisions:**
1. **No histogram equalization** — Plane noise is already uniform; equalization would distort area mapping
2. **No pow() warping** — Monotonic 0→1 mapping must be preserved for accurate weight-to-area
3. **sRGB blending** — Same as all other modes for perceptual consistency

**User Controls:**
| Parameter | Range | Effect |
|-----------|-------|--------|
| `planeAngle` | 0–360° | Gradient direction |
| `planeRadial` | bool | Linear vs radial from center |
| `planeSpread` | 0–100 | Transition sharpness (low = sharp, high = soft) |
| `planeWave` | 0–100 | Noise distortion on gradient |
| `planeOffsetX` | -50–50 | Horizontal center offset (radial only) |
| `planeOffsetY` | -50–50 | Vertical center offset (radial only) |

**When to use:** Clean directional gradients, banners, backgrounds where precise color positioning matters.

---

### 4.5 Glow (Luminous Glow)

**Type ID:** `glow` | **uGradientType:** `5`

**Description:** Additive light simulation — colored light orbs glowing against darkness. Think stage lighting or neon signs in fog.

**Mathematical Model:**

Each orb uses Gaussian falloff:

```
orb_i = exp(-di² / (orbSize² × (0.4 + wi × 0.6)))
```

Then weighted by intensity:
```
orb_i *= wi × glowIntensity
// where glowIntensity = 3.0 + uStrength
```

**Dark Mode (Additive Blending):**
```glsl
finalColor = sColor0;          // Start with darkness
finalColor += sColor1 * orb1;  // Add light
finalColor += sColor2 * orb2;
finalColor += sColor3 * orb3;
// Contrast boost:
float contrastExp = 1.0 + uGlowShadowDensity * 1.5;
finalColor = pow(clamp(finalColor, 0.0, 1.0), vec3(contrastExp));
```

**Light Mode (Multiplicative Blending):**
```glsl
finalColor = sColor0;  // Start with white
finalColor *= mix(vec3(1.0), sColor1, clamp(orb1, 0.0, 1.0));  // Tint like watercolor
// Inverse contrast:
float contrastExp = 1.0 / (1.0 + uGlowShadowDensity * 1.5);
finalColor = pow(clamp(finalColor, 0.0, 1.0), vec3(contrastExp));
```

**Orb Arrangement Styles (4):**

| Style | `glowStyle` | Behavior |
|-------|-------------|----------|
| **Scattered** | `0` | Orbs spread organically across canvas |
| **Clustered** | `1` | Orbs grouped tightly near center |
| **Diagonal** | `2` | Orbs aligned along 45° diagonal line |
| **Ring** | `3` | Orbs arranged in a rotating circle |

**Organic Distortion:**
```glsl
float distortAmount = uGlowDistortion * 0.2;
float dist1Noise = snoise(vec3(st * 3.0, t * 0.3)) * distortAmount;
float d1 = length(st - p1) + dist1Noise;  // Warped distance → non-circular orbs
```

**User Controls:**
| Parameter | Range | Effect |
|-----------|-------|--------|
| `glowOrbSize` | 20–100 | Size of light orbs (maps to Gaussian spread 0.15–0.55) |
| `glowShadowDensity` | 0–100 | Contrast/depth (0 = clean, default) |
| `glowStyle` | scattered/clustered/diagonal/ring | Orb arrangement |
| `glowSpread` | 0–100 | Distance between orbs (maps to 0.08–0.35) |
| `glowOffsetX` | -50–50 | Horizontal shift of entire arrangement |
| `glowOffsetY` | -50–50 | Vertical shift of entire arrangement |
| `glowDistortion` | 0–100 | Organic deformation of orb shapes |

**When to use:** Dramatic hero backgrounds, dark-themed designs, "spotlight" effects. The Spotlight preset uses this with clustered style.

---

### 4.6 Conic

**Type ID:** `conic` | **uGradientType:** `4`

**Description:** Angular gradient rotating around a center point, like a color wheel. Optional spiral effect adds distance-based rotation.

**Noise Computation:**
```glsl
vec2 offsetCenter = centeredUv - uConicOffset;
float angle = atan(offsetCenter.y, offsetCenter.x);       // -π to π
float normalized = (angle + PI) / (2.0 * PI);             // 0 to 1

// Start angle offset
normalized = fract(normalized + uConicStartAngle / (2π));

// Spiral: angle shifts based on distance from center
if (uConicSpiral > 0.01) {
  float dist = length(offsetCenter) * 2.0;
  normalized = fract(normalized + dist * uConicSpiral);
}

// Subtle organic noise overlay
float organicNoise = snoise(noisePos) * 0.05 * density;
noise = normalized + organicNoise;
```

**Color Blending:** Uses the shared threshold system (same as Water/Waves — "Other Modes" block) with sRGB blending.

**User Controls:**
| Parameter | Range | Effect |
|-----------|-------|--------|
| `conicStartAngle` | 0–360° | Starting angle of the gradient |
| `conicSpiral` | 0–100 | Spiral tightness (0 = pure conic, high = spiral) |
| `conicOffsetX` | -50–50 | Center offset horizontal |
| `conicOffsetY` | -50–50 | Center offset vertical |

**When to use:** Color wheel effects, spiral backgrounds, circular progress indicators.

---

### 4.7 Waves

**Type ID:** `waves` | **uGradientType:** `6`

**Description:** Layered sinusoidal waves creating ocean-like color bands. Waves flow along a configurable direction.

**Noise Computation:**
```glsl
// Wave direction (from planeAngle)
vec2 waveDir = vec2(cos(uPlaneAngle), sin(uPlaneAngle));
vec2 perpDir = vec2(-waveDir.y, waveDir.x);

// Project UV onto wave direction
float alongWave = dot(rotatedUv - 0.5, waveDir) + 0.5;
float acrossWave = dot(rotatedUv - 0.5, perpDir);

// Three layered sine waves at different frequencies
float wave1 = sin(acrossWave * waveFreq * 2π + uTime * 0.5) * amplitude;
float wave2 = sin(acrossWave * waveFreq * 2.0 * 2π + uTime * 0.3 + 1.0) * amplitude * 0.5;
float wave3 = sin(acrossWave * waveFreq * 0.5 * 2π + uTime * 0.2 + 2.0) * amplitude * 0.3;

// Final noise: base position + wave distortion + organic noise
float wavyPos = alongWave + (wave1 + wave2 + wave3) * 0.15;
float organicNoise = snoise(noisePos) * 0.1 * density;
noise = clamp(wavyPos + organicNoise, 0.0, 1.0);
```

**Color Blending:** Uses the shared threshold system ("Other Modes" block) with sRGB blending.

**User Controls:**
| Parameter | Range | Effect |
|-----------|-------|--------|
| `wavesCount` | 2–10 | Number of wave layers |
| `wavesAmplitude` | 0–100 | Wave height/distortion |
| `wavesAngle` | 0–360° | Wave direction (uses `planeAngle` internally) |

**When to use:** Ocean-like flowing backgrounds, layered abstract art, music visualizers.

---

### 4.8 Water

**Type ID:** `waterPlane` | **uGradientType:** `3`

**Description:** Smooth flowing liquid effect with multi-octave noise. Creates a calm, fluid look similar to water reflections.

**Noise Computation:**
```glsl
vec3 noisePos = vec3(rotatedUv * 1.5 * freq, uTime * 0.15);

// Three noise layers (multi-octave)
float n1 = snoise(noisePos) * 0.5 + 0.5;           // Base layer
float n2 = snoise(noisePos * 0.7 + 30.0) * 0.25;   // Mid-detail
float n3 = snoise(noisePos * 0.5 + 60.0) * 0.15;   // Fine detail

// Gentle wave motion
float wave = sin(rotatedUv.x * 4.0 + rotatedUv.y * 3.0 + uTime * 0.3) * 0.08;

noise = clamp(n1 + n2 + n3 + wave * density, 0.0, 1.0);
```

**Color Blending:** Uses the shared threshold system ("Other Modes" block) with sRGB blending.

**User Controls:** Same as shared parameters (Strength, Density, Frequency). No mode-specific controls.

**When to use:** Liquid/fluid backgrounds, calm atmospheric visuals, watercolor-like effects.

---

## 5. Color Presets (Palettes)

Defined in `ControlPanel.tsx` → `colorPresets` array. Each preset sets colors and weights but does **not** change the current effect type (unless it has a `fullPreset`).

### Design Principle: Analogous Color Harmony

Adjacent colors in presets are placed near each other on the spectrum to ensure smooth, "creamy" transitions. Complementary colors (e.g., Gold next to Blue) are avoided because they create muddy/gray midtones when blended.

### Presets Table

| Name | Color 1 | Color 2 | Color 3 | Color 4 | W0 | Category | fullPreset? |
|------|---------|---------|---------|---------|-----|----------|-------------|
| **Golden** | `#FDB515` (Gold) | `#EC008C` (Magenta) | `#6A00F4` (Violet) | — | 40% | Bold | No |
| **Neon** | `#EC008C` (Magenta) | `#00C2FF` (Blue) | `#6A00F4` (Violet) | — | 30% | Bold | No |
| **Electric** | `#00C2FF` (Blue) | `#EC008C` (Magenta) | `#FDB515` (Gold) | — | 30% | Bold | No |
| **Spotlight** | `#E8920D` (Amber) | `#F06030` (Orange) | `#EC008C` (Magenta) | — | 55% | Warm | ✅ Glow |
| **Sunset** | `#FF6B6B` (Pink-Red) | `#FDB515` (Gold) | `#6A00F4` (Violet) | — | 35% | Warm | ✅ Plane |
| **Ember** | `#F2665F` (Coral) | `#EC008C` (Magenta) | `#FDB515` (Gold) | `#6A00F4` (Violet) | 35% | Warm | No |
| **Coral** | `#F2665F` (Coral) | `#FDB515` (Gold) | `#6A00F4` (Violet) | — | 35% | Warm | No |
| **Ocean** | `#00C2FF` (Blue) | `#6A00F4` (Violet) | `#EC008C` (Magenta) | — | 40% | Cool | No |
| **Royal** | `#6A00F4` (Violet) | `#EC008C` (Magenta) | `#00C2FF` (Blue) | — | 35% | Cool | No |
| **Dusk** | `#6A00F4` (Violet) | `#EC008C` (Magenta) | `#F2665F` (Coral) | — | 50% | Cool | No |

### Full Preset Details

**Spotlight** (fullPreset):
- Switches to **Glow** mode with `clustered` style
- `glowOrbSize: 75`, `glowSpread: 70`, `glowOffsetX: -15`
- `frozenTime: 5.50` (static), `grain: false`
- Designed for concentrated warm glow, spotlight-on-stage look

**Sunset** (fullPreset):
- Switches to **Plane** mode with `planeAngle: 90` (horizontal)
- `planeSpread: 60`, `planeWave: 0` (clean)
- `frozenTime: 3.0` (static), `grain: false`
- Designed for dusk-sky feel: warm pink-red → golden sun → deep purple horizon

---

## 6. Effect Presets (Default Parameters)

When a user switches effect type (e.g., clicks "Mesh" or "Waves"), the engine applies default parameter values from `effectPresets` in `ControlPanel.tsx`. **Colors are preserved** — only engine parameters change.

| Effect | Key Defaults |
|--------|-------------|
| **Sphere** | `uStrength: 4`, `uDensity: 1.3`, `uFrequency: 5.5`, `meshBlur: 50`, `speed: 0.4` |
| **Mesh** | `uStrength: 2.0`, `uDensity: 1.0`, `uFrequency: 3.0`, `meshNoiseScale: 0.3`, `meshBlur: 70`, `meshStyle: center` |
| **Aurora** | `uStrength: 0.5`, `uDensity: 1.0`, `uFrequency: 2.0`, `meshNoiseScale: 0.3`, `meshBlur: 95`, `meshStretch: true`, `speed: 0.15` |
| **Plane** | `uStrength: 1.5`, `uDensity: 0.5`, `uFrequency: 1`, `planeAngle: 45°`, `planeSpread: 50`, `speed: 0.4` |
| **Water** | `uStrength: 1.5`, `uDensity: 1.5`, `uFrequency: 2`, `meshNoiseScale: 2.0`, `meshBlur: 70`, `speed: 0.3` |
| **Conic** | `uStrength: 1`, `uDensity: 0.5`, `uFrequency: 1`, `conicStartAngle: 0`, `conicSpiral: 0`, `speed: 0.4` |
| **Glow** | `uStrength: 1.5`, `uDensity: 1.0`, `uFrequency: 2`, `glowOrbSize: 60`, `glowShadowDensity: 0`, `glowStyle: scattered`, `glowSpread: 50`, `glowDistortion: 40` |
| **Waves** | `uStrength: 1`, `uDensity: 1.2`, `uFrequency: 1.5`, `wavesCount: 5`, `wavesAmplitude: 50`, `speed: 0.25` |

All effects have `grain: false` by default.

---

## 7. Built-in Full Presets

Defined in `src/config/presets.ts`. These are complete configurations (colors + weights + effect parameters + animation settings) — one-click reproduction of curated looks.

| Preset | Effect | Category | Description |
|--------|--------|----------|-------------|
| Dark Sunrise | Plane | Dark | Diagonal violet-to-coral on deep black |
| Deep Aurora | Sphere | Dark | Silky aurora curtains (blue-violet-magenta) |
| Ocean Depth | Water | Dark | Blues and teals with violet hints |
| Violet Tide | Waves | Dark | Deep violet waves with coral/magenta |
| Blue Beacon | Plane (radial) | Minimal | Single blue light source on black |
| Neon Nights | Sphere | Vibrant | Electric magenta and cyan |
| Sunset Blaze | Plane | Vibrant | Warm coral-to-yellow-to-magenta |
| Luminous Glow | Glow | Vibrant | 4-color light orbs on darkness |
| Prismatic Waves | Waves | Vibrant | 4-color wave layers |
| Golden Waves | Waves | Vibrant | Bold gold + violet waves |
| Warm Glow | Glow | Vibrant | 4-color warm sunset orbs |
| Warm Spotlight | Glow | Vibrant | Concentrated warm amber spotlight |
| Morning Mist | Sphere | Light | Soft pastels on white |
| Soft Coral | Plane | Light | Gentle coral/peach on light background |

---

## 8. Anti-Banding (Dithering)

### Problem
Dark gradients on 8-bit displays show visible "banding" — color steps where transitions should be smooth. Only 256 values per channel.

### Solution: 8×8 Bayer Ordered Dithering

Applied as the **last step** before output:

```glsl
float d = bayer8x8(gl_FragCoord.xy);  // Returns -0.5 to +0.5
finalColor = clamp(finalColor + d * (0.75 / 255.0), 0.0, 1.0);
```

Amplitude is `0.75 / 255 ≈ 0.003` — less than 1 LSB in 8-bit. Invisible to the eye but breaks up quantization artifacts.

**Why Bayer (not random noise)?** Random dithering "dances" during animation. Bayer is deterministic — the pattern is fixed per pixel position, so it doesn't flicker.

---

## 9. Film Grain

Optional overlay applied in sRGB space after all blending:

```glsl
if (uGrain > 0.0) {
  float g = snoise(vec3(vUv * 220.0, uTime * 0.7));
  float grainAmt = (g * 0.5 + 0.5 - 0.5) * (uGrain * 0.18);
  gl_FragColor.rgb = clamp(gl_FragColor.rgb + grainAmt, 0.0, 1.0);
}
```

- `vUv * 220.0` — high-frequency noise for fine grain
- `uTime * 0.7` — temporal variation (grain "dances")
- `uGrain * 0.18` — intensity scaling

Additionally, a CSS-based grain overlay is applied for 4-color modes via an SVG `feTurbulence` filter in `GradientCanvas.tsx`:
```tsx
<div style={{
  opacity: grainOpacity,
  backgroundImage: "url(\"data:image/svg+xml,...feTurbulence...\")",
  mixBlendMode: 'soft-light',
  filter: 'contrast(150%) brightness(110%)',
}} />
```

**Default:** `grain: false`, `grainIntensity: 5`

---

## 10. Export System

### How Export Works

The export system (`ExportModal.tsx`) recreates the gradient at any resolution using a **JavaScript-based renderer** (Canvas 2D), not WebGL. This ensures:
- Arbitrary resolution support (up to 4K+)
- Consistent results across devices
- Same visual output as the WebGL preview

### Export Categories

| Category | Formats |
|----------|---------|
| **Social** | Instagram Post (1080×1080), Instagram Story (1080×1920), Facebook (1200×630), LinkedIn (1200×627), Twitter (1200×675) |
| **Web** | HD Desktop (1920×1080), 4K Desktop (3840×2160), Website Hero (1440×900), Banner Wide (1920×400) |
| **Print** | A4 300dpi (2480×3508), A3 300dpi (3508×4961), Letter (2550×3300), Poster 24×36 (7200×10800) |
| **Banner** | Leaderboard (728×90), Billboard (970×250), Skyscraper (160×600), Large Rectangle (336×280) |

### Parity Guarantee

The JS renderer mirrors the GLSL shader logic:
- Same Simplex Noise algorithm
- Same gamma correction functions
- Same threshold calculations
- Same Bayer dithering pattern

---

## 11. Parameter Reference

### Universal Parameters (All Modes)

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `type` | enum | sphere/plane/waterPlane/conic/glow/waves | sphere | Effect type |
| `wireframe` | bool | — | false | Show wireframe overlay |
| `color0` | hex | — | #000000 | Theme base color (auto-set) |
| `color1` | hex | — | #FDB515 | Primary brand color |
| `color2` | hex | — | #EC008C | Secondary brand color |
| `color3` | hex | — | #000000 | Tertiary brand color |
| `color4` | hex/null | — | null | Optional 4th color |
| `colorWeight0` | number | 30–100 | 30 | Base color weight % |
| `colorWeight1` | number | 0–70 | 25 | Color 1 weight % |
| `colorWeight2` | number | 0–70 | 25 | Color 2 weight % |
| `colorWeight3` | number | 0–70 | 20 | Color 3 weight % |
| `colorWeight4` | number | 0–70 | 0 | Color 4 weight % |
| `animate` | bool | — | true | Enable animation |
| `speed` | number | 0–2 | 0.4 | Animation speed |
| `frozenTime` | number/null | — | null | Freeze at specific time (null = animate) |
| `grain` | bool | — | false | Enable film grain |
| `grainIntensity` | number | 0–10 | 5 | Grain visibility |
| `uStrength` | number | 0–10 | 4 | Effect strength/contrast |
| `uDensity` | number | 0–5 | 1.3 | Noise density |
| `uFrequency` | number | 0–10 | 5.5 | Noise frequency |
| `gradientRotation` | number | 0–360 | 0 | Global rotation (degrees) |
| `aspectRatio` | enum | 1:1/16:9/9:16/... | free | Output aspect ratio |

### Mesh/Aurora-Specific

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `meshNoiseScale` | 0.1–10 | 0.3 | Blob size (lower = larger) |
| `meshBlur` | 0–100 | 50 | Edge softness |
| `meshStyle` | organic/flow/center | center | Blob arrangement |
| `meshFlowAngle` | 0–360° | 45 | Flow direction |
| `meshCenterInward` | bool | true | Inward/outward for center style |
| `meshStretch` | bool | false | Aurora curtain mode |

### Plane-Specific

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `planeAngle` | 0–360° | 45 | Gradient direction |
| `planeRadial` | bool | false | Radial vs linear |
| `planeSpread` | 0–100 | 50 | Transition softness |
| `planeWave` | 0–100 | 0 | Wave distortion |
| `planeOffsetX` | -50–50 | 0 | Radial center X offset |
| `planeOffsetY` | -50–50 | 0 | Radial center Y offset |

### Glow-Specific

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `glowOrbSize` | 20–100 | 60 | Light orb diameter |
| `glowShadowDensity` | 0–100 | 0 | Contrast/shadow depth |
| `glowStyle` | scattered/clustered/diagonal/ring | scattered | Orb arrangement |
| `glowSpread` | 0–100 | 50 | Distance between orbs |
| `glowOffsetX` | -50–50 | 0 | Horizontal arrangement shift |
| `glowOffsetY` | -50–50 | 0 | Vertical arrangement shift |
| `glowDistortion` | 0–100 | 40 | Organic shape deformation |

### Conic-Specific

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `conicStartAngle` | 0–360° | 0 | Gradient start angle |
| `conicSpiral` | 0–100 | 0 | Spiral effect intensity |
| `conicOffsetX` | -50–50 | 0 | Center offset X |
| `conicOffsetY` | -50–50 | 0 | Center offset Y |

### Waves-Specific

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `wavesCount` | 2–10 | 5 | Number of wave layers |
| `wavesAmplitude` | 0–100 | 50 | Wave height |
| `wavesAngle` | 0–360° | 0 | Wave direction |

### Banner-Specific

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `bannerBlackFade` | 15–50 | 30 | Left-side black fade % (hero-banner only) |

### Button-Specific

| Parameter | Description |
|-----------|-------------|
| `hoverColor1/2/3` | Hover state colors for button mode |
| `buttonPreviewState` | `default` / `hover` |

---

*Document generated: February 2026*
*Source of truth for shader math: `src/components/Custom4ColorGradient.tsx`*
