
# תוכנית: שדרוג Mesh ל-Soft Light Blobs + הוספת Aurora נפרד

## הבעיה הנוכחית
ב-Mesh Mode השיידר משתמש ב-Simplex Noise שיוצר צורות "עמבות" עגולות ומוגדרות מדי. זה נראה כמו מנורת לבה מיושנת ולא כמו הרפרנסים היוקרתיים שהצגת (Soft Light Blobs / Atmospheric Lighting).

## הפתרון הטכני

### 1. שדרוג השיידר של Mesh Mode ב-Custom4ColorGradient.tsx

**הגישה החדשה: Radial Light Sources**

במקום לחשב noise ולמפות אותו לצבעים, נחליף לגישה של **מוקדי אור** (Radial Light Sources):

- כל צבע (Color1, Color2, Color3, Color4) יוצג כמקור אור עצמאי עם דעיכה אקספוננציאלית
- מקורות האור ממוקמים בנקודות שונות על הקנבס ומשתנים בעדינות לאורך הזמן
- הצבע הבסיסי (Color0 - שחור) הוא הרקע שממנו "בוקעים" האורות
- הערבוב הוא **additive-like** (mix) ולא threshold-based

**שינויים עיקריים בשיידר:**

```text
   +-------------------+      +-------------------+
   |   Current Mesh    |      |   New Mesh        |
   |   (Noise Based)   | ---> |   (Light Based)   |
   +-------------------+      +-------------------+
         |                           |
   Simplex Noise              Radial Light Sources
         |                           |
   Threshold Mapping          Exponential Falloff
         |                           |
   smoothstep blends          Additive mix blends
```

**פרמטרים חדשים בשיידר:**
- `radialLight()` - פונקציה שמחשבת דעיכה אקספוננציאלית ממרכז מקור האור
- Softness מבוסס על `uBlur` - ככל שגבוה יותר, האור מתפזר יותר
- מיקומי האור מושפעים מ-`uMeshStyle` (organic/flow/center)
- ה-weights משפיעים על הרדיוס והעוצמה של כל מקור אור

### 2. הפרדה בין Mesh ל-Aurora בתפריט

**שני אפקטים נפרדים:**

| אפקט | מאפיינים | Preset ברירת מחדל |
|------|----------|-------------------|
| Mesh | Soft Light Blobs - מוקדי אור רכים | blur: 60, scale: 1.5 |
| Aurora | Stretched curtains - וילונות מתוחים | blur: 95, scale: 0.4, stretch: true |

**Aurora יקבל פרמטר ייעודי: Anisotropic Stretching**
- מתיחת קואורדינטות לפני חישוב מיקומי האור
- יצירת צורות אנכיות/אופקיות ארוכות במקום עיגולים

### 3. עדכון ControlPanel - איפוס פרמטרים בלבד

כשלוחצים על אפקט חדש:
- **יאופסו**: Strength, Density, Frequency, Blur, Scale, Grain, Speed
- **יישמרו**: הצבעים והמשקלים שהמשתמש בחר

```text
effectPresets = {
  mesh: {
    // Parameters only - no colors
    meshNoiseScale: 1.5,
    meshBlur: 60,
    uStrength: 2.0,
    uDensity: 1.0,
    uFrequency: 3.0,
    speed: 0.3,
    grain: false,
  },
  aurora: {
    meshNoiseScale: 0.4,
    meshBlur: 95,
    meshStretch: true,  // New parameter
    uStrength: 0.5,
    uDensity: 1.0,
    uFrequency: 2.0,
    speed: 0.15,
    grain: true,
    grainIntensity: 10,
  }
}
```

---

## קבצים לעריכה

### 1. `src/components/Custom4ColorGradient.tsx`
- שכתוב הלוגיקה של `uGradientType == 0` (MESH MODE) בשיידר
- הוספת פונקציית `radialLight()` לחישוב דעיכה אקספוננציאלית
- מיקומי אור דינמיים עם אנימציה עדינה
- תמיכה ב-`uMeshStretch` לאפקט Aurora

### 2. `src/types/gradient.ts`
- הוספת פרמטר `meshStretch: boolean` ל-GradientConfig

### 3. `src/components/ControlPanel.tsx`
- עדכון `effectPresets` עם הערכים החדשים
- הסרת צבעים מה-presets (רק פרמטרים)
- הוספת סליידר Stretch למצב Aurora (אופציונלי - רק כשמופעל)

### 4. `src/components/GradientDebugOverlay.tsx`
- הוספת הצגת Mesh Stretch כשרלוונטי

---

## סיכום טכני

הגישה החדשה מבוססת על עקרונות ה-CSS שהצגת מ-Gemini:

```css
/* ההשראה המקורית */
background-image: 
  radial-gradient(at 20% 20%, rgba(0, 194, 255, 0.7) 0%, transparent 60%),
  radial-gradient(at 80% 50%, rgba(106, 0, 244, 0.6) 0%, transparent 50%);
filter: blur(100px);
```

רק שבמקום CSS, זה מיושם ב-WebGL עם אנימציה חלקה ותמיכה ב-5 צבעים.

**התוצאה הצפויה:**
- Mesh: כתמי אור רכים וגדולים שמתמזגים בעדינות
- Aurora: וילונות צבע ארוכים וחלקים (כמו זוהר הצפון)
- שניהם ללא "עמבות" או צורות מוגדרות מדי
