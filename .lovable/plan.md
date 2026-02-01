
# תוכנית שיפורים כוללת ל-Gradient Studio

## סקירה כללית

תוכנית זו מפרטת את כל השיפורים שיבוצעו באפליקציה, מסודרים לפי סדר עדיפות ותלויות. כל שיפור יבוצע כמודול עצמאי שניתן לבדוק בנפרד.

---

## 1. מערכת Presets (שמירה וטעינה של הגדרות)

### מה נבנה
מערכת שמאפשרת למשתמש לשמור הגדרות גרדיינט מלאות (כולל צבעים, מצב, אנימציה, אפקטים) ולטעון אותן בקליק אחד.

### איך זה יעבוד
```text
┌─────────────────────────────────────────────────────┐
│  My Presets                                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │  Sunset    │ │   Ocean    │ │   Neon     │  +   │
│  │   🗑️       │ │    🗑️      │ │    🗑️      │      │
│  └────────────┘ └────────────┘ └────────────┘      │
│                                                     │
│  [💾 Save Current]                                  │
└─────────────────────────────────────────────────────┘
```

### שינויים טכניים

| קובץ | שינוי |
|------|-------|
| `src/types/gradient.ts` | הוספת `GradientPreset` type |
| `src/hooks/usePresets.ts` | hook חדש לניהול presets ב-localStorage |
| `src/components/ControlPanel.tsx` | הוספת סקשן "My Presets" עם UI לשמירה/טעינה/מחיקה |

### מבנה ה-Preset
```typescript
interface GradientPreset {
  id: string;
  name: string;
  createdAt: number;
  config: Partial<GradientConfig>; // כל ההגדרות מלבד aspectRatio
}
```

---

## 2. מערכת Undo/Redo

### מה נבנה
היסטוריית שינויים שמאפשרת לחזור אחורה או קדימה בהגדרות.

### איך זה יעבוד
```text
┌──────────────────────┐
│  ↩️  ↪️   History    │
│  [Undo] [Redo]       │
└──────────────────────┘
```

- כל שינוי בהגדרות נשמר בסטאק היסטוריה
- מקסימום 30 מצבים (למניעת בעיות זיכרון)
- כפתורים בהדר או בתחילת הפאנל

### שינויים טכניים

| קובץ | שינוי |
|------|-------|
| `src/hooks/useConfigHistory.ts` | hook חדש לניהול היסטוריה |
| `src/pages/Index.tsx` | שילוב ה-hook עם ה-state הקיים |
| `src/components/Header.tsx` | הוספת כפתורי Undo/Redo |

### לוגיקה
```typescript
interface ConfigHistory {
  past: GradientConfig[];      // מצבים קודמים
  present: GradientConfig;     // מצב נוכחי
  future: GradientConfig[];    // מצבים שבוטלו
}
```

---

## 3. מצב Conic Gradient

### מה נבנה
סוג גרדיינט חדש - זוויתי/ספירלי - שמוסיף מגוון אפשרויות עיצוביות.

### איך זה יראה
```text
Shape: [Sphere] [Plane] [Water] [Mesh] [Conic]

Conic Controls:
- Start Angle: 0° - 360°
- Spiral: 0 - 100%
- Center X/Y offsets
```

### שינויים טכניים

| קובץ | שינוי |
|------|-------|
| `src/types/gradient.ts` | הוספת `conic` ל-type, הוספת `conicStartAngle`, `conicSpiral` |
| `src/components/Custom4ColorGradient.tsx` | הוספת לוגיקת shader עבור Conic |
| `src/components/ControlPanel.tsx` | הוספת "Conic" לכפתורי Shape + בקרות ייחודיות |
| `src/components/GradientCanvas.tsx` | תמיכה בסוג החדש |
| `src/lib/noise.ts` | פונקציית Conic לייצוא |
| `src/components/ExportModal.tsx` | תמיכה ב-Conic בייצוא |

### לוגיקת Shader
```glsl
// CONIC MODE: Angular gradient
else if (uGradientType == 4) {
  float angle = atan(centeredUv.y - uConicOffsetY, centeredUv.x - uConicOffsetX);
  float normalized = (angle + 3.14159) / 6.28318; // 0-1
  normalized = fract(normalized + uConicStartAngle / 360.0); // Apply start angle
  
  // Add spiral effect
  if (uConicSpiral > 0.0) {
    float dist = length(centeredUv);
    normalized = fract(normalized + dist * uConicSpiral);
  }
  
  noise = normalized;
}
```

---

## 4. שיפור ייצוא (תמיכה בצבע חמישי)

