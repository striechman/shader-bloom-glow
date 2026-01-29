

## תוכנית: הוספת שליטה על זווית וכיוון הגרדיאנט במצב Plane

### הבעיה הנוכחית
במצב Plane, שבירת הצבעים מחושבת רק בכיוון אלכסוני אחד קבוע (45°):
```glsl
float diagonal = (vUv.x + vUv.y) * 0.5;
```
זה תמיד יוצר אלכסון מהפינה השמאלית-תחתונה לפינה הימנית-עליונה, ללא גמישות.

---

### הפתרון המוצע: 3 אפשרויות שליטה

#### אפשרות 1: סליידר זווית (0°-360°)
סליידר פשוט שמאפשר לסובב את כיוון הגרדיאנט בזווית רציפה.
- **יתרון**: מקסימום חופש, קל להבנה
- **חיסרון**: יכול להיות overwhelming לחלק מהמשתמשים

#### אפשרות 2: כפתורי כיוונים מוגדרים מראש + זווית מותאמת אישית
כפתורים מהירים לכיוונים נפוצים (אופקי, אנכי, אלכסוני) + סליידר לכוונון עדין.
- **יתרון**: מאזן בין קלות שימוש לגמישות
- **חיסרון**: יותר מורכב לתכנות

#### אפשרות 3: גלגל כיוון גרפי (Dial)
ממשק גרפי של גלגל שמסובבים עם העכבר.
- **יתרון**: אינטואיטיבי וויזואלי
- **חיסרון**: יותר מורכב לפיתוח

---

### המלצה: אפשרות 2 - כפתורים + סליידר

שילוב של כפתורי כיוונים מהירים עם סליידר זווית מלא:

**כפתורי Preset:**
- ← אופקי (0°) - שמאל לימין
- ↓ אנכי (90°) - למעלה למטה  
- ↘ אלכסוני (45°) - הנוכחי
- ↙ אלכסוני הפוך (135°)
- ◉ רדיאלי (מרכז החוצה) - בונוס אופציונלי

**סליידר כוונון עדין:** 0° עד 360°

---

### פרטים טכניים

#### 1. עדכון `GradientConfig` (types/gradient.ts)
```typescript
// Plane gradient direction
planeAngle: number; // 0-360 degrees
planeRadial: boolean; // If true, radial from center instead of linear
```

#### 2. עדכון ה-Shader (Custom4ColorGradient.tsx)
```glsl
uniform float uPlaneAngle;
uniform bool uPlaneRadial;

// PLANE MODE
if (uGradientType == 2) {
  float noise;
  
  if (uPlaneRadial) {
    // Radial gradient from center
    noise = length(centeredUv) * 1.4;
  } else {
    // Linear gradient with custom angle
    float angleRad = uPlaneAngle * 3.14159 / 180.0;
    vec2 direction = vec2(cos(angleRad), sin(angleRad));
    float linear = dot(vUv - 0.5, direction) + 0.5;
    noise = linear;
  }
  
  // Add organic noise
  vec3 noisePos = vec3(vUv * 2.0 * freq, uTime * 0.25);
  float organicNoise = snoise(noisePos) * 0.12 * density;
  
  noise = clamp(noise + organicNoise, 0.0, 1.0);
}
```

#### 3. עדכון ControlPanel.tsx
הוספת סקציה חדשה שמופיעה רק במצב Plane:
```text
┌─────────────────────────────────┐
│ Plane Direction                 │
│                                 │
│ [→] [↓] [↘] [↙] [◉]            │
│                                 │
│ Angle: ●───────────○  135°     │
│                                 │
└─────────────────────────────────┘
```

#### 4. קבצים לעריכה
| קובץ | שינוי |
|------|-------|
| `src/types/gradient.ts` | הוספת `planeAngle` ו-`planeRadial` |
| `src/components/Custom4ColorGradient.tsx` | עדכון shader עם uniforms חדשים |
| `src/components/ControlPanel.tsx` | UI חדש לשליטה בכיוון |

