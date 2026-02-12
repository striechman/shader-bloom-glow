

# Color Presets Redesign - Art Director Approach

## The Problem

Right now all 12 color presets are "flat" - they all have equal weights (30/25/25/20) except for 3 newer ones. They're also not organized by visual logic, and there's no consideration for how different effects render the same colors differently.

## Design Philosophy

As an art director would approach this: color combinations work differently depending on **contrast relationships**, **temperature harmony**, and **visual weight distribution**. The key insight is that a preset isn't just "which colors" - it's also "how much of each color" because weight balance dramatically changes the mood.

## Proposed Preset System

### 1. Reorganized Color Presets (Universal - work across all effects)

Group presets into 3 visual families, ordered from bold to subtle:

**Bold / High Contrast (dominant accent color)**
| Name | Color1 | Color2 | Color3 | Color4 | W0 | W1 | W2 | W3 | W4 | Logic |
|------|--------|--------|--------|--------|----|----|----|----|-----|-------|
| Royal | #6A00F4 (Violet) | #EC008C (Magenta) | #00C2FF (Blue) | - | 35 | 30 | 20 | 15 | 0 | Cool triad, violet leads |
| Neon | #EC008C (Magenta) | #00C2FF (Blue) | #6A00F4 (Violet) | - | 30 | 30 | 25 | 15 | 0 | Magenta punch, high energy |
| Golden | #FDB515 (Gold) | #6A00F4 (Violet) | #EC008C (Magenta) | - | 40 | 32 | 16 | 12 | 0 | Warm accent on dark, complementary contrast |

**Warm / Analogous (colors flow into each other)**
| Name | Color1 | Color2 | Color3 | Color4 | W0 | W1 | W2 | W3 | W4 | Logic |
|------|--------|--------|--------|--------|----|----|----|----|-----|-------|
| Sunset | #FDB515 (Gold) | #F2665F (Coral) | #EC008C (Magenta) | - | 30 | 28 | 24 | 18 | 0 | Warm analogous flow, gold to magenta |
| Ember | #F2665F (Coral) | #EC008C (Magenta) | #FDB515 (Gold) | #6A00F4 (Violet) | 35 | 25 | 20 | 12 | 8 | 4-color warmth with cool violet anchor |
| Coral | #F2665F (Coral) | #FDB515 (Gold) | #6A00F4 (Violet) | - | 35 | 30 | 22 | 13 | 0 | Coral dominant, warm-cool bridge |

**Cool / Atmospheric (depth and mystery)**
| Name | Color1 | Color2 | Color3 | Color4 | W0 | W1 | W2 | W3 | W4 | Logic |
|------|--------|--------|--------|--------|----|----|----|----|-----|-------|
| Ocean | #00C2FF (Blue) | #6A00F4 (Violet) | #EC008C (Magenta) | - | 40 | 28 | 20 | 12 | 0 | Deep cool with magenta accent |
| Dusk | #6A00F4 (Violet) | #EC008C (Magenta) | #F2665F (Coral) | - | 50 | 22 | 16 | 12 | 0 | Heavy dark, violet whisper |
| Electric | #00C2FF (Blue) | #EC008C (Magenta) | #FDB515 (Gold) | - | 30 | 28 | 24 | 18 | 0 | Full spectrum split-complementary |

### 2. Key Design Decisions

**Remove duplicates**: "Violet" and "Royal" are nearly identical (same 3 colors). "Warm" and "Sunset" are also too similar. Cut from 12 to 9 distinct presets.

**Remove "Blush"**: White as color3 is problematic - it washes out in light mode and looks odd in most effects. Not a good universal preset.

**Varying weights instead of flat 30/25/25/20**: Each preset gets curated weights that create a distinct mood. More base color (W0) = more cinematic depth. More accent = more energy. This is the #1 thing that makes presets feel "designed" vs "random".

**Color order matters**: Color1 should always be the **dominant accent** (gets the most weight after base). This ensures the preset thumbnail accurately represents the actual result.

### 3. Should Effects Have Separate Presets?

**No - keep presets universal.** Here's why:

- The current architecture already separates "effect params" from "colors" - when you switch effects, colors are preserved. This is the right pattern.
- Having per-effect presets would create a confusing UX (too many choices, preset meaning changes when switching effects).
- Instead, the **weight balance** already handles effect differences naturally: high-base presets (Dusk at 50%) look great on Waves/Glow, while balanced presets (Neon at 30%) shine on Mesh/Sphere.

**What we should do instead**: Add a small "recommended" indicator (a subtle star or dot) on 2-3 presets that work especially well with the currently selected effect. This guides without restricting.

### 4. Recommended Pairings (shown via subtle indicator)

| Effect | Best Presets | Why |
|--------|-------------|-----|
| Glow | Ember, Golden, Sunset | Warm colors create beautiful luminous orbs |
| Waves | Dusk, Ocean, Royal | High contrast with dark base makes wave layers pop |
| Mesh/Aurora | Ocean, Royal, Neon | Cool colors blend beautifully in organic noise |
| Plane | Golden, Sunset, Electric | Clean gradients benefit from clear color separation |
| Conic | Neon, Electric, Royal | Radial symmetry needs high-energy colors |
| Sphere | Any (most forgiving effect) | - |
| Water | Ocean, Dusk, Coral | Natural tones suit water movement |

## Technical Implementation

### Files to modify:
1. **`src/components/ControlPanel.tsx`**:
   - Replace the `colorPresets` array with 9 curated presets (organized bold/warm/cool)
   - Add a `recommendedFor` field to each preset (array of effect names)
   - Show a subtle sparkle/star icon on recommended presets based on current `config.type`
   - Update grid from `grid-cols-3` to accommodate 9 items cleanly (3x3 grid)

2. **`src/config/presets.ts`**:
   - Update built-in presets to match the new color/weight values for consistency
   - Remove presets that duplicate the new color presets

### UI Changes:
- 3x3 grid of preset swatches
- Each swatch shows the gradient preview with the preset name
- Recommended presets for current effect get a small star icon in the corner
- Optional: thin separator lines between the 3 groups (bold/warm/cool) or subtle group labels

