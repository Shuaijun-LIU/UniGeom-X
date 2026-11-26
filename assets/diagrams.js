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
  if(state.occluded)s+=`<path d="M340 203h190v126H340Z" fill="#1a1a25" fill-opacity=".92" stroke="#8c849d" stroke-dasharray="5 6"/>${text(435,253,'局部视觉遮挡','svg-label','middle')}${text(435,280,'目标信息继续保留','svg-small','middle')}`;
  else s+=`<path d="M387 280l47 27 51 -17" fill="none" stroke="${C.teal}" stroke-dasharray="4 6" opacity=".6"/>`;
  // Sensory readouts are qualitative illustrations, without fabricated metrics.
  const panels=narrow?[[110,425],[325,425],[540,425]]:[[28,35],[600,35],[600,180]];
  panels.forEach(([x,y],i)=>{
    const w=narrow?190:205, names=['RGB / Depth','Tactile','任务状态'];
    const info=[state.occluded?'局部观测缺失':'孔位与相对姿态',contact?(corrected?'接触趋于对称':'局部接触偏差'):'尚未接触目标','目标孔位持续保留'][i];
    const color=i===1?C.sand:i===2?C.teal:C.purple;
    s+=rect(x,y,w,99,color+'70','#17171fe8',9)+text(x+13,y+24,names[i],'svg-label','start',color)+text(x+13,y+79,info,'svg-small');
    if(i===0)s+=`<path d="M${x+17} ${y+55}h${state.occluded?25:145}" stroke="${color}" stroke-width="2" stroke-dasharray="${state.occluded?'4 7':'0'}"/>`;
    if(i===1)for(let j=0;j<9;j++)s+=`<circle cx="${x+25+j*17}" cy="${y+48+(contact?Math.sin(j*.8)*(corrected?3:9):0)}" r="${contact?3.4:2}" fill="${color}" opacity="${contact?'.9':'.3'}"/>`;
    if(i===2)s+=`<path d="M${x+17} ${y+48}h120m-6 -5 6 5-6 5" stroke="${color}" fill="none"/>`;
  });
  if(!narrow){s+=line(235,98,361,194,C.purple,'3 6')+line(600,230,512,265,C.teal,'3 6');}
  svg.innerHTML=s;
}

export function drawInterface(svg,state){
  const mobile=svg.clientWidth<480;
  svg.setAttribute('viewBox',mobile?'0 0 520 690':'0 0 920 510');
  const touch=state.touch,change=state.relation==='transition';
  let s='';
  if(mobile){
    const labels=['RGB','Depth','Tactile'];
    [15,185,355].forEach((x,i)=>{
      const color=[C.purple,C.teal,C.sand][i],active=i<2||touch;
      s+=`<g opacity="${active?1:.25}">`+node(x,25,150,74,labels[i],'独立编码器',color)+flow(`M${x+75} 99V133Q${x+75} 145 260 145V180`,color)+'</g>';
    });
    s+=rect(45,180,430,174,C.purple+'90')+text(260,212,'仅连接可共享的关系','svg-title','middle');
    s+=points(143,267,C.purple,0,change)+points(260,267,C.teal,1,change)+(touch?points(377,267,C.sand,1,change):text(377,275,'未接入','svg-small','middle'));
    s+=text(260,331,change?'对照同一交互中的变化方向':'联系局部形状与相对位置','svg-small','middle');
    s+=flow('M260 354V414',C.purple)+flow('M90 99V115H8V460H45',C.purple);
    if(touch)s+=flow('M430 99V115H512V460H475',C.sand);
    s+=text(260,391,'原有模态信息沿两侧旁路保留','svg-small','middle');
    s+=node(45,414,430,93,'持续更新交互状态','共享信息 + 原有特征 + 历史',C.teal)+flow('M260 507V555',C.teal)+node(105,555,310,80,'ACT / Diffusion Policy','生成动作，继续接收反馈',C.teal);
    s+=text(260,668,touch?'触觉接入后，压力与滑移仍可用于控制。':'仍保留视觉与深度；缺少新的触觉证据。','svg-small','middle');
  }else{
    s+=text(28,35,'独立感知模型','svg-small')+text(292,35,'轻量几何接口','svg-small')+text(675,35,'状态承接与控制','svg-small');
    ['RGB','Depth','Tactile'].forEach((label,i)=>{
      const y=70+i*132,color=[C.purple,C.teal,C.sand][i],active=i<2||touch;
      s+=`<g opacity="${active?1:.22}">`+node(28,y,173,78,label,'冻结 Encoder',color)+flow(`M201 ${y+39}H260Q275 ${y+39} 275 243H295`,color)+'</g>';
    });
    s+=rect(295,110,300,260,C.purple+'90')+text(445,147,'部分共享关系','svg-title','middle');
    s+=points(365,218,C.purple,0,change)+points(520,218,C.teal,1,change);
    s+=line(397,216,486,216,C.purple,'3 5');
    s+=touch?points(445,288,C.sand,1,change):text(445,298,'触觉尚未接入','svg-small','middle');
    s+=text(445,346,change?'共享变化，不要求坐标相同':'只联系当前可观察的共同信息','svg-small','middle');
    s+=flow('M595 243H665',C.purple)+flow('M201 109H238V65H774V142',C.purple);
    if(touch)s+=flow('M201 373H238V444H876V222H860',C.sand);
    s+=text(450,89,'原有信息旁路','svg-small','middle',C.purple)+text(450,475,touch?'触觉保留局部压力与滑移信息':'触觉分支未接入','svg-small','middle',touch?C.sand:C.muted);
    s+=node(665,142,195,128,'交互状态','结合历史持续更新',C.teal)+flow('M762 270V327',C.teal)+node(665,327,195,87,'ACT / DP','动作生成',C.teal);
    s+=`<path d="M860 370H894V177H860" fill="none" stroke="${C.teal}" stroke-width="1.3" stroke-dasharray="4 6"/>`;
  }
  svg.innerHTML=s;
}

