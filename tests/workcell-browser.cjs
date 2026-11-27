const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--disable-gpu','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-proxy-server']});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto((process.argv[2]||'http://127.0.0.1:8943/')+'#handover');
 const ready=()=>page.waitForFunction(()=>document.querySelector('#grasp-workcell')?.dataset.ready==='true',null,{timeout:90000});
 const waitTime=t=>page.waitForFunction(t=>+document.querySelector('#grasp-workcell').dataset.time>=t,t,{timeout:300000});
 await ready();assert.equal(await page.locator('.wc-panel').count(),2);await page.click('[data-wc-mode=live]');await ready();await page.click('.wc-play');await waitTime(2);
 await page.click('#next');const paused=await page.locator('#grasp-workcell').getAttribute('data-time');await page.waitForTimeout(300);assert.equal(await page.locator('#grasp-workcell').getAttribute('data-time'),paused);
 await page.click('#previous');assert.equal(await page.locator('.wc-play').innerText(),'Play both');await page.click('.wc-play');await waitTime(20);
 assert.deepEqual(await page.locator('.wc-phase').allTextContents(),['Seated in pocket','Placement failed']);assert.deepEqual(await page.locator('.wc-panel').evaluateAll(ps=>ps.map(p=>p.dataset.time)),['20.000','20.000']);
 const fallen=await page.locator('.wc-panel').last().getAttribute('data-object-position');await page.waitForTimeout(300);assert.equal(await page.locator('.wc-panel').last().getAttribute('data-object-position'),fallen);
 await page.click('.wc-reset');await ready();assert.equal(+await page.locator('#grasp-workcell').getAttribute('data-time'),0);
 await page.click('[data-wc-mode=recorded]');await ready();await page.locator('#wc-time').fill('20');await page.locator('#wc-time').dispatchEvent('input');assert.deepEqual(await page.locator('.wc-phase').allTextContents(),['Seated in pocket','Placement failed']);
 assert.deepEqual(errors,[]);console.log('PASS: synchronized dual rigid live runs, terminal states, no automatic restart, pause, reset, recorded/live transitions.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
