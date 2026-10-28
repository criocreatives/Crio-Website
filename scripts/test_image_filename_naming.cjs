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
  '\n  globalThis.__nameTesting = { sourceFormat, outputFilename, safeUniqueNames, resizeDimensions };\n})();'
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
  const expectedVersion = tool === 'resizer' ? '4' : '3';
  assert.ok(html.includes('src="/tools/toolkit.js?v=' + expectedVersion + '"'), tool + ': old script version');
}

const { resizeDimensions } = naming(false);
const resized = (width, height, opts) => {
  const result = resizeDimensions(width, height, opts);
  return [result.width, result.height];
};
const longest = (size, allowUp = false) =>
  ({ mode: 'longest', longest: size, maxW: 1920, maxH: 1080, ratio: true, allowUp });
const bounds = (ratio, allowUp = false) =>
  ({ mode: 'bounds', maxW: 1920, maxH: 1080, ratio, allowUp });
assert.deepEqual(resized(4000, 3000, longest(1920)), [1920, 1440], 'landscape long edge');
assert.deepEqual(resized(3000, 4000, longest(1920)), [1440, 1920], 'portrait long edge');
assert.deepEqual(resized(3000, 3000, longest(1920)), [1920, 1920], 'square long edge');
assert.deepEqual(resized(800, 600, longest(1920)), [800, 600], 'no unwanted upscale');
assert.deepEqual(resized(800, 600, longest(1920, true)), [1920, 1440], 'explicit upscale');
assert.deepEqual(resized(4000, 3000, bounds(true)), [1440, 1080], 'old fit mode preserved');
assert.deepEqual(resized(4000, 3000, bounds(false)), [1920, 1080], 'old exact dimensions preserved');
assert.throws(() => resizeDimensions(4000, 3000, longest(0)), /Longest side/);
assert.throws(() => resizeDimensions(4000, 3000, longest(40000)), /Longest side/);
const resizerHTML=fs.readFileSync(path.join(root, 'tools/resizer/index.html'), 'utf8');
for(const id of ['resize-mode', 'resize-bounds', 'resize-longest', 'resize-ratio', 'longest-side']) {
  assert.ok(resizerHTML.includes('id="' + id + '"'), 'Missing resizer control: ' + id);
}
assert.ok(resizerHTML.includes('<option value="longest">Longest side</option>'));

console.log('PASS: 4 image tools preserve export names; resizer long-edge, upscaling and existing modes tested.');
