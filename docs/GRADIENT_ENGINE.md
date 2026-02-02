# 🎨 Amdocs Ambiance Studio - Gradient Engine Documentation

> **Last Updated:** February 2026  
> **Engine Version:** 2.0 (with Bayer Dithering & Built-in Presets)

---

## 📋 Table of Contents

1. [Overview](#סקירה-כללית)
2. [Architecture](#ארכיטקטורה)
3. [Color System](#מערכת-הצבעים)
4. [Mesh Shader](#שיידר-glsl---מצב-mesh)
5. [Plane Shader](#שיידר-glsl---מצב-plane)
6. [Dithering (Banding Prevention)](#dithering-מניעת-פסים)
7. [Built-in Presets](#presets-מובנים)
8. [Export System](#ייצוא-export)
9. [Performance](#ביצועים)

---


## סקירה כללית

מנוע הגרדיינטים של Amdocs Ambiance Studio בנוי על בסיס WebGL ו-Three.js, עם שיידרים מותאמים אישית (Custom GLSL Shaders) לשליטה מלאה על מיזוג צבעים, אנימציה ואפקטים ויזואליים.

---

## 🏗️ ארכיטקטורה

### מסלולי רינדור

המערכת תומכת בשני מסלולי רינדור עיקריים:

```
┌─────────────────────────────────────────────────────────────┐
│                    GradientCanvas.tsx                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   ShaderGradient    │    │   Custom 4-Color Gradient   │ │
│  │   (ספריית צד ג')    │    │   (שיידר מותאם אישית)       │ │
│  ├─────────────────────┤    ├─────────────────────────────┤ │
│  │ • Sphere mode       │    │ • Plane mode                │ │
│  │ • 3 צבעים בלבד      │    │ • Mesh mode                 │ │
│  │                     │    │ • Water mode                │ │
│  │                     │    │ • Conic/Spiral/Waves        │ │
│  │                     │    │ • 5 צבעים (Color 0-4)       │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 מערכת הצבעים

### היררכיית צבעים (5 צבעים)

| צבע | תפקיד | משקל ברירת מחדל | הערות |
|-----|-------|-----------------|-------|
| Color 0 | צבע בסיס (Theme) | 30% (מינימום) | שחור ב-Dark Mode, לבן ב-Light Mode |
| Color 1 | צבע מותג ראשי | 25% | ניתן לעריכה |
| Color 2 | צבע מותג משני | 25% | ניתן לעריכה |
| Color 3 | צבע מותג שלישי | 20% | ניתן לעריכה |
| Color 4 | צבע אופציונלי | 0% | מופעל ידנית |

### צבעי מותג Amdocs

```typescript
// src/types/gradient.ts - Brand Colors
const AMDOCS_BRAND_COLORS = {
  magenta: '#EC008C',
  violet: '#6A00F4',
  blue: '#00C2FF',
  coral: '#F2665F',
  yellow: '#FDB515',
};
```

### אלגוריתם חלוקת משקלים

כאשר משקל Color 0 משתנה, הצבעים האחרים מתחלקים פרופורציונלית:

```typescript
// חישוב משקלים - מקובץ ControlPanel.tsx
const remainingWeight = 100 - baseWeight; // מה שנותר לצבעי המותג
const totalBrandWeights = colorWeight1 + colorWeight2 + colorWeight3 + colorWeight4;

// חלוקה פרופורציונלית
newWeight1 = Math.round((colorWeight1 / totalBrandWeights) * remainingWeight);
newWeight2 = Math.round((colorWeight2 / totalBrandWeights) * remainingWeight);
// ... וכו'
```

---

## 🔧 שיידר GLSL - מצב Mesh

### קובץ: `src/components/CustomMeshGradient.tsx`

### Simplex Noise 3D

השיידר משתמש ב-Simplex Noise לייצור פטרנים אורגניים:

```glsl
// פונקציות עזר לרעש
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  // Stefan Gustavson's Simplex Noise implementation
  // מחזיר ערכים בין -1 ל-1
  // ...
}
```

### Vertex Shader

```glsl
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

### Fragment Shader - Uniforms

```glsl
// צבעים (במרחב Linear RGB)
uniform vec3 uColor0;  // צבע בסיס
uniform vec3 uColor1;  // צבע מותג 1
uniform vec3 uColor2;  // צבע מותג 2
uniform vec3 uColor3;  // צבע מותג 3
uniform vec3 uColor4;  // צבע אופציונלי

// משקלים (0-100)
uniform float uWeight0;
uniform float uWeight1;
uniform float uWeight2;
uniform float uWeight3;
uniform float uWeight4;

// מצב Color4
uniform bool uHasColor4;

// זמן ואנימציה
uniform float uTime;

// פרמטרי רעש
uniform float uNoiseScale;   // גודל הכתמים (1-10)
uniform float uBlur;         // רכות המעברים (0-1)
uniform float uStrength;     // חדות קצוות
uniform float uDensity;      // צפיפות רעש
uniform float uFrequency;    // תדירות רעש

// גריין
uniform float uGrain;

// סגנון Mesh
uniform int uMeshStyle;        // 0=organic, 1=flow, 2=center
uniform float uMeshFlowAngle;  // זווית ב-radians
uniform bool uMeshCenterInward;
```

### המרת מרחב צבעים (Gamma Correction)

```glsl
// sRGB → Linear RGB (פענוח גאמה)
vec3 srgbToLinear(vec3 srgb) {
  vec3 low = srgb / 12.92;
  vec3 high = pow((srgb + 0.055) / 1.055, vec3(2.4));
  return mix(low, high, step(0.04045, srgb));
}

// Linear RGB → sRGB (קידוד גאמה)
vec3 linearToSrgb(vec3 linear) {
  vec3 low = linear * 12.92;
  vec3 high = 1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(0.0031308, linear));
}
```

**למה זה חשוב?**
- מסכים מציגים צבעים במרחב sRGB
- ערבוב צבעים נכון מתבצע במרחב Linear
- ללא התיקון, צבעים יראו "דהויים" או עם גוון שגוי

### לוגיקת רעש Multi-Octave

```glsl
void main() {
  // יצירת רעש בסיסי
  vec3 noisePos = vec3(vUv * uNoiseScale * freq, uTime * 0.5);
  
  // 3 שכבות רעש בתדרים שונים (Multi-octave)
  float n1 = snoise(noisePos) * 0.5 + 0.5;           // שכבה ראשית
  float n2 = snoise(noisePos * 2.0 + 100.0) * 0.20;  // פרטים בינוניים
  float n3 = snoise(noisePos * 4.0 + 200.0) * 0.10;  // פרטים דקים
  
  float baseNoise = (n1 + n2 + n3) / 1.375; // נורמליזציה ל-0-1
}
```

### סגנונות Mesh

```glsl
// ORGANIC (ברירת מחדל)
// משתמש ברעש הבסיסי כפי שהוא

// FLOW - רעש מוטה לפי כיוון
if (uMeshStyle == 1) {
  vec2 flowDir = vec2(cos(uMeshFlowAngle), sin(uMeshFlowAngle));
  float directionalBias = dot(centeredUv, flowDir) * 0.5 + 0.5;
  noise = baseNoise * 0.6 + directionalBias * 0.4;
}

// CENTER - רעש מוטה לפי מרחק מהמרכז
else if (uMeshStyle == 2) {
  float dist = length(centeredUv) * 1.4;
  if (!uMeshCenterInward) dist = 1.0 - dist;
  noise = baseNoise * 0.5 + dist * 0.5;
}
```

### מתיחת היסטוגרמה (Histogram Equalization)

רעש Simplex מתקבץ טבעית סביב 0.5. כדי שמשקלי הצבעים יתאימו לשטח הנראה:

```glsl
// מתיחה באמצעות S-curve
float centered = noise - 0.5;
float stretched = sign(centered) * pow(abs(centered) * 2.0, 0.7) * 0.5;
noise = stretched + 0.5;
noise = clamp(noise, 0.0, 1.0);
```

### חישוב Thresholds

```glsl
// המרת משקלים ל-thresholds מצטברים
float w0 = uWeight0 / 100.0;
float w1 = uWeight1 / 100.0;
float w2 = uWeight2 / 100.0;
float w3 = uWeight3 / 100.0;

float threshold0 = w0;                    // 0.30
float threshold1 = w0 + w1;               // 0.55
float threshold2 = w0 + w1 + w2;          // 0.80
float threshold3 = w0 + w1 + w2 + w3;     // 1.00
```

### מעברים חלקים (Smooth Transitions)

```glsl
// רוחב מעבר מבוסס Blur
float baseTransitionWidth = 0.12;
float transitionWidth = baseTransitionWidth + blurFactor * 0.25;

// מעבר ראשון - א-סימטרי (Color0 סולידי עד ל-threshold)
float blend01 = smoothstep(
  threshold0 - transitionWidth * 0.5,
  threshold0 + transitionWidth * 1.5,
  noise
);

// מעברים נוספים - ממורכזים על ה-threshold
float blend12 = smoothstep(threshold1 - transitionWidth, threshold1 + transitionWidth, noise);
float blend23 = smoothstep(threshold2 - transitionWidth, threshold2 + transitionWidth, noise);
float blend34 = smoothstep(threshold3 - transitionWidth, threshold3 + transitionWidth, noise);

// חדות מעברים (Strength) - השפעה עדינה
float strengthExp = 1.0 + strength * 0.4;
blend01 = pow(clamp(blend01, 0.0, 1.0), strengthExp);
// ... וכו' לשאר המעברים
```

### מיזוג צבעים (Progressive Mix)

```glsl
// מתחילים מצבע הבסיס
vec3 finalColor = uColor0;

// מערבבים פרוגרסיבית
finalColor = mix(finalColor, uColor1, blend01);
finalColor = mix(finalColor, uColor2, blend12);
finalColor = mix(finalColor, uColor3, blend23);

// Color4 אופציונלי
if (uHasColor4) {
  finalColor = mix(finalColor, uColor4, blend34);
}

// המרה חזרה ל-sRGB לתצוגה
finalColor = linearToSrgb(finalColor);

gl_FragColor = vec4(finalColor, 1.0);
```

### אפקט גריין (Film Grain)

```glsl
if (uGrain > 0.0) {
  float g = snoise(vec3(vUv * 220.0, uTime * 0.7));
  float grainAmt = (g * 0.5 + 0.5 - 0.5) * (uGrain * 0.18);
  gl_FragColor.rgb = clamp(gl_FragColor.rgb + grainAmt, 0.0, 1.0);
}
```

---

## 🎯 Dithering (מניעת פסים)

### הבעיה: Banding

בגרדיינטים כהים (במיוחד ב-Dark Mode), המסך מתקשה להציג מעברי צבע עדינים ונוצרים "פסים" (Banding). זה קורה כי יש רק 256 ערכים אפשריים לכל ערוץ צבע (8-bit).

### הפתרון: 8x8 Bayer Ordered Dithering

המנוע משתמש ב-Bayer Dithering - טכניקה שמוסיפה רעש מבוקר (לא אקראי) כדי "לשבור" את הפסים:

```glsl
// פונקציית Bayer Dithering
float bayer8x8(vec2 coord) {
  int x = int(mod(coord.x, 8.0));
  int y = int(mod(coord.y, 8.0));
  
  // מטריצת Bayer 8x8 (ערכים 0-63)
  int bayer[64] = int[64](
     0, 32,  8, 40,  2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44,  4, 36, 14, 46,  6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
     3, 35, 11, 43,  1, 33,  9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47,  7, 39, 13, 45,  5, 37,
    63, 31, 55, 23, 61, 29, 53, 21
  );
  
  int index = y * 8 + x;
  return (float(bayer[index]) / 64.0 - 0.5);  // -0.5 to 0.5
}

// יישום בסוף ה-shader
float d = bayer8x8(gl_FragCoord.xy);
finalColor = clamp(finalColor + d * (0.75 / 255.0), 0.0, 1.0);
```

### למה Bayer ולא רעש אקראי?

| סוג | יתרונות | חסרונות |
|-----|---------|---------|
| **Bayer (Ordered)** | פטרן קבוע, לא "רוקד" באנימציה | מבנה גיאומטרי עדין |
| **Random Noise** | אין מבנה נראה | "רוקד" ומהבהב באנימציה |

### כיסוי ה-Dithering במנוע

| רכיב | Bayer Dithering | Film Grain |
|------|:---------------:|:----------:|
| Custom4ColorGradient (Plane) | ✅ | ✅ |
| CustomMeshGradient (Mesh) | ✅ | ✅ |
| ExportModal (JS Renderer) | ✅ | ❌ |

---

## 🎨 Presets מובנים

### קובץ: `src/config/presets.ts`

המערכת כוללת presets מובנים המחולקים לקטגוריות:

### Dark Mode Presets

| שם | סוג | תיאור |
|----|-----|-------|
| **Dark Sunrise** | Plane | גרדיינט אלכסוני סגול-קורל על שחור |
| **Deep Aurora** | Mesh | עננים אורגניים כחול-סגול-מגנטה |
| **Ocean Depth** | Water | כחולים וטורקיזים עם סגול עמוק |
| **Blue Beacon** | Plane Radial | מקור אור כחול על רקע שחור |

### Vibrant Presets

| שם | סוג | תיאור |
|----|-----|-------|
| **Neon Nights** | Mesh | מגנטה וציאן חשמליים |
| **Sunset Blaze** | Plane | גרדיינט חם קורל-צהוב-מגנטה |
| **Cosmic Spiral** | Spiral | ספירלה היפנוטית עם כל צבעי המותג |
| **Prismatic Waves** | Waves | גלים צבעוניים יוצרים אפקט פריזמה |

### Light Mode Presets

| שם | סוג | תיאור |
|----|-----|-------|
| **Morning Mist** | Mesh | פסטלים רכים על בסיס לבן |
| **Soft Coral** | Plane | קורל ואפרסק על רקע בהיר |

### שימוש ב-Presets

```typescript
import { PRESET_DEEP_AURORA, getPresetById } from '@/config/presets';

// טעינה ישירה
const config = { ...defaultGradientConfig, ...PRESET_DEEP_AURORA.config };

// טעינה לפי ID
const preset = getPresetById('deep-aurora');
if (preset) {
  setConfig(prev => ({ ...prev, ...preset.config }));
}
```

### המלצות ל-Preset של Aurora

הסוד למראה ה"חלבי" של Aurora:
- `meshBlur: 90` - טשטוש מקסימלי
- `meshNoiseScale: 2.5` - כתמים גדולים
- `speed: 0.2` - תנועה איטית
- `colorWeight0: 35` - שחור דומיננטי אבל לא מוחלט

---

## 🔧 שיידר GLSL - מצב Plane

### קובץ: `src/components/Custom4ColorGradient.tsx`

מצב Plane משתמש בארכיטקטורה שונה לדיוק מבני:

### הבדלים עיקריים מ-Mesh

| מאפיין | Mesh Mode | Plane Mode |
|--------|-----------|------------|
| מיזוג | Progressive Mix | Weighted Segments |
| היסטוגרמה | מתיחת S-curve | ללא (ליניארי) |
| רעש | Multi-octave אורגני | רעש + drift מבוקר |
| Strength | משפיע על חדות | מבוטל |

### Weighted Segments (Plane)

```glsl
// ניתוח סגמנטים בטווח 0-1 של הרעש
// כל צבע מקבל "חלון" בגודל המשקל שלו

float segmentStart0 = 0.0;
float segmentEnd0 = w0;                              // 0.00 - 0.30

float segmentStart1 = w0;
float segmentEnd1 = w0 + w1;                         // 0.30 - 0.55

float segmentStart2 = w0 + w1;
float segmentEnd2 = w0 + w1 + w2;                    // 0.55 - 0.80

// וכו'...

// חישוב מעברים ממורכזים
float t0 = smoothstep(segmentStart0 + tw, segmentEnd0 - tw, noise);
float t1 = smoothstep(segmentStart1 + tw, segmentEnd1 - tw, noise);
// ...

// מיזוג רציף
vec3 finalColor = uColor0;
finalColor = mix(finalColor, uColor1, t0);
finalColor = mix(finalColor, uColor2, t1);
// ...
```

### Drift Animation (Plane)

אנימציה עדינה גם כש-PlaneWave=0:

```glsl
// Linear mode drift
baseNoise += sin(uTime * 0.20) * 0.025;

// Radial mode drift
vec2 drift = vec2(sin(uTime * 0.22), cos(uTime * 0.18)) * 0.02;
offsetCenter = centeredUv - uPlaneOffset + drift;
```

---

## 🌊 מצב Water

מצב Water משתמש באותו שיידר של Mesh/Plane אך עם:
- `meshNoiseScale` גבוה יותר
- `uFrequency` נמוך יותר לתנועה גלית

---

## 🎭 אפקטים אמנותיים

### Conic (גרדיינט זוויתי)

```glsl
float angle = atan(centeredUv.y, centeredUv.x);
float normalizedAngle = (angle + PI) / (2.0 * PI);
// ... spiral distortion אופציונלי
```

### Spiral

```glsl
float dist = length(centeredUv);
float angle = atan(centeredUv.y, centeredUv.x);
float spiral = fract((angle / (2.0 * PI) + dist * uSpiralTightness));
// Multi-octave noise לרכות
noise = spiral * 0.6 + snoise(...) * 0.4;
```

### Waves

```glsl
float wave = sin(vUv.y * uWavesCount * PI * 2.0 + uTime);
float amplitude = uWavesAmplitude / 100.0;
noise = vUv.x + wave * amplitude;
```

---

## 📤 ייצוא (Export)

### קובץ: `src/components/ExportModal.tsx`

הייצוא משתמש ב-Canvas 2D עם אותה לוגיקת שיידר מתורגמת ל-JavaScript:

```typescript
// לולאה על כל פיקסל
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const u = x / (width - 1);
    const v = 1 - y / (height - 1);
    
    // חישוב רעש זהה לשיידר
    const noise = calculateNoise(u, v, config);
    
    // מיזוג צבעים במרחב Linear
    const color = blendColors(noise, colors, weights);
    
    // המרה ל-sRGB וכתיבה
    imageData.data[idx] = linearToSrgb(color.r);
    // ...
  }
}
```

### פונקציות עזר ב-JS

```typescript
// Simplex noise ב-JavaScript
import { createNoise3D } from '@/lib/noise';

// Gamma correction
function srgbToLinear(c: number): number {
  return c <= 0.04045 
    ? c / 12.92 
    : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 
    ? c * 12.92 
    : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
```

---

## 📊 TypeScript Types

### קובץ: `src/types/gradient.ts`

```typescript
export interface GradientConfig {
  // סוג גרדיינט
  type: 'sphere' | 'plane' | 'waterPlane' | 'conic' | 'spiral' | 'waves';
  wireframe: boolean;
  
  // צבעים
  color0: string;  // Theme-based (#000000 או #FFFFFF)
  color1: string;
  color2: string;
  color3: string;
  color4: string | null;
  
  // משקלים (סה"כ = 100)
  colorWeight0: number;  // 30-100
  colorWeight1: number;
  colorWeight2: number;
  colorWeight3: number;
  colorWeight4: number;
  
  // אנימציה
  animate: boolean;
  speed: number;
  frozenTime: number | null;
  
  // אפקטים
  grain: boolean;
  grainIntensity: number;  // 0-100
  uStrength: number;
  uDensity: number;
  uFrequency: number;
  
  // הגדרות Mesh
  meshNoiseScale: number;  // 1-10
  meshBlur: number;        // 0-100
  meshStyle: 'organic' | 'flow' | 'center';
  meshFlowAngle: number;   // 0-360
  meshCenterInward: boolean;
  
  // הגדרות Plane
  planeAngle: number;      // 0-360
  planeRadial: boolean;
  planeWave: number;       // 0-100
  planeSpread: number;     // 0-100
  planeOffsetX: number;    // -50 to 50
  planeOffsetY: number;    // -50 to 50
  
  // ... עוד הגדרות
}
```

---

## 🔄 React Component Flow

```
Index.tsx
├── config state (GradientConfig)
├── GradientCanvas.tsx
│   ├── use4ColorMode? → Custom4ColorGradient.tsx / CustomMeshGradient.tsx
│   │   └── Three.js Canvas + ShaderMaterial
│   └── else → ShaderGradient (3rd party)
├── ControlPanel.tsx
│   ├── Color pickers
│   ├── Weight sliders
│   └── Effect controls
└── ExportModal.tsx
    └── Canvas 2D rendering
```

---

## ⚡ ביצועים

### אופטימיזציות

1. **Uniforms Caching** - יצירת uniforms פעם אחת ב-useMemo
2. **useFrame Updates** - עדכון ערכים בכל פריים ללא re-render
3. **preserveDrawingBuffer** - מופעל לצורך ייצוא
4. **Key-based Refresh** - רענון WebGL context בשינוי פרמטרים קריטיים

```typescript
// CustomMeshGradient.tsx
const uniforms = useMemo(() => ({
  uColor0: { value: new THREE.Color(config.color0) },
  // ... יצירה חד-פעמית
}), []);

useFrame((state) => {
  // עדכון ערכים בכל פריים
  mat.uniforms.uColor0.value.set(config.color0);
  mat.uniforms.uTime.value = state.clock.elapsedTime * config.speed;
});
```

---

## 🐛 Debug Overlay

### קובץ: `src/components/GradientDebugOverlay.tsx`

מציג בזמן אמת:
- סוג גרדיינט וסגנון
- צבעים + קודי HEX + משקלים
- מצב אנימציה ומהירות
- Thresholds מצטברים
- פרמטרי אפקטים

---

## 📚 קבצים קשורים

| קובץ | תפקיד |
|------|-------|
| `src/components/GradientCanvas.tsx` | מנהל ראשי - בחירת מסלול רינדור |
| `src/components/CustomMeshGradient.tsx` | שיידר Mesh |
| `src/components/Custom4ColorGradient.tsx` | שיידר Plane + אפקטים אמנותיים |
| `src/components/ControlPanel.tsx` | ממשק בקרה |
| `src/components/ExportModal.tsx` | ייצוא תמונות |
| `src/types/gradient.ts` | טיפוסים וברירות מחדל |
| `src/lib/noise.ts` | Simplex Noise ב-JavaScript |
| `src/lib/webglCapture.ts` | לכידת WebGL canvas |

---

## 🎯 סיכום עקרונות מפתח

1. **Linear RGB Blending** - כל מיזוג צבעים במרחב ליניארי עם המרת גאמה
2. **Weight-to-Area Accuracy** - משקל צבע = שטח פיזי על המסך
3. **Asymmetric Base Transition** - Color0 סולידי עד לאחוז שנקבע
4. **Multi-octave Noise** - טקסטורה עשירה עם פרטים בתדרים שונים
5. **Export Parity** - ייצוא זהה לתצוגה (אותה לוגיקה)

---

*תיעוד זה נוצר אוטומטית - עודכן לאחרונה: February 2026*
