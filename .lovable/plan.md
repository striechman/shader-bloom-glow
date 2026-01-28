

## תיקון סוגי הגרדיינט - הוספת Water ו-Mesh

### מה צריך לתקן

כרגע יש 3 אופציות: Sphere, Plane, Mesh
אבל את רוצה: Sphere, Plane, Water (פלואידי), Mesh (רשת)

### הפתרון

הספריה `@shadergradient/react` תומכת ב-3 צורות בסיסיות בלבד:
- `sphere` - כדור
- `plane` - מישור
- `waterPlane` - מים (פלואידי/גלי)

אפשר ליצור אפקט "Mesh" על ידי הפעלת `wireframe={true}` - זה יציג את הגרדיינט כרשת קווים.

### השינויים

**1. עדכון הממשק (GradientConfig)**
הוספת שדה חדש `wireframe: boolean` לקונפיגורציה

**2. עדכון אפשרויות הצורה (ControlPanel)**
```text
+------------------+
| Shape Options    |
+------------------+
| Sphere | Plane   |
| Water  | Mesh    |
+------------------+
```

- **Sphere** - כדור רגיל
- **Plane** - מישור שטוח
- **Water** - waterPlane (פלואידי/גלי)
- **Mesh** - wireframe על sphere

**3. עדכון GradientCanvas**
להעביר את הערך `wireframe` מהקונפיגורציה ל-ShaderGradient

### קבצים לעדכון

| קובץ | שינוי |
|------|-------|
| `src/components/ControlPanel.tsx` | שינוי shapeOptions ל-4 אפשרויות, הוספת לוגיקה לבחירת type ו-wireframe |
| `src/components/GradientCanvas.tsx` | הוספת wireframe לממשק והעברתו ל-ShaderGradient |
| `src/pages/Index.tsx` | הוספת wireframe לדיפולט קונפיג |

### פרטים טכניים

```typescript
// GradientConfig - הוספת wireframe
interface GradientConfig {
  type: 'sphere' | 'plane' | 'waterPlane';
  wireframe: boolean; // חדש
  // ... שאר השדות
}

// shapeOptions - 4 אפשרויות
const shapeOptions = [
  { value: 'sphere', wireframe: false, label: 'Sphere' },
  { value: 'plane', wireframe: false, label: 'Plane' },
  { value: 'waterPlane', wireframe: false, label: 'Water' },
  { value: 'sphere', wireframe: true, label: 'Mesh' },
];

// בלחיצה על כפתור:
onConfigChange({ type: shape.value, wireframe: shape.wireframe })

// ב-GradientCanvas:
<ShaderGradient
  type={config.type}
  wireframe={config.wireframe}
  // ...
/>
```

