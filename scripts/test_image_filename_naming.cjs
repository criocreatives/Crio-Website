'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { TextEncoder } = require('node:util');

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'tools/toolkit.js'), 'utf8');
assert.match(src, /\n\}\)\(\);\s*$/, 'Expected shared image-tool closure');
const testedSrc = src.replace(
  /\n\}\)\(\);\s*$/,
  '\n  globalThis.__nameTesting = { sourceFormat, outputFilename, safeUniqueNames };\n})();'
);

function naming(checked) {
  const context = {
    TextEncoder,
    document: {
      body: { dataset: { tool: 'converter' } },
      querySelector: selector => selector === '#keep-original-names' ? { checked } : null,
      createElement: () => ({ toBlob() {} })
    }
  };
  vm.runInNewContext(testedSrc, context, { filename: 'tools/toolkit.js' });
  assert.ok(context.__nameTesting);
  return context.__nameTesting;
}

const cases = [
  ['Kitchen Render.png', 'image/png', 'jpeg', 'converted', 'Kitchen Render.jpg', 'Kitchen Render-converted.jpg'],
  ['IMG_0042.jpeg', 'image/jpeg', 'webp', 'optimized', 'IMG_0042.webp', 'IMG_0042-optimized.webp'],
  ['Logo.webp', 'image/webp', 'png', 'watermarked', 'Logo.png', 'Logo-watermarked.png'],
  ['render.v2.png', 'image/png', 'webp', '1600x900', 'render.v2.webp', 'render.v2-1600x900.webp'],
  ['portrait.jpg', 'image/jpeg', 'jpeg', 'converted', 'portrait-converted.jpg', 'portrait-converted.jpg'],
  ['portrait.jpeg', 'image/jpeg', 'jpeg', 'optimized', 'portrait-optimized.jpg', 'portrait-optimized.jpg'],
  ['Photo.PNG', 'image/png', 'png', 'watermarked', 'Photo-watermarked.png', 'Photo-watermarked.png']
];
for (const [name, type, fmt, suffix, enabledName, disabledName] of cases) {
  const file = { name, type };
  assert.equal(naming(true).outputFilename(file, suffix, fmt), enabledName);
  assert.equal(naming(false).outputFilename(file, suffix, fmt), disabledName);
}

const duplicateBatch = [
  { name: 'Logo.webp' },
  { name: 'logo.webp' },
  { name: 'Logo.webp' }
];
naming(true).safeUniqueNames(duplicateBatch);
assert.deepEqual(duplicateBatch.map(x => x.name), ['Logo.webp', 'logo-2.webp', 'Logo-3.webp']);

for (const tool of ['converter', 'compressor', 'resizer', 'watermarker']) {
  const html = fs.readFileSync(path.join(root, 'tools', tool, 'index.html'), 'utf8');
  assert.equal((html.match(/id="keep-original-names"/g) || []).length, 1, tool + ': expected one filename option');
  assert.ok(html.includes('type="checkbox" id="keep-original-names"'), tool + ': checkbox is not present');
  assert.ok(html.includes('src="/tools/toolkit.js?v=3"'), tool + ': old script version');
}
console.log('PASS: 4 image tools offer basename preservation; format, original suffix, and batch collision cases verified.');
