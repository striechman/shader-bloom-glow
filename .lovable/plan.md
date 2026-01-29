
# Web Assets Generator - Banners & Button Gradients

## Overview
Adding a new section to generate web assets including Hero Banners, Small Banners, and Gradient Buttons with hover states.

---

## Feature 1: Banner Generator

### Banner Types

| Type | Width | Height | Special Requirements |
|------|-------|--------|---------------------|
| Hero Banner | Min 1280px | Auto (min 300px) | Left 30% must start black and blend into other colors |
| Small Banner | 600px | Auto (min 300px) | Standard gradient |

### Technical Approach

**New Component: `BannerGenerator.tsx`**
- Canvas-based rendering for precise control
- Separate preview panel with live gradient
- Export to PNG/JPG at specified dimensions

**Hero Banner Gradient Logic:**
```text
+------------------+---------------------------+
|   BLACK (30%)    |  Color Blend (70%)        |
|   Solid start    |  Gradient transition      |
+------------------+---------------------------+
     ^                    ^
   0-15%             15-30% blend zone    →    Full gradient
```

**CSS Gradient Pattern for Hero:**
```
linear-gradient(to right, 
  #000000 0%, 
  #000000 15%, 
  [blend zone 15-30%], 
  color1 30%, 
  color2 65%, 
  color3 100%
)
```

---

## Feature 2: Gradient Buttons

### Button Specifications
- Shape: Rectangular with slightly rounded corners (8px border-radius)
- Default State: Primary gradient
- Hover/Active State: Secondary gradient (different colors or direction)

### User Controls
- Select colors for default gradient (2-3 colors)
- Select colors for hover gradient (2-3 colors)  
- Gradient direction (horizontal, diagonal, radial)
- Border radius adjustment (4-16px)
- Button size presets (Small, Medium, Large)

### Export Options
- CSS code for button styles
- Preview component with live interaction
- Copy-paste ready code

---

## Implementation Plan

### Phase 1: Data Structures

**File: `src/types/gradient.ts`**

Add new types:
```text
BannerConfig {
  type: 'hero' | 'small'
  width: number
  height: number
  blackFadePercentage: number (for hero)
  gradientColors: string[]
  gradientWeights: number[]
}

ButtonGradientConfig {
  defaultGradient: {
    colors: string[]
    direction: 'horizontal' | 'vertical' | 'diagonal' | 'radial'
  }
  hoverGradient: {
    colors: string[]
    direction: 'horizontal' | 'vertical' | 'diagonal' | 'radial'
  }
  borderRadius: number
  size: 'sm' | 'md' | 'lg'
}
```

### Phase 2: New Components

**1. `src/components/WebAssetsPanel.tsx`** - Main container with tabs
   - Tab: Banners
   - Tab: Buttons
   
**2. `src/components/BannerPreview.tsx`** - Live banner preview
   - Canvas rendering with black-to-gradient fade
   - Dimension controls
   - Export button

**3. `src/components/ButtonPreview.tsx`** - Interactive button preview
   - Live default/hover state demo
   - CSS code generation
   - Copy button

### Phase 3: UI Integration

**Option A: New Page Route**
- Add `/web-assets` route
- Accessible from main navigation

**Option B: Expandable Section in Control Panel** (Recommended)
- Add new accordion section in existing ControlPanel
- Keeps everything in one place
- Can still use current gradient colors

### Phase 4: Export Modal Updates

**File: `src/components/ExportModal.tsx`**

Add new tabs:
- "Banner" tab - export generated banners
- "Button CSS" tab - copy button gradient CSS

---

## UI Wireframe

```text
+------------------------------------------+
|  Settings Panel                     [X]  |
+------------------------------------------+
|  [Shape] [Colors] [Animation] [Effects]  |
|                                          |
|  ▼ Web Assets (NEW)                      |
|  +--------------------------------------+|
|  |  [Banners]  [Buttons]               ||
|  |                                      ||
|  |  Banner Type:  ○ Hero  ○ Small      ||
|  |                                      ||
|  |  +----------------------------+     ||
|  |  |  [PREVIEW]                 |     ||
|  |  |  Black fade → Gradient     |     ||
|  |  +----------------------------+     ||
|  |                                      ||
|  |  Width: [1280] px                   ||
|  |  Height: [300] px (min)             ||
|  |                                      ||
|  |  [Export Banner]                    ||
|  +--------------------------------------+|
+------------------------------------------+
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/gradient.ts` | Modify | Add BannerConfig, ButtonGradientConfig types |
| `src/types/webAssets.ts` | Create | New types file for web assets |
| `src/components/WebAssetsPanel.tsx` | Create | Main panel with tabs |
| `src/components/BannerPreview.tsx` | Create | Banner preview and generation |
| `src/components/ButtonPreview.tsx` | Create | Button preview with hover demo |
| `src/components/ControlPanel.tsx` | Modify | Add Web Assets accordion section |
| `src/components/ExportModal.tsx` | Modify | Add banner/button export tabs |

---

## Technical Details

### Hero Banner Black Fade Algorithm

```typescript
function generateHeroBannerGradient(
  colors: string[], 
  blackPercentage: number = 30
): string {
  const fadeStart = blackPercentage * 0.5;  // 15%
  const fadeEnd = blackPercentage;           // 30%
  
  return `linear-gradient(to right,
    #000000 0%,
    #000000 ${fadeStart}%,
    ${colors[0]} ${fadeEnd}%,
    ${colors[1] || colors[0]} ${50 + fadeEnd/2}%,
    ${colors[2] || colors[1] || colors[0]} 100%
  )`;
}
```

### Button CSS Generation

```typescript
function generateButtonCSS(config: ButtonGradientConfig): string {
  const sizeMap = { sm: '8px 16px', md: '12px 24px', lg: '16px 32px' };
  const dirMap = { 
    horizontal: '90deg', 
    vertical: '180deg', 
    diagonal: '135deg',
    radial: 'radial-gradient'
  };
  
  return `
.gradient-button {
  padding: ${sizeMap[config.size]};
  border-radius: ${config.borderRadius}px;
  border: none;
  background: linear-gradient(
    ${dirMap[config.defaultGradient.direction]},
    ${config.defaultGradient.colors.join(', ')}
  );
  transition: all 0.3s ease;
}

.gradient-button:hover,
.gradient-button:active {
  background: linear-gradient(
    ${dirMap[config.hoverGradient.direction]},
    ${config.hoverGradient.colors.join(', ')}
  );
}`;
}
```

### Banner Canvas Export

The banner export will use a similar approach to the existing `renderGradientToCanvas` function in ExportModal, but with the special left-to-right black fade logic for Hero banners.

---

## Brand Colors Integration

Using the existing brand color palette:
- Yellow Orange (#FDB515)
- Coral (#F25665)
- Magenta (#E71989)
- Deep Violet (#6A00F4)
- Electric Blue (#00C2FF)
- Black (#000000)
- White (#FFFFFF)

The banner and button generators will use the same color picker component from the Control Panel for consistency.
