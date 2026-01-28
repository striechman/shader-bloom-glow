
מטרות (לפי הבקשה שלך)
1) Aspect Ratio “לא משפיע” → לתקן כך שהקנבס באמת יוצג בתוך יחס המסך הנבחר, ולא “ימתח” על כל המסך.
2) להסיר את המסגרת (frame) – לא צריך.
3) אחוזי הצבעים (weights) לא משפיעים כשאין אנימציה → לגרום לזה לעבוד ולהיראות בפועל גם כשהאנימציה עצורה.
4) לבדוק ולתקן Export של תמונה + קוד + וידאו (כולל איכות ורזולוציה).

מה מצאתי בקוד (אבחון קצר)
- ב־`GradientCanvas.tsx` מגדירים ל־container גם `width: '100%'` וגם `height: '100%'` יחד עם `aspectRatio`. בפועל, כששני הממדים “נעולים” על 100%, ה־`aspect-ratio` כמעט לא מצליח “להכריח” את היחס, ולכן זה מרגיש שאין השפעה.
- משקלי צבעים לא מוזנים בכלל ל־`ShaderGradient` (הספרייה תומכת רק ב־color1/2/3 בלי stops). לכן גם אם ה־state משתנה, לא רואים שינוי “אמיתי” בגרדיינט התלת־ממדי, במיוחד כשעצור.
- ייצוא תמונה/וידאו כיום מצלם את ה־canvas הקיים, אבל הוא בגודל המסך הנוכחי ולא בגודל שבחרת במודאל (1920×1080 וכו’). לכן האיכות לא תואמת את מה שמבקשים.
- וידאו: כרגע זה יוצא WebM (לא MP4). MP4 ב־MediaRecorder נתמך חלקית בלבד בדפדפנים; צריך לעשות זיהוי תמיכה + fallback ברור.

תכנית עבודה (מה נשנה)
A) תיקון Aspect Ratio (וללא מסגרת)
1) `src/components/GradientCanvas.tsx`
   - להסיר את `showFrame` ואת ה־`ring-*` שנוספו.
   - לשכתב את `getContainerStyle()` כך ש־aspect ratio ישפיע באמת:
     - במקום `width: 100%` ו־`height: 100%` ביחד:
       - נחשב “קופסה” שמרכזים במסך עם:
         - `width: min(100vw, 100vh * ratio)`
         - `height: calc(width / ratio)` (או להפך לפורטרט)
       - או פתרון CSS נקי: לקבוע רק ממד אחד והשני `auto`, יחד עם `aspectRatio`.
   - נשמור על `position: relative` כדי שה־canvas (absolute) יתאים נכון.

B) לגרום ל־Color Weights לעבוד גם כשהאנימציה עצורה
המטרה כאן היא “שיראו שינוי” כשמזיזים אחוזים גם בלי אנימציה.
2) `src/components/GradientCanvas.tsx`
   - להשאיר את ה־`key={colorKey}` (זה בסדר).
   - להוסיף שכבת “Preview” ב־CSS (רק כשעצור / או לפי בחירה):
     - כאשר `isFrozen === true`, נציג מעל ה־WebGL שכבה שקופה חלקית עם:
       - `background: linear-gradient(135deg, color1 0..w1%, color2 w1..w2%, color3 w2..100%)`
     - זה נותן חיווי ויזואלי אמיתי למשקלים, גם אם ShaderGradient לא תומך ב־stops.
   - נשמור את האטימות נמוכה (למשל 0.25–0.45) כדי שלא “יהרוס” את המראה, אבל כן ייראה שינוי.
   - (אופציונלי) אם תרצה שזה ישפיע תמיד, לא רק בפאוז—נאפשר מצב תמידי; כרגע נתחיל רק ב־paused כדי לפתור את הדרישה שלך.

