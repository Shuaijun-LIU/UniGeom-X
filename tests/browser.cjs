/* Run with Playwright installed: node tests/browser.cjs [base-url]. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.argv[2]||'http://localhost:8000/';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--disable-gpu','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-proxy-server']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#overlap').textContent.includes('/'));
  assert.equal(await page.locator('.slide:visible').count(),1);
  const old=await page.locator('#hero-cloud').getAttribute('data-observation');
  await page.locator('#next-observation').click();assert.notEqual(await page.locator('#hero-cloud').getAttribute('data-observation'),old);
  await page.locator('#slide-unigeom .motion-toggle').click();
  const a=await page.locator('#hero-cloud').evaluate(c=>c.toDataURL());await page.waitForTimeout(150);
  assert.equal(await page.locator('#hero-cloud').evaluate(c=>c.toDataURL()),a,'Paused measured view changed');
  await page.locator('#next').click();
  await page.waitForFunction(()=>document.querySelector('#grasp-workcell')?.dataset.ready==='true');
  await page.locator('.wc-event').click();
  assert.match(await page.locator('.wc-phase').innerText(),/Respond to load/);
  assert.equal(await page.locator('.wc-overlay').isVisible(),false);
  await page.locator('#wc-time').fill('16');await page.locator('#wc-time').dispatchEvent('input');
  assert.match(await page.locator('.wc-phase').innerText(),/Placed on target/);
  await page.locator('#wc-controller').selectOption('fixed-grip');
  await page.waitForFunction(()=>!document.querySelector('.wc-play').disabled);
  await page.locator('#wc-time').fill('16');await page.locator('#wc-time').dispatchEvent('input');
  assert.match(await page.locator('.wc-phase').innerText(),/Object dropped/);
  await page.locator('#next').click();await page.locator('[data-relation="transition"]').click();
  assert.match(await page.locator('#interface-caption').innerText(),/Relate changes/);
  await page.locator('label:has(#touch-connected)').click();assert.match(await page.locator('#interface-scene').textContent(),/Offline/);
  await page.locator('#next').click();await page.locator('[data-mode="conditioned"]').click();await page.locator('[data-candidate="advance"]').click();
  assert.match(await page.locator('#model-scene').textContent(),/Candidate actions/);assert.match(await page.locator('#model-caption').innerText(),/one-sided contact/);
  await page.locator('#next').click();assert.equal(await page.locator('#next').isDisabled(),true);
  await page.locator('#deck').focus();await page.keyboard.press('Home');assert.match(page.url(),/#unigeom$/);
  await page.keyboard.press('End');assert.match(page.url(),/#roadmap$/);
  await page.goBack();assert.match(page.url(),/#unigeom$/);
  for(const [width,height] of [[1440,900],[1280,720],[390,844],[320,568],[844,390]]){
    await page.setViewportSize({width,height});
    for(const key of ['unigeom','handover','interface','model','roadmap']){
      await page.evaluate(k=>location.hash=k,key);await page.waitForTimeout(100);
      assert.equal(await page.locator('.slide:visible').count(),1);
      const geometry=await page.locator('.slide:visible').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,top:el.getBoundingClientRect().top,first:el.firstElementChild.getBoundingClientRect().top}));
      assert.ok(geometry.scroll<=geometry.width+1,`${width} ${key}: horizontal overflow`);
      await page.locator('.slide:visible').evaluate(el=>el.scrollTop=0);
      const accessible=await page.locator('.slide:visible').evaluate(el=>el.firstElementChild.getBoundingClientRect().top>=el.getBoundingClientRect().top-1);
      assert.ok(accessible,`${width} ${key}: content clipped above scroll area`);
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'#unigeom');await page.waitForFunction(()=>document.querySelector('#overlap').textContent.includes('/'));
  assert.equal(await page.locator('#slide-unigeom .motion-toggle').getAttribute('aria-pressed'),'true');
  const still=await page.locator('#hero-cloud').evaluate(c=>c.toDataURL());await page.waitForTimeout(180);
  assert.equal(await page.locator('#hero-cloud').evaluate(c=>c.toDataURL()),still);
  assert.deepEqual(errors,[]);await browser.close();console.log('PASS: navigation, controls, measured data, pause, reduced motion, five viewport layouts.');
})().catch(e=>{console.error(e);process.exit(1);});
