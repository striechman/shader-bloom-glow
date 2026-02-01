
## תיקון עיוות צבעים - הושלם ✅

### הבעיה
הצבעים המוצגים (גם ב-Preview וגם בייצוא) שונים מצבעי המותג שנבחרו בגלל אי-התאמה במרחב צבעים.

### הפתרון שיושם

#### 1. תיקון השיידרים (Preview)
הוספנו המרת `linearToSrgb()` בסוף כל שיידר כדי להמיר את הצבעים חזרה מ-Linear RGB ל-sRGB:

**קבצים שעודכנו:**
- `src/components/CustomMeshGradient.tsx` - fragment shader
- `src/components/Custom4ColorGradient.tsx` - fragment shader  
- `src/components/BannerCanvas.tsx` - fragment shader

#### 2. תיקון ה-JavaScript Renderers (ייצוא)
הוספנו פונקציות המרה ב-`src/lib/noise.ts`:
- `srgbToLinear()` - המרת sRGB ל-Linear לפני חישובים
- `linearToSrgb()` - המרה חזרה ל-sRGB לפני כתיבה לתמונה
- `parseColorLinear()` - פרסור hex ישירות ל-Linear RGB

**קבצים שעודכנו:**
- `src/lib/noise.ts` - פונקציות המרה חדשות
- `src/components/BannerPreview.tsx` - שימוש ב-parseColorLinear + linearToSrgb
- `src/components/ExportModal.tsx` - שימוש ב-parseColorLinear + linearToSrgb

### תוצאה
הצבעים עכשיו תואמים בדיוק לצבעי המותג שנבחרו, גם ב-Preview וגם בקבצים המיוצאים.

