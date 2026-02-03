
# תיקון מעברי צבע חלקים ב-Mesh Mode

## הבעיה
בתמונה רואים שהמעבר בין **צהוב (Yellow)** ל**ורוד (Pink)** לא חלק - יש "קו" או "פס" בולט במקום מעבר קרמי רך. גם ה-edge fade לא מספיק רך.

## אבחון טכני
מהקונפיג שהעברת:
```
transitionWidth: 0.1481
meshBlur: 58
thresholds: T0:30, T1:55, T2:80, T3:100
```

הסיבות לבעיה:
1. **Transition Width קטן מדי**: ב-`0.1481` יש רק ~15% של טווח הרעש למעבר בין שני צבעים, מה שיוצר "קו" נראה לעין
2. **Sequential Mix Effect**: כשעושים `mix(color1, color2, blend12)` ואז מיד אחר כך `mix(result, color3, blend23)`, המעברים נחתכים אחד בשני
3. **Edge Fade לא מספיק הדרגתי**: ה-smoothstep(0.7, 1.3) קופץ מהר מדי בקצוות

## פתרון מוצע

### שינויים בשיידר (Custom4ColorGradient.tsx):

**1. הגדלת Transition Width בסיסי:**
```glsl
// לפני:
float baseTrans = (uGradientType == 0) ? 0.12 : 0.08;

// אחרי: 
float baseTrans = (uGradientType == 0) ? 0.18 : 0.08;
```

**2. Overlap Blending במקום Sequential Mix:**
במקום מעברים חדים שנחתכים ב-threshold, ניצור "חפיפה" בין כל זוג צבעים סמוכים:
```glsl
// מעברים עם חפיפה - כל צבע "נכנס" קצת לפני שהקודם "יוצא"
float overlapFactor = 0.5; // כמה חפיפה בין מעברים
float tw = transitionWidth * (1.0 + overlapFactor);

float blend01 = smoothstep(threshold0 - tw * 0.3, threshold0 + tw, noise);
float blend12 = smoothstep(threshold1 - tw, threshold1 + tw, noise);
float blend23 = smoothstep(threshold2 - tw, threshold2 + tw, noise);
```

**3. Edge Fade רחב יותר:**
```glsl
// לפני:
float edgeFade = 1.0 - smoothstep(0.7, 1.3, edgeDist);

// אחרי: Fade מתחיל מ-50% מהמרחק ומתפשט עד 140%
float edgeFade = 1.0 - smoothstep(0.5, 1.4, edgeDist);
```

**4. Blur משפיע יותר על Transition:**
```glsl
// לפני:
float transitionWidth = baseTrans + blurFactor * 0.25;

// אחרי: Blur יותר דומיננטי למראה קרמי
float transitionWidth = baseTrans + blurFactor * 0.4;
```

### עדכון Debug Overlay:
- להוסיף את `overlapFactor` לתצוגה
- להציג את `edgeFadeRange` (0.5-1.4 במקום 0.7-1.3)

## קבצים לעריכה
1. `src/components/Custom4ColorGradient.tsx` - שינויי שיידר
2. `src/components/GradientDebugOverlay.tsx` - עדכון תצוגת debug

## תוצאה צפויה
- מעברים "קרמיים" חלקים בין כל הצבעים (צהוב↔ורוד↔שחור)
- אין קווים נראים לעין
- Edge fade עדין שנראה טבעי
- שמירה על דיוק המשקלים (30% שחור = ~30% שטח)

## בדיקות
1. Mesh עם הקונפיג שלך (Yellow/Pink/Black) - לוודא שהמעבר חלק
2. Static mode (Animate OFF) - לוודא שאין banding
3. Edge fade - לוודא שהפייד לשחור רך ולא פתאומי
