// Original conceptual diagrams. No simulation or model outputs are implied.
const C={purple:'#a29cff',teal:'#68c5b4',sand:'#d7b78f',line:'#4a455c',ink:'#eeeaf6',muted:'#aaa8ba'};
const rect=(x,y,w,h,color=C.line,fill='#1b1a24',r=12)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${color}" stroke-width="1.3"/>`;
const text=(x,y,s,cl='svg-label',anchor='start',color='')=>`<text x="${x}" y="${y}" class="${cl}" text-anchor="${anchor}"${color?` style="fill:${color}"`:''}>${s}</text>`;
const line=(x1,y1,x2,y2,color=C.line,dash='')=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="1.5"${dash?` stroke-dasharray="${dash}"`:''}/>`;
const flow=(d,color=C.purple)=>`<path class="flow-track" d="${d}" fill="none" stroke="${color}" stroke-opacity=".45" stroke-width="1.5"/><path class="flow-light" d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-dasharray="5 110"/>`;
const node=(x,y,w,h,label,sub,color=C.line)=>rect(x,y,w,h,color)+text(x+w/2,y+h/2-(sub?3:-5),label,'svg-label','middle')+(sub?text(x+w/2,y+h/2+20,sub,'svg-small','middle'):'');
function points(x,y,color,variant=0,transition=false){
  const coords=[[-28,7],[-14,-13],[7,-5],[26,-20],[27,17],[2,24]];
  return coords.map(([dx,dy],i)=>{
    const xx=x+dx, yy=y+dy+(variant?Math.sin(i)*5:0);
    return (i<5?line(xx,yy,x+coords[i+1][0],y+coords[i+1][1],color):'')+`<circle cx="${xx}" cy="${yy}" r="4" fill="${color}"/>`+(transition?`<path d="M${xx} ${yy}l9 -7m-5 0h5v5" fill="none" stroke="${color}" stroke-width="1.3"/>`:'');
  }).join('');
}

export function drawInteraction(svg,state,phaseProgress=state.phase){
  const narrow=svg.clientWidth<480;
  svg.setAttribute('viewBox',narrow?'90 0 660 550':'0 0 840 470');
  const p=phaseProgress,contact=p>=.8,corrected=p>1.5;
  const dy=p<1? -110*(1-p):28*(p-1);
  const dx=16*(1-Math.max(0,p-1));
  const tilt=7*(1-Math.max(0,p-1));
  let s=`<defs><linearGradient id="table" x2="0" y2="1"><stop stop-color="#302d3d"/><stop offset="1" stop-color="#181820"/></linearGradient><linearGradient id="metal"><stop stop-color="#625c78"/><stop offset=".5" stop-color="#373343"/><stop offset="1" stop-color="#827992"/></linearGradient><pattern id="grid" width="35" height="22" patternUnits="userSpaceOnUse"><path d="M35 0H0V22" fill="none" stroke="#a29cff" stroke-opacity=".1"/></pattern><radialGradient id="touch-glow"><stop stop-color="#d7b78f" stop-opacity=".7"/><stop offset="1" stop-color="#d7b78f" stop-opacity="0"/></radialGradient></defs>`;
  s+=`<path d="M125 285L500 180 742 308 365 420Z" fill="url(#table)" stroke="#494252"/><path d="M125 285L365 420 742 308V327L365 440 125 305Z" fill="#181720" stroke="#34303f"/><path d="M125 285L500 180 742 308 365 420Z" fill="url(#grid)"/>`;
  // Target socket remains fixed. The moving plug approaches its actual aperture.
  s+=`<ellipse cx="434" cy="306" rx="85" ry="21" fill="#08080d" opacity=".6"/><path d="M365 273l73 -25 65 34 -73 28Z" fill="#494354" stroke="#746980"/><path d="M365 273v30l65 35v-28Z" fill="#272431" stroke="#534b62"/><path d="M430 310v28l73 -26v-30Z" fill="#35303f" stroke="#655c73"/><path d="M393 274l45 -15 36 19 -45 15Z" fill="#0e0e15" stroke="${corrected?C.teal:C.sand}" stroke-width="2"/>`;
  s+=`<g transform="translate(${dx} ${dy}) rotate(${tilt} 433 276)"><path d="M414 17h39v132h-39Z" fill="url(#metal)" stroke="#71677d"/><rect x="374" y="125" width="119" height="55" rx="10" fill="#35303f" stroke="#8b7d98"/><path d="M381 170v55l20 12 8 -9v-58M485 170v55l-20 12 -8 -9v-58" fill="#464051" stroke="#a59ab0" stroke-width="2"/><path d="M410 190l27 -9 22 12v64l-27 10 -22 -13Z" fill="url(#metal)" stroke="#c0b6c8"/><path d="M410 254l22 13 27 -10v19l-27 10 -22 -13Z" fill="#c8bed0" stroke="#e5deeb"/><path d="M432 267v19" stroke="#887e93"/><rect x="397" y="203" width="10" height="23" rx="3" fill="${contact?C.sand:'#696078'}"/><rect x="460" y="203" width="10" height="23" rx="3" fill="${contact?C.sand:'#696078'}"/></g>`;
  if(contact)s+=`<ellipse cx="${corrected?434:460}" cy="${corrected?289:279}" rx="37" ry="20" fill="url(#touch-glow)"/><circle class="contact-ring" cx="${corrected?434:460}" cy="${corrected?289:279}" r="16" fill="none" stroke="${corrected?C.teal:C.sand}" stroke-width="1.4"/>`;
  if(state.occluded)s+=`<path d="M340 203h190v126H340Z" fill="#1a1a25" fill-opacity=".92" stroke="#8c849d" stroke-dasharray="5 6"/>${text(435,253,'View occluded','svg-label','middle')}${text(435,280,'Target retained','svg-small','middle')}`;
  else s+=`<path d="M387 280l47 27 51 -17" fill="none" stroke="${C.teal}" stroke-dasharray="4 6" opacity=".6"/>`;
  // Sensory readouts are qualitative illustrations, without fabricated metrics.
  const panels=narrow?[[110,425],[325,425],[540,425]]:[[28,35],[600,35],[600,180]];
  panels.forEach(([x,y],i)=>{
    const w=narrow?190:205, names=['RGB / Depth','Tactile','Task memory'];
    const info=[state.occluded?'Local view missing':'Target pose',contact?(corrected?'Balanced contact':'Uneven contact'):'No object contact','Goal retained'][i];
    const color=i===1?C.sand:i===2?C.teal:C.purple;
    s+=rect(x,y,w,99,color+'70','#17171fe8',9)+text(x+13,y+24,names[i],'svg-label','start',color)+text(x+13,y+79,info,'svg-small');
    if(i===0)s+=`<path d="M${x+17} ${y+55}h${state.occluded?25:145}" stroke="${color}" stroke-width="2" stroke-dasharray="${state.occluded?'4 7':'0'}"/>`;
    if(i===1)for(let j=0;j<9;j++)s+=`<circle cx="${x+25+j*17}" cy="${y+48+(contact?Math.sin(j*.8)*(corrected?3:9):0)}" r="${contact?3.4:2}" fill="${color}" opacity="${contact?'.9':'.3'}"/>`;
    if(i===2)s+=`<path d="M${x+17} ${y+48}h120m-6 -5 6 5-6 5" stroke="${color}" fill="none"/>`;
  });
  if(!narrow){s+=line(235,98,361,194,C.purple,'3 6')+line(600,230,512,265,C.teal,'3 6');}
  svg.innerHTML=s;
}

// The architecture vocabulary follows UniGeom's framework: slanted modules,
// layered feature grids, fixed-size arrowheads and a magnified mechanism inset.
let scope='';
function definitions(id){
 scope=id;
 return `<defs>${[C.purple,C.teal,C.sand,C.line].map(c=>`<marker id="${id}-${c.slice(1)}" viewBox="0 0 8 8" markerWidth="5" markerHeight="5" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="${c}"/></marker>`).join('')}<linearGradient id="${id}-zoom" x2="0" y2="1"><stop stop-color="${C.purple}" stop-opacity=".2"/><stop offset="1" stop-color="${C.purple}" stop-opacity=".02"/></linearGradient></defs>`;
}
function route(d,color=C.purple,active=true){
 return `<path d="${d}" class="arch-wire" fill="none" stroke="${color}" marker-end="url(#${scope}-${color.slice(1)})"/>`+(active?`<path d="${d}" class="flow-light" pathLength="120" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="6 114"/>`:'');
}
function module(x,y,w,h,label,sub,color=C.purple,locked=false){
 return `<path d="M${x+10} ${y}h${w-10}l-10 ${h}h${10-w}Z" fill="${color}19" stroke="${color}" stroke-width="1.5"/>`+text(x+w/2,y+h/2-(sub?3:-6),label,'arch-label','middle')+(sub?text(x+w/2,y+h/2+19,sub,'arch-small','middle'):'')+(locked?`<g transform="translate(${x+w-23} ${y+10})" stroke="${color}" fill="none" stroke-width="1.3"><path d="M2 6V4a3 3 0 0 1 6 0v2"/><rect x="1" y="6" width="8" height="7" rx="1"/></g>`:'');
}
function grid(x,y,w,h,color=C.purple,n=5){
 let paths='';for(let i=1;i<n;i++){paths+=`M${x+13+i*w/n} ${y}l-13 ${h}M${x+13*(1-i/n)} ${y+i*h/n}h${w}`;}
 return `<path d="M${x+17} ${y-5}h${w}l-13 ${h}h${-w}Z" fill="${color}0c" stroke="${color}55"/><path d="M${x+13} ${y}h${w}l-13 ${h}h${-w}Z" fill="${color}22" stroke="${color}" stroke-width="1.3"/><path d="${paths}" stroke="${color}" stroke-width=".7" opacity=".55"/>`;
}
function inset(x,y,w,h,label){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#191820" stroke="#72647f" stroke-dasharray="5 5" stroke-width="1.2"/>`+text(x+20,y+29,label,'arch-label');}
function junction(x,y){return `<circle cx="${x}" cy="${y}" r="10" fill="#22222e" stroke="#c5badb" stroke-width="1.5"/><path d="M${x-4} ${y}h8M${x} ${y-4}v8" stroke="#e7deef" stroke-width="1.4"/>`;}
function miniFrame(x,y,kind,color,w=66,h=43){
 let s=rect(x,y,w,h,color,'#20232d',2);
 if(kind==='rgb')s+=`<path d="M${x+8} ${y+h-10}l15 -15 18 8 13 -16" stroke="${color}" fill="none"/><circle cx="${x+18}" cy="${y+12}" r="4" fill="${color}"/>`;
 if(kind==='depth')s+=grid(x+12,y+10,35,22,color,4);
 if(kind==='touch')for(let i=0;i<8;i++)s+=`<circle cx="${x+13+(i%4)*13}" cy="${y+13+Math.floor(i/4)*15}" r="${2+(i%3)}" fill="${color}" opacity=".75"/>`;
 if(kind==='force')s+=`<path d="M${x+8} ${y+31}l9 -3 9 -13 9 9 9 -4 12 -8" fill="none" stroke="${color}" stroke-width="1.5"/>`;
 return s;
}
export function drawInterface(svg,state){
 const mobile=svg.clientWidth<520,touch=state.touch,change=state.relation==='transition';
 svg.setAttribute('viewBox',mobile?'0 0 480 720':'0 0 900 535');
 let s=definitions('x');
 if(!mobile){
  const rows=[['Vision',C.purple],['Depth',C.teal],['Touch',C.sand]];
  s+=text(20,24,'Independent encoders','arch-small');
  rows.forEach(([l,c],i)=>{const y=53+i*126,on=i<2||touch;s+=`<g opacity="${on?1:.23}">`+miniFrame(20,y+9,['rgb','depth','touch'][i],c,58,40)+route(`M80 ${y+29}H102`,c,on)+module(104,y,143,60,l,'Frozen',c,true)+route(`M245 ${y+30}H285`,c,on)+grid(290,y+12,45,32,c)+route(`M347 ${y+30}H350Q361 ${y+30} 361 172V181`,c,on)+'</g>';});
  s+=module(379,69,166,70,'Interface','Trainable',C.purple)+route('M545 104H597',C.purple)+module(600,69,134,70,'State','With history',C.teal)+route('M734 104H768',C.teal)+module(771,69,110,70,'Policy','ACT / DP',C.teal);
  // Encoder feature branches enter the learned interface from below.
  s+=route('M361 181V149H457V140',C.purple);
  s+=`<path d="M391 139H534L865 197H368Z" fill="url(#x-zoom)"/>`;
  s+=inset(369,197,512,311,'Inside the geometry interface');
  s+=text(402,260,change?'Compare changes':'Relate visible structure','arch-small');
  s+=points(438,302,C.purple,0,change)+points(535,302,C.teal,1,change)+(touch?points(626,302,C.sand,1,change):text(626,309,'Offline','arch-small','middle'));
  s+=line(470,301,499,301,C.purple,'3 4')+(touch?line(568,301,592,301,C.sand,'3 4'):'');
  s+=route('M662 301H704',C.purple)+grid(718,281,81,49,C.purple,5)+text(762,358,'Shared relations','arch-small','middle');
  s+=text(401,405,'Preserve original features','arch-small')+grid(407,426,48,28,C.purple)+grid(475,426,48,28,C.teal)+(touch?grid(543,426,48,28,C.sand):'');
  s+=route('M608 442H682Q694 442 694 410V392H751',C.teal)+junction(762,392)+route('M762 369V382',C.purple)+route('M772 392H841',C.teal);
  s+=text(759,477,'To state update','arch-small','middle');
  s+=route('M704 69V44H641V68',C.teal,false)+text(671,31,'History','arch-small','middle');
  s+=text(25,449,'Different observations.','arch-label')+text(25,477,'A continuing task state.','arch-label');
 }else{
  ['Vision','Depth','Touch'].forEach((l,i)=>{const c=[C.purple,C.teal,C.sand][i],on=i<2||touch,x=10+i*158;s+=`<g opacity="${on?1:.23}">`+miniFrame(x+40,14,['rgb','depth','touch'][i],c)+module(x,76,146,65,l,'Frozen',c,true)+route(`M${x+73} 141V165H240V194`,c,on)+'</g>';});
  s+=inset(10,194,460,318,'Partial geometry interface');
  s+=points(100,281,C.purple,0,change)+points(240,281,C.teal,1,change)+(touch?points(380,281,C.sand,1,change):text(380,287,'Offline','arch-small','middle'));
  s+=text(240,337,change?'Relate changes in the same interaction':'Relate jointly observable structure','arch-small','middle');
  s+=route('M240 349V384',C.purple)+grid(203,387,62,39,C.purple)+text(240,460,'Shared + original features','arch-label','middle');
  s+=route('M45 141H2V479H185',C.purple)+ (touch?route('M435 141H478V479H295',C.sand):'');
  s+=route('M240 478V550',C.teal)+module(84,550,312,66,'Persistent state','Update with history',C.teal)+route('M240 616V651',C.teal)+module(84,651,312,60,'ACT / Diffusion Policy','',C.teal);
 }
 svg.innerHTML=s;
}

