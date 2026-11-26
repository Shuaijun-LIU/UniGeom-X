import {GeometryView} from './vendor/unigeom-geometry.js';
import {drawInterface,drawModel,drawGlyphs} from './diagrams.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const keys=['unigeom','handover','interface','model','roadmap'];
const titles=['UniGeom','X · Handover','X · Interface','M · World & Action','Research path'];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={page:0,phase:0,occluded:false,touch:true,relation:'state',mode:'joint',candidate:'correct'};
const paused=[reduced.matches,reduced.matches,reduced.matches,reduced.matches,true];
let hero=null,pair=null,time=0,last=0,phaseShown=0,drawAt=-1;
let workcell=null,workcellLoading=null;
function updateWorkcell(){
 if(state.page===1&&!workcellLoading){workcellLoading=import('./workcell/workcell.js').then(m=>m.mountWorkcell($('#grasp-workcell'))).then(w=>{workcell=w;w?.setActive(state.page===1);}).catch(e=>{$('#grasp-workcell').textContent='Unable to load workcell: '+e.message;console.error(e);});}
 workcell?.setActive(state.page===1);
}
const scenes=[$('#interaction-scene'),$('#interface-scene'),$('#model-scene')];
function pressed(parent,key,value){$$(parent+' button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===String(value))));}
function draw(){
  if(state.page===0)hero?.drawHero();

  if(state.page===2)drawInterface(scenes[1],state);
  if(state.page===3)drawModel(scenes[2],state);
}
function motionUI(){
  $$('.motion-toggle').forEach(b=>{const i=$$('.slide').indexOf(b.closest('.slide'));b.textContent=paused[i]?'Play animation':'Pause animation';b.setAttribute('aria-label',b.textContent);b.setAttribute('aria-pressed',String(paused[i]));});
  $$('.slide').forEach((s,i)=>s.classList.toggle('motion-paused',paused[i]));
}
function go(index,updateHash=true){
  state.page=Math.max(0,Math.min(4,index));
  $$('.slide').forEach((s,i)=>s.hidden=i!==state.page);
  $$('.page-tabs button').forEach((b,i)=>{b.setAttribute('aria-selected',String(i===state.page));b.tabIndex=i===state.page?0:-1;});
  $('#mobile-page').value=String(state.page);
  $('#page-number').textContent=String(state.page+1).padStart(2,'0');
  $('#page-title').textContent=titles[state.page];
  $('#previous').disabled=state.page===0;$('#next').disabled=state.page===4;
  document.title=`${titles[state.page]} · UniGeom Series`;
  if(updateHash&&location.hash!=='#'+keys[state.page])history.pushState(null,'','#'+keys[state.page]);
  updateWorkcell();
  requestAnimationFrame(draw);
}
$$('[data-page]').forEach(b=>b.onclick=()=>go(Number(b.dataset.page)));
$$('[data-go]').forEach(b=>b.onclick=()=>go(Number(b.dataset.go)));
$('#mobile-page').onchange=e=>go(Number(e.target.value));
$('#previous').onclick=()=>go(state.page-1);$('#next').onclick=()=>go(state.page+1);
window.addEventListener('hashchange',()=>go(Math.max(0,keys.indexOf(location.hash.slice(1))),false));
window.addEventListener('keydown',e=>{
  if(e.altKey||e.metaKey||e.ctrlKey||e.target.closest('input,select,textarea,.segmented,.step-list,#grasp-workcell'))return;
  if(['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End'].includes(e.key)){
    e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?4:state.page+(['ArrowRight','PageDown'].includes(e.key)?1:-1);go(n);
    if(e.target.closest('[role=tablist]'))$(`[data-page="${state.page}"]`).focus();
  }
});
let swipe=null;
$('#deck').addEventListener('touchstart',e=>{if(!e.target.closest('button,input,select,label,#grasp-workcell'))swipe=[e.touches[0].clientX,e.touches[0].clientY];},{passive:true});
$('#deck').addEventListener('touchend',e=>{if(!swipe)return;const dx=e.changedTouches[0].clientX-swipe[0],dy=e.changedTouches[0].clientY-swipe[1];if(Math.abs(dx)>90&&Math.abs(dx)>Math.abs(dy)*1.8)go(state.page+(dx<0?1:-1));swipe=null;},{passive:true});
$$('.motion-toggle').forEach(b=>b.onclick=()=>{const i=$$('.slide').indexOf(b.closest('.slide'));paused[i]=!paused[i];motionUI();draw();});
reduced.addEventListener('change',e=>{if(e.matches){paused.fill(true);phaseShown=state.phase;}if(hero)hero.reduced=e.matches;motionUI();draw();});
function interfaceCaption(){
  $('#interface-caption').textContent=!state.touch?'Vision and depth remain connected. Adding touch introduces new contact evidence.':state.relation==='state'?'Relate local shape and pose while retaining the original contact evidence.':'Relate changes caused by the same interaction, without equating all features.';
}
$$('[data-relation]').forEach(b=>b.onclick=()=>{state.relation=b.dataset.relation;pressed('#geometry-mode','relation',state.relation);interfaceCaption();draw();});
$('#touch-connected').onchange=e=>{state.touch=e.target.checked;interfaceCaption();draw();};
function modelCaption(){
  const action=state.candidate==='correct'?'pose correction leads to more balanced contact and less resistance':'advancing with a pose error may increase one-sided contact and resistance';
  $('#model-caption').textContent=(state.mode==='joint'?'Illustrative joint output: ':'Illustrative action-conditioned future: ')+action+'.';
}
$$('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;pressed('#model-mode','mode',state.mode);modelCaption();draw();});
$$('[data-candidate]').forEach(b=>b.onclick=()=>{state.candidate=b.dataset.candidate;pressed('#candidate-controls','candidate',state.candidate);modelCaption();draw();});
function chooseObservation(q){
  hero.heroQuery=q;
  hero.heroShared=pair.neighborsA[q].filter(i=>pair.neighborsB[q].includes(i));
  hero.heroFocus=new Set([q,...hero.heroShared]);
  $('#overlap').textContent=`${hero.heroShared.length} / ${pair.neighborsA[q].length}`;
  $('#hero-cloud').dataset.observation=String(q);
  hero.drawHero();
}
$('#next-observation').disabled=true;
fetch('assets/data/geometry.json').then(r=>{if(!r.ok)throw Error('Geometry HTTP '+r.status);return r.json();}).then(data=>{
  pair=data.pairs[0];hero=Object.create(GeometryView.prototype);
  Object.assign(hero,{hero:$('#hero-cloud'),normalized:new WeakMap(),phase:0,reduced:reduced.matches});
  hero.heroClouds=[hero.normalize(pair.a),hero.normalize(pair.b)];chooseObservation(pair.example);
  $('#next-observation').disabled=false;
  $('#next-observation').onclick=()=>chooseObservation((hero.heroQuery+47)%pair.a.length);
}).catch(e=>{$('#data-error').hidden=false;console.error(e);});
new ResizeObserver(()=>requestAnimationFrame(draw)).observe($('#deck'));
drawGlyphs();motionUI();go(Math.max(0,keys.indexOf(location.hash.slice(1))),false);
function frame(now){
  const dt=Math.min((now-last)/1000||0,.05);last=now;
  if(!document.hidden&&!paused[state.page]){
    time+=dt;
    if(hero&&state.page===0){hero.phase+=dt;hero.drawHero();}
    document.documentElement.style.setProperty('--flow-offset',String(-time*23));
    document.documentElement.style.setProperty('--contact-opacity',String(.45+.35*Math.sin(time*2)));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
