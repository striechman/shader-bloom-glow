
# תוכנית: שדרוג Mesh ל-Soft Light Blobs + הוספת Aurora נפרד

## סטטוס: ✅ הושלם

### מה נעשה:

1. **שדרוג שיידר Mesh ל-Radial Light Sources**
   - הוחלף מנוע ה-Simplex Noise ב-MESH MODE לגישת מוקדי אור (Radial Light Sources)
   - כל צבע (Color1-4) מוצג כמקור אור עם דעיכה אקספוננציאלית
   - הצבע הבסיסי (Color0) הוא הרקע שממנו "בוקעים" האורות
   - מיקומי האור מונעים בעדינות לאורך הזמן
   - תמיכה ב-3 סגנונות: Organic, Flow, Center

2. **הוספת אפקט Aurora נפרד**
   - נוסף פרמטר `meshStretch` ל-GradientConfig
   - Aurora משתמש ב-stretch אנכי ליצירת "וילונות" צבע
   - ברירות מחדל אופטימליות: blur גבוה, מהירות איטית, grain עדין

3. **עדכון effectPresets**
   - הוסרו משקלי צבעים מה-presets (הצבעים נשמרים בעת מעבר בין אפקטים)
   - Mesh: blur=70, scale=1.5, stretch=false
   - Aurora: blur=95, scale=0.6, stretch=true

4. **עדכון Debug Overlay**
   - הוספת הצגת Mesh Stretch

### קבצים שנערכו:
- `src/components/Custom4ColorGradient.tsx` - שיידר חדש
- `src/types/gradient.ts` - הוספת meshStretch
- `src/components/ControlPanel.tsx` - עדכון presets
- `src/components/GradientDebugOverlay.tsx` - הצגת stretch
