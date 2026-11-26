const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--disable-gpu','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-proxy-server']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto((process.argv[2]||'http://localhost:8000/')+'#handover');
 const ready=()=>page.waitForFunction(()=>document.querySelector('#grasp-workcell')?.dataset.ready==='true',null,{timeout:60000});
 const waitTime=t=>page.waitForFunction(t=>+document.querySelector('#grasp-workcell').dataset.time>=t,t,{timeout:90000});
 await ready();await page.locator('[data-wc-mode=live]').click();await ready();
 assert.equal(await page.locator('#wc-time').isDisabled(),true);
 await page.locator('.wc-play').click();await waitTime(2);
 await page.locator('#next').click();const paused=await page.locator('#grasp-workcell').getAttribute('data-time');
 await page.waitForTimeout(350);assert.equal(await page.locator('#grasp-workcell').getAttribute('data-time'),paused,'Hidden live simulation advanced');
 await page.locator('#previous').click();assert.equal(await page.locator('.wc-play').innerText(),'Play');
 await page.locator('.wc-play').click();await waitTime(20);
 assert.equal(await page.locator('.wc-phase').innerText(),'Seated in pocket');
 await page.locator('.wc-reset').click();await ready();assert.equal(+await page.locator('#grasp-workcell').getAttribute('data-time'),0);
 await page.locator('#wc-controller').selectOption('fixed-grip');await ready();await page.locator('.wc-play').click();await waitTime(20);
 assert.equal(await page.locator('.wc-phase').innerText(),'Placement failed');
 await page.locator('[data-wc-mode=recorded]').click();await ready();await page.locator('#wc-time').fill('20');await page.locator('#wc-time').dispatchEvent('input');
 assert.equal(await page.locator('.wc-phase').innerText(),'Placement failed');
 assert.deepEqual(errors,[]);console.log('PASS: live success/failure, pause on exit, reset and recorded/live transitions.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
