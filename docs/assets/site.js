import {GeometryView} from './vendor/unigeom-geometry.js';
import {drawInteraction,drawInterface,drawModel,drawGlyphs} from './diagrams.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const keys=['unigeom','handover','interface','model','roadmap'];
const titles=['从 UniGeom 出发','X · 感知交接','X · 如何连接','M · 统一学习','研究路线'];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={page:0,phase:0,occluded:false,touch:true,relation:'state',mode:'joint',candidate:'correct'};
const paused=[reduced.matches,reduced.matches,reduced.matches,reduced.matches,true];
let hero=null,pair=null,time=0,last=0,phaseShown=0,drawAt=-1;
const scenes=[$('#interaction-scene'),$('#interface-scene'),$('#model-scene')];
function pressed(parent,key,value){$$(parent+' button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===String(value))));}
function draw(){
  if(state.page===0)hero?.drawHero();
  if(state.page===1)drawInteraction(scenes[0],state,phaseShown);
  if(state.page===2)drawInterface(scenes[1],state);
  if(state.page===3)drawModel(scenes[2],state);
}
function motionUI(){
  $$('.motion-toggle').forEach((b,i)=>{b.textContent=paused[i]?'播放动画':'暂停动画';b.setAttribute('aria-label',b.textContent);b.setAttribute('aria-pressed',String(paused[i]));});
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
  requestAnimationFrame(draw);
}
$$('[data-page]').forEach(b=>b.onclick=()=>go(Number(b.dataset.page)));
$$('[data-go]').forEach(b=>b.onclick=()=>go(Number(b.dataset.go)));
$('#mobile-page').onchange=e=>go(Number(e.target.value));
$('#previous').onclick=()=>go(state.page-1);$('#next').onclick=()=>go(state.page+1);
window.addEventListener('hashchange',()=>go(Math.max(0,keys.indexOf(location.hash.slice(1))),false));
window.addEventListener('keydown',e=>{
  if(e.altKey||e.metaKey||e.ctrlKey||e.target.closest('input,select,textarea,.segmented,.step-list'))return;
  if(['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End'].includes(e.key)){
    e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?4:state.page+(['ArrowRight','PageDown'].includes(e.key)?1:-1);go(n);
    if(e.target.closest('[role=tablist]'))$(`[data-page="${state.page}"]`).focus();
  }
});
let swipe=null;
$('#deck').addEventListener('touchstart',e=>{if(!e.target.closest('button,input,select,label'))swipe=[e.touches[0].clientX,e.touches[0].clientY];},{passive:true});
$('#deck').addEventListener('touchend',e=>{if(!swipe)return;const dx=e.changedTouches[0].clientX-swipe[0],dy=e.changedTouches[0].clientY-swipe[1];if(Math.abs(dx)>90&&Math.abs(dx)>Math.abs(dy)*1.8)go(state.page+(dx<0?1:-1));swipe=null;},{passive:true});
$$('.motion-toggle').forEach((b,i)=>b.onclick=()=>{paused[i]=!paused[i];motionUI();draw();});
reduced.addEventListener('change',e=>{if(e.matches){paused.fill(true);phaseShown=state.phase;}if(hero)hero.reduced=e.matches;motionUI();draw();});
function phaseCaption(){
  $('#phase-label').textContent=['接近目标','建立接触','修正并插入'][state.phase];
  $('#state-caption').textContent=state.phase===0?(state.occluded?'接触区看不清时，已有目标信息仍保留；局部位置需依靠可用观测。':'目标孔位与任务目标，由视觉阶段建立。'):state.phase===1?(state.occluded?'局部视觉受阻，触觉补充接触偏差，继续保留此前目标信息。':'触觉加入接触证据，已有目标与任务状态继续保留。'):'触觉反馈用于修正局部偏差；视觉和历史信息继续支持目标判断。';
}
$$('[data-phase]').forEach(b=>b.onclick=()=>{state.phase=Number(b.dataset.phase);pressed('#phase-controls','phase',state.phase);if(paused[1]||reduced.matches)phaseShown=state.phase;phaseCaption();draw();});
$('#occlusion').onchange=e=>{state.occluded=e.target.checked;phaseCaption();draw();};
function interfaceCaption(){
  $('#interface-caption').textContent=!state.touch?'当前只有视觉与深度参与。接入触觉后，接口还需要承接新增的接触证据。':state.relation==='state'?'局部形状和相对位置可以联系；触觉的局部压力信息仍沿独立旁路保留。':'物体发生小幅移动时，对照两种模态的变化关系；不要求它们的全部特征相同。';
}
$$('[data-relation]').forEach(b=>b.onclick=()=>{state.relation=b.dataset.relation;pressed('#geometry-mode','relation',state.relation);interfaceCaption();draw();});
$('#touch-connected').onchange=e=>{state.touch=e.target.checked;interfaceCaption();draw();};
function modelCaption(){
  const action=state.candidate==='correct'?'修正姿态后，接触趋于均匀、阻力减小':'保持偏差继续前进，可能产生单侧接触与更大阻力';
  $('#model-caption').textContent=(state.mode==='joint'?'联合生成的示意情境：':'给定动作后的定性后果：')+action+'。需要通过真实预测与控制实验验证。';
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
    if(state.page===1&&Math.abs(phaseShown-state.phase)>.001){phaseShown+=(state.phase-phaseShown)*Math.min(1,dt*5);if(now-drawAt>32){drawInteraction(scenes[0],state,phaseShown);drawAt=now;}}
    document.documentElement.style.setProperty('--flow-offset',String(-time*23));
    document.documentElement.style.setProperty('--contact-opacity',String(.45+.35*Math.sin(time*2)));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
