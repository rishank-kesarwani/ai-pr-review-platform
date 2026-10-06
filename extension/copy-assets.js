const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const manifestPath = path.join(__dirname, 'manifest.json');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy manifest.json
fs.copyFileSync(manifestPath, path.join(distDir, 'manifest.json'));

// Copy HTML, CSS, and SVG asset files
['popup.html', 'popup.css', 'options.html', 'icon.svg'].forEach((file) => {
  const src = path.join(srcDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, file));
  }
});

console.log('✅ Chrome extension assets copied to dist/');
