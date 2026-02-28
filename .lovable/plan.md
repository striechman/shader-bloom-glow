

# תיקון שגיאת Build + תיקון נקודות הבקרה (Handles)

## 1. תיקון שגיאת Build — חסרות תכונות ב-`defaultGradientConfig`

**קובץ:** `src/types/gradient.ts`

הוספת 5 תכונות חסרות ל-`defaultGradientConfig`:
- `noiseOctaves: 4`
- `noiseGraininess: 30`
- `iridescentIntensity: 50`
- `iridescentScale: 100`
- `useOklch: false`

## 2. תיקון נקודות הבקרה — הנקודות לא מגיבות ללחיצה/גרירה

**בעיה:** שכבת הגרירה (drag overlay) בגובה z-[35] תופסת pointer capture על כל הקנבס דרך `setPointerCapture`. ברגע שהמשתמש לוחץ על הנקודה, אם האצבע/עכבר נוגע קודם באזור ה-overlay (שמכסה את כל הקנבס), ה-capture נלקח ע"י ה-overlay והנקודה לא מקבלת אירועים.

**פתרון בקובץ:** `src/components/GradientCanvas.tsx`

1. **הסרת `setPointerCapture` מה-overlay** — במקום, נשתמש ב-`window` event listeners כדי לתפוס תנועות גם מחוץ לקנבס, בלי לחטוף אירועים מהנקודות
2. **הוספת `pointer-events-auto`** מפורש על הנקודות כדי לוודא שהן מקבלות אירועים
3. **שינוי הלוגיקה:** ב-`handlePointerDown` של ה-overlay, בדיקה שה-`activeHandle` לא פעיל לפני תחילת גרירה

## פרטים טכניים

### שינויים ב-`GradientCanvas.tsx`:

1. ב-`handlePointerDown` של ה-overlay: הסרת `setPointerCapture` והוספת guard:
```typescript
if (activeHandle.current) return; // handle is being dragged, don't interfere
isDragging.current = true;
```

2. הוספת `window` level pointermove/pointerup listeners ב-useEffect כדי לתפוס גרירה גם מחוץ לגבולות הקנבס

3. על כל ה-handle divs: הוספת style `pointerEvents: 'auto'` מפורש

### שינויים ב-`gradient.ts`:

הוספת השדות החסרים אחרי `gradientRotation: 0`:
```typescript
noiseOctaves: 4,
noiseGraininess: 30,
iridescentIntensity: 50,
iridescentScale: 100,
useOklch: false,
```

