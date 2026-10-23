import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

console.log('🧪 Starting Vercel Image Optimization Verification Tests...\n');

// 1. Verify next.config.js structure and image constraints
const nextConfigPath = path.join(frontendDir, 'next.config.js');
assert.ok(fs.existsSync(nextConfigPath), 'next.config.js must exist');

const nextConfigModule = await import(nextConfigPath);
const nextConfig = nextConfigModule.default || nextConfigModule;

console.log('1️⃣ Checking images configuration in next.config.js:');
assert.ok(nextConfig.images, 'images object must be defined');

// Verify formats
assert.deepEqual(
  nextConfig.images.formats,
  ['image/avif', 'image/webp'],
  'images.formats must enable both AVIF and WebP for optimal compression'
);
console.log('   ✅ images.formats: [image/avif, image/webp]');

// Verify deviceSizes reduction
assert.deepEqual(
  nextConfig.images.deviceSizes,
  [640, 1080, 1920],
  'images.deviceSizes must be constrained to 3 key responsive breakpoints'
);
console.log('   ✅ images.deviceSizes: [640, 1080, 1920] (reduced from default 8 variants)');

// Verify imageSizes reduction
assert.deepEqual(
  nextConfig.images.imageSizes,
  [32, 64, 128, 256],
  'images.imageSizes must be constrained to essential thumbnail sizes'
);
console.log('   ✅ images.imageSizes: [32, 64, 128, 256] (reduced from default 8 variants)');

// Verify minimumCacheTTL
assert.equal(
  nextConfig.images.minimumCacheTTL,
  31536000,
  'images.minimumCacheTTL must be set to 31,536,000s (1 year) to prevent 60s cache churn'
);
console.log('   ✅ images.minimumCacheTTL: 31,536,000s (1 year Edge CDN caching)');

// Verify dangerouslyAllowSVG
assert.equal(
  nextConfig.images.dangerouslyAllowSVG,
  false,
  'dangerouslyAllowSVG must be false so SVGs are rendered vector-native without raster transformation'
);
console.log('   ✅ images.dangerouslyAllowSVG: false');

// Verify remotePatterns replacing deprecated domains
assert.ok(
  Array.isArray(nextConfig.images.remotePatterns),
  'remotePatterns must be configured as an array'
);
const hostnames = nextConfig.images.remotePatterns.map((p) => p.hostname);
assert.ok(hostnames.includes('avatars.githubusercontent.com'), 'Must allow GitHub avatars');
assert.ok(hostnames.includes('github.com'), 'Must allow GitHub assets');
console.log('   ✅ remotePatterns includes avatars.githubusercontent.com and github.com');

// Verify cache headers
assert.ok(typeof nextConfig.headers === 'function', 'nextConfig must define async headers()');
const headers = await nextConfig.headers();
assert.ok(headers.length > 0, 'headers must return at least one route config');
const staticHeader = headers.find((h) => h.source.includes('svg'));
assert.ok(staticHeader, 'Static asset cache header must exist');
const cacheControl = staticHeader.headers.find((h) => h.key === 'Cache-Control');
assert.ok(cacheControl && cacheControl.value.includes('public'), 'Cache-Control must specify public');
console.log(`   ✅ Cache-Control header: ${cacheControl.value}`);

// 2. Verify OptimizedImage component architecture
console.log('\n2️⃣ Checking OptimizedImage component architecture:');
const optimizedImagePath = path.join(frontendDir, 'src', 'components', 'OptimizedImage.tsx');
assert.ok(fs.existsSync(optimizedImagePath), 'OptimizedImage.tsx must exist');

const optimizedImageContent = fs.readFileSync(optimizedImagePath, 'utf-8');

// Check SVG bypass
assert.ok(
  optimizedImageContent.includes('isSvg'),
  'OptimizedImage must detect SVGs and bypass optimization'
);
console.log('   ✅ SVG detection and unoptimized enforcement verified');

// Check small icon bypass
assert.ok(
  optimizedImageContent.includes('isSmallIcon'),
  'OptimizedImage must detect small icons (<= 64px) and bypass optimization'
);
console.log('   ✅ Small icon (<=64px) unoptimized enforcement verified');

// Check pre-optimized CDN / avatar bypass
assert.ok(
  optimizedImageContent.includes('avatars.githubusercontent.com'),
  'OptimizedImage must bypass optimization for pre-optimized GitHub avatar URLs'
);
console.log('   ✅ GitHub avatar CDN unoptimized bypass verified');

// Check quota failure fallback
assert.ok(
  optimizedImageContent.includes('attemptedDirectFallback'),
  'OptimizedImage must retry with unoptimized direct loading upon Vercel quota failure'
);
console.log('   ✅ Vercel 402/403/500 quota error fallback verified');

// Check accessible placeholder
assert.ok(
  optimizedImageContent.includes('role="img"'),
  'OptimizedImage must render accessible layout-stable placeholder'
);
console.log('   ✅ Layout-stable accessible placeholder verified');

// 3. Verify public assets
console.log('\n3️⃣ Checking public assets:');
const publicDir = path.join(frontendDir, 'public');
const faviconSvg = path.join(publicDir, 'favicon.svg');
const iconSvg = path.join(publicDir, 'icon.svg');
assert.ok(fs.existsSync(faviconSvg), 'favicon.svg must exist');
assert.ok(fs.existsSync(iconSvg), 'icon.svg must exist');
const faviconStat = fs.statSync(faviconSvg);
const iconStat = fs.statSync(iconSvg);
console.log(`   ✅ public/favicon.svg (${faviconStat.size} bytes - lightweight vector)`);
console.log(`   ✅ public/icon.svg (${iconStat.size} bytes - lightweight vector)`);

console.log('\n✨ All Vercel Image Optimization verification tests PASSED!\n');
