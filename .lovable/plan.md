

## הוספת בקרות כיווניות ל-Mesh Mode

### רעיון

מצב Mesh יוצר גרדיינטים אורגניים מבוססי רעש (Noise). כרגע הרעש מפוזר באופן אקראי לחלוטין. נוסיף אפשרויות לשלוט על **התפלגות הרעש** כך שהצבעים יטו לכיוון מסוים - אבל ישמרו על המראה האורגני והבלתי-צפוי שמאפיין Mesh.

### אפשרויות כיווניות חדשות ל-Mesh

| סגנון | תיאור | שימוש |
|-------|-------|-------|
| **Organic** (ברירת מחדל) | רעש אקראי לחלוטין - כמו עכשיו | בלובים אקראיים |
| **Flow** | רעש שזורם לכיוון מסוים (זווית) | מעבר רך עם תנועה |
| **Center** | רעש שמתרכז במרכז או מתפזר ממנו | אפקט זום/מיקוד |
| **Corners** | רעש עם דגש על פינות שונות | תנועה מהפינות |

```text
┌─────────────────────────────────────────────────┐
│  Mesh Style                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Organic  │ │   Flow   │ │  Center  │        │
│  │  (אקראי)  │ │  (זרימה)  │ │  (מרכז)  │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                 │
│  Flow Direction (כאשר Flow נבחר)               │
│  [→] [↓] [↘] [↙] + Slider 0°-360°              │
│                                                 │
│  Center Mode (כאשר Center נבחר)                │
│  [Inward ←•→ Outward]                          │
└─────────────────────────────────────────────────┘
```

---

### שינויים טכניים

#### 1. הרחבת Type Definition
**קובץ:** `src/types/gradient.ts`

```typescript
// New properties for Mesh mode direction
meshStyle: 'organic' | 'flow' | 'center';
meshFlowAngle: number; // 0-360 degrees (for flow style)
meshCenterInward: boolean; // true = colors flow inward, false = outward
```

#### 2. עדכון ה-Shader
**קובץ:** `src/components/CustomMeshGradient.tsx`

הוספת uniforms חדשים:
- `uMeshStyle` (int): 0=organic, 1=flow, 2=center
- `uMeshFlowAngle` (float): זווית הזרימה ברדיאנים
- `uMeshCenterInward` (bool): כיוון המרכז

לוגיקת השיידר:
```glsl
// ORGANIC: Pure noise (current behavior)
if (uMeshStyle == 0) {
  noise = snoise(noisePos);
}
// FLOW: Noise biased by direction
else if (uMeshStyle == 1) {
  vec2 flowDir = vec2(cos(uMeshFlowAngle), sin(uMeshFlowAngle));
  float directionalBias = dot(centeredUv, flowDir) * 0.5 + 0.5;
  noise = snoise(noisePos) * 0.6 + directionalBias * 0.4;
}
// CENTER: Noise biased by distance from center
else if (uMeshStyle == 2) {
  float dist = length(centeredUv) * 1.4;
  if (!uMeshCenterInward) dist = 1.0 - dist;
  noise = snoise(noisePos) * 0.5 + dist * 0.5;
}
```

#### 3. הוספת UI Controls
**קובץ:** `src/components/ControlPanel.tsx`

הוספה לתוך הסקשן "Mesh Gradient":
- כפתורי בחירת סגנון (Organic / Flow / Center)
- סליידר זווית (רק כש-Flow נבחר)
- Toggle כיוון (רק כש-Center נבחר)

---

### סיכום השינויים

| קובץ | שינוי |
|------|-------|
| `src/types/gradient.ts` | הוספת `meshStyle`, `meshFlowAngle`, `meshCenterInward` |
| `src/components/CustomMeshGradient.tsx` | הוספת uniforms ולוגיקה לסגנונות |
| `src/components/Custom4ColorGradient.tsx` | עדכון Mesh mode לתמוך בסגנונות |
| `src/components/ControlPanel.tsx` | הוספת UI לבחירת סגנון ובקרות |
| `src/components/GradientCanvas.tsx` | העברת props חדשים |

### תוצאה צפויה

מצב Mesh יקבל **3 סגנונות** שונים:
1. **Organic** - התנהגות נוכחית (בלובים אקראיים)
2. **Flow** - הבלובים נוטים לכיוון עם זווית נשלטת
3. **Center** - הצבעים מתרכזים/מתפזרים מהמרכז

זה נותן גמישות רבה יותר בלי להעמיס על הממשק - רק 3 כפתורים + סליידר אחד בהתאם לבחירה.

