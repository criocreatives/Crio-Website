'use strict';
/* Chrome browser regression suite for every manifest-managed Arch/Viz preview. */
const {chromium} = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
async function headerState(page) {
  return page.locator('#site-header').evaluate(el => {
    const rect = node => {
      const r=node.getBoundingClientRect();
      return [r.x,r.y,r.width,r.height].map(value=>Math.round(value*100)/100);
    };
    const style=getComputedStyle(el);
    return {
      outer:rect(el),background:style.backgroundColor,radius:style.borderRadius,
      padding:style.padding,border:style.borderWidth,shadow:style.boxShadow,
      inner:rect(el.querySelector('.header-inner')),
      logo:rect(el.querySelector('.header-logo'))
    };
  });
}
(async () => {
  const manifests = fs.readdirSync('previews/projects')
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join('previews/projects',f),'utf8')));
  const browser = await chromium.launch({
    executablePath:process.env.CHROME_BIN || ['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync), headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage']
  });
  const sizes = [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}];
  const homeReference = {};
  const referencePages = [];
  try {
    for (const size of sizes) {
      const reference=await browser.newPage({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
      referencePages.push(reference);
      await reference.goto('http://127.0.0.1:8765/',{waitUntil:'load',timeout:30000});
      await reference.waitForFunction(()=>document.querySelector('#site-header')?.style.getPropertyValue('--morph-left'));
      homeReference[size.name]={top:await headerState(reference)};
      await reference.evaluate(()=>window.scrollTo(0,240));
      await reference.waitForFunction(()=>document.querySelector('#site-header')?.classList.contains('scrolled'));
      await reference.waitForTimeout(500);
      homeReference[size.name].scrolled=await headerState(reference);
      await reference.evaluate(()=>window.scrollTo(0,0));
      await reference.waitForFunction(()=>!document.querySelector('#site-header')?.classList.contains('scrolled'));
    }
    for (const project of manifests) {
      assert.equal(project.schema_version,2);
      assert.equal(project.category,'arch-viz');
      const galleryCount = project.sections.reduce((total, s) => total + (s.images?.length || 0), 0);
      for (const size of sizes) {
        const page = await browser.newPage({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
        const url = 'http://127.0.0.1:8765/previews/' + project.slug + '/';
        const issues = [];
        page.on('pageerror', e => issues.push(e.message));
        await page.goto(url,{waitUntil:'load',timeout:30000});
        assert.equal(await page.locator('.site-header').count(),1,url+' single header');
        assert.equal(await page.locator('#site-header').count(),1,url+' shared site header controller');
        assert.equal(await page.locator('script[src^="/assets/js/site-header.js"]').count(),1,url+' shared site header morph');
        assert.equal(await page.locator('link[href="/assets/css/site-header.css?v=3"]').count(),1,url+' shared site header stylesheet');
        assert.equal(await page.locator('link[href="/style.css?v=4"]').count(),1,url+' exact home header stylesheet');
        assert.equal(await page.locator('link[href="/previews/assets/css/arch-viz.css?v=5"]').count(),1,url+' current Arch/Viz layout stylesheet');
        assert.equal(await page.locator('.av-hero').count(),1,url+' single hero');
        assert.equal(await page.locator('h1').count(),1,url+' one title');
        assert.equal(await page.locator('.av-shot').count(),galleryCount,url+' gallery count');
        assert.equal(await page.locator('.av-expand').count(),0,url+' gallery thumbnails have no corner expand icons');
        assert.equal(await page.locator('link[rel="stylesheet"]').count(),3,url+' Arch/Viz, site and shared header stylesheets');
        assert.equal(await page.locator('.site-header a[href="/previews/"]').count(),1,url+' header All Previews');
        assert.equal(await page.locator('footer a[href="/previews/"]').count(),0,url+' no footer All Previews');
        assert.ok(await page.locator('#site-nav a').evaluateAll(links => links.every(link => getComputedStyle(link).textTransform === 'uppercase')),url+' header links uppercase');
        assert.equal(await page.locator('.menu-toggle').evaluate(el => getComputedStyle(el).textTransform),'uppercase',url+' menu label uppercase');
        assert.equal(await page.locator('.av-caption').count(),1,url+' single project label strip');
        assert.equal(await page.locator('.av-caption').evaluate(el => getComputedStyle(el).textTransform),'uppercase',url+' project label uppercase');
        const topStack = await page.evaluate(() => {
          const caption = document.querySelector('.av-caption').getBoundingClientRect();
          const hero = document.querySelector('.av-hero').getBoundingClientRect();
          return {bodyTop:parseFloat(getComputedStyle(document.body).paddingTop),captionTop:caption.top,captionHeight:caption.height,heroTop:hero.top};
        });
        assert.equal(topStack.captionTop,topStack.bodyTop,url+' label strip occupies the paper header row');
        assert.equal(topStack.heroTop,topStack.bodyTop+topStack.captionHeight,url+' hero begins below the header and label strip');
        assert.deepEqual(await headerState(page),homeReference[size.name].top,url+' header matches home page at page top');
        const sectionText = await page.locator('.av-section-head').first().evaluate(el => {
          const heading = el.querySelector('h2');
          const paragraph=el.querySelector('p:not(.av-section-label)');
          const list=el.querySelector('ul');
          return {alignment:getComputedStyle(heading).textAlign,headLeft:heading.getBoundingClientRect().left,containerLeft:el.getBoundingClientRect().left,paragraphWidth:paragraph?.getBoundingClientRect().width,listWidth:list?.getBoundingClientRect().width,containerWidth:el.getBoundingClientRect().width};
        });
        assert.equal(sectionText.alignment,'left',url+' section text left aligned');
        assert.ok(Math.abs(sectionText.headLeft-sectionText.containerLeft)<2,url+' section heading starts at the text block edge');
        if(sectionText.paragraphWidth) assert.ok(Math.abs(sectionText.paragraphWidth-sectionText.containerWidth)<2,url+' section paragraph uses the full content width');
        if(sectionText.listWidth) assert.ok(Math.abs(sectionText.listWidth-sectionText.containerWidth)<2,url+' section list uses the full content width');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(overflow <= 2,url+' horizontal overflow: '+overflow);
        await page.evaluate(() => {
          document.body.style.minHeight=Math.max(document.body.scrollHeight,innerHeight+400)+'px';
          window.scrollTo(0,240);
        });
        await page.waitForFunction(() => document.querySelector('#site-header')?.classList.contains('scrolled'));
        await page.waitForTimeout(500);
        const compactHeader = await headerState(page);
        assert.equal(compactHeader.outer[0],0,url+' morphed header flush left');
        assert.equal(compactHeader.outer[1],0,url+' morphed header pinned to top');
        assert.equal(compactHeader.outer[2],size.width,url+' morphed header spans viewport');
        assert.deepEqual(compactHeader,homeReference[size.name].scrolled,url+' morphed header exactly matches home page');
        assert.equal(await page.locator('.av-caption').evaluate(el => getComputedStyle(el).opacity),'0',url+' label strip tucks away in compact header');
        await page.evaluate(() => { window.scrollTo(0,0); document.body.style.minHeight=''; });
        await page.waitForFunction(() => !document.querySelector('#site-header')?.classList.contains('scrolled'));
        if (project.hero.src) {
          await page.waitForFunction(()=>document.querySelector('.av-hero-image')?.complete,{timeout:5000});
          assert.ok(await page.locator('.av-hero-image').evaluate(el => el.naturalWidth > 0),url+' hero file loaded');
          await page.locator('.av-hero-image').evaluate(el => el.click());
          assert.equal(await page.locator('#av-dialog').evaluate(el => el.open),false,url+' hero image does not open viewer');
          assert.equal(await page.locator('.av-view-hero').count(),0,url+' no full-screen hero control');
        }
        if (size.name === 'mobile') {
          const toggle = page.locator('.menu-toggle');
          await toggle.click();
          assert.equal(await toggle.getAttribute('aria-expanded'),'true',url+' mobile menu expanded');
          assert.ok(await page.locator('.site-header a[href="/previews/"]').isVisible(),url+' All Previews visible in menu');
          await toggle.click();
        }
        if (galleryCount) {
          const first=page.locator('.av-shot').first();
          await first.scrollIntoViewIfNeeded();
          await first.locator('img').evaluate(el => el.decode());
          assert.ok(await first.locator('img').evaluate(el => el.naturalWidth > 0),url+' first gallery image loaded');
          const maxGalleryHeight=Math.min(size.height*(size.width<=640?.58:.68),720);
          assert.ok(await first.locator('img').evaluate(el => el.getBoundingClientRect().height <= Math.min(innerHeight*(innerWidth<=640?.58:.68),720)+2),url+' first gallery image is height limited (limit '+maxGalleryHeight+')');
          await first.click();
          assert.equal(await page.locator('#av-dialog').evaluate(el => el.open),true,url+' viewer opened');
          const viewerLayout=await page.locator('#av-dialog').evaluate(dialog=>{
            const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
            return {dialog:rect(dialog),body:rect(dialog.querySelector('.av-dialog-body')),image:rect(dialog.querySelector('#av-full')),prev:rect(dialog.querySelector('#av-prev')),next:rect(dialog.querySelector('#av-next'))};
          });
          assert.ok(Math.abs(viewerLayout.dialog.width-size.width)<2&&Math.abs(viewerLayout.dialog.height-size.height)<2,url+' viewer fills the viewport');
          if(size.name==='mobile'){
            assert.ok(viewerLayout.image.width>=size.width-30,url+' mobile viewer image uses nearly the full screen width');
            assert.ok(viewerLayout.prev.y>=viewerLayout.image.bottom,url+' mobile previous control is below the image');
            assert.ok(viewerLayout.next.y>=viewerLayout.image.bottom,url+' mobile next control is below the image');
            assert.ok(viewerLayout.next.bottom<=viewerLayout.dialog.bottom,url+' mobile navigation stays inside the viewer');
            assert.ok(Math.abs(viewerLayout.prev.y-viewerLayout.next.y)<2,url+' mobile controls share the bottom row');
          }else assert.ok(viewerLayout.image.width>=viewerLayout.body.width*.7,url+' desktop viewer image uses most of the available width');
          if (galleryCount > 1) {
            const before=await page.locator('#av-count').innerText();
            await page.keyboard.press('ArrowRight');
            assert.notEqual(await page.locator('#av-count').innerText(),before,url+' viewer next image');
            await page.locator('#av-prev').click();
            assert.equal(await page.locator('#av-count').innerText(),before,url+' viewer previous control');
            await page.locator('#av-next').click();
            assert.notEqual(await page.locator('#av-count').innerText(),before,url+' viewer next control');
          }
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#av-dialog').evaluate(el => el.open),false,url+' viewer closed');
        }
        if(project.slug==='boscobel-heights-residence'){
          const tall=page.locator('.av-shot img[src$="Image17.png"]');
          await tall.scrollIntoViewIfNeeded();
          await tall.evaluate(el=>el.decode());
          const tallHeight=await tall.evaluate(el=>el.getBoundingClientRect().height);
          const tallLimit=Math.min(size.height*(size.name==='mobile'?.58:.68),720);
          assert.ok(tallHeight<=tallLimit+2,url+' Image17 is height limited: '+tallHeight+' > '+tallLimit);
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
  } finally { await Promise.all(referencePages.map(page=>page.close())); await browser.close(); }
})().catch(err => {console.error(err);process.exit(1)});
