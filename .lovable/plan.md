

# Fix Color Accuracy in Mesh Mode - Color Space Correction

## The Problem
Colors don't match their hex values: Salmon (#F2665F) appears as deep red, Purple (#6A00F4) appears as blue. The gradient looks shifted away from the intended brand colors.

## Root Cause: THREE.Color Automatic Conversion

Since Three.js r152+, `THREE.ColorManagement.enabled` defaults to `true`. This means:

```text
User picks #6A00F4 (purple in sRGB)
        |
        v
THREE.Color.set('#6A00F4')
        |
        v
Automatic sRGB -> Linear conversion
Stored as: (0.158, 0.0, 0.914)    <-- NOT (0.416, 0.0, 0.957)
        |                               Red channel crushed!
        v
Shader receives LINEAR values
        |
        v
Mesh mode SKIPS linearToSrgb (line 559)
        |
        v
Linear values output directly to screen
        |
        v
Purple looks BLUE (red channel too dark)
Salmon looks RED (green/blue channels too dark)
```

The shader comment says "Mesh mode blends in sRGB" -- but the input colors are actually LINEAR (due to Three.js auto-conversion). So the shader has been blending linear values while thinking they're sRGB.

Non-mesh modes work correctly because they apply `linearToSrgb()` at the end (line 559), which converts the linear result back to sRGB for display.

## The Fix

Convert uniform colors from Linear back to sRGB at the start of the mesh block, then blend in true sRGB space. This is a small, surgical fix.

### File: `src/components/Custom4ColorGradient.tsx`

**Change 1: Add sRGB conversion at start of mesh block (around line 398)**

After the existing mesh mode comment block, add color conversion:

```glsl
// Convert from Linear (THREE.Color auto-converts) back to sRGB for perceptual blending
vec3 sColor0 = linearToSrgb(uColor0);
vec3 sColor1 = linearToSrgb(uColor1);
vec3 sColor2 = linearToSrgb(uColor2);
vec3 sColor3 = linearToSrgb(uColor3);
vec3 sColor4 = linearToSrgb(uColor4);
```

**Change 2: Use sColor* instead of uColor* in the mesh blend (line 504)**

Replace:
```glsl
finalColor = uColor0 * a0 + uColor1 * a1 + uColor2 * a2 + uColor3 * a3;
if (uHasColor4) {
  finalColor += uColor4 * a4;
}
finalColor = mix(uColor0, finalColor, edgeFade);
```

With:
```glsl
finalColor = sColor0 * a0 + sColor1 * a1 + sColor2 * a2 + sColor3 * a3;
if (uHasColor4) {
  finalColor += sColor4 * a4;
}
finalColor = mix(sColor0, finalColor, edgeFade);
```

**Change 3: Keep line 559 as-is** -- mesh mode already outputs sRGB after this fix, so skipping the final `linearToSrgb` is correct.

## Why This Works

```text
After fix:
                                     
THREE.Color.set('#6A00F4')           
  -> Linear: (0.158, 0.0, 0.914)    
  -> Shader receives LINEAR          
  -> linearToSrgb() at start of mesh 
  -> sRGB: (0.416, 0.0, 0.957)      <- Original hex values restored!
  -> Blend in sRGB space             
  -> Output sRGB directly            
  -> Screen shows correct purple     
```

## What This Does NOT Change
- Other modes (Plane, Water, Conic, Spiral, Waves) are completely unaffected -- they already handle the conversion at line 559
- The Radial Glow blending model stays exactly the same
- Gaussian positions, softness, distortion -- all unchanged
- Only the COLOR VALUES fed into the final blend are corrected

## Expected Result
- Salmon (#F2665F) will look like warm coral/salmon, not deep red
- Purple (#6A00F4) will look like violet/purple, not blue
- Yellow (#FDB515) will look like golden yellow, not orange
- Black (#000000) stays black (linear and sRGB are identical for 0.0)

