
# תוכנית: תיקון ערבוב הצבעים - חזרה לגרדיינטים חלקים

## הבעיה שזוהתה

השינוי האחרון הפך את מערבבת הצבעים מ-**Progressive Mix** (ערבוב מתקדם חלק) ל-**Zone-Based Blending** (אזורי צבע נפרדים עם מעברים צרים). זה גרם לתוצאה שנראית כמו "פסים" או "בלוקים" במקום גרדיינט זורם וחלק.

### השוואה בין הגישות:

```text
PROGRESSIVE MIX (הגישה הישנה - חלקה):
┌─────────────────────────────────────────────┐
│  צבע0 ──▶ מעבר רך ──▶ צבע1 ──▶ מעבר רך ──▶  │
│       ◀── ערבוב מתמשך ללא גבולות חדים ──▶   │
└─────────────────────────────────────────────┘

ZONE-BASED (הגישה הנוכחית - קשה):
┌─────────────────────────────────────────────┐
│ [צבע0] │ מעבר │ [צבע1] │ מעבר │ [צבע2] │   │
│   ◀── בלוקים נפרדים עם גבולות ברורים ──▶   │
└─────────────────────────────────────────────┘
```

## פתרון מוצע: Progressive Mix עם מניעת דליפה

נחזיר את הגישה המקורית (Progressive Mix) שנותנת ערבוב חלק, אבל נוסיף מנגנון שמונע מ-color0 לחזור ולהופיע במעברים בין צבעים אחרים (הבעיה המקורית של שחור בין ורוד לכתום).

### עיקרון הפתרון:

במקום לערבב באופן קומולטיבי כל הצבעים, נשתמש ב-**weighted layering** - כל צבע "דורס" את הקודם לו בלבד, כך ש-color0 לא יכול לחזור אחרי שעברנו אותו.

```glsl
// במקום:
finalColor = mix(color0, color1, blend01);
finalColor = mix(finalColor, color2, blend12);  // בעיה: blend12 קטן מחזיר color0!

// נשתמש ב:
float layer1 = blend01;                          // כמה color1 מכסה את color0
float layer2 = blend12 * layer1;                 // color2 מכסה רק מה שכבר color1
finalColor = mix(color0, color1, layer1);
finalColor = mix(finalColor, color2, layer2);   // בלי לחזור ל-color0
```

## שינויים נדרשים

### קובץ: `src/components/Custom4ColorGradient.tsx`

**מה נשנה:**
1. הסרת כל מבנה ה-if/else של Zone-Based (שורות 397-451)
2. החזרת Progressive Mix עם Layering מתקדם
3. שמירה על רוחב מעבר רחב יותר (blurFactor) לערבוב חלק

**לוגיקה חדשה:**
```glsl
// Progressive mix with layer masking (prevents color0 bleeding)
float blurFactor = uBlur * 0.5;

// Blend factors with smooth transitions
float blend01 = smoothstep(threshold0 - blurFactor, threshold0 + blurFactor, noise);
float blend12 = smoothstep(threshold1 - blurFactor, threshold1 + blurFactor, noise);
float blend23 = smoothstep(threshold2 - blurFactor, threshold2 + blurFactor, noise);
float blend34 = smoothstep(threshold3 - blurFactor, threshold3 + blurFactor, noise);

// Apply strength for edge control
float strengthExp = 1.0 + strength * 0.5;
blend01 = pow(blend01, strengthExp);
blend12 = pow(blend12, strengthExp);
blend23 = pow(blend23, strengthExp);
blend34 = pow(blend34, strengthExp);

// LAYER MASKING: Each layer only affects what's "above" the previous threshold
// This prevents color0 from appearing in color2-color3 transitions
vec3 finalColor = uColor0;
finalColor = mix(finalColor, uColor1, blend01);

// For subsequent colors, only blend where we're already past the previous threshold
float mask12 = blend01;  // Only blend color2 where color1 exists
finalColor = mix(finalColor, uColor2, blend12 * mask12);

float mask23 = max(blend01, blend12);  // Only blend color3 where color1 or color2 exist
finalColor = mix(finalColor, uColor3, blend23 * mask23);

if (uHasColor4) {
  float mask34 = max(mask23, blend23);
  finalColor = mix(finalColor, uColor4, blend34 * mask34);
}
```

### קובץ: `src/components/ExportModal.tsx`

יש לעדכן את לוגיקת הייצוא כדי להתאים לשינוי בשיידר, כך שהתמונה המיוצאת תהיה זהה לפריוויו.

## סיכום

| קריטריון | לפני | אחרי |
|----------|------|------|
| ערבוב צבעים | קשה ומופרד (Zone-Based) | חלק וזורם (Progressive Mix) |
| דליפת color0 | נמנעה | נמנעת (עם Layer Masking) |
| איכות ויזואלית | בלוקים נפרדים | גרדיינט אורגני |
| תאימות Export | צריכה עדכון | מסונכרנת |

---

## פרטים טכניים

### הסבר Layer Masking:

הרעיון הוא שכל צבע יכול להופיע רק באזורים שכבר "נכבשו" על ידי הצבע הקודם לו. כך color0 נשאר רק באזור שלו (0 עד threshold0), ולא יכול "לדלוף" למעברים בין color2 ל-color3.

```text
noise:     0.0 ────────────────────────── 1.0
           
color0:    ████████░░░░░░░░░░░░░░░░░░░░░░░
           (100% עד threshold0, אז דועך)
           
color1:    ░░░░░░░████████████░░░░░░░░░░░░
           (מתחיל רק אחרי threshold0)
           
color2:    ░░░░░░░░░░░░░░░████████████░░░░
           (מתחיל רק אחרי threshold1, מוגבל ל-mask)
           
color3:    ░░░░░░░░░░░░░░░░░░░░░░░███████░
           (מתחיל רק אחרי threshold2, מוגבל ל-mask)
```

### קבצים שישתנו:
1. `src/components/Custom4ColorGradient.tsx` - השיידר הראשי
2. `src/components/ExportModal.tsx` - לוגיקת הייצוא
