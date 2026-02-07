

# Fix Color Accuracy and Weight-to-Area Mapping Across All Effects

## Two Problems Identified

### Problem 1: Color Accuracy (Same issue fixed in Glow/Mesh, but still exists in Water, Conic, Waves)
Water, Conic, and Waves modes blend colors using linear RGB values (auto-converted by THREE.js), which shifts hues. Mesh and Glow modes already fix this by converting to sRGB before blending — but the other modes don't.

### Problem 2: Increasing Black Weight Dims Colors Instead of Shrinking Their Area
When the base color (Color 0 / black) weight goes up from 30% to 70%, colors should stay **equally bright** but occupy **less area**. Currently, they get dimmer AND smaller.

**In Mesh mode** (Radial Glow):
```text
Current:  g1 = exp(-d²/r²) * w1 * glowBoost
                              ^^
                     weight multiplies INTENSITY
                     
When w1 drops from 25% to 10%:
  - Radius shrinks (correct: less area)  
  - Intensity drops to 40% (wrong: colors dim)
```

**In Glow mode** (Additive Light):
```text
Current:  orb1 *= w1 * glowIntensity
                  ^^
          Same problem: weight dims the light source
```

**In threshold modes** (Water, Conic, Waves):
```text
Current:  transitionWidth = 0.10 (fixed)
          Color zone width when w0=70%: only ~0.107

          Transition zone nearly covers the entire color band!
          Color never reaches full saturation.
```

---

## The Fix

### File: `src/components/Custom4ColorGradient.tsx`

#### Change 1: Mesh Mode — Weight Controls Area, Not Brightness
Remove weight from the glow intensity multiplier. Weight already controls the radius (area). Intensity at the center of each blob stays constant regardless of weight.

```text
Before: g1 = exp(-d²/r²) * w1 * glowBoost    (double counting w1)
After:  g1 = exp(-d²/r²) * glowBoost          (w1 only in radius r1)
```

The `darkBase = w0 * boost` in the normalization naturally fills more area when w0 increases, pushing color blobs into smaller zones while keeping them vivid.

#### Change 2: Glow Mode — Same Fix
Weight controls orb size (Gaussian spread radius), not intensity. The light stays bright at its center, just covers less area.

```text
Before: orb1 *= w1 * glowIntensity
After:  orb1 *= glowIntensity   (w1 already controls orb radius)
```

#### Change 3: Threshold Modes (Water, Conic, Waves) — Adaptive Transition Width
Cap the transition width so it never exceeds a fraction of the narrowest color zone. This ensures that even when color zones are compressed (high w0), each color reaches full saturation at its center.

```text
Before: transitionWidth = baseTrans + blurFactor * 0.20  (fixed)
After:  
  minZone = min(w1, w2, w3)         // narrowest color zone
  maxTrans = minZone * 0.4          // never exceed 40% of narrowest zone
  transitionWidth = min(calculated, maxTrans)
```

#### Change 4: sRGB Conversion for Water, Conic, Waves
Same fix already applied to Mesh and Glow — convert `uColor*` to sRGB before blending so colors match their hex values. Skip the final `linearToSrgb()` for these modes since they'll already be in sRGB.

```text
// At start of each mode block:
vec3 sColor0 = linearToSrgb(uColor0);
vec3 sColor1 = linearToSrgb(uColor1);
// ... blend with sColor* instead of uColor*

// Skip linearToSrgb at line 642 for these modes too
```

---

## What Changes

| Mode | Color Fix | Weight Fix |
|------|-----------|------------|
| Mesh | Already done | Remove w1 from intensity |
| Glow | Already done | Remove w1 from intensity |
| Plane | Already correct (linear blend is fine for monotonic) | Already correct (thresholds work well) |
| Water | Add sRGB conversion | Cap transition width |
| Conic | Add sRGB conversion | Cap transition width |
| Waves | Add sRGB conversion | Cap transition width |

## What Does NOT Change
- Plane mode stays as-is (monotonic gradient, linear blend works correctly)
- No UI changes needed
- No new controls or parameters
- Preset configs remain the same

## Expected Result
- Colors stay vivid at any weight percentage
- Increasing black weight = more dark area, colors shrink but stay bright
- All effects show accurate hex colors (salmon looks salmon, purple looks purple)

