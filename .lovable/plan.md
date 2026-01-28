

# תכנית: תיקון מצב Mesh עם Wireframe אמיתי

## הבעיה שזיהיתי

לאחר ניתוח מעמיק של ספריית `@shadergradient/react` v2.4.20, גיליתי ש-**prop `wireframe` לא ממומש בכלל בספרייה**.

הראיות:
1. בקובץ `Materials.tsx` של הספרייה (שורה 69) יש הערה: `// wireframe: true` - הם השביתו את זה
2. הקומפוננט `Mesh` לא מקבל את ה-wireframe prop ולא מעביר אותו ל-Material
3. ה-prop מוגדר ב-TypeScript types אבל לא משפיע על הרנדר

לכן כשאתה בוחר "Mesh" במערכת, זה פשוט מציג plane רגיל בלי קווי wireframe.

## הפתרון

נממש wireframe אמיתי באמצעות **`@react-three/drei` Wireframe component** שיושב מעל ה-ShaderGradient.

`@react-three/drei` כבר זמין כ-peer dependency של `@react-three/fiber` שמותקן בפרויקט.

## איך זה יעבוד

```text
+-------------------------------------------+
|           ShaderGradientCanvas            |
|  +-------------------------------------+  |
|  |    ShaderGradient (רקע הגרדיינט)      |  |
|  |                                     |  |
|  |  +---------------------------------+|  |
|  |  |  Wireframe (קווי mesh מעל)      ||  |
|  |  |  - stroke color: based on config||  |
|  |  |  - fill: gradient colors        ||  |
|  |  |  - thickness: adjustable        ||  |
|  |  +---------------------------------+|  |
|  +-------------------------------------+  |
+-------------------------------------------+
```

## שינויים נדרשים

### 1. התקנת @react-three/drei

```bash
npm install @react-three/drei@^9.122.0
```

### 2. עדכון types/gradient.ts

נוסיף פרמטרים חדשים ל-Mesh mode:
- `meshLineThickness`: עובי הקווים (0.01-0.1)
- `meshLineColor`: צבע הקווים (שחור/לבן/אוטומטי)
- `meshFillOpacity`: שקיפות המילוי (0-1)

### 3. יצירת CustomMeshGradient.tsx חדש

קומפוננט שמשלב:
- גרדיינט רקע (ShaderGradient רגיל עם fillOpacity נמוך)
- שכבת Wireframe מ-drei מעל

```tsx
import { Wireframe } from '@react-three/drei'
import { ShaderGradient } from '@shadergradient/react'

function CustomMeshGradient({ config }) {
  return (
    <>
      {/* Base gradient with reduced opacity */}
      <ShaderGradient {...baseProps} />
      
      {/* Wireframe overlay */}
      <mesh>
        <planeGeometry args={[5, 5, 32, 32]} />
        <Wireframe
          stroke={config.color1}  // or black/white
          thickness={config.meshLineThickness}
          fill={config.color2}
          fillOpacity={config.meshFillOpacity}
          squeeze
        />
      </mesh>
    </>
  )
}
```

### 4. עדכון GradientCanvas.tsx

- זיהוי מצב wireframe
- שימוש ב-CustomMeshGradient במקום ShaderGradient רגיל כשנבחר Mesh

### 5. עדכון ControlPanel.tsx - הגדרות Mesh

נוסיף לפאנל:
- **Line Thickness**: slider לעובי הקווים
- **Line Color**: בחירה בין שחור/לבן/אוטומטי (לפי הרקע)
- **Fill Opacity**: slider לשקיפות הרקע

## אינטגרציה של שחור

הצבע השחור (#000000) ישמש כ:
1. **צבע קווי ברירת מחדל** - קווי mesh שחורים על גרדיינט צבעוני
2. **אפשרות Fill** - רקע שחור עם קווים צבעוניים

## קבצים שישתנו

| קובץ | שינוי |
|------|-------|
| `package.json` | הוספת `@react-three/drei@^9.122.0` |
| `src/types/gradient.ts` | הוספת props חדשים ל-mesh |
| `src/components/CustomMeshGradient.tsx` | קומפוננט חדש |
| `src/components/GradientCanvas.tsx` | שימוש ב-CustomMeshGradient |
| `src/components/ControlPanel.tsx` | הגדרות mesh מורחבות |

## תוצאה צפויה

1. בחירת "Mesh" תציג גרדיינט עם קווי wireframe אמיתיים
2. הקווים יהיו חדים וברורים (לא מטושטשים)
3. אפשרות לשלוט בעובי, צבע ושקיפות
4. שחור ישתלב כצבע קווים או רקע
5. יעבוד גם באנימציה וגם בסטטי