### מה נבנה
תיקון מערכת הייצוא כך שתתמוך ב-5 צבעים (color0-color4) ב-CSS וב-Image.

### בעיות נוכחיות
- ה-CSS מייצא רק 4 צבעים
- הרינדור ב-JavaScript (לייצוא) לא מתחשב ב-color4

### שינויים טכניים

| קובץ | שינוי |
|------|-------|
| `src/components/ExportModal.tsx` | עדכון `generateCSSCode()` לתמוך ב-5 צבעים |
| `src/components/ExportModal.tsx` | עדכון `render4ColorGradientHighQuality()` ל-5 צבעים |
| `src/lib/noise.ts` | (אם נדרש) פונקציות עזר נוספות |

### CSS עם 5 צבעים
```css
.gradient-background {
  background: linear-gradient(
    135deg,
    ${color0} 0%,
    ${color0} ${w0}%,
    ${color1} ${w1}%,
    ${color2} ${w2}%,
    ${color3} ${w3}%,
    ${color4} 100%  /* הוספת צבע חמישי */
  );
}
```

---

## 5. שיפור UI במובייל

### מה נבנה
התאמות לפאנל ההגדרות כך שיהיה נוח יותר לשימוש במסכים קטנים.

### שיפורים מתוכננים
```text
Mobile Improvements:
┌────────────────────────┐
│ 1. Bottom Sheet Mode   │  <- הפאנל עולה מלמטה במובייל
│ 2. Collapsible Sections│  <- סקשנים מתקפלים
│ 3. Touch-Friendly      │  <- כפתורים גדולים יותר
│ 4. Quick Actions Bar   │  <- כפתורים מהירים בתחתית
└────────────────────────┘
```

### שינויים טכניים

| קובץ | שינוי |
|------|-------|
| `src/components/ControlPanel.tsx` | שימוש ב-`useIsMobile()` להתאמת UI |
| `src/components/ControlPanel.tsx` | הוספת Collapsible sections עם Accordion |
| `src/components/ControlPanel.tsx` | שינוי positioning למובייל (bottom sheet) |
| `src/index.css` | התאמות CSS למובייל |

### Bottom Sheet במובייל
```typescript
// Mobile: slide from bottom, 70% height max
// Desktop: slide from right (current behavior)
const panelVariants = {
  mobile: {
    initial: { y: '100%' },
    animate: { y: isOpen ? 0 : '100%' }
  },
  desktop: {
    initial: { x: 400 },
    animate: { x: isOpen ? 0 : 400 }
  }
};
```

---

## סדר ביצוע מומלץ

```text
שלב 1: מערכת Presets
   ↓
שלב 2: Undo/Redo
   ↓
שלב 3: שיפור ייצוא (5 צבעים)
   ↓
שלב 4: מצב Conic Gradient
   ↓
שלב 5: שיפור UI מובייל
```

### הסבר לסדר
1. **Presets** - פיצ'ר עצמאי, לא משפיע על קוד קיים
2. **Undo/Redo** - משתלב עם ה-state הקיים, לא דורש שינויי UI גדולים
3. **שיפור ייצוא** - תיקון באג, לא משנה התנהגות קיימת
4. **Conic** - פיצ'ר חדש שדורש שינויים בשיידר ו-UI
5. **מובייל** - refactoring של UI קיים, עדיף בסוף

---

## סיכום קבצים שישתנו

| קובץ | שיפורים שיושמו בו |
|------|-----------------|
| `src/types/gradient.ts` | Presets type, Conic props |
| `src/hooks/usePresets.ts` | **חדש** - ניהול presets |
| `src/hooks/useConfigHistory.ts` | **חדש** - undo/redo |
| `src/pages/Index.tsx` | שילוב Undo/Redo |
| `src/components/Header.tsx` | כפתורי Undo/Redo |
| `src/components/ControlPanel.tsx` | Presets UI, Conic controls, Mobile UI |
| `src/components/Custom4ColorGradient.tsx` | Conic shader |
| `src/components/GradientCanvas.tsx` | תמיכה ב-Conic |
| `src/components/ExportModal.tsx` | 5 צבעים, Conic export |
| `src/lib/noise.ts` | Conic export function |
| `src/index.css` | Mobile styles |

---

## תוצאה צפויה

לאחר השלמת כל השיפורים, האפליקציה תכלול:
- שמירה וטעינה של הגדרות גרדיינט מותאמות אישית
- יכולת לבטל ולחזור על שינויים
- מצב גרדיינט Conic (זוויתי/ספירלי)
- ייצוא מלא עם כל 5 הצבעים
- חוויית משתמש משופרת במובייל

