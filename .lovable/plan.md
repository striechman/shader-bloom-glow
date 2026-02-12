

# Control Panel UX Redesign - Visual Hierarchy and Grouping

## The Problem

The current panel has 12+ sections of sliders that all look identical - same label, same slider bar, same spacing. This creates "slider fatigue" where everything blends together and feels overwhelming. Additionally, the global Rotation control is placed far from the effect-specific controls, and effect controls are scattered across multiple separate sections.

## Current Section Order (top to bottom)

1. Header + Theme toggle
2. Shape (effect grid)
3. Aspect Ratio
4. Mesh controls (conditional)
5. Colors (presets + pickers + weights)
6. Plane Direction (conditional)
7. Conic controls (conditional)
8. Glow controls (conditional)
9. Waves controls (conditional)
10. Animation (play/pause, timeline, speed)
11. Position / Rotation
12. Effects (grain, strength, density, frequency)

**Issues:**
- Rotation is at position 11, far from the effect-specific controls at positions 4-9
- Effect-specific controls (Plane/Conic/Glow/Waves) appear AFTER Colors, breaking the logical flow of "pick shape -> adjust shape -> pick colors"
- All sliders look identical - no visual differentiation between primary controls and fine-tuning

## Proposed New Layout

Reorganize into **4 clear groups** with visual separators and collapsible sections:

```text
+----------------------------------+
| Settings                    [X]  |
| [Dark/Light toggle]             |
+==================================+
| 1. SHAPE & STYLE                 |
|    [Shape grid: 8 buttons]       |
|    --- Effect Controls ---       |  <-- Contextual (Glow/Plane/etc)
|    [Rotation slider + presets]   |  <-- Moved here! Global position
+----------------------------------+
| 2. COLORS                        |
|    [9 preset swatches]           |
|    [Save/My presets]             |
|    [Base weight + Text Safe]     |
|    [Color 1-4 pickers+weights]   |
+----------------------------------+
| 3. ANIMATION                     |
|    [Play/Pause/Capture]          |
|    [Timeline + Speed]            |
+----------------------------------+
| 4. FINE TUNE                     |  <-- Collapsible, closed by default
|    [Grain toggle + intensity]    |
|    [Strength / Density / Freq]   |
|    [Aspect Ratio]                |  <-- Moved here (less used)
+----------------------------------+
```

## Key Changes

### 1. Move Rotation into "Shape & Style" section
The rotation slider and quick-presets move directly below the effect-specific controls (Glow settings, Plane direction, etc.) so all spatial/shape controls are together.

### 2. Move effect-specific controls right after Shape selection
Currently Mesh/Glow/Plane/Conic/Waves controls appear after Colors. Move them to immediately follow the Shape grid so the flow is: pick effect -> tweak effect -> pick colors.

### 3. Visual differentiation between sections
Add thin separator lines (`border-t border-border/50`) between the 4 main groups. Each group gets a slightly different background treatment:
- Sections use a subtle `bg-secondary/20` background with rounded corners
- Group headers are slightly larger and bolder

### 4. Collapse "Fine Tune" by default
Strength, Density, Frequency, and Aspect Ratio are advanced controls most users rarely touch. Wrap them in a collapsible section (using the existing Collapsible component) that's closed by default. This dramatically reduces visual clutter on first open.

### 5. Compact effect controls with grouped sliders
For effect sections with many sliders (Glow has 5 sliders), reduce vertical spacing from `space-y-4` to `space-y-3` and remove helper text (`<p>` descriptions) for sliders where the label is self-explanatory (e.g., "Orb Size" doesn't need "Size of light orbs" underneath).

## Technical Implementation

### File: `src/components/ControlPanel.tsx`

**Section reordering** (inside the main `div.space-y-6`):

1. Header + Theme toggle (unchanged)
2. **Shape & Style group**:
   - Shape grid (lines 546-581, unchanged)
   - Effect-specific controls moved here: Mesh (634-731), Plane (996-1125), Conic (1127-1207), Glow (1210-1349), Waves (1351-1429)
   - Rotation control moved here (currently at lines 1509-1547)
3. **Colors group** (lines 734-993, unchanged content)
4. **Animation group** (lines 1432-1507, unchanged content)
5. **Fine Tune group** (collapsible):
   - Wrap Aspect Ratio (moved from position 3) + Effects section (grain, strength, density, frequency) in a `Collapsible` component
   - Default state: closed

**Visual separator** between groups:
```tsx
<div className="border-t border-border/30 pt-4">
```

**Collapsible Fine Tune section:**
```tsx
<Collapsible>
  <CollapsibleTrigger className="flex items-center justify-between w-full ...">
    <h3>Fine Tune</h3>
    <ChevronDown />
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* Aspect Ratio + Grain + Strength + Density + Frequency */}
  </CollapsibleContent>
</Collapsible>
```

**Reduce helper text** - remove `<p>` descriptions from:
- Glow: "How far apart the light orbs are", "Organic wobble on orb shapes"
- Mesh: "Lower = larger color areas...", "Softness of transitions..."
- Plane: "Low = sharp edges, High = soft blend"
- Waves: "Wave height intensity"
- Keep only the Text Safe description (important for understanding)

**Compact spacing** for effect sections: change `space-y-4` to `space-y-3` in effect control containers.

### Summary of moves:
- Rotation: from section 11 to inside section 2 (after effect controls)
- Effect controls (Mesh/Plane/Conic/Glow/Waves): from sections 4,6,7,8,9 to inside section 2
- Aspect Ratio: from section 3 to inside collapsible "Fine Tune"
- Fine Tune (grain, strength, density, freq): wrapped in collapsible, closed by default

