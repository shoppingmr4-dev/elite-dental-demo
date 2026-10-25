import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const fontDir = path.join(root, 'assets', 'fonts');
const manifest = JSON.parse(fs.readFileSync(path.join(fontDir, 'font-assets-manifest.json'), 'utf8'));
const cssBytes = fs.readFileSync(path.join(fontDir, 'local-fonts.css'));
const css = cssBytes.toString('utf8');
const candidateIndex = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const baselinePath = process.env.BASELINE_INDEX_PATH;
const expectedBaseSha = 'fa087349b6f4a3cce16d28f0823b94157d6866cc';
const expectedCssSha = '9c4d0550b224c77ba3719ab56fc1f76dc02d635dcf59657f0927aef751d4d0d6';
const expectedFiles = [
  'Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys43PW5fslBEg0.woff2',
  'Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys93PW5fslB.woff2',
  'Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YOG-eCRXMRrKATtYV0.woff2',
  'Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YOG-eCUXMRrKATt.woff2',
  'Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPi-OCRXMRrKATtYV0.woff2',
  'Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPi-OCUXMRrKATt.woff2',
  'UMBXrPdDqW66y0Y2usFeai3dA5E64Bc.woff2',
  'UMBXrPdDqW66y0Y2usFeaijdA5E64BdCIg.woff2'
].sort();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function normalize(value) {
  return String(value == null ? '' : value).toLowerCase().replace(/\s+/g, '').replace(/["']/g, '');
}

assert(baselinePath && fs.existsSync(baselinePath), 'BASELINE_INDEX_PATH must point to the main SHA index.html.');
const baselineIndex = fs.readFileSync(baselinePath, 'utf8');
assert(manifest.baselineSha === expectedBaseSha, 'Manifest baseline SHA differs from the requested main SHA.');
assert(manifest.cssResponseStatus === 200, 'Captured Google Fonts CSS response was not HTTP 200.');
assert(manifest.cssResponseBytes === 19668, 'Captured CSS response byte count differs from the recorded capture.');
assert(manifest.cssResponseSha256 === expectedCssSha, 'Captured CSS response SHA-256 differs from the recorded capture.');
assert(manifest.sameBodyAcrossAllRuns === true, 'The captured CSS body was not identical across all three runs.');
assert(manifest.exactSameEightWoff2UrlsAcrossAllRuns === true, 'The requested WOFF2 URL set was not identical across the three runs.');
assert(manifest.originalCssFaceRuleCount === 36, 'Expected 36 original @font-face rules.');
assert(manifest.selectedFaceRuleCount === 16, 'Expected 16 selected @font-face rules.');
assert(manifest.selectedWoff2UrlCount === 8, 'Expected exactly eight selected WOFF2 URLs.');
assert(Array.isArray(manifest.fontAssets) && manifest.fontAssets.length === 8, 'Manifest must contain exactly eight font assets.');
assert(cssBytes.byteLength === manifest.localCssBytes, 'Local CSS byte count differs from the manifest.');

const actualFiles = fs.readdirSync(fontDir).filter(name => name.endsWith('.woff2')).sort();
const manifestFiles = manifest.fontAssets.map(asset => asset.fileName).sort();
assert(JSON.stringify(actualFiles) === JSON.stringify(expectedFiles), 'The font directory contains missing or extra WOFF2 files.');
assert(JSON.stringify(manifestFiles) === JSON.stringify(expectedFiles), 'The manifest does not name exactly the eight observed WOFF2 files.');
assert(!/https?:\/\/fonts\.(?:googleapis|gstatic)\.com/i.test(css), 'Local stylesheet contains an external Google Fonts URL.');
const blocks = Array.from(css.matchAll(/@font-face\s*\{([^}]+)\}/g), match => match[1]);
assert(blocks.length === 16, 'Expected 16 local @font-face rules; found ' + blocks.length + '.');
const cssFileNames = Array.from(css.matchAll(/url\(\s*['"]?\.\/([^)'"\s]+\.woff2)['"]?\s*\)/gi), match => match[1]);
const uniqueCssFiles = Array.from(new Set(cssFileNames)).sort();
assert(JSON.stringify(uniqueCssFiles) === JSON.stringify(expectedFiles), 'Local CSS does not reference exactly the eight observed WOFF2 assets.');

let descriptorRulesChecked = 0;
for (const asset of manifest.fontAssets) {
  assert(asset.sourceUrl.endsWith('/' + asset.fileName), 'Source URL/filename mismatch for ' + asset.fileName + '.');
  assert(Array.isArray(asset.faceRules) && asset.faceRules.length > 0, 'Missing retained face descriptors for ' + asset.fileName + '.');
  const bytes = fs.readFileSync(path.join(fontDir, asset.fileName));
  assert(bytes.length === asset.downloadedBytes, 'Downloaded byte count mismatch for ' + asset.fileName + '.');
  assert(sha256(bytes) === asset.sha256, 'Downloaded SHA-256 mismatch for ' + asset.fileName + '.');
  assert(bytes.subarray(0, 4).toString('ascii') === 'wOF2', 'Invalid WOFF2 signature in ' + asset.fileName + '.');
  for (const face of asset.faceRules) {
    const expectedDescriptors = [
      'font-family:' + face.family + ';',
      'font-style:' + face.style + ';',
      'font-weight:' + face.weight + ';',
      'font-display:' + face.display + ';',
      'unicode-range:' + face.unicodeRange + ';',
      'src:url(./' + asset.fileName + ')format(woff2);'
    ];
    const matchingRules = blocks.filter(block => expectedDescriptors.every(descriptor => normalize(block).includes(normalize(descriptor))));
    assert(matchingRules.length === 1, 'Descriptor mismatch or duplicate for ' + face.family + ' weight ' + face.weight + ' in ' + asset.fileName + '. Matches: ' + matchingRules.length);
    descriptorRulesChecked++;
  }
}
assert(descriptorRulesChecked === 16, 'Expected to validate 16 retained descriptor rules; checked ' + descriptorRulesChecked + '.');

for (const license of ['OFL-Alexandria.txt', 'OFL-IBM-Plex-Sans-Arabic.txt']) {
  const content = fs.readFileSync(path.join(fontDir, license), 'utf8');
  assert(/SIL OPEN FONT LICENSE/i.test(content), 'Missing SIL Open Font License text in ' + license + '.');
}
assert(/<html\s+lang="ar"\s+dir="rtl"/i.test(candidateIndex), 'Arabic RTL document attributes changed.');
assert(/assets\/fonts\/local-fonts\.css/.test(candidateIndex), 'Candidate does not link to the local font stylesheet.');
assert(!/fonts\.(?:googleapis|gstatic)\.com/i.test(candidateIndex), 'Candidate HTML still references external Google Fonts.');
assert(candidateIndex.includes('w=2200&q=90') && candidateIndex.includes('w=1200&q=85'), 'Responsive hero image preload URLs/quality settings changed.');

function removeFontLinkLines(value) {
  return value.split(/\r?\n/).filter(line => !(/<link\b/i.test(line) && /(?:fonts\.googleapis\.com|fonts\.gstatic\.com|assets\/fonts\/local-fonts\.css)/i.test(line))).join('\n');
}
assert(removeFontLinkLines(candidateIndex) === removeFontLinkLines(baselineIndex), 'HTML has changes beyond the intended font stylesheet/preconnect links.');

const report = {
  passed: true,
  baselineSha: expectedBaseSha,
  capture: {
    status: manifest.cssResponseStatus,
    decodedBytes: manifest.cssResponseBytes,
    sha256: manifest.cssResponseSha256,
    identicalAcrossThreeRuns: manifest.sameBodyAcrossAllRuns
  },
  localCss: {
    bytes: cssBytes.byteLength,
    faceRuleCount: blocks.length,
    distinctWoff2UrlCount: uniqueCssFiles.length,
    allDescriptorsVerified: descriptorRulesChecked
  },
  assets: manifest.fontAssets.map(asset => ({
    fileName: asset.fileName,
    bytes: asset.downloadedBytes,
    sha256: asset.sha256,
    retainedDescriptors: asset.faceRules.length
  })),
  licenseFiles: ['OFL-Alexandria.txt', 'OFL-IBM-Plex-Sans-Arabic.txt'],
  rtlPreserved: true,
  heroImageUrlsAndQualityPreserved: true,
  htmlOutsideFontLinksIdenticalToMain: true
};
console.log(JSON.stringify(report, null, 2));
