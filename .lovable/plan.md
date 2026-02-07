

# Fix Glow Regression + Remove Sharp Transitions in Water/Conic/Waves

## Three Issues to Fix

### Issue 1: Glow Mode Lost Its Look
**What happened**: Removing weight from orb intensity entirely means all orbs blast at equal full power (`glowIntensity = 3.0+`). With additive blending, where orbs overlap they sum above 1.0 and clip to white, washing everything out.

**Fix**: Add back a *soft* weight factor using `mix(0.5, 1.0, clamp(w * 3.0, 0.0, 1.0))`. This means:
- A 5% weight color still glows at ~57% intensity (vivid, not dim)
- A 25% weight color glows at ~100% intensity (full brightness)
- Colors stay bright regardless of weight, but there's enough modulation to prevent the blow-out when all orbs stack up

```text
Before (too aggressive):  orb1 *= w1 * glowIntensity     (5% weight = 5% brightness)
Bad fix (no modulation):  orb1 *= glowIntensity           (all orbs equal = white blow-out)
New fix (soft floor):     orb1 *= glowIntensity * mix(0.5, 1.0, clamp(w1*3.0, 0.0, 1.0))
                                                           (5% weight = ~57% brightness)
```

### Issue 2: Water/Conic/Waves Sharp "Amoeba" Transitions
**What happened**: The adaptive cap `minZone * 0.4` crushes transition width globally when ANY color has a small weight. Example with default weights (w3=5%):
```text
minZone = 0.05 (5%)
maxTrans = 0.05 * 0.4 = 0.02
transitionWidth: 0.10 --> capped to 0.02 (5x sharper!)
```
This makes ALL transitions sharp, not just the narrow one.

**Fix**: Remove the adaptive cap entirely. The original transition logic (`baseTrans + blurFactor * 0.20`) already produces smooth, liquid transitions. The sRGB conversion was the real needed fix for color accuracy -- the transition width was fine as-is.

### Issue 3: Mesh Mode -- Same Glow Fix Needed
The mesh mode has the same issue as glow: weight was fully removed from intensity. Apply the same soft floor approach so colors stay vivid but don't blow out when stacked.

---

## Changes in `src/components/Custom4ColorGradient.tsx`

### Change 1: Mesh Mode -- Soft Weight Floor (lines ~477-481)
Replace constant-intensity Gaussians with soft weight modulation:

```glsl
// Before (no weight modulation):
float g1 = exp(...) * glowBoost;

// After (soft floor -- stays bright even at low weight):
float wFactor1 = mix(0.5, 1.0, clamp(w1 * 3.0, 0.0, 1.0));
float g1 = exp(-d1 * d1 / (r1 * r1)) * glowBoost * wFactor1;
// Same for g2, g3, g4
```

### Change 2: Glow Mode -- Soft Weight Floor (lines ~561-567)
Same approach for orb intensity:

```glsl
// Before (no weight modulation):
orb1 *= glowIntensity;

// After:
orb1 *= glowIntensity * mix(0.5, 1.0, clamp(w1 * 3.0, 0.0, 1.0));
// Same for orb2, orb3, orb4
```

### Change 3: Water/Conic/Waves -- Remove Adaptive Cap (lines ~634-639)
Delete the 6 lines that implement the adaptive transition width cap:

```glsl
// DELETE these lines:
float minZone = min(w1, min(w2, w3));
if (uHasColor4) minZone = min(minZone, w4);
float maxTrans = minZone * 0.4;
transitionWidth = min(transitionWidth, max(maxTrans, 0.02));
```

The remaining transition logic stays as-is:
```glsl
float baseTrans = 0.10;
float transitionWidth = baseTrans + blurFactor * 0.20;
float strengthMod = 1.0 + strength * 0.15;
transitionWidth = transitionWidth / strengthMod;
transitionWidth = max(transitionWidth, 0.06);
// (adaptive cap removed -- transitions stay smooth)
```

---

## What Each Mode Will Look Like After

| Mode | Change | Result |
|------|--------|--------|
| Mesh | Soft weight floor on Gaussian intensity | Colors vivid at any weight, no blow-out |
| Glow | Soft weight floor on orb intensity | Restored delicate light-in-darkness balance |
| Water | Remove adaptive cap, keep sRGB | Smooth liquid transitions, accurate colors |
| Conic | Remove adaptive cap, keep sRGB | Smooth angular transitions, accurate colors |
| Waves | Remove adaptive cap, keep sRGB | Smooth wave transitions, accurate colors |
| Plane | No changes | Already working correctly |

## What Does NOT Change
- sRGB color conversion stays (color accuracy fix is preserved)
- No UI changes
- No new parameters
- Plane mode untouched