C) ייצוא תמונה באיכות וברזולוציה שבוחרים
3) `src/components/ExportModal.tsx`
   - להפסיק להסתמך על `document.querySelector('canvas')` בלבד ובגודל המסך.
   - להוסיף “רנדרר ייצוא” זמני (offscreen / hidden) שמרנדר את הגרדיינט בגודל היעד:
     - ניצור בתוך המודאל container נסתר (למשל `position: fixed; left: -99999px`) בגודל שנבחר (width/height).
     - נרנדר שם `ShaderGradientCanvas` חדש עם אותו `config` אך עם style בגודל המדויק.
     - נמתין 2–3 `requestAnimationFrame` כדי לתת ל־WebGL לצייר פריים.
     - נצלם `toBlob/toDataURL` מתוך הקנבס הזה.
     - נפרק (unmount) את הרנדרר אחרי השמירה כדי לא להשאיר הקשר WebGL פתוח.
   - נעדיף `canvas.toBlob()` על `toDataURL()` כדי לשפר יציבות וביצועים.
   - נוסיף טיפול שגיאות ברור אם מתקבל “קנבס ריק”.

הערה חשובה: יצירת WebGL נוסף עלולה לגרום ל־“THREE.WebGLRenderer: Context Lost” במכשירים חלשים. לכן נעשה זאת קצר, ונשקול גם אופציה חלופית: “להקפיא, להגדיל זמנית את הקנבס הראשי, לצלם, ולהחזיר” אם נראה שהגישה הראשונה כבדה.

D) בדיקה ותיקון Export וידאו + Export קוד
4) `src/components/ExportModal.tsx`
   - Video:
     - כרגע הרזולוציה שבוחרים לא באמת מיושמת; הוידאו מצולם מהקנבס הקיים.
     - ניישם אותו עיקרון של “רנדרר ייצוא” גם לוידאו:
       - נרנדר קנבס ייעודי בגודל הוידאו (1080p וכו’),
       - נצלם ממנו `captureStream(30)` ונקליט.
     - MP4:
       - נבדוק `MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')`.
       - אם אין תמיכה, נעשה fallback ל־WebM ונסביר בטוסט: “הדפדפן לא תומך MP4, ייצאנו WebM”.
       - אם יש תמיכה, נשמור mp4 אמיתי.
     - נוודא שה־duration Custom עובד (slider/number input) ושלא נשאר טיימר “רוח” אם סוגרים מודאל באמצע.
   - Code (CSS export):
     - נוודא שהקוד כבר מייצג weights (הוא כן), ונוסיף (אם צריך) גם הערה/variant נוסף לשימושים נפוצים.
     - נבדוק שה־copy עובד בכל הדפדפנים (fallback אם clipboard נכשל).

קבצים שניגע בהם
- `src/components/GradientCanvas.tsx`
  - Fix aspect ratio sizing (באמת משפיע)
  - Remove frame
  - Add paused weights preview overlay
- `src/components/ExportModal.tsx`
  - Export image via hidden/offscreen re-render at target resolution
  - Export video via hidden/offscreen re-render at target resolution
  - MP4 support detection + fallback to WebM + הודעה
  - (בדיקה) יצוא קוד/העתקה

בדיקות קבלה (מה אתה אמור לראות בסוף)
1) Aspect Ratio:
   - מעבר בין 16:9 / 9:16 / 1:1 משנה בפועל את “הקופסה” של הגרדיינט על המסך (מוצג במרכז, לא מתיחה לכל המסך).
2) אין מסגרת.
3) כשהאנימציה עצורה:
   - הזזת אחוזים משנה מיידית את המראה (דרך שכבת preview) ולא רק את המספר.
4) Export תמונה:
   - אם בוחרים 1920×1080, הקובץ באמת יוצא 1920×1080 ובאיכות חדה.
5) Export וידאו:
   - 1080p באמת יוצא 1080p (לא תלוי בגודל המסך).
   - אם MP4 נתמך – יוצא MP4. אם לא – יוצא WebM עם הודעה ברורה.

סיכונים/הערות
- WebGL Context Lost: אם נראה שזה קורה הרבה בגלל רנדרר ייצוא נוסף, נעבור לאסטרטגיה של “resize זמני לקנבס הראשי בזמן export”.
- weights ב־3D: הספרייה לא תומכת ב־color stops “אמיתיים”, לכן הפתרון הוא שכבת preview שמייצרת את ההתנהגות שאתה רוצה בפועל (במיוחד בפאוז).

