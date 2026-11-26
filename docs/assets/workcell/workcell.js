import {drawTactile} from './tactile.js';
const DURATION=20;
import {createWorkcell,loadPackedJson} from './viewer.js';
const base=new URL('./',import.meta.url);
const captions={'Clear the divider':'The gripper lifts higher to carry the object over a physical divider.','Turn & transfer':'The object turns 90° during transfer and receives a second, sideways load.','Align with pocket':'The gripper lines up the object with the receiving pocket.','Seat in pocket':'The object is lowered slowly between the pocket walls.','Seated in pocket':'The released object meets the pocket position, height and orientation checks.','Placement failed':'The object did not finish seated inside the pocket.',Approach:'The gripper approaches the object. The destination stays fixed.', 'Establish contact':'Both finger pads make contact before the object leaves the table.',Lift:'A light grip supports the object during the lift.','Hold':'The robot holds the object above the table.','Respond to load':'A brief downward load increases shear at the finger pads.','Grip recovered':'Contact-force feedback increases grip, then the transfer continues.',Transfer:'The robot carries the object to the same destination.',Place:'The object is lowered onto the marked destination.',Release:'The fingers open after placing the object.',Withdraw:'The gripper withdraws; the final object position is checked.','Placed on target':'The object remains inside the destination after release.','Object dropped':'The object has left the grip. This run does not reach the destination.'};
export async function mountWorkcell(root){
 root.innerHTML=`<div class="wc-toolbar"><div class="wc-object-choice"><span class="wc-kicker">OBJECT</span><div class="segmented" aria-label="Grasp object"><button data-wc-object="rigid" aria-pressed="true">Slippery block</button><button data-wc-object="soft" aria-pressed="false">Soft sponge</button></div></div><div class="segmented" aria-label="Demo mode"><button data-wc-mode="recorded" aria-pressed="true">Recorded 3D</button><button data-wc-mode="live" aria-pressed="false">Live physics</button></div></div>
 <div class="wc-body"><div class="wc-stage"><div class="wc-canvas"><img class="wc-poster" src="${new URL('data/poster.png',base).href}" alt="Franka workcell with a compact table, obstacle and receiving pocket"/></div><div class="wc-scene-top"><span class="wc-phase" role="status">Loading workcell…</span><div class="wc-views"><button data-view="overview" aria-pressed="true">Workcell</button><button data-view="contact" aria-pressed="false">Close-up</button></div></div><div class="wc-overlay"><button class="wc-start" disabled>Loading 3D scene…</button></div><div class="wc-scene-bottom"><span>Drag to orbit · Scroll to zoom</span><span class="wc-clock">0.0 s</span></div></div>
 <aside class="wc-evidence"><div class="wc-policy"><label for="wc-controller">Controller</label><select id="wc-controller"><option value="contact-feedback">Contact feedback</option><option value="fixed-grip">Fixed grip</option></select></div><div class="wc-sensor-heading"><strong>Optical tactile feedback</strong><span>Simulated gel RGB · normal force</span></div><div class="wc-pads"><div><canvas class="wc-pad" width="140" height="160" aria-label="Left simulated optical tactile image"></canvas><span>Left <b class="wc-left">0.00 N</b></span></div><div><canvas class="wc-pad" width="140" height="160" aria-label="Right simulated optical tactile image"></canvas><span>Right <b class="wc-right">0.00 N</b></span></div></div><div class="wc-metrics"><div><span class="wc-metric-one">Peak slip</span><strong class="wc-slip">0.0 <small>mm</small></strong></div><div><span class="wc-metric-two">Applied load</span><strong class="wc-load">0.00 <small>N</small></strong></div></div><div class="wc-plot-label"><span><i class="wc-normal-key"></i>Normal</span><span><i class="wc-shear-key"></i>Shear</span><span>N</span></div><canvas class="wc-chart" width="500" height="155" aria-label="Normal and shear force over simulation time"></canvas></aside></div>
 <div class="wc-controls"><button class="wc-play" disabled>Play</button><button class="wc-reset" disabled>Reset</button><label class="sr-only" for="wc-time">Simulation time</label><input id="wc-time" type="range" min="0" max="20" step="0.02" value="0" disabled><output class="wc-time-text">0.0 / 20.0 s</output></div><div class="wc-caption"><p class="wc-explanation">Loading the recorded physical execution.</p><button class="wc-event" disabled>Inspect the load</button></div><details class="wc-details"><summary>About this demonstration</summary><p class="wc-about"></p></details>`;
 const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)];
 const tasks={
  rigid:{scene:'scene',prefix:'',dt:.002,title:'Play slip-recovery demo',baseline:'Fixed grip',event:5.9,eventLabel:'Inspect the load',about:'The rigid block receives a 1.3 N downward pulse and a 0.65 N sideways pulse. Ideal contact-force feedback adjusts grip. The robot clears a divider, turns 90° and seats the block in a pocket. Both controllers use the same initial state and disturbance.'},
  soft:{scene:'soft-scene',prefix:'soft-',dt:.001,title:'Play soft-grasp demo',baseline:'Fixed firm grip',event:6.1,eventLabel:'Inspect compression',about:'The sponge uses a reduced elastic model: eight spring-mounted contact nodes around a free carrier in MuJoCo. The visible surface follows those nodes. Compression measures the change in distance between opposite faces; this is not a calibrated foam material model. Feedback uses ideal contact forces and simulated compression; the fixed firm grip uses a constant command. The 35% compression bound is a demonstration criterion, not a measured damage threshold. The soft task uses smaller load pulses (0.12 N downward and 0.10 N sideways) and a shallow tray.'}
 };
 const commonAbout=' The arm follows a scripted path. Gel RGB is an uncalibrated optical illustration driven by contact loads, not real sensor footage or the controller input. These are task prototypes, not trained UniGeom-X results. Recorded 3D and live physics use the same controller and scene for each object.';
 const softCaptions={'Approach':'The fingers approach a porous sponge with a compliant surface.','Establish contact':'Contact feedback relaxes the grip when the sponge is squeezed too far.','Lift':'The sponge deforms between the pads as the robot lifts it.','Clear the divider':'The robot raises the sponge above the divider.','Turn & transfer':'The gripper turns and carries the sponge to the receiving tray.','Align with tray':'The gripper positions the sponge over a shallow receiving tray.','Lower into tray':'The sponge is lowered while the grip keeps its shape under control.','Release & rebound':'The fingers open and the simulated sponge recovers its shape.','Placed & recovered':'The sponge is in the tray, with peak compression below the demonstration limit.','Excess compression':'The sponge was placed, but the firm grip exceeded the compression limit.','Grip recovered':'The grip supports the sponge while monitoring its compression.','Respond to load':'A brief load tests the balance between holding and squeezing.'};
 let task='rigid',mode='recorded',which='contact-feedback',playing=false,active=true,ready=false,started=false,time=0,episode=null,sim=null,viewer=null,viewerTask=null,mj=null,mjPromise=null,serial=0,raf=0,last=0,acc=0,trace=[],dead=false;
 const abort=new AbortController(),cache=new Map(),pads=$$('.wc-pad');
 const pressed=(sel,attr,v)=>$$(sel).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[attr]===v)));
 function asset(name){if(!cache.has(name))cache.set(name,loadPackedJson(new URL('data/'+name+'.json.gz',base),abort.signal).catch(e=>{cache.delete(name);throw e;}));return cache.get(name);}
 function playUI(){$('.wc-play').textContent=playing?'Pause':time>=DURATION?'Replay':'Play';$('.wc-overlay').hidden=started;$('.wc-start').textContent=tasks[task].title;}
 function controls(enabled){ready=enabled;root.dataset.ready=String(enabled);for(const s of ['.wc-play','.wc-reset','.wc-start','#wc-controller'])$(s).disabled=!enabled;$('#wc-time').disabled=!enabled||mode==='live';$('.wc-event').disabled=!enabled||mode==='live';}
 function taskUI(){
  $('#wc-controller option[value="fixed-grip"]').textContent=tasks[task].baseline;
  $('.wc-metric-one').textContent=task==='soft'?'Compression':'Peak slip';$('.wc-metric-two').textContent=task==='soft'?'Peak compression':'Applied load';
  $('.wc-about').textContent=tasks[task].about+commonAbout;$('.wc-event').textContent=tasks[task].eventLabel;
 }
 function chart(frames,t){
  const c=$('.wc-chart').getContext('2d'),left=27,right=492,top=12,bottom=132,max=task==='soft'?10:8;
  c.clearRect(0,0,500,155);c.font='26px Manrope, sans-serif';c.fillStyle='#b0acbf';c.fillText('0',5,bottom);c.fillText(String(max),5,top+7);c.strokeStyle='#3d3947';c.lineWidth=1;
  for(const y of [top,(top+bottom)/2,bottom]){c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();}
  c.fillStyle='#d7b78f16';c.fillRect(left+5.5/DURATION*(right-left),top,.8/DURATION*(right-left),bottom-top);
  for(const [key,color]of [['normal','#68c5b4'],['shear','#d7b78f']]){c.beginPath();c.strokeStyle=color;c.lineWidth=2.5;let first=true;for(const f of frames){if(f.time>t)break;const val=f[key].reduce((a,b)=>a+b,0),x=left+f.time/DURATION*(right-left),y=bottom-Math.min(max,val)/max*(bottom-top);if(first){c.moveTo(x,y);first=false;}else c.lineTo(x,y);}c.stroke();}
  c.strokeStyle='#a29cff';c.beginPath();const x=left+t/DURATION*(right-left);c.moveTo(x,top);c.lineTo(x,bottom);c.stroke();
 }
 function readout(f){
  time=f.time;$('.wc-phase').textContent=f.phase;$('.wc-phase').classList.toggle('wc-failure',['Object dropped','Placement failed','Excess compression'].includes(f.phase));$('.wc-clock').textContent=time.toFixed(1)+' s';
  $('.wc-left').textContent=f.normal[0].toFixed(2)+' N';$('.wc-right').textContent=f.normal[1].toFixed(2)+' N';
  $('.wc-slip').innerHTML=task==='soft'?(100*f.compression).toFixed(1)+' <small>%</small>':(1000*f.peakSlip).toFixed(1)+' <small>mm</small>';
  $('.wc-load').innerHTML=task==='soft'?(100*f.peakCompression).toFixed(1)+' <small>%</small>':Math.abs(f.pulse).toFixed(2)+' <small>N</small>';
  $('.wc-explanation').textContent=(task==='soft'?softCaptions[f.phase]:null)||captions[f.phase]||f.phase;
  $('#wc-time').value=time;$('.wc-time-text').textContent=time.toFixed(1)+' / 20.0 s';pads.forEach((p,i)=>drawTactile(p,f,i));chart(mode==='recorded'?episode.frames:trace,time);
  Object.assign(root.dataset,{time:time.toFixed(3),phase:f.phase,mode,controller:which,object:task,compression:String(f.compression??0)});
 }
 function seek(t){
  t=Math.max(0,Math.min(DURATION,t));const fs=episode.frames;let lo=0,hi=fs.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(fs[mid].time<=t)lo=mid;else hi=mid-1;}
  const a=fs[lo],b=fs[Math.min(lo+1,fs.length-1)],mix=b.time>a.time?(t-a.time)/(b.time-a.time):0;
  viewer.pose(a.bodies,b.bodies,mix,a.soft,b.soft);readout({...a,time:t});
 }
 async function setup(){
  const token=++serial,currentTask=task,currentMode=mode,currentController=which,config=tasks[task];
  playing=false;started=false;controls(false);taskUI();$('.wc-overlay').hidden=false;$('.wc-start').textContent='Loading '+(task==='soft'?'sponge':'block')+'…';$('.wc-phase').textContent='Loading workcell…';
  sim?.dispose();sim=null;trace=[];time=0;acc=0;
  try{
   if(viewerTask!==currentTask){
    const [description,common]=await Promise.all([asset(config.scene),asset('scene')]);if(dead||token!==serial)return;
    const next={...description,geometries:description.sharedGeometry?common.geometries:description.geometries};
    viewer?.dispose();viewer=createWorkcell($('.wc-canvas'),next);viewerTask=currentTask;pressed('[data-view]','view','overview');
   }
   if(currentMode==='recorded'){episode=await asset(config.prefix+currentController);if(dead||token!==serial)return;seek(0);}
   else{
    const [{default:load},commonPhysics,physics,files,extra]=await Promise.all([import('./vendor/mujoco_wasm.js'),import('./physics.js'),import(currentTask==='soft'?'./soft-physics.js':'./physics.js'),asset('physics'),currentTask==='soft'?asset('soft-physics'):Promise.resolve(null)]);
    if(dead||token!==serial)return;
    mjPromise??=load().then(engine=>{commonPhysics.mountAssets(engine,files);return engine;});mj=await mjPromise;if(dead||token!==serial)return;
    if(extra)commonPhysics.mountAssets(mj,extra);sim=physics.createSimulation(mj,{feedback:currentController==='contact-feedback'});
    const f=sim.snapshot();viewer.pose(sim.bodyFrames(),undefined,0,f.soft);trace.push(f);readout(f);
   }
   controls(true);$('.wc-poster').hidden=true;playUI();
  }catch(e){if(dead||token!==serial)return;$('.wc-phase').textContent='Unable to load this task';$('.wc-start').textContent='Retry loading';$('.wc-start').disabled=false;$('.wc-explanation').textContent=e.message;console.error(e);}
 }
 function toggle(){if(!ready){setup();return;}if(time>=DURATION){if(mode==='recorded')seek(0);else{setup();return;}}playing=!playing;started=true;last=performance.now();playUI();}
 $('.wc-play').onclick=toggle;$('.wc-start').onclick=toggle;
 $('.wc-reset').onclick=()=>{if(mode==='live')setup();else{playing=false;started=false;seek(0);playUI();}};
 $('#wc-time').oninput=e=>{playing=false;started=true;seek(+e.target.value);playUI();};
 $('.wc-event').onclick=()=>{playing=false;started=true;seek(tasks[task].event);viewer.setView('contact');pressed('[data-view]','view','contact');playUI();};
 $('#wc-controller').onchange=e=>{which=e.target.value;setup();};
 $$('[data-wc-object]').forEach(b=>b.onclick=()=>{if(task===b.dataset.wcObject)return;task=b.dataset.wcObject;pressed('[data-wc-object]','wcObject',task);setup();});
 $$('[data-wc-mode]').forEach(b=>b.onclick=()=>{if(mode===b.dataset.wcMode)return;mode=b.dataset.wcMode;pressed('[data-wc-mode]','wcMode',mode);setup();});
 $$('[data-view]').forEach(b=>b.onclick=()=>{viewer?.setView(b.dataset.view);pressed('[data-view]','view',b.dataset.view);});
 await setup();let report=0;
 function tick(now){
  const dt=Math.min(.06,(now-last)/1000||0);last=now;
  if(playing&&active&&ready&&!document.hidden){
   if(mode==='recorded')seek(Math.min(DURATION,time+dt));
   else if(sim){
    const step=tasks[task].dt;acc=Math.min(.08,acc+dt);const start=performance.now();let steps=0;
    while(acc>=step&&steps<120&&sim.data.time<DURATION-1e-8&&performance.now()-start<12){sim.step();acc-=step;steps++;}
    const f=sim.snapshot();viewer.pose(sim.bodyFrames(),undefined,0,f.soft);
    if(now-report>35||f.done){trace.push(f);readout(f);report=now;}
   }
   if(time>=DURATION){playing=false;playUI();}
  }
  if(!dead)raf=requestAnimationFrame(tick);
 }
 raf=requestAnimationFrame(tick);
 return {setActive(v){active=v;last=performance.now();if(!v){playing=false;playUI();}},dispose(){dead=true;serial++;abort.abort();cancelAnimationFrame(raf);sim?.dispose();viewer?.dispose();}};
}
