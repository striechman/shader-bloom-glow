
# Plan: Fix Color Preset Issues and Export Corner Artifact

## Summary
This plan addresses three issues:
1. Color presets not applying correctly to Sphere/Mesh gradients
2. Missing weight definitions in most color presets
3. Export corner artifact (cyan/blue spot in top-right)

---

## Technical Details

### Problem 1: Theme Effect Overriding Preset Colors

**Root Cause**: In `src/pages/Index.tsx`, a `useEffect` hook automatically updates `color3` based on the Dark/Light theme. This runs AFTER preset selection, overwriting the preset's color3 value.

**Current Code (Index.tsx lines 18-22)**:
```typescript
useEffect(() => {
  const newColor3 = theme === 'dark' ? '#000000' : '#FFFFFF';
  setConfig(prev => ({ ...prev, color3: newColor3 }));
}, [theme]);
```

**Solution**: Add a tracking flag to detect if user manually selected a preset, and only apply theme-based color3 when no preset is active or when theme changes without preset selection.

---

### Problem 2: Presets Missing Weight Values

**Root Cause**: Only Blush, Violet, and Salmon presets define `weight1/2/3`. When selecting Royal, Sunset, etc., the weights remain from previous state, causing inconsistent visuals.

**Current Preset Structure (ControlPanel.tsx)**:
```typescript
const colorPresets = [
  { name: 'Royal', color1: '#6A00F4', color2: '#EC008C', color3: '#000000' },
  // ... no weights defined
  { name: 'Blush', color1: '#EC008C', color2: '#000000', color3: '#FFFFFF', weight1: 45, weight2: 45, weight3: 10 },
];
```

**Solution**: Add default weights (33/34/33) to all presets without explicit weights, ensuring consistent behavior.

---

### Problem 3: Export Corner Artifact

**Root Cause**: The shader edge-fade logic prevents artifacts on-screen, but the export function captures raw WebGL pixels before the CSS overlays are composited. Additionally, the `captureVisibleWebGLCanvasToCanvas` function doesn't apply the same edge masking.

**Solution**: Add a post-processing step in `ExportModal.tsx` that applies an edge-fade mask to the captured image, blending corners into the background color (color3).

---

## Implementation Steps

### Step 1: Update Color Presets with Default Weights
**File**: `src/components/ControlPanel.tsx`

Add explicit weight values to all presets:
```typescript
const colorPresets = [
  { name: 'Royal', color1: '#6A00F4', color2: '#EC008C', color3: '#000000', weight1: 33, weight2: 34, weight3: 33 },
  { name: 'Sunset', color1: '#FDB515', color2: '#EC008C', color3: '#000000', weight1: 33, weight2: 34, weight3: 33 },
  { name: 'Ocean', color1: '#00C2FF', color2: '#6A00F4', color3: '#000000', weight1: 33, weight2: 34, weight3: 33 },
  { name: 'Coral', color1: '#F2665F', color2: '#6A00F4', color3: '#000000', weight1: 33, weight2: 34, weight3: 33 },
  { name: 'Neon', color1: '#EC008C', color2: '#00C2FF', color3: '#000000', weight1: 33, weight2: 34, weight3: 33 },
  { name: 'Electric', color1: '#00C2FF', color2: '#EC008C', color3: '#000000', weight1: 33, weight2: 34, weight3: 33 },
  { name: 'Blush', color1: '#EC008C', color2: '#000000', color3: '#FFFFFF', weight1: 45, weight2: 45, weight3: 10 },
  { name: 'Violet', color1: '#EC008C', color2: '#6A00F4', color3: '#FFFFFF', weight1: 45, weight2: 45, weight3: 10 },
  { name: 'Salmon', color1: '#F2665F', color2: '#000000', color3: '#FFFFFF', weight1: 45, weight2: 45, weight3: 10 },
];
```

### Step 2: Update Preset Click Handler
**File**: `src/components/ControlPanel.tsx`

Modify the preset button click to ALWAYS apply weights:
```typescript
onClick={() => onConfigChange({ 
  color1: preset.color1, 
  color2: preset.color2, 
  color3: preset.color3,
  colorWeight1: preset.weight1,
  colorWeight2: preset.weight2,
  colorWeight3: preset.weight3,
})}
```

### Step 3: Fix Theme Effect Not Overriding Presets
**File**: `src/pages/Index.tsx`

Remove the automatic color3 override based on theme. Instead, only apply theme default on initial load (not on preset selection):

```typescript
// Remove this useEffect entirely, or modify it to only run on mount
// and respect user's preset selections
```

### Step 4: Add Edge-Fade Mask to Export
**File**: `src/components/ExportModal.tsx`

After capturing WebGL pixels, apply an edge-fade mask using radial gradient that fades corners to color3:

```typescript
// After captureVisibleWebGLCanvasToCanvas call, add edge masking:
const edgeMaskCanvas = document.createElement('canvas');
edgeMaskCanvas.width = targetWidth;
edgeMaskCanvas.height = targetHeight;
const maskCtx = edgeMaskCanvas.getContext('2d');

if (maskCtx && config) {
  // Create edge fade mask - corners blend to color3
  const color3 = config.color3;
  const fadeSize = Math.min(targetWidth, targetHeight) * 0.15; // 15% fade zone
  
  // Draw corner fades
  maskCtx.fillStyle = color3;
  
  // Top-right corner
  const gradientTR = maskCtx.createRadialGradient(
    targetWidth, 0, 0,
    targetWidth, 0, fadeSize
  );
  gradientTR.addColorStop(0, color3);
  gradientTR.addColorStop(1, 'transparent');
  maskCtx.fillStyle = gradientTR;
  maskCtx.fillRect(targetWidth - fadeSize, 0, fadeSize, fadeSize);
  
  // Apply mask to main canvas
  ctx.drawImage(edgeMaskCanvas, 0, 0);
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ControlPanel.tsx` | Add weights to all presets, update click handler |
| `src/pages/Index.tsx` | Remove/modify theme-based color3 override |
| `src/components/ExportModal.tsx` | Add corner edge-fade mask after WebGL capture |

---

## Expected Results

1. **Preset Selection**: Clicking any preset (Royal, Sunset, etc.) will immediately apply all three colors AND the correct weight distribution
2. **Sphere/Mesh Consistency**: Both gradient types will correctly reflect the selected preset colors
3. **Export Quality**: Exported images will have smooth, artifact-free corners that blend into the background color

---

## Testing Checklist

- [ ] Select Royal preset, verify purple/magenta colors appear (no cyan/blue)
- [ ] Switch between Sphere and Mesh modes with same preset, verify colors match
- [ ] Export 1:1 and 16:9 images, verify no corner artifacts
- [ ] Select Blush/Violet presets, verify white accent (10%) appears correctly
- [ ] Toggle Dark/Light mode, verify presets still work after theme change