function futurePanel(x,y,w,h,state){
  const good=state.candidate==='correct';
  let s=rect(x,y,w,h,C.sand+'65')+text(x+15,y+27,'同一次交互的未来','svg-label','start',C.sand);
  // Three parallel future observations of the same illustrative action.
  const slots=[['视觉 / 深度',good?'姿态逐步对准':'偏差仍然存在'],['触觉',good?'接触逐渐均匀':'单侧接触明显'],['受力',good?'阻力减小':'阻力持续上升']];
  slots.forEach(([title,desc],i)=>{
    const yy=y+62+i*65;
    s+=text(x+15,yy,title,'svg-small')+text(x+15,yy+24,desc,'svg-small','start',good?C.teal:C.sand);
    const start=x+w-109,cy=yy+6;
    if(i===0){s+=`<path d="M${start} ${cy+15}h72" stroke="#70687e" stroke-width="3"/><g transform="rotate(${good?0:15} ${start+36} ${cy})"><rect x="${start+26}" y="${cy-20}" width="20" height="30" rx="2" fill="${C.purple}66" stroke="${C.purple}"/></g>`;}
    if(i===1){for(let k=0;k<6;k++)s+=`<circle cx="${start+k*12}" cy="${cy+(k%2)*7}" r="${good?4:2+k*.9}" fill="${C.sand}" opacity="${good?.65:.3+k*.13}"/>`;}
    if(i===2){const ys=good?[10,5,0,4,8,10,11]:[13,13,10,8,2,-7,-12];s+=`<path d="M${ys.map((v,k)=>`${start+k*12} ${cy+v}`).join('L')}" fill="none" stroke="${good?C.teal:C.sand}" stroke-width="2"/>`;}
  });
  return s;
}
export function drawModel(svg,state){
  const mobile=svg.clientWidth<480,joint=state.mode==='joint';
  svg.setAttribute('viewBox',mobile?'0 0 520 810':'0 0 920 510');
  let s='';
  if(mobile){
    s+=text(260,25,'语言指令 · 机器人状态 · 多模态历史','svg-small','middle');
    ['RGB','Depth','Touch','Force'].forEach((l,i)=>{const x=12+i*128;s+=node(x,43,112,49,l,'',[C.purple,C.teal,C.sand,C.sand][i]);});
    s+=flow('M260 92V143',C.sand)+rect(35,143,450,150,C.sand)+text(260,180,'预训练 WAM + 多模态交互模块','svg-title','middle');
    s+=text(260,210,'继承已有的视觉、触觉与动作能力','svg-small','middle')+text(260,236,'新增深度、受力路径与几何交互','svg-small','middle');
    for(let i=0;i<9;i++)s+=`<rect x="${104+i*36}" y="256" width="23" height="15" rx="3" fill="${[C.purple,C.teal,C.sand][i%3]}" opacity=".6"/>`;
    s+=flow('M170 293V336',C.sand)+flow(joint?'M350 293V336':'M350 336V293',C.teal);
    s+=node(35,336,450,65,joint?'共同生成未来与动作':'输入候选动作，预测多模态未来',joint?'共享交互信息，学习物理一致性':'动作作为条件进入模型',C.teal);
    s+=futurePanel(35,425,450,240,state);
    s+=flow('M260 401V425',C.sand)+node(35,690,450,77,joint?'动作序列':'给定的动作序列',state.candidate==='correct'?'修正姿态，再继续插入':'保持当前姿态，继续向前',C.teal);
    s+=text(260,795,joint?'联合生成模式':'动作条件模式','svg-small','middle');
  }else{
    s+=text(22,35,'多模态历史与任务指令','svg-small');
    ['RGB / Depth','Tactile / Force','本体状态 / 语言'].forEach((l,i)=>{s+=node(22,74+i*98,185,67,l,'',[C.purple,C.sand,C.teal][i])+flow(`M207 ${107+i*98}H233Q255 ${107+i*98} 255 205H284`,[C.purple,C.sand,C.teal][i]);});
    s+=rect(284,102,266,232,C.sand)+text(417,143,'多模态 World-Action','svg-title','middle')+text(417,170,'Model','svg-title','middle');
    s+=text(417,213,'继承预训练模型能力','svg-small','middle')+text(417,241,'改造跨模态交互与预测','svg-small','middle');
    for(let i=0;i<7;i++)s+=`<rect x="${317+i*29}" y="273" width="18" height="18" rx="3" fill="${[C.purple,C.teal,C.sand][i%3]}" opacity=".65"/>`;
    s+=flow('M550 205H615',C.sand)+futurePanel(615,72,281,249,state);
    s+=flow(joint?'M417 334V397H615':'M615 397H417V334',C.teal)+node(615,355,281,85,joint?'生成动作序列':'输入候选动作',state.candidate==='correct'?'修正姿态，再继续插入':'保持姿态，继续向前',C.teal);
    s+=text(412,434,joint?'世界与动作共同生成':'动作条件进入模型','svg-small','middle',C.teal);
    s+=`<path d="M756 321V355" stroke="${C.sand}" stroke-width="1.5" stroke-dasharray="4 5"/>`+text(756,475,'视觉、接触与受力需要相互一致','svg-small','middle');
  }
  svg.innerHTML=s;
}

export function drawGlyphs(){
  const box=(x,w,c)=>rect(x,17,w,40,c,'#1b1a24',7);
  document.querySelector('#glyph-foundation').innerHTML=`<svg viewBox="0 0 360 75">${box(5,70,C.purple)+flow('M75 37H142',C.purple)+box(142,55,C.purple)+flow('M197 37H260',C.teal)+box(260,92,C.teal)}</svg>`;
  document.querySelector('#glyph-x').innerHTML=`<svg viewBox="0 0 360 75">${[C.purple,C.teal,C.sand].map((c,i)=>rect(5,4+i*25,52,18,c)+flow(`M57 ${13+i*25}H96Q110 ${13+i*25} 150 37`,c)).join('')+box(150,70,C.purple)+flow('M220 37H270',C.teal)+box(270,82,C.teal)}</svg>`;
  document.querySelector('#glyph-m').innerHTML=`<svg viewBox="0 0 360 75">${box(45,270,C.sand)+[C.purple,C.teal,C.sand,C.purple,C.teal,C.sand].map((c,i)=>rect(73+i*34,28,18,18,c,c+'55',3)).join('')}</svg>`;
}
