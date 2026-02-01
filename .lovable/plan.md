
## מערכת צבעים מורחבת - הושלם ✅

### שינויים שבוצעו

#### 1. תמיכה ב-4 צבעי מותג (במקום 3)
- הוספת `color4` ו-`colorWeight4` ל-`GradientConfig`
- עדכון השיידרים (`Custom4ColorGradient`, `CustomMeshGradient`) לתמוך ב-5 צבעים סה"כ
- הוספת `uHasColor4` boolean לשיידר לזיהוי האם צבע 4 פעיל

#### 2. UI להוספת/הסרת צבע רביעי
- כפתור "Add Color 4" מופיע כשצבע 4 לא פעיל
- כפתור "-" ליד Color 4 להסרתו
- חלוקה אוטומטית של המשקלים בהוספה/הסרה

#### 3. פריסטים מעודכנים
- כל הפריסטים משתמשים ב-2+ צבעי מותג (לא רק שחור/לבן)
- פריסטים חדשים: "Blush", "Violet", "Warm" עם 3 צבעי מותג

### קבצים שעודכנו
| קובץ | שינוי |
|------|-------|
| `src/types/gradient.ts` | הוספת `color4`, `colorWeight4` |
| `src/components/ControlPanel.tsx` | UI ל-4 צבעים + פריסטים מעודכנים |
| `src/components/Custom4ColorGradient.tsx` | תמיכה ב-color4 בשיידר |
| `src/components/CustomMeshGradient.tsx` | תמיכה ב-color4 בשיידר |
| `src/components/GradientCanvas.tsx` | העברת color4 לקומפוננטים |


