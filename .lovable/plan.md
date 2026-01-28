

## שדרוג Gradient Studio - תכנית מלאה

### סיכום הבקשות

1. **משקל צבעים באחוזים** - שליטה בכמה כל צבע תופס מהגרדיינט
2. **שיפור Mesh** - הבדלה ברורה מ-Plane ואפשרויות נוספות
3. **הקפאת אנימציה** - יכולת לעצור את האנימציה ברגע מסוים וליצא
4. **יחסי מסך** - הגדרת aspect ratio לפלט (1:1, 2:3, 16:9, 9:16)
5. **פלט רב-תכליתי** - אתרים, פרינט, באנרים

---

### חלק 1: משקל צבעים (Color Weights)

**האתגר**: ספריית ShaderGradient לא תומכת ב-color stops מותאמים אישית - הצבעים מפוזרים באופן קבוע (0%, 50%, 100%).

**הפתרון**: נוסיף sliders לכל צבע שישפיעו על הפלט CSS בלבד. ב-3D gradient נשתמש בפרמטרים אחרים (uStrength, uDensity) ליצירת אפקט דומה.

```text
Color 1: [=======30%==========]
Color 2: [==========45%========]
Color 3: [====25%=======]
         Total: 100%
```

**שינויים בקוד**:
- הוספה ל-GradientConfig:
  - `colorWeight1: number` (0-100)
  - `colorWeight2: number` (0-100)
  - `colorWeight3: number` (0-100)
- יצירת מנגנון נעילה שמוודא שהסכום = 100%
- עדכון CSS export להשתמש באחוזים

---

### חלק 2: שיפור Mesh

**הבעיה**: כרגע Mesh ו-Plane נראים כמעט זהים.

**הפתרון**: שינוי קונפיגורציה ייעודית ל-Mesh עם פרמטרים שיוצרים מראה שונה לחלוטין.

| פרמטר | Plane | Mesh |
|-------|-------|------|
| type | plane | plane |
| wireframe | false | true |
| uDensity | 1.3 | 3.5 |
| uFrequency | 5.5 | 12 |
| rotationX | 0 | 60 |
| cDistance | 3.6 | 2.0 |
| brightness | 1.4 | 2.2 |

**אפשרויות נוספות ל-Mesh**:
- Grid Density - צפיפות הקווים
- Line Thickness - עובי הקווים (דרך uStrength)
- View Angle - זווית מבט

---

### חלק 3: הקפאת אנימציה (Freeze Frame)

**איך זה עובד**: השימוש ב-`uTime` קבוע במקום אנימציה. כשהאנימציה פועלת, `uTime` משתנה אוטומטית. כשעוצרים - נקבע ערך ספציפי.

**ממשק משתמש**:
```text
+-----------------------------+
| Animation                   |
| [Play] [Pause] [Capture]    |
|                             |
| Timeline: [======O=======]  |
| Frame: 2.5s                 |
+-----------------------------+
```

**שינויים**:
- הוספה ל-GradientConfig:
  - `frozenTime: number | null` - הזמן שבו האנימציה קפואה
- כפתור "Capture Current Frame" - שומר את הזמן הנוכחי
- Slider לבחירת רגע ספציפי (0-10 שניות)
- כש-frozenTime מוגדר, מעבירים אותו כ-uTime ומכבים animate

---

### חלק 4: יחסי מסך (Aspect Ratios)

**הפתרון**: שני מקומות לשליטה:

**א. ב-Control Panel** - תצוגה מקדימה עם יחס מסך:
```text
Preview Ratio: [1:1] [2:3] [16:9] [9:16] [Free]
```

**ב. ב-Export Modal** - בחירה מהירה לפי שימוש:

| קטגוריה | גדלים |
|---------|-------|
| Social | 1:1, 4:5, 9:16 |
| Web | 16:9, 21:9, Banner sizes |
| Print | A4, A3, Letter |
| Custom | Width x Height |

**שינויים**:
- הוספה ל-GradientConfig:
  - `aspectRatio: string` ('1:1', '16:9', '9:16', '2:3', '3:2', 'free')
- עדכון GradientCanvas להציג את הגרדיינט ביחס הנבחר
- עדכון Export Modal עם קטגוריות ברורות

---

### חלק 5: ארגון Export Modal מחדש

**מבנה חדש עם tabs**:

```text
+----------------------------------------+
| Export Gradient                    [X] |
+----------------------------------------+
| [Image] [CSS] [Video*]                 |
+----------------------------------------+
| USE CASE:                              |
| [Social] [Web] [Print] [Banner]        |
+----------------------------------------+
| SIZE:                                  |
| +----------+  +----------+             |
| | 1:1      |  | 4:5      |             |
| | 1080x1080|  | 1080x1350|             |
| +----------+  +----------+             |
| +----------+  +----------+             |
| | 9:16     |  | Custom   |             |
| | 1080x1920|  |  W x H   |             |
| +----------+  +----------+             |
+----------------------------------------+
| FORMAT: [PNG] [JPG]                    |
+----------------------------------------+
| [        Download         ]            |
+----------------------------------------+
```

*Video export - לשלב עתידי

---

### קבצים לעדכון

| קובץ | שינויים |
|------|---------|
| `src/pages/Index.tsx` | הרחבת GradientConfig עם שדות חדשים |
| `src/components/ControlPanel.tsx` | הוספת Color Weights, Freeze Frame, Aspect Ratio, שיפור Mesh |
| `src/components/GradientCanvas.tsx` | תמיכה ב-frozenTime, aspectRatio, פרמטרים מיוחדים ל-Mesh |
| `src/components/ExportModal.tsx` | ארגון מחדש עם קטגוריות שימוש |

