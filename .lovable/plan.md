

## Analysis of the Reference Gradient

The image shows a stunning gradient with these key visual characteristics:

1. **Color Palette** (analogous warm spectrum): Deep amber/gold (#E8920D) -> Coral/orange (#F06030) -> Hot pink/magenta (#EC008C) -- all adjacent on the color wheel for buttery smooth transitions
2. **Heavy black dominance** (~55-60% of the canvas) concentrated on the left side
3. **Colors clustered to the right** -- creating a dramatic "light source from the right" effect with 3D depth
4. **Extremely smooth, luminous transitions** -- no hard edges, colors melt into each other and into the black
5. **Subtle warm reflection on the "floor"** -- the bottom area has a faint warm glow suggesting environmental lighting

## Implementation Plan

### 1. Add a new color preset: "Warm Spotlight" (or "זרקור חם")

A new built-in preset in `src/config/presets.ts` that captures this exact look:

- **Effect type**: `glow` (Luminous Glow) -- best matches the "light source" feel
- **Colors**: 
  - Color0: #000000 (black base)
  - Color1: #E8920D (warm amber/gold)
  - Color2: #F06030 (coral orange)  
  - Color3: #EC008C (hot pink/magenta)
- **Weights**: Color0 at 55%, remaining 45% split among the warm colors
- **Glow settings**: 
  - Clustered style with offset shifted to the right (glowOffsetX: -0.15)
  - Large orb size for smooth blending
  - High spread for that melting feel
  - Moderate distortion for organic shapes
- **Grain**: enabled at 5%
- **Animation**: slow or frozen at a good frame

### 2. Register the preset

Add it to the `ALL_PRESETS` array and ensure it appears in the preset selector.

### Technical Details

**File changes:**

1. **`src/config/presets.ts`** -- Add `PRESET_WARM_SPOTLIGHT` with the tuned parameters, and add it to the exports/array
2. No shader changes needed -- the existing Glow engine can reproduce this look with the right parameter combination

The key insight from this gradient style is the **analogous warm color harmony** (gold -> orange -> pink) combined with **asymmetric positioning** (colors shifted to one side) and **heavy black dominance**. This creates that premium 3D product-photography lighting feel.

