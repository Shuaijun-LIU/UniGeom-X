const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--disable-gpu','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-proxy-server']});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});await page.goto((process.argv[2]||'http://127.0.0.1:8943/')+'#handover');
 const ready=()=>page.waitForFunction(()=>document.querySelector('#grasp-workcell')?.dataset.ready==='true',null,{timeout:90000});
 const seek=async t=>{await page.locator('#wc-time').fill(String(t));await page.locator('#wc-time').dispatchEvent('input');};
 await ready();await page.click('[data-wc-object=soft]');await ready();await seek(6);const compression=await page.locator('.wc-panel').evaluateAll(ps=>ps.map(p=>+p.dataset.compression));assert.ok(compression[0]>.1&&compression[1]>.45);
 await seek(20);assert.deepEqual(await page.locator('.wc-phase').allTextContents(),['Placed & recovered','Excess compression']);
 await page.click('[data-wc-mode=live]');await ready();await page.click('.wc-play');
 const progress=setInterval(async()=>{try{console.log('Live sponge clock:',await page.locator('#grasp-workcell').getAttribute('data-time'));}catch{}},20000);
 try{await page.waitForFunction(()=>+document.querySelector('#grasp-workcell').dataset.time>=20,null,{timeout:300000});}finally{clearInterval(progress);}

 assert.deepEqual(await page.locator('.wc-phase').allTextContents(),['Placed & recovered','Excess compression']);assert.deepEqual(await page.locator('.wc-panel').evaluateAll(ps=>ps.map(p=>p.dataset.time)),['20.000','20.000']);
 for(const c of await page.locator('.wc-panel').evaluateAll(ps=>ps.map(p=>+p.dataset.compression)))assert.ok(c<.01);
 await page.click('.wc-reset');await ready();assert.equal(+await page.locator('#grasp-workcell').getAttribute('data-time'),0);
 await page.click('[data-wc-object=rigid]');await ready();await page.click('[data-wc-mode=recorded]');await ready();await seek(20);assert.deepEqual(await page.locator('.wc-phase').allTextContents(),['Seated in pocket','Placement failed']);
 assert.deepEqual(errors,[]);console.log('PASS: dual sponge recordings and full live runs, shared clock, elastic recovery, reset and cross-task switching.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