function futureStrip(state,mobile){
 const good=state.candidate==='correct',y=mobile?490:340,w=mobile?460:860,x=mobile?10:20;
 let s=inset(x,y,w,mobile?274:174,'One action, consistent sensory consequences');
 const columns=mobile?[[40,y+70],[190,y+70],[340,y+70]]:[[52,y+61],[344,y+61],[635,y+61]];
 columns.forEach(([xx,yy],i)=>{
  const names=['Vision / depth','Touch','Force'];s+=text(xx,yy,names[i],'arch-label');
  if(i===0){
   const cx=xx+40,cy=yy+45;
   s+=`<path d="M${xx+4} ${cy+22}h85" stroke="#81768f" stroke-width="2"/><g transform="rotate(${good?0:18} ${cx} ${cy})"><path d="M${cx-10} ${cy-20}h25v33h-25Z" fill="${C.purple}33" stroke="${C.purple}"/><path d="M${cx-10} ${cy-20}l9 -6h25l-9 6" fill="none" stroke="${C.purple}"/></g>`;
  }else if(i===1){
   for(let k=0;k<12;k++)s+=`<circle cx="${xx+7+(k%6)*15}" cy="${yy+28+Math.floor(k/6)*22}" r="${good?4:2+(k%6)*.85}" fill="${C.sand}" opacity="${good?.7:.3+(k%6)*.13}"/>`;
  }else{
   const points=good?[20,9,0,9,15,18,20]:[20,20,16,10,0,-12,-17];s+=`<path d="M${points.map((v,k)=>`${xx+k*15} ${yy+37+v}`).join('L')}" fill="none" stroke="${good?C.teal:C.sand}" stroke-width="2"/>`;
  }
  const captions=good?['Aligned pose','Balanced contact','Less resistance']:['Pose error','One-sided contact','Rising resistance'];
  s+=text(xx,yy+96,captions[i],'arch-small');
 });
 if(mobile)s+=text(240,y+234,good?'Correct the pose, then continue.':'Advancing can increase resistance.','arch-small','middle');
 return s;
}
export function drawModel(svg,state){
 const mobile=svg.clientWidth<520,joint=state.mode==='joint';
 svg.setAttribute('viewBox',mobile?'0 0 480 785':'0 0 900 535');
 let s=definitions('m');
 if(!mobile){
  s+=text(20,23,'Multimodal history','arch-small');
  [['RGB','rgb',C.purple],['Depth','depth',C.teal],['Touch','touch',C.sand],['Force','force',C.sand]].forEach(([l,k,c],i)=>{
   const xx=20+(i%2)*99, yy=47+Math.floor(i/2)*109;s+=miniFrame(xx,yy,k,c,76,46)+text(xx+38,yy+70,l,'arch-small','middle');
  });
  s+=route('M96 70V132H225V173H269',C.purple)+route('M195 70H225V173',C.teal)+route('M96 179V242H225V173',C.sand)+route('M195 179H225V173',C.sand);
  s+=text(446,24,'Language · robot state · task history','arch-small','middle')+route('M446 34V59',C.teal);
  s+=`<path d="M282 59h303l-15 233H269Z" fill="#211e2b" stroke="${C.sand}" stroke-width="1.5"/>`;
  s+=text(427,93,'Pretrained WAM','arch-label','middle');
  s+=grid(302,123,52,37,C.purple)+grid(379,123,52,37,C.teal)+grid(456,123,52,37,C.sand);
  s+=text(428,186,'Multimodal interaction','arch-small','middle');
  s+=module(294,204,244,55,'Geometry interaction','',C.purple);
  s+=route('M585 125H649',C.sand)+module(652,95,226,66,'Future observations','RGB-D · touch · force',C.sand);
  s+=route(joint?'M578 244H649':'M649 244H578',C.teal)+module(652,211,226,66,joint?'Generated actions':'Candidate actions',state.candidate==='correct'?'Correct the pose':'Keep advancing',C.teal);
  s+=route('M766 161V183H892V322H839V339',C.sand,false);
  s+=text(424,318,'Learn world–action consistency','arch-small','middle');
  s+=futureStrip(state,false);
 }else{
  ['rgb','depth','touch','force'].forEach((k,i)=>{const x=17+i*119,c=[C.purple,C.teal,C.sand,C.sand][i];s+=miniFrame(x+12,12,k,c)+text(x+45,78,['RGB','Depth','Touch','Force'][i],'arch-small','middle');});
  s+=route('M240 94V100',C.sand,false)+text(240,123,'+ language and robot state','arch-small','middle')+route('M240 131V144',C.teal,false);
  s+=`<path d="M41 145h408l-12 174H29Z" fill="#211e2b" stroke="${C.sand}" stroke-width="1.5"/>`+text(240,181,'Pretrained WAM','arch-label','middle');
  s+=grid(115,205,55,33,C.purple)+grid(208,205,55,33,C.teal)+grid(301,205,55,33,C.sand)+text(240,278,'Geometry-aware multimodal updates','arch-small','middle');
  s+=route('M141 319V358',C.sand)+route(joint?'M350 319V358':'M350 358V319',C.teal);
  s+=module(10,358,216,76,'Future senses','RGB-D · touch · force',C.sand)+module(250,358,220,76,joint?'Generated actions':'Candidate actions',state.candidate==='correct'?'Correct the pose':'Keep advancing',C.teal);
  s+=route('M118 434V489',C.sand)+futureStrip(state,true);
 }
 svg.innerHTML=s;
}
export function drawGlyphs(){
 const containers=['foundation','x','m'];
 containers.forEach((name,i)=>{
  let s=definitions('g'+i);
  if(i===0)s+=grid(10,29,38,27,C.purple)+route('M64 43H95',C.purple)+module(98,18,90,50,'T','',C.purple)+route('M188 43H218',C.teal)+module(220,18,130,50,'Dynamics','',C.teal,true);
  if(i===1){[C.purple,C.teal,C.sand].forEach((c,j)=>{s+=grid(10,8+j*25,33,18,c,3)+route(`M57 ${17+j*25}H85Q98 ${17+j*25} 123 43`,c);});s+=module(124,18,110,50,'Interface','',C.purple)+route('M232 43H263',C.teal)+grid(275,26,57,35,C.teal);}
  if(i===2)s+=module(20,9,326,67,'','',C.sand)+[C.purple,C.teal,C.sand].map((c,j)=>grid(57+j*90,27,47,32,c)).join('');
  document.querySelector('#glyph-'+name).innerHTML=`<svg viewBox="0 0 360 85">${s}</svg>`;
 });
}
