const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const extensionDir = __dirname;
const distDir = path.join(extensionDir, 'dist');
const manifestPath = path.join(distDir, 'manifest.json');
const zipOutputPath = path.join(distDir, 'ai-pr-review-extension.zip');

console.log('📦 Packaging Chrome Extension for Production (Manifest V3)...');

// 1. Validate Manifest V3
if (!fs.existsSync(manifestPath)) {
  console.error('❌ Error: manifest.json not found in dist/. Run `npm run build` first.');
  process.exit(1);
}

const manifestContent = fs.readFileSync(manifestPath, 'utf8');
let manifest;
try {
  manifest = JSON.parse(manifestContent);
} catch (err) {
  console.error('❌ Error: Invalid JSON in manifest.json:', err.message);
  process.exit(1);
}

if (manifest.manifest_version !== 3) {
  console.error(`❌ Error: Expected manifest_version 3, got ${manifest.manifest_version}`);
  process.exit(1);
}

if (!manifest.name || !manifest.version) {
  console.error('❌ Error: Manifest must contain name and version');
  process.exit(1);
}

if (!manifest.background || !manifest.background.service_worker) {
  console.error('❌ Error: Manifest V3 must declare background.service_worker');
  process.exit(1);
}

console.log(`✅ Manifest V3 validated: ${manifest.name} v${manifest.version}`);

// Verify required files exist in dist/
const requiredDistFiles = [
  'manifest.json',
  manifest.background.service_worker,
  'popup.html',
  'options.html',
];

for (const file of requiredDistFiles) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: Required extension file missing in dist/: ${file}`);
    process.exit(1);
  }
}

// 2. Package into ZIP
// Minimal, standalone standard PKZIP writer in pure JS (no external dependencies required)
function createZip(files, outputPath) {
  const localHeaders = [];
  const centralDirHeaders = [];
  let offset = 0;

  for (const { relativePath, content } of files) {
    const filenameBuffer = Buffer.from(relativePath, 'utf8');
    const compressed = zlib.deflateRawSync(content);
    const uncompressedSize = content.length;
    const compressedSize = compressed.length;
    const crc = crc32(content);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + filenameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4); // version needed to extract (2.0)
    localHeader.writeUInt16LE(0, 6); // general purpose bit flag
    localHeader.writeUInt16LE(8, 8); // compression method (8 = Deflate)
    localHeader.writeUInt16LE(0, 10); // file last mod time
    localHeader.writeUInt16LE(0, 12); // file last mod date
    localHeader.writeUInt32LE(crc, 14); // crc-32
    localHeader.writeUInt32LE(compressedSize, 18); // compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // uncompressed size
    localHeader.writeUInt16LE(filenameBuffer.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length
    filenameBuffer.copy(localHeader, 30);

    localHeaders.push(localHeader, compressed);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + filenameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // central directory header signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed to extract
    centralHeader.writeUInt16LE(0, 8); // general purpose bit flag
    centralHeader.writeUInt16LE(8, 10); // compression method (Deflate)
    centralHeader.writeUInt16LE(0, 12); // file last mod time
    centralHeader.writeUInt16LE(0, 14); // file last mod date
    centralHeader.writeUInt32LE(crc, 16); // crc-32
    centralHeader.writeUInt32LE(compressedSize, 20); // compressed size
    centralHeader.writeUInt32LE(uncompressedSize, 24); // uncompressed size
    centralHeader.writeUInt16LE(filenameBuffer.length, 28); // file name length
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // file comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal file attributes
    centralHeader.writeUInt32LE(0, 38); // external file attributes
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header
    filenameBuffer.copy(centralHeader, 46);

    centralDirHeaders.push(centralHeader);

    offset += localHeader.length + compressed.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralDirHeaders.reduce((acc, h) => acc + h.length, 0);

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // end of central dir signature
  eocd.writeUInt16LE(0, 4); // number of this disk
  eocd.writeUInt16LE(0, 6); // number of the disk with the start of central directory
  eocd.writeUInt16LE(files.length, 8); // total number of entries on this disk
  eocd.writeUInt16LE(files.length, 10); // total number of entries
  eocd.writeUInt32LE(centralDirSize, 12); // size of the central directory
  eocd.writeUInt32LE(centralDirOffset, 16); // offset of start of central directory
  eocd.writeUInt16LE(0, 20); // zip file comment length

  const allBuffers = [...localHeaders, ...centralDirHeaders, eocd];
  const finalZipBuffer = Buffer.concat(allBuffers);
  fs.writeFileSync(outputPath, finalZipBuffer);
}

// CRC-32 Lookup Table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Collect dist files (excluding existing zip files)
const distEntries = fs.readdirSync(distDir);
const filesToPackage = [];

for (const entry of distEntries) {
  if (entry.endsWith('.zip') || entry.startsWith('.')) continue;
  const fullPath = path.join(distDir, entry);
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    filesToPackage.push({
      relativePath: entry,
      content: fs.readFileSync(fullPath),
    });
  }
}

createZip(filesToPackage, zipOutputPath);
const zipStats = fs.statSync(zipOutputPath);
console.log(`✅ Packaged ${filesToPackage.length} files into ${zipOutputPath} (${(zipStats.size / 1024).toFixed(1)} KB)`);
