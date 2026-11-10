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
    for (const legacy of ['converter','compressor','resizer']) {
      await page.goto(`${base}/tools/${legacy}/`, { waitUntil:'domcontentloaded' });
      await page.waitForURL(url => url.pathname === '/tools/image/' && !url.search);
      assert.equal(await page.locator('h1').innerText(), 'Image Processor');
    }

    await page.goto(`${base}/tools/image/`, { waitUntil:'networkidle' });
    assert.equal(await page.locator('h1').innerText(), 'Image Processor');
    assert.equal(await page.locator('[role="tab"]').count(), 0, 'the processor has no mode tabs');
    assert.equal(await page.locator('#do-resize').isChecked(), true, 'Resize starts enabled');
    assert.equal(await page.locator('#do-convert').isChecked(), false);
    assert.equal(await page.locator('#do-optimize').isChecked(), false);
    assert.equal(await page.locator('#resize-settings').isVisible(), true);
    assert.equal(await page.locator('#format').isDisabled(), true);
    assert.equal(await page.locator('#quality').isDisabled(), true);

    await page.locator('#do-convert').check();
    await page.locator('#format').selectOption('webp');
    await page.locator('#do-optimize').check();
    assert.equal(await page.locator('#quality-control').isVisible(), true);
    await page.locator('#format').selectOption('png');
    assert.equal(await page.locator('#quality-control').isVisible(), false, 'PNG has no quality control');
    assert.equal(await page.locator('#background-control').isVisible(), false, 'PNG has no JPEG background control');
    assert.equal(await page.locator('#optimize-note').isVisible(), true, 'PNG optimization explains how to use lossy formats');
    await page.locator('#format').selectOption('webp');
    assert.equal(await page.locator('#quality-control').isVisible(), true);
    await page.locator('#resize-mode').selectOption('longest');
    assert.equal(await page.locator('#resize-bounds').isVisible(), false);
    assert.equal(await page.locator('#resize-longest').isVisible(), true);
    await page.locator('#resize-mode').selectOption('bounds');
    await page.locator('#width').fill('10');
    await page.locator('#height').fill('10');

    const dataUrl = await page.evaluate(() => {
      const canvas=document.createElement('canvas');canvas.width=20;canvas.height=10;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#cc3344';ctx.fillRect(0,0,20,10);
      return canvas.toDataURL('image/png');
    });
    await page.locator('#files').setInputFiles({
      name:'processor-check.png',mimeType:'image/png',buffer:Buffer.from(dataUrl.split(',')[1],'base64')
    });
    assert.match(await page.locator('#status').innerText(),/Added 1 image\./,'singular batch status reads correctly');

    const combinedDownload=page.waitForEvent('download');
    await page.locator('#run').click();
    assert.equal((await combinedDownload).suggestedFilename(),'processor-check-10x5-to-webp-optimized.webp');
    await page.waitForFunction(()=>!document.querySelector('#output-summary').hidden);
    assert.match(await page.locator('#output-summary').innerText(),/smaller|larger/);
    await page.waitForFunction(()=>!document.querySelector('#run').disabled);

    await page.locator('#do-resize').uncheck();
    assert.equal(await page.locator('#resize-settings').isVisible(),false);
    const noResizeDownload=page.waitForEvent('download');
    await page.locator('#run').click();
    assert.equal((await noResizeDownload).suggestedFilename(),'processor-check-to-webp-optimized.webp','Convert and Optimize still run with Resize disabled');
    await page.waitForFunction(()=>!document.querySelector('#run').disabled);

    await page.locator('#do-optimize').uncheck();
    await page.locator('#format').selectOption('webp');
    const convertDownload=page.waitForEvent('download');
    await page.locator('#run').click();
    assert.equal((await convertDownload).suggestedFilename(),'processor-check-to-webp.webp','Convert runs with Optimize disabled');
    assert.deepEqual(errors,[],'browser JavaScript errors');

    await page.setViewportSize({width:390,height:844});
    await page.goto(`${base}/tools/image/`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('#site-header').count(),1,'one shared site header');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile layout has no horizontal overflow');
    await page.goto(`${base}/tools/qr/`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('#qr-canvas').count(),1);
    assert.match(await page.locator('#status').innerText(),/QR code ready/i);
    assert.ok(await page.locator('#qr-canvas').evaluate(canvas=>{
      const {data}=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
      for(let i=0;i<data.length;i+=4)if(data[i]<80&&data[i+1]<80&&data[i+2]<80)return true;
      return false;
    }),'QR canvas contains generated dark modules');
    assert.deepEqual(errors,[],'browser JavaScript errors across image tools');
    console.log('PASS: legacy routes, independent operation toggles, combined processing, format controls and QR rendering.');
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
