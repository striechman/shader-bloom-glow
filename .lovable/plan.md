
# Shader-Based Banners with Animation Toggle

## Summary

The current banner implementation uses simple CSS `linear-gradient` which doesn't match the rich visual effects available in the main gradient editor (Mesh, Plane, Water). This plan upgrades the banner generator to use the same WebGL shader effects with an option for static or animated output.

---

## Current vs. Target Comparison

| Feature | Current | Target |
|---------|---------|--------|
| Visual Style | Simple CSS gradient | Shader effects (Mesh/Plane/Water) |
| Animation | None | Toggle: Static or Animated |
| Export | Canvas 2D gradient | WebGL capture (like main export) |
| Preview | CSS div | Live WebGL canvas |

---

## Technical Architecture

```text
+-------------------------------------------+
|           BannerPreview Component         |
+-------------------------------------------+
|  Effect Type: [Mesh] [Plane] [Water]      |
|  Animation:   [Static] [Animated]         |
|                                           |
|  +-------------------------------------+  |
|  |   WebGL Canvas (ShaderGradient or   |  |
|  |   CustomMeshGradient component)     |  |
|  +-------------------------------------+  |
|                                           |
|  Hero Banner: Left 30% Black Overlay      |
|  (CSS overlay on top of shader)           |
|                                           |
|  [Export PNG] [Export Video] (if animated)|
+-------------------------------------------+
```

---

## Implementation Plan

### Phase 1: Extend BannerConfig Type

**File: `src/types/webAssets.ts`**

Add new properties to support shader-based rendering:

```typescript
export interface BannerConfig {
  type: 'hero' | 'small';
  width: number;
  height: number;
  blackFadePercentage: number;
  
  // NEW: Shader effect settings
  effectType: 'mesh' | 'plane' | 'water';
  animate: boolean;
  speed: number;
  
  // Colors (existing)
  gradientColors: string[];
  gradientWeights: number[];
  
  // NEW: Effect parameters (like main gradient)
  uStrength: number;
  uDensity: number;
  uFrequency: number;
  meshNoiseScale: number;
  meshBlur: number;
}
```

### Phase 2: Create Banner Canvas Component

**New File: `src/components/BannerCanvas.tsx`**

A reusable WebGL canvas component for banner preview and export:

- Accepts banner dimensions and effect configuration
- Renders ShaderGradient (Plane/Water) or CustomMeshGradient (Mesh)
- Supports static or animated mode
- For Hero banners: Applies a CSS overlay for the black-to-transparent fade on the left side

```text
Banner Canvas Structure:
+--------------------------------------------------+
|  Canvas (WebGL shader effect)                    |
+--------------------------------------------------+
|  [Black Fade Overlay - Hero only]                |
|  gradient: linear-gradient(                      |
|    to right,                                     |
|    rgba(0,0,0,1) 0%,                             |
|    rgba(0,0,0,1) 15%,                            |
|    rgba(0,0,0,0) 30%                             |
|  )                                               |
+--------------------------------------------------+
```

### Phase 3: Update BannerPreview Component

**File: `src/components/BannerPreview.tsx`**

Replace the CSS gradient preview with the new BannerCanvas:

1. Add effect type selector (Mesh / Plane / Water buttons)
2. Add animation toggle (Static / Animated switch)
3. Add speed slider (when animated)
4. Integrate BannerCanvas for live preview
5. Update export to capture WebGL canvas (using existing `captureVisibleWebGLCanvasToCanvas` logic from ExportModal)
6. Add video export option for animated banners

UI Layout:
```text
+-----------------------------------------------+
| [Hero Banner] [Small Banner]                   |
+-----------------------------------------------+
| Effect: [Mesh] [Plane] [Water]                 |
+-----------------------------------------------+
| [Live WebGL Preview]                           |
| +-------------------------------------------+ |
| |  Shader Effect with Black Fade (if Hero)  | |
| +-------------------------------------------+ |
+-----------------------------------------------+
| Animation: [Static] [Animated]                 |
| Speed: [====o====] 0.4                         |
+-----------------------------------------------+
| Width: [1280px]  Height: [400px]               |
| Black Fade: [30%] (Hero only)                  |
+-----------------------------------------------+
| Colors: [picker] [picker] [picker]             |
+-----------------------------------------------+
| [Export Image]  [Export Video] (if animated)   |
+-----------------------------------------------+
```

### Phase 4: Export Logic

**Image Export (Static/Animated):**
- Use WebGL `readPixels` to capture the current frame
- Apply black fade overlay in 2D canvas before export
- Same high-quality export as main ExportModal

**Video Export (Animated only):**
- Use MediaRecorder to capture canvas stream
- Include black fade overlay in the recording
- Export as MP4/WebM (similar to main export)

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/webAssets.ts` | Modify | Add effectType, animate, speed, shader params to BannerConfig |
| `src/components/BannerCanvas.tsx` | Create | WebGL canvas component for banner rendering |
| `src/components/BannerPreview.tsx` | Modify | Replace CSS preview with BannerCanvas, add controls |

---

## Hero Banner Black Fade Implementation

The black fade will be a CSS overlay on top of the WebGL canvas:

```typescript
// Overlay style for Hero banners
const blackFadeOverlay = {
  background: `linear-gradient(to right,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 1) ${blackFadePercentage * 0.5}%,
    rgba(0, 0, 0, 0) ${blackFadePercentage}%
  )`,
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
};
```

For export, this overlay will be composited onto the captured WebGL frame using 2D canvas drawing operations.

---

## Key Technical Details

### Shader Integration

The banner will reuse the existing shader components:

1. **Mesh Mode**: Uses `CustomMeshGradient` component (Simplex noise-based)
2. **Plane/Water Mode**: Uses `ShaderGradient` from @shadergradient/react

### Animation Control

```typescript
// In BannerCanvas
<ShaderGradient
  animate={config.animate ? 'on' : 'off'}
  uSpeed={config.animate ? config.speed : 0}
  uTime={config.animate ? undefined : 0}
  // ... other props
/>
```

### Export with Black Fade Compositing

```typescript
async function exportBannerWithBlackFade(
  sourceCanvas: HTMLCanvasElement,
  config: BannerConfig
): Promise<Blob> {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = config.width;
  tempCanvas.height = config.height;
  const ctx = tempCanvas.getContext('2d');
  
  // 1. Draw WebGL content
  await captureVisibleWebGLCanvasToCanvas(sourceCanvas, ctx, width, height);
  
  // 2. Draw black fade overlay for Hero banners
  if (config.type === 'hero') {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(blackFadePercentage * 0.5 / 100, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(blackFadePercentage / 100, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  
  // 3. Export as PNG
  return await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
}
```
