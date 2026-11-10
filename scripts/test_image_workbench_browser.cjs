'use strict';
const assert = require('node:assert/strict');
let browserLib;
try { browserLib = require('playwright'); }
catch { browserLib = require('playwright-core'); }
const { chromium } = browserLib;
const base = process.env.BASE_URL || 'http://127.0.0.1:8765';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const [legacy, mode] of [['converter','convert'],['compressor','optimize'],['resizer','resize']]) {
      await page.goto(`${base}/tools/${legacy}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(url => url.pathname === '/tools/image/' && url.searchParams.get('mode') === mode);
      assert.equal(await page.locator(`[data-mode="${mode}"][role="tab"]`).getAttribute('aria-selected'), 'true');
    }

    await page.goto(`${base}/tools/image/?mode=resize`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#resize-bounds').isVisible(), true);
    assert.equal(await page.locator('#optimize-note').isVisible(), false);
    await page.locator('#format').selectOption('png');
    assert.equal(await page.locator('#quality-control').isVisible(), false, 'PNG has no quality slider');
    assert.equal(await page.locator('#background-control').isVisible(), false, 'PNG has no JPEG background control');
    await page.locator('#format').selectOption('jpeg');
    assert.equal(await page.locator('#quality-control').isVisible(), true);
    assert.equal(await page.locator('#background-control').isVisible(), true);

    await page.locator('#tab-optimize').click();
    assert.equal(await page.locator('#resize-bounds').isVisible(), false);
    assert.equal(await page.locator('#optimize-note').isVisible(), true);
    assert.equal(await page.locator('#format').inputValue(), 'jpeg', 'Optimize keeps the selected supported JPEG format');
    assert.equal(await page.locator('#format option[value="png"]').evaluate(option => option.hidden), true, 'PNG cannot be chosen for Optimize');
    assert.match(await page.locator('#run').innerText(), /OPTIMIZE/);
    await page.locator('#format').selectOption('webp');
    await page.locator('#tab-convert').click();
    assert.equal(await page.locator('#format option[value="png"]').evaluate(option => option.hidden), false, 'PNG remains available for Convert');
    assert.equal(await page.locator('#format option[value="original"]').evaluate(option => option.hidden), true, 'original format is a Resize-only option');

    await page.locator('#tab-resize').click();
    await page.locator('#format').selectOption('original');
    await page.locator('#width').fill('10');
    await page.locator('#height').fill('10');
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 20; canvas.height = 10;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#cc3344'; ctx.fillRect(0,0,20,10);
      return canvas.toDataURL('image/png');
    });
    await page.locator('#files').setInputFiles({
      name: 'workbench-check.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64')
    });
    assert.match(await page.locator('#status').innerText(), /Added 1 image\./, 'singular batch status reads correctly');
    assert.equal(await page.locator('#quality-control').isVisible(), false, 'original PNG has no quality setting');
    assert.equal(await page.locator('#background-control').isVisible(), false, 'original PNG has no JPEG background setting');
    const resizeDownload = page.waitForEvent('download');
    await page.locator('#run').click();
    const resized = await resizeDownload;
    assert.equal(resized.suggestedFilename(), 'workbench-check-10x5.png');
    await page.waitForFunction(() => document.querySelector('#run').disabled === false);

    await page.locator('#tab-optimize').click();
    const optimizeDownload = page.waitForEvent('download');
    await page.locator('#run').click();
    const optimized = await optimizeDownload;
    assert.equal(optimized.suggestedFilename(), 'workbench-check-optimized.webp');
    await page.waitForFunction(() => !document.querySelector('#output-summary').hidden);
    assert.match(await page.locator('#output-summary').innerText(), /KB|B/);
    assert.match(await page.locator('#output-summary').innerText(), /smaller|larger/);
    await page.locator('#tab-convert').click();
    await page.locator('#format').selectOption('png');
    const convertDownload=page.waitForEvent('download');
    await page.locator('#run').click();
    assert.equal((await convertDownload).suggestedFilename(),'workbench-check-converted.png');
    assert.deepEqual(errors, [], 'browser JavaScript errors');

    await page.setViewportSize({ width:390, height:844 });
    await page.goto(`${base}/tools/image/?mode=convert`, { waitUntil:'networkidle' });
    assert.equal(await page.locator('#site-header').count(), 1, 'one shared site header');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile layout has no horizontal overflow');
    assert.equal(await page.locator('[role="tab"]').evaluateAll(tabs => new Set(tabs.map(tab => Math.round(tab.getBoundingClientRect().y))).size), 1, 'mode tabs stay on one line on mobile');
    await page.goto(`${base}/tools/qr/`, { waitUntil:'networkidle' });
    assert.equal(await page.locator('#qr-canvas').count(), 1);
    assert.match(await page.locator('#status').innerText(), /QR code ready/i);
    assert.ok(await page.locator('#qr-canvas').evaluate(canvas => {
      const { data }=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
      for(let index=0;index<data.length;index+=4) if(data[index]<80&&data[index+1]<80&&data[index+2]<80) return true;
      return false;
    }), 'QR canvas contains generated dark modules');
    assert.deepEqual(errors, [], 'browser JavaScript errors across image tools');
    console.log('PASS: legacy route modes, format-specific settings, resize export and optimization summary.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
