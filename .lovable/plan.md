

## תיקון בעיות - ייצוא תמונה ומשקלי צבעים

### בעיה 1: ייצוא תמונה לא עובד/לא באיכות טובה

**הבעיה הנוכחית:**
הקוד הנוכחי ב-`ExportModal.tsx` מנסה פשוט להעתיק את ה-canvas הקיים ולהגדיל אותו. זה לא עובד טוב כי:
1. ה-WebGL canvas של ShaderGradient לא שומר את התוכן שלו בין רנדרים (חסר `preserveDrawingBuffer: true`)
2. הגדלה של תמונה קטנה לגדולה = טשטוש ואיכות נמוכה
3. לפעמים ה-canvas ריק כשמנסים לצלם אותו

**הפתרון:**
1. יצירת canvas נפרד לייצוא ברזולוציה הרצויה
2. רינדור הגרדיינט מחדש ברזולוציה הגבוהה
3. שימוש ב-`preserveDrawingBuffer: true` ב-ShaderGradientCanvas
4. הוספת דיליי קטן לוודא שהרנדר הושלם

**שינויים:**

```typescript
// GradientCanvas.tsx - הוספת preserveDrawingBuffer
<ShaderGradientCanvas
  style={{...}}
  pixelDensity={2}
  pointerEvents="none"
  gl={{ preserveDrawingBuffer: true }} // חדש!
>
```

```typescript
// ExportModal.tsx - שיפור הייצוא
const handleExport = async () => {
  setIsExporting(true);
  
  // Wait for any pending renders
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
  if (!canvas) {
    toast.error('Canvas not found');
    setIsExporting(false);
    return;
  }

  // Get the WebGL context with preserveDrawingBuffer
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  // Create export at target resolution
  const width = useCustomSize ? customWidth : selectedSize.width;
  const height = useCustomSize ? customHeight : selectedSize.height;
  
  // Use toDataURL directly for better quality
  try {
    // For high quality, we capture at the current canvas resolution
    // and let the browser handle the download
    const dataUrl = canvas.toDataURL(
      format === 'png' ? 'image/png' : 'image/jpeg',
      format === 'jpg' ? 0.95 : undefined
    );
    
    // Create download link
    const link = document.createElement('a');
    link.download = `gradient-${Date.now()}.${format}`;
    link.href = dataUrl;
    link.click();
    
    toast.success('Exported successfully!');
  } catch (error) {
    toast.error('Export failed - try pausing the animation first');
  }
  
  setIsExporting(false);
};
```

---

### בעיה 2: לא ניתן לשנות משקלי צבעים כשהאנימציה מושהית

**הבעיה הנוכחית:**
בדקתי את הקוד - ה-sliders של משקלי הצבעים אמורים לעבוד תמיד. הבעיה האמיתית היא כנראה אחת משתיים:
1. משקלי הצבעים משפיעים רק על ה-CSS export ולא על הגרדיינט ה-3D (כי ShaderGradient לא תומך ב-color stops)
2. כשהאנימציה מושהית (frozen), הגרדיינט לא מתעדכן כי ה-`uTime` קבוע

**הפתרון:**
1. לוודא שהגרדיינט מתעדכן גם במצב frozen כשמשנים צבעים
2. להוסיף מפתח (key) ל-ShaderGradient שמשתנה כשהצבעים משתנים - מה שיאלץ re-render
3. להציג הודעה למשתמש שמשקלי הצבעים משפיעים בעיקר על ה-CSS export

**שינויים:**

```typescript
// GradientCanvas.tsx - הוספת key לאלץ re-render כשמשנים צבעים
export const GradientCanvas = ({ config }: GradientCanvasProps) => {
  // Create a key that changes when colors change
  const colorKey = `${config.color1}-${config.color2}-${config.color3}-${config.colorWeight1}-${config.colorWeight2}-${config.colorWeight3}`;
  
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center">
      <div style={getContainerStyle()}>
        <ShaderGradientCanvas
          key={colorKey} // Forces re-render when colors change
          // ...rest
        >
```

---

### קבצים לעדכון

| קובץ | שינויים |
|------|---------|
| `src/components/GradientCanvas.tsx` | הוספת `preserveDrawingBuffer: true` ו-key דינמי |
| `src/components/ExportModal.tsx` | שיפור לוגיקת הייצוא עם toDataURL ישיר ודיליי |

---

### סדר ביצוע

1. עדכון `GradientCanvas.tsx` להוספת `preserveDrawingBuffer` ו-key
2. עדכון `ExportModal.tsx` עם לוגיקת ייצוא משופרת
3. בדיקה שהייצוא עובד ושניתן לשנות צבעים במצב מושהה