---

### פרטים טכניים

**GradientConfig המורחב**:

```typescript
interface GradientConfig {
  // Existing
  type: 'sphere' | 'plane' | 'waterPlane';
  wireframe: boolean;
  animate: boolean;
  speed: number;
  color1: string;
  color2: string;
  color3: string;
  grain: boolean;
  uStrength: number;
  uDensity: number;
  uFrequency: number;
  
  // New: Color Weights
  colorWeight1: number; // 0-100
  colorWeight2: number; // 0-100
  colorWeight3: number; // 0-100
  
  // New: Freeze Frame
  frozenTime: number | null; // null = animating, number = frozen at time
  
  // New: Aspect Ratio
  aspectRatio: '1:1' | '16:9' | '9:16' | '2:3' | '3:2' | '4:5' | 'free';
  
  // New: Mesh-specific
  meshDensity: number;   // Grid line density (for wireframe mode)
  meshAngle: number;     // View angle (for wireframe mode)
}
```

**Color Weights - לוגיקת חישוב**:

```typescript
// Sliders מקושרים - כשמשנים אחד, האחרים מתאזנים
const handleColorWeightChange = (colorIndex: number, newValue: number) => {
  const weights = [colorWeight1, colorWeight2, colorWeight3];
  const oldValue = weights[colorIndex];
  const diff = newValue - oldValue;
  
  // חלק את ההפרש בין שני הצבעים האחרים
  const otherIndices = [0, 1, 2].filter(i => i !== colorIndex);
  const adjustment = diff / 2;
  
  const newWeights = weights.map((w, i) => {
    if (i === colorIndex) return newValue;
    return Math.max(0, Math.min(100, w - adjustment));
  });
  
  // וודא שהסכום = 100
  const total = newWeights.reduce((a, b) => a + b, 0);
  if (total !== 100) {
    newWeights[otherIndices[0]] += 100 - total;
  }
  
  onConfigChange({
    colorWeight1: newWeights[0],
    colorWeight2: newWeights[1],
    colorWeight3: newWeights[2]
  });
};
```

**Freeze Frame - שימוש ב-uTime**:

```typescript
// ב-GradientCanvas
<ShaderGradient
  animate={config.frozenTime === null ? 'on' : 'off'}
  uTime={config.frozenTime ?? 0}
  // ...
/>
```

**Aspect Ratio - הצגה**:

```typescript
const aspectRatioStyles: Record<string, { paddingBottom: string }> = {
  '1:1': { paddingBottom: '100%' },
  '16:9': { paddingBottom: '56.25%' },
  '9:16': { paddingBottom: '177.78%' },
  '2:3': { paddingBottom: '150%' },
  '3:2': { paddingBottom: '66.67%' },
  '4:5': { paddingBottom: '125%' },
};

// ב-GradientCanvas wrapper
<div 
  className="relative overflow-hidden"
  style={config.aspectRatio !== 'free' ? aspectRatioStyles[config.aspectRatio] : undefined}
>
  <div className="absolute inset-0">
    <ShaderGradientCanvas>...</ShaderGradientCanvas>
  </div>
</div>
```

**Export Sizes מאורגנים**:

```typescript
const exportCategories = {
  social: [
    { label: 'Instagram Post', width: 1080, height: 1080, ratio: '1:1' },
    { label: 'Instagram Story', width: 1080, height: 1920, ratio: '9:16' },
    { label: 'Facebook Post', width: 1200, height: 630, ratio: '1.91:1' },
    { label: 'LinkedIn Post', width: 1200, height: 627, ratio: '1.91:1' },
  ],
  web: [
    { label: 'HD Desktop', width: 1920, height: 1080, ratio: '16:9' },
    { label: '4K Desktop', width: 3840, height: 2160, ratio: '16:9' },
    { label: 'Website Hero', width: 1440, height: 900, ratio: '16:10' },
    { label: 'Banner Wide', width: 1920, height: 400, ratio: '4.8:1' },
  ],
  print: [
    { label: 'A4 (300dpi)', width: 2480, height: 3508, ratio: 'A4' },
    { label: 'A3 (300dpi)', width: 3508, height: 4961, ratio: 'A3' },
    { label: 'Letter (300dpi)', width: 2550, height: 3300, ratio: 'Letter' },
    { label: 'Poster 24x36', width: 7200, height: 10800, ratio: '2:3' },
  ],
  banner: [
    { label: 'Leaderboard', width: 728, height: 90, ratio: '8:1' },
    { label: 'Billboard', width: 970, height: 250, ratio: '3.9:1' },
    { label: 'Skyscraper', width: 160, height: 600, ratio: '1:3.75' },
    { label: 'Large Rectangle', width: 336, height: 280, ratio: '1.2:1' },
  ],
};
```

---

### סדר ביצוע

1. **עדכון GradientConfig** - הוספת כל השדות החדשים
2. **Freeze Frame** - הפיצ'ר הפשוט ביותר ליישום
3. **Mesh Improvements** - שינוי פרמטרים ליצירת מראה ייחודי
4. **Color Weights** - הוספת UI ולוגיקת חישוב
5. **Aspect Ratio** - תצוגה מקדימה ו-wrapper
6. **Export Modal** - ארגון מחדש עם קטגוריות

