
## תיקון עיוות צבעים בייצוא גרדיינטים

### הבעיה

הצבעים המיוצאים שונים מהותית מצבעי המותג שנבחרו:

| צבע מותג | Hex נכון | Hex בייצוא | הבדל |
|----------|----------|------------|------|
| Magenta | `#EC008C` | `#dd0043` | אדום/כהה יותר |
| Violet | `#6A00F4` | `#2200eb` | כחול יותר |
| Blue | `#00C2FF` | `#0095fd` | כהה יותר |
| Coral | `#F2665F` | `#e71f19` | אדום בוהק |
| Yellow | `#FDB515` | `#f07701` | כתום |

### שורש הבעיה

**מרחב צבעים (Color Space)** - אי-התאמה בין WebGL ל-JavaScript:

1. **ב-WebGL/Three.js**: `THREE.Color` ממיר צבעי sRGB (מה שאנחנו רואים) ל-**Linear RGB** לחישובים בשיידר
2. **בייצוא JS**: `parseColor` עובד ישירות על ערכי sRGB (0-255) ללא המרה
3. **בלכידת WebGL**: `readPixels` מחזיר ערכים ב-Linear RGB שאינם זהים ל-sRGB

חישובי מיקס (lerp/mix) במרחב Linear נותנים תוצאות שונות מאותם חישובים ב-sRGB!

---

### הפתרון

#### אסטרטגיה 1: תיקון ה-JavaScript Renderer (עדיפה)

נוסיף **המרות Gamma** (sRGB ↔ Linear) ל-`src/lib/noise.ts`:

**קבצים לעריכה:**
- `src/lib/noise.ts` - הוספת פונקציות המרה

**שינויים:**
```typescript
// sRGB to Linear RGB (gamma decoding)
export function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 
    ? s / 12.92 
    : Math.pow((s + 0.055) / 1.055, 2.4);
}

// Linear RGB to sRGB (gamma encoding)
export function linearToSrgb(c: number): number {
  const s = c <= 0.0031308 
    ? c * 12.92 
    : 1.055 * Math.pow(c, 1/2.4) - 0.055;
  return Math.round(s * 255);
}

// Parse color and convert to Linear RGB [0-1]
export function parseColorLinear(hex: string): { r: number; g: number; b: number } {
  const srgb = parseColor(hex);
  return {
    r: srgbToLinear(srgb.r),
    g: srgbToLinear(srgb.g),
    b: srgbToLinear(srgb.b)
  };
}
```

#### עדכון ה-Renderers

**קבצים לעריכה:**
- `src/components/BannerPreview.tsx` - פונקציית `renderBannerHighQuality`
- `src/components/ExportModal.tsx` - פונקציות `render4ColorGradientHighQuality` ו-`renderGradientToCanvas`

**שינויים בלוגיקה:**
1. המרת צבעי קלט מ-sRGB ל-Linear לפני החישובים
2. ביצוע כל ה-lerp/mix במרחב Linear
3. המרה חזרה ל-sRGB לפני כתיבה ל-ImageData

```typescript
// Before (incorrect - mixing in sRGB)
const color1 = parseColor('#EC008C'); // { r: 236, g: 0, b: 140 }
let r = lerp(color1.r, color2.r, edge);

// After (correct - mixing in Linear, then convert back)
const color1 = parseColorLinear('#EC008C'); // { r: 0.827, g: 0, b: 0.262 }
let r = lerp(color1.r, color2.r, edge);
// ...
data[idx] = linearToSrgb(r); // Convert back to sRGB [0-255]
```

---

### סיכום השינויים

| קובץ | שינוי |
|------|-------|
| `src/lib/noise.ts` | הוספת `srgbToLinear`, `linearToSrgb`, `parseColorLinear` |
| `src/components/BannerPreview.tsx` | עדכון `renderBannerHighQuality` לעבוד ב-Linear RGB |
| `src/components/ExportModal.tsx` | עדכון `render4ColorGradientHighQuality` ו-`renderGradientToCanvas` לעבוד ב-Linear RGB |

### תוצאה צפויה

לאחר התיקון, הצבעים המיוצאים יהיו **זהים** לצבעי המותג שנבחרו, כי החישובים ב-JavaScript יתאימו למה שהשיידר עושה ב-WebGL.
