const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const launcherXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#0A1020" android:pathData="M0,0h108v108h-108z"/>
    <path android:fillColor="#8C72FF" android:pathData="M54,12A42,42 0,1 0,54 96A42,42 0,1 0,54 12"/>
    <path android:fillColor="#37D3C0" android:pathData="M70,64A12,12 0,1 0,70 88A12,12 0,1 0,70 64"/>
    <path android:fillColor="#F6F7FB" android:pathData="M29,31A7,7 0,0 1,36 24h30a7,7 0,0 1,7 7v7h-7v-4h-30v39h23v7h-23a7,7 0,0 1,-7 -7z"/>
    <path android:fillColor="#0A1020" android:pathData="M36,42h25v5h-25zM36,52h25v5h-25zM36,62h18v5h-18z"/>
    <path android:fillColor="#F6F7FB" android:pathData="M67,55a3,3 0,1 0,0 6h7a3,3 0,1 0,0 -6z"/>
</vector>`;

module.exports = function withMoneyLogAndroid(config) {
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$ = application.$ || {};
      application.$["android:icon"] = "@drawable/sml_launcher";
      application.$["android:roundIcon"] = "@drawable/sml_launcher";
    }
    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const drawableDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "drawable"
      );
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.writeFileSync(
        path.join(drawableDir, "sml_launcher.xml"),
        launcherXml,
        "utf8"
      );
      return config;
    },
  ]);

  return config;
};
