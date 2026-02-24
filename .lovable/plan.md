

# Add Warp Control to All Effect Styles

## What This Does
The "Warp" slider currently only appears for Mesh/Aurora modes. This change adds it to **all** effect modes: Plane, Conic, Glow, and Waves. Warp creates organic, fluid distortions by feeding noise into the coordinate system (domain warping).

## Changes

### 1. Shader Updates (`src/components/Custom4ColorGradient.tsx`)

Add domain warping to each mode's shader branch:

- **Plane mode** (type 2): Apply warp to `offsetCenter` coordinates before computing linear/radial gradient. This will create organic distortions in the otherwise perfectly straight gradient lines.

- **Conic mode** (type 4): Apply warp to `offsetCenter` before computing the angle. This distorts the angular sweep into flowing, organic shapes.

- **Waves mode** (type 6): Apply warp to the wave coordinate calculation, creating irregularity in the wave patterns.

- **Glow mode** (type 5): Apply warp to orb center positions, making the light orbs shift and distort organically.

For each mode, the warp is applied as:
```text
warpOffset.x = snoise(vec3(uv * 0.7, time * 0.2))
warpOffset.y = snoise(vec3(uv * 0.7 + 5.2, time * 0.2))
warpedUv = uv + warpOffset * uWarpStrength * 0.08
```

When `meshWarpStrength = 0`, the warp has zero effect (no visual change from current behavior).

### 2. UI Updates (`src/components/ControlPanel.tsx`)

Add a "Warp" slider (identical to the one in Mesh Settings) to each effect section:
- **Plane Direction** section (after the Position controls)
- **Conic Settings** section (after the Center controls)
- **Glow Settings** section (after the Position controls)
- **Waves Settings** section (after the existing controls)

Each slider: min=0, max=3, step=0.1, controls `meshWarpStrength`.
