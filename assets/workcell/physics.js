import {solveSelectedIk} from './selectedIkSolver.js';
export const DURATION=20;
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
 const targets=[[.46,0,.18],[.46,0,.039],[.46,0,.21],[.46,0,.30],[.46,.25,.30],[.46,.25,.11],[.46,.25,.043],[.46,.25,.20]];
 const poses=[];let prev=home;
 for(const [index,p] of targets.entries()){scratch.qpos.set(data.qpos);const q=solveSelectedIk({mujoco:mj,model,data:scratch,siteId:site,qposAddresses:addresses,currentQ:prev,targetPosition:{x:p[0],y:p[1],z:p[2]},targetQuaternion:index>=4?{x:Math.SQRT1_2,y:Math.SQRT1_2,z:0,w:0}:{x:1,y:0,z:0,w:0},jointRanges:ranges,maxIterations:150,tolerance:.00003,damping:.00005});
 if(!q)throw Error('IK failed');q.forEach((v,i)=>scratch.qpos[addresses[i]]=v);mj.mj_forward(model,scratch);
 const err=Math.hypot(...p.map((v,i)=>scratch.site_xpos[site*3+i]-v));if(err>.001)throw Error('IK target outside tolerance: '+err);
 poses.push(q);prev=q;}
 poses[0].forEach((v,i)=>{data.qpos[addresses[i]]=v;data.ctrl[i]=v;});data.ctrl[7]=5;mj.mj_forward(model,data);
 let grip=1.8,baseOffset=null,lastZ=null,lastHandZ=null,slip=0,peakSlip=0,event=false,recovered=false,done=false;
 let loads=[{normal:0,shear:0,points:[],tangent:[0,0]},{normal:0,shear:0,points:[],tangent:[0,0]}];const forceBuffer=new mj.DoubleBuffer(6);
 const events=[];
 const phase=t=>t<2?'Approach':t<3?'Establish contact':t<5.5?'Lift':t<8?(recovered?'Grip recovered':'Respond to load'):t<9.5?'Clear the divider':t<12.5?'Turn & transfer':t<14?'Align with pocket':t<17?'Seat in pocket':t<18?'Release':'Withdraw';
 function contacts(){
  loads=[{normal:0,shear:0,points:[],tangent:[0,0]},{normal:0,shear:0,points:[],tangent:[0,0]}];
  for(let k=0;k<data.ncon;k++){
   const c=data.contact.get(k);let p=-1;
   if(c.geom1===sample)p=pads.indexOf(c.geom2);if(c.geom2===sample)p=pads.indexOf(c.geom1);if(p<0)continue;
   mj.mj_contactForce(model,data,k,forceBuffer);const force=forceBuffer.GetView();
   const normal=Math.max(0,force[0]),shear=Math.hypot(force[1],force[2]);loads[p].normal+=normal;loads[p].shear+=shear;
   const g=pads[p],delta=[0,1,2].map(j=>c.pos[j]-data.geom_xpos[g*3+j]);const m=data.geom_xmat.subarray(g*9,g*9+9);
   const local=[0,1,2].map(j=>delta.reduce((a,v,i)=>a+v*m[i*3+j],0));loads[p].points.push([local[0],local[2],normal]);
   const sign=c.geom2===g?1:-1;
   const worldForce=[0,1,2].map(j=>sign*(c.frame[3+j]*force[1]+c.frame[6+j]*force[2]));
   loads[p].tangent[0]+=worldForce.reduce((v,x,i)=>v+x*m[i*3],0);
   loads[p].tangent[1]+=worldForce.reduce((v,x,i)=>v+x*m[i*3+2],0);
  }
 }
 function step(){
  if(done)return;
  const t=data.time;let a=0,b=1,u=t/2;
  if(t>=2&&t<3){a=b=1;u=0;}
  else if(t>=3&&t<5){a=1;b=2;u=(t-3)/2;}
  else if(t>=5&&t<8){a=b=2;u=0;}
  else if(t>=8&&t<9.5){a=2;b=3;u=(t-8)/1.5;}
  else if(t>=9.5&&t<12.5){a=3;b=4;u=(t-9.5)/3;}
  else if(t>=12.5&&t<14){a=4;b=5;u=(t-12.5)/1.5;}
  else if(t>=14&&t<17){a=5;b=6;u=(t-14)/3;}
  else if(t>=17&&t<18){a=b=6;u=0;}
  else if(t>=18){a=6;b=7;u=(t-18)/2;}
  const blend=smooth(u);for(let j=0;j<7;j++)data.ctrl[j]=poses[a][j]+blend*(poses[b][j]-poses[a][j]);
  const n=loads.reduce((s,p)=>s+p.normal,0),s=loads.reduce((s,p)=>s+p.shear,0);
  // Ideal contact-force feedback; no learned policy or optical tactile estimator.
  if(feedback&&t>3.2&&t<14&&n>.1&&s/n>.46){grip=Math.min(9,grip+.032);}
  data.ctrl[7]=t<2?5:t>=17?5:-grip;
  const pulse=t>=5.5&&t<6.3?disturbance*Math.sin(Math.PI*(t-5.5)/.8):0;
  data.xfrc_applied[object*6+2]=-pulse;
  data.xfrc_applied[object*6]=t>=10.5&&t<11.3?.65*Math.sin(Math.PI*(t-10.5)/.8):0;
  mj.mj_step(model,data);contacts();
  const z=data.xpos[object*3+2],hz=data.site_xpos[site*3+2];
  if(t>4.8&&baseOffset===null)baseOffset=z-hz;
  if(baseOffset!==null&&t<17){slip=Math.max(0,baseOffset-(z-hz));peakSlip=Math.max(peakSlip,slip);}
  if(t>=5.5&&!event){event=true;events.push({time:data.time,label:'Downward load',kind:'disturbance'});}
  const relativeSpeed=lastZ===null?0:((z-lastZ)-(hz-lastHandZ))/.002;
  if(event&&!recovered&&t>6.3&&z>.12&&Math.abs(relativeSpeed)<.002&&slip<.03){recovered=true;events.push({time:data.time,label:'Stable hold',kind:'recovery'});}
  lastZ=z;lastHandZ=hz;done=data.time>=DURATION-1e-8;
 }
 function snapshot(){const p=Array.from(data.xpos.subarray(object*3,object*3+3));
 const rotation=data.xmat.subarray(object*9,object*9+9),yaw=Math.atan2(rotation[3],rotation[0]);
 const angleError=Math.abs(Math.atan2(Math.sin(yaw-Math.PI/2),Math.cos(yaw-Math.PI/2)));
 const success=done&&Math.abs(p[0]-.46)<.01&&Math.abs(p[1]-.25)<.01&&p[2]>.030&&p[2]<.047&&angleError<.22&&rotation[8]>.97;
 return {time:Number(data.time.toFixed(6)),phase:done?(success?'Seated in pocket':'Placement failed'):(data.time>5.5&&data.time<14&&p[2]<.08?'Object dropped':phase(data.time)),normal:loads.map(x=>x.normal),shear:loads.map(x=>x.shear),tangent:loads.map(x=>x.tangent),patches:loads.map(x=>x.points),grip,slip,peakSlip,pulse:Math.hypot(data.xfrc_applied[object*6],data.xfrc_applied[object*6+2]),object:p,yaw,angleError,recovered,done,success};}
 function bodyFrames(){const out=[];for(let i=0;i<model.nbody;i++)out.push(...data.xpos.subarray(i*3,i*3+3),data.xquat[i*4+1],data.xquat[i*4+2],data.xquat[i*4+3],data.xquat[i*4]);return out;}
 return {model,data,step,snapshot,bodyFrames,events,ids:{object,hand,pads,sample},dispose(){forceBuffer.delete();scratch.delete();data.delete();model.delete();}};
}
