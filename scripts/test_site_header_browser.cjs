'use strict';
/* Browser parity check for the one Crio header on every first-party shell page. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const pages = Object.keys(JSON.parse(fs.readFileSync('scripts/site-header-pages.json', 'utf8')));
for (const file of fs.readdirSync('previews/projects').filter(name => name.endsWith('.json'))) {
  pages.push(`previews/${path.basename(file, '.json')}/index.html`);
}

async function state(page) {
  return page.locator('#site-header').evaluate(header => {
    const rect = element => {
      const box = element.getBoundingClientRect();
      return [box.x, box.y, box.width, box.height].map(value => Math.round(value * 100) / 100);
    };
    const style = getComputedStyle(header);
    return {
      header: rect(header),
      radius: style.borderRadius,
      background: style.backgroundColor,
      logo: rect(header.querySelector('.header-logo')),
      scrolled: header.classList.contains('scrolled')
    };
  });
}

(async () => {
  const executablePath = process.env.CHROME_BIN || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(fs.existsSync);
  assert.ok(executablePath, 'Install Chrome/Chromium or set CHROME_BIN');
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 1024, height: 768 }, { name: 'mobile', width: 390, height: 844 }]) {
      const home = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
      await home.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
      await home.waitForFunction(() => document.querySelector('#site-header')?.style.getPropertyValue('--morph-left'));
      await home.evaluate(() => { document.body.style.minHeight = '2500px'; });
      const homeTop = await state(home);
      await home.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 240); });
      await home.waitForFunction(() => document.querySelector('#site-header')?.classList.contains('scrolled'));
      await home.waitForTimeout(60);
      const homeScrolled = await state(home);

      for (const route of pages) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:8765/${route}`, { waitUntil: 'load', timeout: 30000 });
        await page.waitForFunction(() => document.querySelector('#site-header')?.style.getPropertyValue('--morph-left'));
        assert.equal(await page.locator('#site-header').count(), 1, `${route}: one shared header`);
        assert.equal(await page.locator('#site-header .nav').count(), route === 'payment-details/index.html' ? 0 : 1, `${route}: expected nav slot`);
        await page.evaluate(() => { document.body.style.minHeight = '2500px'; });
        assert.deepEqual(await state(page), homeTop, `${route} ${viewport.name}: initial header differs from home`);
        const linkStyles = await page.locator('#site-header .nav a').evaluateAll(links => links.map(link => ({
          transform: getComputedStyle(link).textTransform,
          whiteSpace: getComputedStyle(link).whiteSpace
        })));
        const transform = linkStyles.map(link => link.transform);
        assert.ok(transform.every(value => value === 'uppercase'), `${route}: header links must render in uppercase`);
        assert.ok(linkStyles.every(link => link.whiteSpace === 'nowrap'), `${route}: menu labels must stay on one line`);
        const logoBounds = await page.locator('#site-header .header-logo').evaluate(logo => {
          const image = logo.getBoundingClientRect();
          const header = logo.closest('#site-header').getBoundingClientRect();
          return { left: image.left, right: image.right, headerLeft: header.left, headerRight: header.right };
        });
        assert.ok(logoBounds.left >= logoBounds.headerLeft && logoBounds.right <= logoBounds.headerRight, `${route}: header logo must not be clipped`);
        if (viewport.width <= 1280 && await page.locator('#site-header .menu-toggle').count()) {
          const button = page.locator('#site-header .menu-toggle');
          assert.equal(await button.isVisible(), true, `${route}: compact menu is visible before links can wrap`);
          await button.click();
          assert.equal(await page.locator('#site-header .nav').isVisible(), true, `${route}: mobile nav opens`);
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#site-header .nav').isVisible(), false, `${route}: Escape closes mobile nav`);
        }
        await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 240); });
        await page.waitForFunction(() => document.querySelector('#site-header')?.classList.contains('scrolled'));
        await page.waitForTimeout(60);
        assert.deepEqual(await state(page), homeScrolled, `${route} ${viewport.name}: scrolled header differs from home`);
        assert.deepEqual(errors, [], `${route}: browser errors`);
        console.log(`PASS ${route} ${viewport.name}`);
        await page.close();
      }
      await home.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
