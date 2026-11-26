import {solveSelectedIk} from './selectedIkSolver.js';
export const DURATION=16;
export const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
export function mountAssets(mj,files){
  try{mj.FS.mkdir('/unigeom');mj.FS.mkdir('/unigeom/assets');}catch{}
  for(const [name,b64]of Object.entries(files))mj.FS.writeFile('/unigeom/'+name,Uint8Array.from(atob(b64),c=>c.charCodeAt(0)));
}
export function createSimulation(mj,{feedback=true,disturbance=1.3}={}){
 const model=mj.MjModel.loadFromXML('/unigeom/scene.xml'),data=new mj.MjData(model),scratch=new mj.MjData(model);
 const id=(type,name)=>mj.mj_name2id(model,type,name);
 const object=id(1,'object'),hand=id(1,'hand'),site=id(6,'grasp_center'),pads=[id(5,'left_pad'),id(5,'right_pad')],sample=id(5,'sample');
 const addresses=Array.from({length:7},(_,i)=>model.jnt_qposadr[id(3,'joint'+(i+1))]);
 const ranges=Array.from({length:7},(_,i)=>{const j=id(3,'joint'+(i+1));return [model.jnt_range[2*j],model.jnt_range[2*j+1]];});
 const home=[0,-.6,0,-2.1,0,1.5,.785398];addresses.forEach((a,i)=>data.qpos[a]=home[i]);
 data.qpos[7]=data.qpos[8]=.04;mj.mj_forward(model,data);
 const targets=[[.46,0,.18],[.46,0,.039],[.46,0,.21],[.46,.22,.21],[.46,.22,.039],[.46,.22,.18]];
 const poses=[];let prev=home;
 for(const p of targets){scratch.qpos.set(data.qpos);const q=solveSelectedIk({mujoco:mj,model,data:scratch,siteId:site,qposAddresses:addresses,currentQ:prev,targetPosition:{x:p[0],y:p[1],z:p[2]},targetQuaternion:{x:1,y:0,z:0,w:0},jointRanges:ranges,maxIterations:150,tolerance:.00003,damping:.00005});
 if(!q)throw Error('IK failed');q.forEach((v,i)=>scratch.qpos[addresses[i]]=v);mj.mj_forward(model,scratch);
 const err=Math.hypot(...p.map((v,i)=>scratch.site_xpos[site*3+i]-v));if(err>.001)throw Error('IK target outside tolerance: '+err);
 poses.push(q);prev=q;}
 poses[0].forEach((v,i)=>{data.qpos[addresses[i]]=v;data.ctrl[i]=v;});data.ctrl[7]=5;mj.mj_forward(model,data);
 let grip=1.8,baseOffset=null,lastZ=null,lastHandZ=null,slip=0,peakSlip=0,event=false,recovered=false,done=false;
 let loads=[{normal:0,shear:0,points:[]},{normal:0,shear:0,points:[]}];const forceBuffer=new mj.DoubleBuffer(6);
 const events=[];
 const phase=t=>t<2?'Approach':t<3?'Establish contact':t<5.5?'Lift':t<8?(event?(recovered?'Grip recovered':'Respond to load'):'Hold'):t<11?'Transfer':t<13?'Place':t<14?'Release':'Withdraw';
 function contacts(){
  loads=[{normal:0,shear:0,points:[]},{normal:0,shear:0,points:[]}];
  for(let k=0;k<data.ncon;k++){
   const c=data.contact.get(k);let p=-1;
   if(c.geom1===sample)p=pads.indexOf(c.geom2);if(c.geom2===sample)p=pads.indexOf(c.geom1);if(p<0)continue;
   mj.mj_contactForce(model,data,k,forceBuffer);const force=forceBuffer.GetView();
   const normal=Math.max(0,force[0]),shear=Math.hypot(force[1],force[2]);loads[p].normal+=normal;loads[p].shear+=shear;
   const g=pads[p],delta=[0,1,2].map(j=>c.pos[j]-data.geom_xpos[g*3+j]);const m=data.geom_xmat.subarray(g*9,g*9+9);
   const local=[0,1,2].map(j=>delta.reduce((a,v,i)=>a+v*m[i*3+j],0));loads[p].points.push([local[0],local[2],normal]);
  }
 }
 function step(){
  if(done)return;
  const t=data.time;let a=0,b=1,u=t/2;
  if(t>=2&&t<3){a=b=1;u=0;}
  else if(t>=3&&t<5){a=1;b=2;u=(t-3)/2;}
  else if(t>=5&&t<8){a=b=2;u=0;}
  else if(t>=8&&t<11){a=2;b=3;u=(t-8)/3;}
  else if(t>=11&&t<13){a=3;b=4;u=(t-11)/2;}
  else if(t>=13&&t<14){a=b=4;u=0;}
  else if(t>=14){a=4;b=5;u=(t-14)/2;}
  const blend=smooth(u);for(let j=0;j<7;j++)data.ctrl[j]=poses[a][j]+blend*(poses[b][j]-poses[a][j]);
  const n=loads.reduce((s,p)=>s+p.normal,0),s=loads.reduce((s,p)=>s+p.shear,0);
  // Ideal contact-force feedback; no learned policy or optical tactile estimator.
  if(feedback&&t>3.2&&t<13&&n>.1&&s/n>.46){grip=Math.min(9,grip+.032);}
  data.ctrl[7]=t<2?5:t>=13?5:-grip;
  const pulse=t>=5.5&&t<6.3?disturbance*Math.sin(Math.PI*(t-5.5)/.8):0;
  data.xfrc_applied[object*6+2]=-pulse;
  mj.mj_step(model,data);contacts();
  const z=data.xpos[object*3+2],hz=data.site_xpos[site*3+2];
  if(t>4.8&&baseOffset===null)baseOffset=z-hz;
  if(baseOffset!==null&&t<13){slip=Math.max(0,baseOffset-(z-hz));peakSlip=Math.max(peakSlip,slip);}
  if(t>=5.5&&!event){event=true;events.push({time:data.time,label:'Downward load',kind:'disturbance'});}
  const relativeSpeed=lastZ===null?0:((z-lastZ)-(hz-lastHandZ))/.002;
  if(event&&!recovered&&t>6.3&&z>.12&&Math.abs(relativeSpeed)<.002&&slip<.03){recovered=true;events.push({time:data.time,label:'Stable hold',kind:'recovery'});}
  lastZ=z;lastHandZ=hz;done=data.time>=DURATION;
 }
 function snapshot(){const p=Array.from(data.xpos.subarray(object*3,object*3+3));
 return {time:Number(data.time.toFixed(6)),phase:data.time>=16?(Math.hypot(p[0]-.46,p[1]-.22)<.03?'Placed on target':'Object dropped'):(data.time>5.5&&data.time<11&&p[2]<.08?'Object dropped':phase(data.time)),normal:loads.map(x=>x.normal),shear:loads.map(x=>x.shear),patches:loads.map(x=>x.points),grip,slip,peakSlip,pulse:data.xfrc_applied[object*6+2],object:p,recovered,done,success:done&&Math.hypot(p[0]-.46,p[1]-.22)<.03&&p[2]>.025&&p[2]<.055};}
 function bodyFrames(){const out=[];for(let i=0;i<model.nbody;i++)out.push(...data.xpos.subarray(i*3,i*3+3),data.xquat[i*4+1],data.xquat[i*4+2],data.xquat[i*4+3],data.xquat[i*4]);return out;}
 return {model,data,step,snapshot,bodyFrames,events,ids:{object,hand,pads,sample},dispose(){forceBuffer.delete();scratch.delete();data.delete();model.delete();}};
}
