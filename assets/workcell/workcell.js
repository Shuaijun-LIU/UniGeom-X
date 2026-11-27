import {drawTactile} from './tactile.js';
const DURATION=20;
import {createWorkcell,loadPackedJson} from './viewer.js';
const base=new URL('./',import.meta.url);
const captions={'Clear the divider':'The gripper lifts higher to carry the object over a physical divider.','Turn & transfer':'The object turns 90° during transfer and receives a second, sideways load.','Align with pocket':'The gripper lines up the object with the receiving pocket.','Seat in pocket':'The object is lowered slowly between the pocket walls.','Seated in pocket':'The released object meets the pocket position, height and orientation checks.','Placement failed':'The object did not finish seated inside the pocket.',Approach:'The gripper approaches the object. The destination stays fixed.', 'Establish contact':'Both finger pads make contact before the object leaves the table.',Lift:'A light grip supports the object during the lift.','Hold':'The robot holds the object above the table.','Respond to load':'A brief downward load increases shear at the finger pads.','Grip recovered':'Contact-force feedback increases grip, then the transfer continues.',Transfer:'The robot carries the object to the same destination.',Place:'The object is lowered onto the marked destination.',Release:'The fingers open after placing the object.',Withdraw:'The gripper withdraws; the final object position is checked.','Placed on target':'The object remains inside the destination after release.','Object dropped':'The object has left the grip. This run does not reach the destination.'};
export async function mountWorkcell(root){
 const tasks={
  rigid:{scene:'scene',prefix:'',dt:.002,title:'Play slip-recovery demo',baseline:'Fixed grip',event:5.9,eventLabel:'Inspect the load',about:'While held, the rigid block receives a scheduled 1.3 N downward pulse and a 0.65 N sideways pulse. Pulses stop after grip loss, so a fallen block is not pushed again. Ideal contact-force feedback adjusts grip. The robot clears a divider, turns 90° and seats the block in a pocket. Both controllers use the same initial state and disturbance schedule.'},
  soft:{scene:'soft-scene',prefix:'soft-',dt:.001,title:'Play soft-grasp demo',baseline:'Fixed firm grip',event:6.1,eventLabel:'Inspect compression',about:'The sponge uses a reduced elastic model: eight spring-mounted contact nodes around a free carrier in MuJoCo. The visible surface follows those nodes. Compression measures the change in distance between opposite faces; this is not a calibrated foam material model. Feedback uses ideal contact forces and simulated compression; the fixed firm grip uses a constant command. The 35% compression bound is a demonstration criterion, not a measured damage threshold. The soft task uses smaller load pulses (0.12 N downward and 0.10 N sideways) and a shallow tray.'}
 };
 const commonAbout=' The arm follows a scripted path. Gel RGB is an uncalibrated optical illustration driven by contact loads, not real sensor footage or the controller input. These are task prototypes, not trained UniGeom-X results. Recorded 3D and live physics use the same controller and scene for each object.';
 const softCaptions={'Approach':'The fingers approach a porous sponge with a compliant surface.','Establish contact':'Contact feedback relaxes the grip when the sponge is squeezed too far.','Lift':'The sponge deforms between the pads as the robot lifts it.','Clear the divider':'The robot raises the sponge above the divider.','Turn & transfer':'The gripper turns and carries the sponge to the receiving tray.','Align with tray':'The gripper positions the sponge over a shallow receiving tray.','Lower into tray':'The sponge is lowered while the grip keeps its shape under control.','Release & rebound':'The fingers open and the simulated sponge recovers its shape.','Placed & recovered':'The sponge is in the tray, with peak compression below the demonstration limit.','Excess compression':'The sponge was placed, but the firm grip exceeded the compression limit.','Grip recovered':'The grip supports the sponge while monitoring its compression.','Respond to load':'A brief load tests the balance between holding and squeezing.'};
 const controllers=['contact-feedback','fixed-grip'];
 const panelHTML=(id,i)=>`<article class="wc-panel" data-controller="${id}"><header class="wc-panel-header"><h3>${i?'Fixed grip':'Contact feedback'}</h3><span class="wc-phase" role="status">Loading…</span></header><div class="wc-stage"><div class="wc-canvas"></div><div class="wc-overlay"><button class="wc-start" disabled>Play comparison</button></div><div class="wc-scene-bottom"><span>Drag to orbit · Scroll to zoom</span></div></div><div class="wc-evidence"><div class="wc-touch"><strong class="wc-sensor-heading">Tactile contact</strong><div class="wc-pads">${['Left','Right'].map((side,j)=>`<div><canvas class="wc-pad" width="112" height="128" aria-label="${i?'Fixed grip':'Contact feedback'} ${side.toLowerCase()} simulated tactile image"></canvas><span>${side} <b class="${j?'wc-right':'wc-left'}">0.00 N</b></span></div>`).join('')}</div></div><div class="wc-metrics"><div><span class="wc-metric-one">Peak slip</span><strong class="wc-slip">0.0 <small>mm</small></strong></div><div><span class="wc-metric-two">Applied load</span><strong class="wc-load">0.00 <small>N</small></strong></div></div><div class="wc-force"><div class="wc-plot-label"><span><i class="wc-normal-key"></i>Normal</span><span><i class="wc-shear-key"></i>Shear</span><span>N</span></div><canvas class="wc-chart" width="400" height="130" aria-label="${i?'Fixed grip':'Contact feedback'} contact force history"></canvas></div></div></article>`;
 root.innerHTML=`<div class="wc-toolbar"><div class="wc-object-choice segmented" aria-label="Grasp object"><button data-wc-object="rigid" aria-pressed="true">Slippery block</button><button data-wc-object="soft" aria-pressed="false">Soft sponge</button></div><div class="wc-view-choice segmented" aria-label="Camera view"><button data-view="overview" aria-pressed="false">Workcell</button><button data-view="contact" aria-pressed="true">Close-up</button></div><div class="segmented" aria-label="Demo mode"><button data-wc-mode="recorded" aria-pressed="true">Recorded 3D</button><button data-wc-mode="live" aria-pressed="false">Live physics</button></div></div><div class="wc-comparison">${controllers.map(panelHTML).join('')}</div><div class="wc-controls"><button class="wc-play" disabled>Play both</button><button class="wc-reset" disabled>Reset</button><label class="sr-only" for="wc-time">Shared simulation time</label><input id="wc-time" type="range" min="0" max="20" step="0.02" value="0" disabled><output class="wc-time-text">0.0 / 20.0 s</output></div><div class="wc-caption"><p class="wc-explanation">Both controllers start from the same state and share one playback clock.</p><button class="wc-event" disabled>Inspect the load</button></div><details class="wc-details"><summary>About this demonstration</summary><p class="wc-about"></p></details>`;
 const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)];
 const panels=$$('.wc-panel').map((el,i)=>({el,id:controllers[i],viewer:null,sim:null,episode:null,trace:[],frame:null,$:s=>el.querySelector(s),pads:[...el.querySelectorAll('.wc-pad')]}));
 let task='rigid',mode='recorded',playing=false,active=true,ready=false,started=false,time=0,viewerTask=null,mjPromise=null,serial=0,raf=0,last=0,acc=0,dead=false,report=0;
 const abort=new AbortController(),cache=new Map();
 const pressed=(sel,attr,v)=>$$(sel).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[attr]===v)));
 function asset(name){if(!cache.has(name))cache.set(name,loadPackedJson(new URL('data/'+name+'.json.gz',base),abort.signal).catch(e=>{cache.delete(name);throw e;}));return cache.get(name);}
 function playUI(){$('.wc-play').textContent=playing?'Pause':time>=DURATION?'Replay both':'Play both';$$('.wc-overlay').forEach(e=>e.hidden=started);}
 function controls(enabled){ready=enabled;root.dataset.ready=String(enabled);for(const s of ['.wc-play','.wc-reset','.wc-start'])$$(s).forEach(e=>e.disabled=!enabled);$('#wc-time').disabled=!enabled||mode==='live';$('.wc-event').disabled=!enabled||mode==='live';}
 function taskUI(){
  panels[1].$('h3').textContent=tasks[task].baseline;
  for(const p of panels){p.$('.wc-metric-one').textContent=task==='soft'?'Compression':'Peak slip';p.$('.wc-metric-two').textContent=task==='soft'?'Peak compression':'Applied load';}
  $('.wc-about').textContent=tasks[task].about+commonAbout+' Both panels advance together. Reset and replay are explicit; a dropped object is never automatically returned to its start.';
  $('.wc-event').textContent=tasks[task].eventLabel;
 }
 function chart(panel,frames,t){
  const canvas=panel.$('.wc-chart'),bounds=canvas.getBoundingClientRect(),width=bounds.width,height=bounds.height;
  if(width<1||height<1)return;
  const dpr=Math.min(devicePixelRatio||1,2),pixelWidth=Math.round(width*dpr),pixelHeight=Math.round(height*dpr);
  if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;}
  const c=canvas.getContext('2d');c.setTransform(pixelWidth/width,0,0,pixelHeight/height,0,0);
  const left=26,right=width-5,top=10,bottom=height-10,max=task==='soft'?16:8;
  c.clearRect(0,0,width,height);c.font='12px Manrope, sans-serif';c.textAlign='right';c.textBaseline='middle';c.fillStyle='#b0acbf';
  c.fillText('0',left-7,bottom);c.fillText(String(max),left-7,top);c.strokeStyle='#3d3947';c.lineWidth=1;
  for(const y of [top,(top+bottom)/2,bottom]){c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();}
  c.fillStyle='#d7b78f16';c.fillRect(left+5.5/DURATION*(right-left),top,.8/DURATION*(right-left),bottom-top);
  for(const [key,color]of [['normal','#68c5b4'],['shear','#d7b78f']]){c.beginPath();c.strokeStyle=color;c.lineWidth=1.5;let first=true;for(const f of frames){if(f.time>t)break;const val=f[key].reduce((a,b)=>a+b,0),x=left+f.time/DURATION*(right-left),y=bottom-Math.min(max,val)/max*(bottom-top);if(first){c.moveTo(x,y);first=false;}else c.lineTo(x,y);}c.stroke();}
  c.strokeStyle='#a29cff';c.beginPath();const x=left+t/DURATION*(right-left);c.moveTo(x,top);c.lineTo(x,bottom);c.stroke();
 }
 const chartResize=new ResizeObserver(()=>{for(const p of panels)if(p.frame)chart(p,mode==='recorded'?p.episode.frames:p.trace,p.frame.time);});
 panels.forEach(p=>chartResize.observe(p.$('.wc-chart')));
 function readout(p,f){
  p.frame=f;p.$('.wc-phase').textContent=f.phase;p.$('.wc-phase').classList.toggle('wc-failure',['Object dropped','Placement failed','Excess compression'].includes(f.phase));
  p.$('.wc-left').textContent=f.normal[0].toFixed(2)+' N';p.$('.wc-right').textContent=f.normal[1].toFixed(2)+' N';
  p.$('.wc-slip').innerHTML=task==='soft'?(100*f.compression).toFixed(1)+' <small>%</small>':(1000*f.peakSlip).toFixed(1)+' <small>mm</small>';
  p.$('.wc-load').innerHTML=task==='soft'?(100*f.peakCompression).toFixed(1)+' <small>%</small>':Math.abs(f.pulse).toFixed(2)+' <small>N</small>';
  p.pads.forEach((pad,i)=>drawTactile(pad,f,i));chart(p,mode==='recorded'?p.episode.frames:p.trace,f.time);
  Object.assign(p.el.dataset,{time:f.time.toFixed(3),phase:f.phase,compression:String(f.compression??0),objectPosition:JSON.stringify(f.object)});
 }
 function sharedReadout(t){
  time=t;$('#wc-time').value=t;$('.wc-time-text').textContent=t.toFixed(1)+' / 20.0 s';
  const [a,b]=panels.map(p=>p.frame);
  let text=(task==='soft'?softCaptions[a.phase]:null)||captions[a.phase]||a.phase;
  if(task==='rigid'&&b.dropped)text=t<DURATION?'The fixed grip loses the block. It lands naturally and stays where it falls; the feedback run continues.':'Contact feedback places the block in the pocket. The fixed-grip block remains where it landed.';
  if(task==='soft'&&t>=2.3&&t<17)text='Contact feedback eases the squeeze. The fixed firm grip keeps pressing, so the sponge compresses further.';
  if(task==='soft'&&t>=17)text='Both grips release the sponge into the tray. Compare the recovered shape and peak compression.';
  $('.wc-explanation').textContent=text;Object.assign(root.dataset,{time:t.toFixed(3),mode,object:task});
 }
 function seek(t){
  t=Math.max(0,Math.min(DURATION,t));
  for(const p of panels){const fs=p.episode.frames;let lo=0,hi=fs.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(fs[mid].time<=t)lo=mid;else hi=mid-1;}
   const a=fs[lo],b=fs[Math.min(lo+1,fs.length-1)],mix=b.time>a.time?(t-a.time)/(b.time-a.time):0;
   p.viewer.pose(a.bodies,b.bodies,mix,a.soft,b.soft);readout(p,{...a,time:t});}
  sharedReadout(t);
 }
 async function setup(){
  const token=++serial,currentTask=task,currentMode=mode,config=tasks[task];playing=false;started=false;controls(false);taskUI();playUI();
  for(const p of panels){p.sim?.dispose();p.sim=null;p.trace=[];p.$('.wc-phase').textContent='Loading…';p.$('.wc-start').textContent='Loading comparison…';}time=0;acc=0;
  try{
   if(viewerTask!==currentTask){const [description,common]=await Promise.all([asset(config.scene),asset('scene')]);if(dead||token!==serial)return;
    const next={...description,geometries:description.sharedGeometry?common.geometries:description.geometries};
    for(const [i,p]of panels.entries()){p.viewer?.dispose();p.viewer=createWorkcell(p.$('.wc-canvas'),next,state=>panels[1-i].viewer?.syncCamera(state));}
    viewerTask=currentTask;pressed('[data-view]','view','contact');}
   if(currentMode==='recorded'){
    const episodes=await Promise.all(controllers.map(c=>asset(config.prefix+c)));if(dead||token!==serial)return;
    panels.forEach((p,i)=>p.episode=episodes[i]);seek(0);
   }else{
    const [{default:load},commonPhysics,physics,files,extra]=await Promise.all([import('./vendor/mujoco_wasm.js'),import('./physics.js'),import(currentTask==='soft'?'./soft-physics.js':'./physics.js'),asset('physics'),currentTask==='soft'?asset('soft-physics'):Promise.resolve(null)]);
    if(dead||token!==serial)return;
    mjPromise??=load().then(engine=>{commonPhysics.mountAssets(engine,files);return engine;});const mj=await mjPromise;if(dead||token!==serial)return;
    if(extra)commonPhysics.mountAssets(mj,extra);
    for(const p of panels){p.sim=physics.createSimulation(mj,{feedback:p.id==='contact-feedback'});const f=p.sim.snapshot();p.viewer.pose(p.sim.bodyFrames(),undefined,0,f.soft);p.trace.push(f);readout(p,f);}sharedReadout(0);
   }
   controls(true);$$('.wc-start').forEach(e=>e.textContent='Play comparison');playUI();
  }catch(e){if(dead||token!==serial)return;for(const p of panels){p.$('.wc-phase').textContent='Unable to load';p.$('.wc-start').textContent='Retry loading';p.$('.wc-start').disabled=false;}$('.wc-explanation').textContent=e.message;console.error(e);}
 }
 async function toggle(){if(!ready){setup();return;}if(time>=DURATION){if(mode==='recorded')seek(0);else{await setup();if(!ready)return;}}playing=!playing;started=true;last=performance.now();playUI();}
 $('.wc-play').onclick=toggle;$$('.wc-start').forEach(e=>e.onclick=toggle);
 $('.wc-reset').onclick=()=>{if(mode==='live')setup();else{playing=false;started=false;seek(0);playUI();}};
 $('#wc-time').oninput=e=>{playing=false;started=true;seek(+e.target.value);playUI();};
 $('.wc-event').onclick=()=>{playing=false;started=true;seek(tasks[task].event);panels.forEach(p=>p.viewer.setView('contact'));pressed('[data-view]','view','contact');playUI();};
 $$('[data-wc-object]').forEach(b=>b.onclick=()=>{if(task===b.dataset.wcObject)return;task=b.dataset.wcObject;pressed('[data-wc-object]','wcObject',task);setup();});
 $$('[data-wc-mode]').forEach(b=>b.onclick=()=>{if(mode===b.dataset.wcMode)return;mode=b.dataset.wcMode;pressed('[data-wc-mode]','wcMode',mode);setup();});
 $$('[data-view]').forEach(b=>b.onclick=()=>{panels.forEach(p=>p.viewer?.setView(b.dataset.view));pressed('[data-view]','view',b.dataset.view);});
 await setup();
 function tick(now){const dt=Math.min(.06,(now-last)/1000||0);last=now;
  if(playing&&active&&ready&&!document.hidden){
   if(mode==='recorded')seek(Math.min(DURATION,time+dt));
   else if(panels.every(p=>p.sim)){
    const step=tasks[task].dt;acc=Math.min(.08,acc+dt);const start=performance.now();let steps=0;
    try{while(acc>=step&&steps<120&&panels[0].sim.data.time<DURATION-1e-8&&performance.now()-start<24){for(const p of panels)p.sim.step();acc-=step;steps++;}
     const frames=panels.map(p=>p.sim.snapshot());for(const [i,p]of panels.entries())p.viewer.pose(p.sim.bodyFrames(),undefined,0,frames[i].soft);
     if(now-report>65||frames[0].done){panels.forEach((p,i)=>{p.trace.push(frames[i]);readout(p,frames[i]);});sharedReadout(frames[0].time);report=now;}
    }catch(e){playing=false;$('.wc-explanation').textContent='Simulation stopped: '+e.message;playUI();console.error(e);}
   }
   if(time>=DURATION){playing=false;playUI();}
  }
  if(!dead)raf=requestAnimationFrame(tick);
 }
 raf=requestAnimationFrame(tick);
 return {setActive(v){active=v;last=performance.now();if(!v){playing=false;playUI();}},dispose(){dead=true;serial++;chartResize.disconnect();abort.abort();cancelAnimationFrame(raf);panels.forEach(p=>{p.sim?.dispose();p.viewer?.dispose();});}};
}
