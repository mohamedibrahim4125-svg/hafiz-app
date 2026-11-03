// يجهّز مشروع أندرويد: الاسم، الأيقونات، شاشة البداية، الصلاحيات
const fs = require("fs"), path = require("path");
const { execSync } = require("child_process");
const root = path.join(__dirname, ".."), res = path.join(root, "android/app/src/main/res");
if (!fs.existsSync(res)) { console.error("android/ مش موجود — شغّل npx cap add android الأول"); process.exit(1); }
const py = (code) => execSync(`python3 - <<'PY'\n${code}\nPY`, { stdio: "inherit", shell: "/bin/bash" });
// 1) الاسم
const strings = path.join(res, "values/strings.xml");
let s = fs.readFileSync(strings, "utf8");
s = s.replace(/<string name="app_name">.*?<\/string>/, '<string name="app_name">حافظ</string>')
     .replace(/<string name="title_activity_main">.*?<\/string>/, '<string name="title_activity_main">حافظ</string>');
fs.writeFileSync(strings, s);
// 2) لون خلفية الأيقونة
const bg = path.join(res, "values/ic_launcher_background.xml");
if (fs.existsSync(bg)) fs.writeFileSync(bg, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0F5C45</color>\n</resources>\n');
// 3) الأيقونات وشاشة البداية (Pillow)
py(`
import os,glob
from PIL import Image
res=${JSON.stringify(res)}; R=${JSON.stringify(path.join(root, "resources"))}
icon=Image.open(os.path.join(R,'icon.png')).convert('RGBA'); fg=Image.open(os.path.join(R,'icon-foreground.png')).convert('RGBA')
sp=Image.open(os.path.join(R,'splash.png')).convert('RGB')
sizes={'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192}
for k,v in sizes.items():
    d=os.path.join(res,'mipmap-'+k); os.makedirs(d,exist_ok=True)
    icon.resize((v,v),Image.LANCZOS).save(os.path.join(d,'ic_launcher.png'))
    icon.resize((v,v),Image.LANCZOS).save(os.path.join(d,'ic_launcher_round.png'))
    f=int(v*108/48); fg.resize((f,f),Image.LANCZOS).save(os.path.join(d,'ic_launcher_foreground.png'))
for p in glob.glob(os.path.join(res,'drawable*','splash.png')):
    w,h=Image.open(p).size; sc=max(w,h); big=sp.resize((sc,sc),Image.LANCZOS)
    big.crop(((sc-w)//2,(sc-h)//2,(sc-w)//2+w,(sc-h)//2+h)).save(p)
print('icons+splash ok')
`);
// 4) الصلاحيات (المايك والإنترنت) — احتياطي لو مكتبة الصوت ماضافتهاش
const mf = path.join(root, "android/app/src/main/AndroidManifest.xml");
let m = fs.readFileSync(mf, "utf8");
const perms = ["android.permission.INTERNET", "android.permission.RECORD_AUDIO"];
for (const p of perms) if (!m.includes(p)) m = m.replace("</manifest>", `    <uses-permission android:name="${p}" />\n</manifest>`);
if (!m.includes("android.speech.RecognitionService"))
  m = m.replace("</manifest>", '    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService" />\n        </intent>\n    </queries>\n</manifest>');
fs.writeFileSync(mf, m);
console.log("✔ android patched");
// 5) توقيع ثابت + رقم نسخة بيزيد — علشان التحديثات تتسطّب فوق القديمة من غير ما تمسح تقدّمك
const gradle = path.join(root, "android/app/build.gradle");
let g = fs.readFileSync(gradle, "utf8");
if (!g.includes("signingConfigs.hafiz")) {
  g += `
// --- حافظ: توقيع ثابت ورقم نسخة ---
android {
    signingConfigs {
        hafiz {
            storeFile file('../../resources/hafiz.keystore')
            storePassword 'hafizapp'
            keyAlias 'hafiz'
            keyPassword 'hafizapp'
        }
    }
    defaultConfig {
        versionCode((System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInteger())
        versionName "1.0." + (System.getenv("GITHUB_RUN_NUMBER") ?: "0")
    }
    buildTypes {
        debug { signingConfig signingConfigs.hafiz }
        release { signingConfig signingConfigs.hafiz }
    }
}
`;
  fs.writeFileSync(gradle, g);
}
console.log("✔ signing configured");
