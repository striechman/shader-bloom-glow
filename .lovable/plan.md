

# תוכנית: הוספת סליידר לבחירת אחוז השחור (30%-100%)

## תיאור הבקשה

המשתמש רוצה להיות מסוגל לשלוט על אחוז צבע הבסיס (שחור/לבן) מ-**מינימום 30%** ועד **מקסימום 100%**. כרגע הערך נעול על 30% ואין סליידר לשנות אותו.

## מה צריך להשתנות

```text
לפני:
┌─────────────────────────────────────────────────┐
│ Black (base)                     30% (fixed)    │
└─────────────────────────────────────────────────┘
           ↓ אין שליטה

אחרי:
┌─────────────────────────────────────────────────┐
│ Black (base)                           45%      │
│ [══════════════════●──────────────────────]     │
│                   30%                   100%    │
└─────────────────────────────────────────────────┘
           ↓ סליידר מ-30 עד 100
```

## לוגיקת חלוקת המשקלים

כש-Color0 משתנה, הצבעים האחרים (Color1-4) צריכים להתחלק פרופורציונלית בשאר:

```text
Color0 = 30%  -->  Color1-4 מתחלקים ב-70%
Color0 = 50%  -->  Color1-4 מתחלקים ב-50%
Color0 = 80%  -->  Color1-4 מתחלקים ב-20%
Color0 = 100% -->  Color1-4 = 0% (רק צבע הבסיס)
```

### נוסחה:

```javascript
// כשמשנים את Color0:
const oldRemaining = 100 - oldWeight0; // הערך הקודם
const newRemaining = 100 - newWeight0; // הערך החדש

// כל צבע משני מתכווץ/מתרחב פרופורציונלית
const scale = newRemaining / oldRemaining;
colorWeight1 = colorWeight1 * scale;
colorWeight2 = colorWeight2 * scale;
colorWeight3 = colorWeight3 * scale;
colorWeight4 = colorWeight4 * scale; // אם קיים
```

## קבצים שישתנו

### 1. `src/components/ControlPanel.tsx`

#### א. הוספת פונקציה לטיפול בשינוי משקל Color0:

```typescript
const handleBaseWeightChange = (newWeight0: number) => {
  const oldRemaining = 100 - config.colorWeight0;
  const newRemaining = 100 - newWeight0;
  
  // אם newRemaining = 0, כל הצבעים האחרים הופכים ל-0
  if (newRemaining <= 0) {
    onConfigChange({
      colorWeight0: 100,
      colorWeight1: 0,
      colorWeight2: 0,
      colorWeight3: 0,
      colorWeight4: 0
    });
    return;
  }
  
  // סקאלה פרופורציונלית
  const scale = newRemaining / oldRemaining;
  
  onConfigChange({
    colorWeight0: newWeight0,
    colorWeight1: Math.round(config.colorWeight1 * scale),
    colorWeight2: Math.round(config.colorWeight2 * scale),
    colorWeight3: Math.round(config.colorWeight3 * scale),
    colorWeight4: config.color4 ? Math.round(config.colorWeight4 * scale) : 0
  });
};
```

#### ב. שינוי ה-UI של Color0 מתצוגה בלבד לסליידר:

**לפני (שורות 625-638):**
```jsx
<div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
  <Label>Black (base)</Label>
  <span>{config.colorWeight0}% (fixed)</span>
</div>
```

**אחרי:**
```jsx
<div className="space-y-2 py-2 px-3 rounded-lg bg-secondary/30">
  <div className="flex items-center justify-between">
    <Label className="flex items-center gap-2">
      <span className="w-4 h-4 rounded border" style={{ backgroundColor: color0 }} />
      {isDark ? 'Black' : 'White'} (base)
    </Label>
    <span className="text-xs font-mono">{config.colorWeight0}%</span>
  </div>
  <Slider
    value={[config.colorWeight0]}
    onValueChange={([value]) => handleBaseWeightChange(value)}
    min={30}
    max={100}
    step={1}
  />
  <p className="text-xs text-muted-foreground/70">
    Minimum 30% for brand consistency
  </p>
</div>
```

### 2. `src/types/gradient.ts`

עדכון ברירת המחדל וההערות להסברה שהמינימום הוא 30% (לא נעול):

```typescript
colorWeight0: 30, // Base color weight (minimum 30%, can go up to 100%)
```

### 3. עדכון ה-Presets ב-ControlPanel

כל ה-presets ישארו עם `weight0: 30` כברירת מחדל, אבל המשתמש יוכל לשנות אחרי הבחירה.

---

## התנהגות מיוחדת: Color0 = 100%

כש-Color0 מגיע ל-100%, כל שאר הצבעים מתאפסים והגרדיינט הופך ל**צבע אחיד** (שחור או לבן בהתאם לתמה).

הסליידרים של Color1-4 יהיו disabled כשאין להם משקל.

---

## פרטים טכניים

### למה המינימום 30%?

לפי הזיכרון `features/color-weight-hierarchy`:
> "the base color (Color 0) is locked at a mandatory minimum of 30% of the total gradient area"

זה מבטיח שתמיד יהיה בסיס כהה/בהיר לקונטרסט ועקביות מותגית.

### האם השיידר צריך שינוי?

**לא.** השיידר כבר מטפל נכון במשקלים דינמיים - הוא משתמש ב-`uWeight0` כ-uniform ומחשב את ה-thresholds בהתאם. כשנשנה את `colorWeight0` בקונפיג, השיידר יקבל את הערך החדש אוטומטית.

### מה קורה ל-Export?

גם ה-Export כבר מטפל במשקלים דינמיים ויעבוד נכון.

