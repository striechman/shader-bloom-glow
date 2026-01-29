
# תוכנית: הוספת צבע רביעי (שחור קבוע) לכל הגרדיינטים

## סיכום
מעבר ממערכת 3 צבעים למערכת 4 צבעים עם שחור (#000000) כצבע בסיס קבוע (color0) במשקל 30%.

---

## שינויים נדרשים

### קובץ 1: `src/types/gradient.ts`

**הוספות:**
- `color0: '#000000'` - צבע שחור קבוע (לא ניתן לשינוי)
- `colorWeight0: number` - משקל השחור (ברירת מחדל: 30)

**עדכון ברירות מחדל:**
```text
colorWeight0: 30  (שחור - חדש)
colorWeight1: 23  (צבע 1)
colorWeight2: 24  (צבע 2)
colorWeight3: 23  (צבע 3)
סה"כ: 100%
```

---

### קובץ 2: `src/components/CustomMeshGradient.tsx`

**עדכון השיידר:**
- הוספת `uColor0` uniform (שחור קבוע)
- הוספת `uWeight0` uniform
- עדכון לוגיקת ערבוב הצבעים ל-4 צבעים:

```text
threshold0 = weight0
threshold1 = weight0 + weight1
threshold2 = weight0 + weight1 + weight2

color0 → color1 → color2 → color3
```

---

### קובץ 3: `src/components/ControlPanel.tsx`

**עדכון UI:**
1. הוספת סליידר "Black Weight" (משקל שחור) לפני שאר הצבעים
2. עדכון פונקציית `handleColorWeightChange` לעבוד עם 4 צבעים
3. עדכון כל הפריסטים ל-4 צבעים:

**פריסטים מעודכנים:**
```text
Royal:    30% שחור, 23% סגול, 24% מגנטה, 23% שחור
Sunset:   30% שחור, 23% צהוב, 24% מגנטה, 23% שחור
Ocean:    30% שחור, 23% כחול, 24% סגול, 23% שחור
Coral:    30% שחור, 23% קורל, 24% סגול, 23% שחור
Neon:     30% שחור, 23% מגנטה, 24% כחול, 23% שחור
Electric: 30% שחור, 23% כחול, 24% מגנטה, 23% שחור
Blush:    30% שחור, 32% מגנטה, 31% שחור, 7% לבן
Violet:   30% שחור, 32% מגנטה, 31% סגול, 7% לבן
Salmon:   30% שחור, 32% קורל, 31% שחור, 7% לבן
```

---

### קובץ 4: `src/components/ExportModal.tsx`

**עדכון רנדור:**
- עדכון `renderMeshGradientHighQuality` ל-4 צבעים
- עדכון `renderGradientToCanvas` ל-4 צבעים
- עדכון `generateCSSCode` לכלול 4 צבעים

---

### קובץ 5: `src/components/GradientCanvas.tsx`

**עדכון אוברליי:**
- עדכון חישוב מעברי הצבעים ל-4 צבעים

---

## תוצאה צפויה

1. **יותר שחור** - כל גרדיאנט יכלול 30% שחור בסיס
2. **4 צבעים** - מעברים חלקים בין 4 צבעים
3. **פריסטים מעודכנים** - כל הפריסטים יעבדו עם המערכת החדשה
4. **ייצוא תקין** - תמונות מיוצאות יכללו את כל 4 הצבעים

---

## סדר ביצוע

1. עדכון `gradient.ts` - הוספת color0 וברירות מחדל
2. עדכון `CustomMeshGradient.tsx` - עדכון השיידר
3. עדכון `ControlPanel.tsx` - UI ופריסטים
4. עדכון `GradientCanvas.tsx` - אוברליי
5. עדכון `ExportModal.tsx` - רנדור ו-CSS
