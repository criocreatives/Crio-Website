'use strict';
// Browser regression checks for generated Crio preview pages.
// Usage: NODE_PATH=/tmp/crio-preview-qa/node_modules node scripts/test_crio_preview_browser.cjs
const {chromium} = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const manifests = fs.readdirSync('previews/projects')
    .filter(name => name.endsWith('.json'))
    .map(name => JSON.parse(fs.readFileSync(path.join('previews/projects',name),'utf8')));
  const browser = await chromium.launch({
    executablePath:'/usr/bin/google-chrome',headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage']
  });
  try {
    for(const project of manifests){
      const n=project.gallery.sections.reduce((sum,s)=>sum+s.images.length,0);
      for(const device of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
        const page = await browser.newPage({
          viewport:{width:device.width,height:device.height},reducedMotion:'reduce'
        });
        const url='http://127.0.0.1:8765/previews/'+project.slug+'/';
        await page.goto(url,{waitUntil:'load',timeout:30000});
        await page.waitForFunction(()=>document.body.classList.contains('crio-ed'));
        await page.waitForFunction(()=>document.querySelector('.hero-image').naturalWidth>0);
        const metrics = await page.evaluate(()=>{
          const style=selector=>getComputedStyle(document.querySelector(selector));
          const box=document.querySelector('.gallery .shot').getBoundingClientRect();
          return {
            title:style('.hero h1').color,
            closing:style('.end-section h2').color,
            closingBackground:style('.end-section').backgroundColor,
            width:document.documentElement.scrollWidth,
            bar:document.querySelectorAll('.crio-ed-bar').length,
            images:document.querySelectorAll('.gallery .shot').length,
            sections:document.querySelectorAll('.collection').length,
            galleryImageLoaded:document.querySelector('.gallery .shot img').naturalWidth>0,
            shotRatio:box.width/box.height,
            oldStyles:document.querySelectorAll('style').length
          };
        });
        assert.equal(metrics.title,'rgb(244, 244, 244)',url+' white hero text');
        assert.equal(metrics.closing,'rgb(24, 24, 24)',url+' dark closing text');
        assert.equal(metrics.closingBackground,'rgb(244, 244, 244)',url+' off-white closing');
        assert.equal(metrics.images,n,url+' gallery size');
        assert.equal(metrics.sections,project.gallery.sections.length,url+' section count');
        assert.equal(metrics.bar,1,url+' single site header');
        assert.equal(metrics.oldStyles,0,url+' no page-level stylesheet');
        assert.ok(metrics.width<=device.width+2,url+' unwanted horizontal overflow');
        assert.ok(metrics.galleryImageLoaded,url+' gallery image missing');
        const ratio=project.gallery.default_aspect.split('/').map(Number);
        assert.ok(Math.abs(metrics.shotRatio-ratio[0]/ratio[1])<0.03,url+' gallery ratio');
        await page.locator('.gallery .shot').first().click();
        assert.equal(await page.locator('#lightbox').getAttribute('aria-hidden'),'false');
        await page.keyboard.press('ArrowRight');
        assert.match(await page.locator('#lightbox-counter').innerText(),new RegExp('02 / '+n));
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#lightbox').getAttribute('aria-hidden'),'true');
        console.log('PASS',project.slug,device.name,JSON.stringify(metrics));
        await page.close();
      }
    }
  }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
