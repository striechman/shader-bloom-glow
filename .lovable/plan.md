
# תוכנית: תיקון הגרדיינט ב-Plane - 30% שחור עם מעברים חלקים

## אבחון מעמיק

### למה יש פסים ב-Plane?

הבעיה נוצרת משילוב של שני גורמים:

```text
הגישה הנוכחית:
┌────────────────────────────────────────────────────────┐
│ 1. blurFactor מופחת ל-35% (כדי לשמור 30% שחור)        │
│ 2. Layer Masking מונע color0 מלהופיע במעברים אחרים    │
│                                                        │
│ התוצאה: מעברים צרים מדי = "פסים"                      │
└────────────────────────────────────────────────────────┘
```

### למה Plane צריך גישה אחרת?

ב-**Mesh/Water** הרעש אורגני ומפוזר - Layer Masking עובד מצוין.
ב-**Plane** הרעש לינארי (noise מ-0 ל-1 בהתאם לכיוון) - צריך גישה שמכבדת את הסדר הזה.

## פתרון: "Weighted Segments" עבור Plane

במקום להשתמש ב-Layer Masking (שנועד למנוע דליפות ברעש אורגני), נשתמש בגישת **Weighted Segments** - כל צבע מקבל סגמנט משלו בטווח ה-noise, עם מעברים רחבים וחלקים ביניהם.

### עיקרון הפתרון:

```text
NOISE RANGE:    0.0 ────────────────────────────────── 1.0

COLOR0 (30%):   ████████████████████░░░░░░░░░░░░░░░░░░░░
                [0.0 ─── 0.30] מעבר רחב

COLOR1 (23%):   ░░░░░░░░░░░░░░░████████████████░░░░░░░░░
                       [0.30 ─── 0.53] מעבר רחב

COLOR2 (24%):   ░░░░░░░░░░░░░░░░░░░░░░░░░████████████████
                              [0.53 ─── 0.77] מעבר רחב

COLOR3 (23%):   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████████
                                     [0.77 ─── 1.0]

מעברים רחבים וחופפים = חלק ואורגני
```

### הלוגיקה החדשה ל-Plane:

```glsl
// PLANE MODE: Direct Weighted Segments (no layer masking)
// Each color blends smoothly into the next in sequence

float bigBlur = blurFactor * 1.5; // רחב יותר למעברים חלקים

// שלב 1: Color0 דועך ל-Color1
float seg01 = smoothstep(threshold0 - bigBlur, threshold0 + bigBlur, noise);

// שלב 2: Color1 דועך ל-Color2  
float seg12 = smoothstep(threshold1 - bigBlur, threshold1 + bigBlur, noise);

// שלב 3: Color2 דועך ל-Color3
float seg23 = smoothstep(threshold2 - bigBlur, threshold2 + bigBlur, noise);

// שלב 4: Color3 דועך ל-Color4 (אם קיים)
float seg34 = smoothstep(threshold3 - bigBlur, threshold3 + bigBlur, noise);

// ערבוב ישיר בין צבעים עוקבים - ללא masks!
vec3 finalColor = uColor0;
finalColor = mix(finalColor, uColor1, seg01);
finalColor = mix(finalColor, uColor2, seg12);
finalColor = mix(finalColor, uColor3, seg23);
if (uHasColor4) {
  finalColor = mix(finalColor, uColor4, seg34);
}
```

### למה זה עובד?

ב-Plane, ה-noise הוא **מונוטוני עולה** (0 בצד אחד, 1 בצד השני).
זה אומר שאם noise < threshold0, אנחנו בהכרח באזור של color0.
אם noise > threshold0 ו-< threshold1, אנחנו במעבר color0→color1 או ב-color1.

**אין צורך ב-Layer Masking** כי אין "קפיצות" ברעש - הוא תמיד עולה!

## קבצים שישתנו

### 1. `src/components/Custom4ColorGradient.tsx`

**שינויים בשיידר (שורות 420-469):**

נחליף את הלוגיקה הנוכחית של Plane mode:

```glsl
// לפני:
if (uGradientType == 2) {
  float planeBlur = blurFactor * 0.35; // blur מופחת
  // ... layer masking
}

// אחרי:
if (uGradientType == 2) {
  // PLANE MODE: Weighted Segments - wider blur, no layer masking
  float planeBlur = blurFactor * 1.2; // blur רחב יותר
  
  float seg01 = smoothstep(threshold0 - planeBlur, threshold0 + planeBlur, noise);
  float seg12 = smoothstep(threshold1 - planeBlur, threshold1 + planeBlur, noise);
  float seg23 = smoothstep(threshold2 - planeBlur, threshold2 + planeBlur, noise);
  float seg34 = smoothstep(threshold3 - planeBlur, threshold3 + planeBlur, noise);
  
  // Direct sequential mix - no layer masking needed for linear noise
  finalColor = uColor0;
  finalColor = mix(finalColor, uColor1, seg01);
  finalColor = mix(finalColor, uColor2, seg12);
  finalColor = mix(finalColor, uColor3, seg23);
  if (uHasColor4) {
    finalColor = mix(finalColor, uColor4, seg34);
  }
}
```

**נשמור על Layer Masking לשאר המצבים** (Mesh, Water, Conic, וכו') כי הם צריכים את זה למניעת דליפות.

### 2. `src/components/ExportModal.tsx`

**שינויים בפונקציה `render4ColorGradientHighQuality` (שורות 316-376):**

נעדכן את לוגיקת הייצוא של Plane להתאים לשיידר החדש.

## סיכום השינויים

| היבט | Mesh/Water/Conic | Plane |
|------|------------------|-------|
| סוג רעש | אורגני, מפוזר | לינארי, מונוטוני |
| גישת ערבוב | Layer Masking | Weighted Segments |
| blurFactor | 100% (מלא) | 120% (רחב יותר) |
| מניעת דליפות | masks מונעים color0 | לא צריך - הרעש לינארי |

## תוצאה צפויה

- **30% שחור** - נשמר כי threshold0 = 0.30 וה-noise מתחיל מ-0
- **מעברים חלקים** - blur רחב יותר ללא Layer Masking
- **ללא פסים** - כי אין "חיתוכים" חדים בין הצבעים
- **שאר המצבים** - ללא שינוי, עדיין משתמשים ב-Layer Masking

---

## פרטים טכניים

### למה Layer Masking גורם לפסים ב-Plane?

ב-Layer Masking, כל שכבה מוכפלת במסכה של השכבה הקודמת:
```glsl
finalColor = mix(finalColor, uColor2, blend12 * mask12);
//                                      ↑         ↑
//                                      │         └── תלוי ב-blend01
//                                      └── smoothstep קטן
```

כש-blend01 וגם blend12 קטנים (באזור המעבר), המכפלה שלהם **קטנה מאוד**.
זה יוצר "חור" במעבר שבו לא מספיק צבע מהשכבה החדשה נכנס.

ב-Plane לינארי, זה יוצר פסים ברורים.
ב-Mesh אורגני, זה פחות מורגש כי הרעש מפוזר.

### למה ב-Plane אין צורך ב-Layer Masking?

ב-Plane, ה-noise הוא **מונוטוני עולה**.
אם noise = 0.4 (למשל), אז:
- seg01 ≈ 1.0 (עברנו את threshold0 = 0.30)
- seg12 ≈ 0.5 (באמצע המעבר ל-threshold1 = 0.53)
- seg23 = 0.0 (עוד לא הגענו ל-threshold2)

ה-mix הרגיל נותן תוצאה נכונה בלי masks!
