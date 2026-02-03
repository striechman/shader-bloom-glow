
# תיקון Mesh Mode - בעיית צבע אחד אחיד

## הבעיה
בפריסט הראשוני (Yellow/Pink/Black) עם blur גבוה, כל המסך נראה כמו צבע אחד חום-אדום במקום כתמי צבע מובחנים.

## אבחון טכני

הקונפיג:
```
colors: Yellow (#FDB515), Pink (#EC008C), Black (#000000 - Color3)
weights: 30% base-black, 25% yellow, 25% pink, 20% black
meshBlur: 95%
```

### שורש הבעיה:
1. **Color3 הוא שחור (#000000)** - זה צבע שמשתתף בחישוב האנרגיה אבל לא תורם שום אור לתמונה
2. **Energy Conservation כולל צבעים כהים**: הקוד מחשב:
   ```glsl
   float energy = intensity1 + intensity2 + intensity3 + intensity4;
   float energyScale = availableLight / energy;
   ```
   Color3 (שחור) תופס 20% מה-intensity אבל כשעושים `uColor3 * intensity3` התוצאה היא שחור (0,0,0) - לא תורם אור אבל "גונב" מהתקציב

3. **Blur גבוה = Sharpness נמוך**: כש-blur=95%, ה-sharpness הוא רק 1.89, מה שגורם לכל ערכי הרעש להתפזר לאזור הבינוני (0.3-0.7) במקום קצוות (0.0 ו-1.0)

4. **Screen Blend מערבב הכל**: Yellow + Pink ב-screen blend יוצרים גוון חום-אדום אחיד כי אין הפרדה מרחבית ברורה

### תוצאה:
במקום לראות כתמי צהוב, כתמי ורוד, ואזורים שחורים - רואים צבע אחד אחיד.

## הפתרון: Luminance Guarding

### 1. פונקציית Luminance
להוסיף פונקציה שמחשבת בהירות של צבע:
```glsl
float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}
```

### 2. לסנן צבעים כהים מחישוב האנרגיה
צבעים עם luminance נמוך (< 0.05) לא צריכים להשתתף ב-energy budget:
```glsl
// Check luminance of each color
float luma1 = luma(uColor1);
float luma2 = luma(uColor2);
float luma3 = luma(uColor3);
float luma4 = luma(uColor4);

// Only count colors that actually contribute light
float effectiveIntensity1 = (luma1 > 0.05) ? intensity1 : 0.0;
float effectiveIntensity2 = (luma2 > 0.05) ? intensity2 : 0.0;
float effectiveIntensity3 = (luma3 > 0.05) ? intensity3 : 0.0;
float effectiveIntensity4 = (luma4 > 0.05) ? intensity4 : 0.0;

float energy = effectiveIntensity1 + effectiveIntensity2 + effectiveIntensity3 + effectiveIntensity4;
```

### 3. להגביר Sharpness ב-blur גבוה
הבעיה היא ש-blur 95% הורס את ההפרדה בין הצבעים. צריך floor מינימלי:
```glsl
// Before: sharpness goes from 1.8 (blur=100%) to 3.6 (blur=0%)
// After: sharpness goes from 2.5 (blur=100%) to 4.0 (blur=0%)
float sharpness = mix(2.5, 4.0, 1.0 - uBlur);
```

### 4. Boost לצבעים שנותרו
כדי שהצבעים הפעילים יהיו ברורים:
```glsl
// Count how many colors actually contribute
float activeCount = step(0.05, luma1) + step(0.05, luma2) + step(0.05, luma3) + step(0.05, luma4);
float colorBoost = mix(1.0, 1.5, 1.0 - activeCount/4.0); // Fewer colors = more boost per color

intensity1 *= energyScale * colorBoost;
intensity2 *= energyScale * colorBoost;
intensity3 *= energyScale * colorBoost;
intensity4 *= energyScale * colorBoost;
```

## קובץ לעריכה

`src/components/Custom4ColorGradient.tsx` - שינויים בשיידר (שורות 533-565):

1. הוספת פונקציית `luma()`
2. עדכון חישוב ה-energy להתעלם מצבעים כהים
3. הגדלת טווח ה-sharpness
4. הוספת color boost לצבעים פעילים

## תוצאה צפויה

עם הפריסט הראשוני (Yellow/Pink/Black):
- **Yellow** ו-**Pink** יופיעו ככתמים מובחנים ונפרדים
- **Color3 (Black)** לא "יגנוב" מתקציב האור
- **Blur גבוה** עדיין יתן מעברים רכים אבל לא יהפוך הכל לצבע אחד
- **אזורי שחור** מובחנים (30% בסיס) בין כתמי הצבע

## בדיקות
1. פריסט ראשוני - לוודא שרואים Yellow ו-Pink נפרדים
2. פריסט 77% שחור - לוודא שהשחור דומיננטי והצבעים מעומעמים
3. Blur 0% vs 100% - לוודא ששניהם נראים טוב
