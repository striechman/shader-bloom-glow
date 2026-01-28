
# תכנית: בניית Mesh Gradient אמיתי (בלי רשת!)

## מה גיליתי

המונח "Mesh" הטעה - לא מדובר ברשת קווים (wireframe), אלא ב-**Mesh Gradient**: תערובת חלקה של כתמי צבע גדולים שמתמזגים (כמו ב-Figma, Adobe Illustrator, או shadergradient.co).

בצילום המסך שהעלית (image-8) רואים בדיוק את זה: כתמים צבעוניים רכים שמתערבבים.

## שתי הבעיות העיקריות

| בעיה | סיבה | פתרון |
|------|------|-------|
| "Mesh" מציג רשת במקום ערבוב צבעים | השתמשנו ב-Wireframe component שמציג קווים | נבנה shader מותאם שמייצר blobs/noise צבעוני |
| Weights לא משפיעים (90% שחור = מעט שחור) | Weights לא מועברים ל-shader | נשלב את weights בתוך ה-shader כ-uniforms |

## הפתרון: Custom Shader Mesh Gradient

נבנה ShaderMaterial עם fragment shader שמערבב 3 צבעים לפי:
1. **Noise/Simplex** ליצירת אזורים רכים
2. **Weights** לשליטה בכמות כל צבע
3. **Animation** (אופציונלי) לתנועת הכתמים

## ארכיטקטורה חדשה

```text
+--------------------------------------------------+
|              MeshGradient Component              |
+--------------------------------------------------+
|  Canvas (R3F)                                    |
|  +--------------------------------------------+  |
|  |  PlaneGeometry (full screen)               |  |
|  |  +----------------------------------------+|  |
|  |  |  ShaderMaterial (custom)               ||  |
|  |  |  - vertexShader: standard              ||  |
|  |  |  - fragmentShader:                     ||  |
|  |  |      - simplex noise function          ||  |
|  |  |      - mix 3 colors by noise + weights ||  |
|  |  |      - optional animation (uTime)      ||  |
|  |  +----------------------------------------+|  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

## Shader Logic (פסאודו-קוד)

```glsl
// Uniforms
uniform vec3 color1, color2, color3;
uniform float weight1, weight2, weight3; // 0.0-1.0
uniform float time;

void main() {
  // Generate noise value (-1 to 1) based on position
  float n = simplex3D(vPosition * frequency + time * speed);
  
  // Map noise to color based on weights
  // weight1=0.05, weight2=0.05, weight3=0.90 -> mostly color3
  float t = (n + 1.0) * 0.5; // normalize to 0-1
  
  // Create thresholds based on weights
  float threshold1 = weight1;
  float threshold2 = weight1 + weight2;
  
  vec3 finalColor;
  if (t < threshold1) {
    finalColor = color1;
  } else if (t < threshold2) {
    finalColor = mix(color1, color2, smoothstep(threshold1, threshold2, t));
  } else {
    finalColor = mix(color2, color3, smoothstep(threshold2, 1.0, t));
  }
  
  gl_FragColor = vec4(finalColor, 1.0);
}
```

## קבצים שישתנו

| קובץ | שינוי |
|------|-------|
| `src/components/CustomMeshGradient.tsx` | שכתוב מלא - מעבר ל-ShaderMaterial עם noise-based color mixing |
| `src/types/gradient.ts` | הסרת meshLineThickness, meshLineColor (לא רלוונטי) - הוספת meshNoiseScale, meshBlur |
| `src/components/ControlPanel.tsx` | עדכון הגדרות Mesh - הסרת Line controls, הוספת Noise Scale ו-Color Blur |
| `src/components/GradientCanvas.tsx` | שינויים קלים לתמיכה בפרמטרים החדשים |

## הגדרות Mesh החדשות (בפאנל)

במקום Line Thickness/Color/Fill Opacity:
- **Noise Scale**: גודל הכתמים (גדול = כתמים גדולים, קטן = הרבה כתמים קטנים)
- **Color Blur**: כמה רכות בין הצבעים (0 = גבולות חדים, 100 = מאוד מטושטש)

## תיקון Plane mode

אותו עיקרון יחול גם על Plane - ה-Weights ישפיעו ישירות על הצבעים:
- נוסיף uniform משקלים ל-ShaderGradient
- אם זה לא אפשרי דרך הספרייה, נשתמש באותו shader מותאם

## דוגמה ויזואלית - מה ישתנה

**לפני (נוכחי):**
- Mesh = רשת קווים סגולים על רקע אפור
- 90% שחור = כמעט אותו דבר

**אחרי:**
- Mesh = כתמי צבע רכים שמתערבבים (כמו ב-image-8)
- 90% שחור = 90% מהתמונה שחורה, 10% צבעונית
- אפשרות לשלוט בגודל הכתמים ורכות המעברים

## פרטים טכניים

### Simplex Noise
נשתמש ב-GLSL simplex noise implementation (קיים קוד פתוח) לייצור ערכים חלקים ואקראיים לכל פיקסל.

### Weights Integration
המשקלים יהפכו ל-thresholds ב-shader:
- weight1=5%, weight2=5%, weight3=90%
- threshold1=0.05, threshold2=0.10
- 0.00-0.05 = color1
- 0.05-0.10 = transition zone
- 0.10-1.00 = color3 (90% מהתמונה)

### Animation Support
ה-time uniform יזיז את ה-noise, מה שייצור תנועה איטית של הכתמים.
