'use strict';
/* Chrome browser regression suite for every manifest-managed Arch/Viz preview. */
const {chromium} = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const manifests = fs.readdirSync('previews/projects')
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join('previews/projects',f),'utf8')));
  const browser = await chromium.launch({
    executablePath:'/usr/bin/google-chrome', headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage']
  });
  try {
    for (const project of manifests) {
      assert.equal(project.schema_version,2);
      assert.equal(project.category,'arch-viz');
      const galleryCount = project.sections.reduce((total, s) => total + (s.images?.length || 0), 0);
      for (const size of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]) {
        const page = await browser.newPage({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
        const url = 'http://127.0.0.1:8765/previews/' + project.slug + '/';
        const issues = [];
        page.on('pageerror', e => issues.push(e.message));
        await page.goto(url,{waitUntil:'load',timeout:30000});
        assert.equal(await page.locator('.av-header').count(),1,url+' single header');
        assert.equal(await page.locator('.av-hero').count(),1,url+' single hero');
        assert.equal(await page.locator('h1').count(),1,url+' one title');
        assert.equal(await page.locator('.av-shot').count(),galleryCount,url+' gallery count');
        assert.equal(await page.locator('link[rel="stylesheet"]').count(),1,url+' one stylesheet');
        assert.equal(await page.locator('.av-header a[href="/previews/"]').count(),1,url+' header All Previews');
        assert.equal(await page.locator('footer a[href="/previews/"]').count(),0,url+' no footer All Previews');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(overflow <= 2,url+' horizontal overflow: '+overflow);
        if (project.hero.src) {
          await page.waitForFunction(()=>document.querySelector('.av-hero-image')?.complete,{timeout:5000});
          assert.ok(await page.locator('.av-hero-image').evaluate(el => el.naturalWidth > 0),url+' hero file loaded');
          await page.locator('.av-hero-image').evaluate(el => el.click());
          assert.equal(await page.locator('#av-dialog').evaluate(el => el.open),false,url+' hero image does not open viewer');
          assert.equal(await page.locator('.av-view-hero').count(),0,url+' no full-screen hero control');
        }
        if (size.name === 'mobile') {
          const toggle = page.locator('.av-menu-toggle');
          await toggle.click();
          assert.equal(await toggle.getAttribute('aria-expanded'),'true',url+' mobile menu expanded');
          assert.ok(await page.locator('.av-header a[href="/previews/"]').isVisible(),url+' All Previews visible in menu');
          await toggle.click();
        }
        if (galleryCount) {
          const first=page.locator('.av-shot').first();
          await first.scrollIntoViewIfNeeded();
          await first.locator('img').evaluate(el => el.decode());
          assert.ok(await first.locator('img').evaluate(el => el.naturalWidth > 0),url+' first gallery image loaded');
          await first.click();
          assert.equal(await page.locator('#av-dialog').evaluate(el => el.open),true,url+' viewer opened');
          if (galleryCount > 1) {
            const before=await page.locator('#av-count').innerText();
            await page.keyboard.press('ArrowRight');
            assert.notEqual(await page.locator('#av-count').innerText(),before,url+' viewer next image');
          }
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#av-dialog').evaluate(el => el.open),false,url+' viewer closed');
        }
        const ending = page.locator('.av-ending');
        if (await ending.count()) {
          assert.equal(await ending.evaluate(el => getComputedStyle(el).backgroundColor),'rgb(244, 244, 244)',url+' off-white ending');
        }
        assert.deepEqual(issues,[],url+' browser console errors');
        console.log('PASS',project.slug,size.name,'gallery='+galleryCount,'overflow='+overflow);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(err => {console.error(err);process.exit(1)});
