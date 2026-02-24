

# Fix Plane Mode: Mouse Drag + Scale Behavior

## Two Issues to Fix

### Issue 1: Mouse Drag Not Working
The pointer events are attached to the container `div`, but the `<Canvas>` element sits on top with `position: absolute` and intercepts all pointer events. The drag handlers never fire.

**Fix**: Add a transparent overlay `div` on top of the Canvas (with `z-index`) that captures pointer events for dragging. The Canvas itself should have `pointer-events: none` during drag-capable mode, or we add an invisible interaction layer above it.

### Issue 2: Scale Shrinks Colors Away Instead of Compressing Them
Currently, dividing by `scale` **zooms in** (expands the gradient), so when you reduce the slider to 30%, the gradient gets bigger and colors outside the viewport disappear. The user wants the **opposite**: shrinking the gradient so all colors are compressed into a smaller area that can be positioned anywhere.

**Fix**: Multiply by `(1/scale)` inverted -- actually, swap the logic: multiply `offsetCenter` by `scale` instead of dividing. When `planeScale = 30%` (0.3), the UV coordinates get compressed, making the full color range fit in ~30% of the canvas. The rest of the canvas shows the edge color (color0/black or the last color).

## Technical Changes

### File: `src/components/GradientCanvas.tsx`
- Add a transparent drag overlay `div` positioned above the Canvas with `z-index: 5`
- This overlay only renders in Plane mode and captures all pointer events
- Move `onPointerDown/Move/Up/Leave` from the container to this overlay

### File: `src/components/Custom4ColorGradient.tsx`
- Change line 246 from `/ scale` to `* (1.0 / scale)` with inverted meaning:
  - `planeScale = 100` (1.0) = full size (current default, no change)
  - `planeScale = 30` (0.3) = gradient compressed to 30% of canvas area
- The offset (`uPlaneOffset`) should be applied **before** scaling so the compressed gradient moves correctly

### File: `src/components/ControlPanel.tsx`
- No changes needed (slider already exists)

