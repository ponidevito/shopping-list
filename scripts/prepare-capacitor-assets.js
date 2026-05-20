const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "www");
const files = [
  "index.html",
  "app.js",
  "styles.css",
  "styles.css.map",
  "google-sync.js",
  "manifest.webmanifest",
  "sw.js",
  "icon.svg"
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(outDir, file));
}

console.log(`Prepared ${files.length} web assets in ${path.relative(root, outDir)}.`);
