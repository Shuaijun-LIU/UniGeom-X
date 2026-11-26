import {solveSelectedIk} from './selectedIkSolver.js';
import {smooth} from './physics.js';
export const DURATION=20,DT=.001;
export function createSimulation(mj,{feedback=true}={}){
 const model=mj.MjModel.loadFromXML('/unigeom/soft-scene.xml'),data=new mj.MjData(model),scratch=new mj.MjData(model);
 const id=(t,n)=>mj.mj_name2id(model,t,n),site=id(6,'grasp_center'),hand=id(1,'hand'),pads=[id(5,'left_pad'),id(5,'right_pad')];
 const addresses=Array.from({length:7},(_,i)=>model.jnt_qposadr[id(3,'joint'+(i+1))]);
 const ranges=Array.from({length:7},(_,i)=>{const j=id(3,'joint'+(i+1));return [model.jnt_range[2*j],model.jnt_range[2*j+1]];});
 const home=[0,-.6,0,-2.1,0,1.5,.785398];addresses.forEach((a,i)=>data.qpos[a]=home[i]);data.qpos[7]=data.qpos[8]=.04;mj.mj_forward(model,data);
 const targets=[[.46,0,.18],[.46,0,.034],[.46,0,.21],[.46,0,.30],[.46,.25,.30],[.46,.25,.11],[.46,.25,.036],[.46,.25,.20]];
 const poses=[];let previous=home;
 for(const [index,p]of targets.entries()){
  scratch.qpos.set(data.qpos);const q=solveSelectedIk({mujoco:mj,model,data:scratch,siteId:site,qposAddresses:addresses,currentQ:previous,targetPosition:{x:p[0],y:p[1],z:p[2]},targetQuaternion:index>=4?{x:Math.SQRT1_2,y:Math.SQRT1_2,z:0,w:0}:{x:1,y:0,z:0,w:0},jointRanges:ranges,maxIterations:150,tolerance:.00003,damping:.00005});
  if(!q)throw Error('Soft-task IK failed');poses.push(q);previous=q;
 }
 poses[0].forEach((v,i)=>{data.qpos[addresses[i]]=v;data.ctrl[i]=v;});data.ctrl[7]=5;mj.mj_forward(model,data);
 const object=id(1,'sponge'),vertexBodies=Array.from({length:8},(_,i)=>id(1,'sponge_node_'+i)),sampleGeoms=Array.from({length:8},(_,i)=>id(5,'sponge_contact_'+i)),events=[];
 const signs=Array.from({length:8},(_,i)=>[i<4?-1:1,(i%4)<2?-1:1,i%2?1:-1]);
 // Rendered corners track the corresponding compliant contact bodies.
 function softVertices(){return vertexBodies.flatMap((b,i)=>[0,1,2].map(j=>data.xpos[b*3+j]+signs[i].reduce((v,x,k)=>v+x*.008*data.xmat[b*9+j*3+k],0)));}
 const vertices=8,rest=softVertices(),faces=[[0,1,4,5],[2,3,6,7]],all=Array.from({length:8},(_,i)=>i);
 function center(indices){const positions=softVertices(),c=[0,0,0];for(const i of indices)for(let j=0;j<3;j++)c[j]+=positions[i*3+j]/indices.length;return c;}
 const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i])),restWidth=distance(center(faces[0]),center(faces[1]));
 let grip=feedback?3.2:8.0,compression=0,peakCompression=0,slip=0,peakSlip=0,baseOffset=null,lastOffset=null,recovered=false,event=false,done=false,pulse=0;
 let loads=[0,1].map(()=>({normal:0,shear:0,points:[],tangent:[0,0]}));const forceBuffer=new mj.DoubleBuffer(6);
 function contacts(){
  loads=[0,1].map(()=>({normal:0,shear:0,points:[],tangent:[0,0]}));
  const contactList=data.contact;
  for(let k=0;k<data.ncon;k++){
   const c=contactList.get(k);if(!sampleGeoms.includes(c.geom1)&&!sampleGeoms.includes(c.geom2)){c.delete();continue;}
   const side=sampleGeoms.includes(c.geom1)?1:0,g=c.geom[side],p=pads.indexOf(g);if(p<0){c.delete();continue;}
   mj.mj_contactForce(model,data,k,forceBuffer);const f=forceBuffer.GetView(),normal=Math.max(0,f[0]);loads[p].normal+=normal;loads[p].shear+=Math.hypot(f[1],f[2]);
   const mat=data.geom_xmat.subarray(g*9,g*9+9),delta=[0,1,2].map(j=>c.pos[j]-data.geom_xpos[g*3+j]);
   const local=[0,1,2].map(j=>delta.reduce((a,v,i)=>a+v*mat[i*3+j],0));loads[p].points.push([local[0],local[2],normal]);
   const sign=side===1?1:-1,w=[0,1,2].map(j=>sign*(c.frame[3+j]*f[1]+c.frame[6+j]*f[2]));loads[p].tangent[0]+=w.reduce((v,x,i)=>v+x*mat[i*3],0);loads[p].tangent[1]+=w.reduce((v,x,i)=>v+x*mat[i*3+2],0);c.delete();
  }
  contactList.delete();
  for(const p of loads)p.shear=Math.hypot(...p.tangent);
 }
 function step(){
  if(done)return;const t=data.time;let a=0,b=1,u=t/2;
  if(t>=2&&t<3){a=b=1;u=0;}else if(t>=3&&t<5){a=1;b=2;u=(t-3)/2;}else if(t>=5&&t<8){a=b=2;u=0;}else if(t>=8&&t<9.5){a=2;b=3;u=(t-8)/1.5;}else if(t>=9.5&&t<12.5){a=3;b=4;u=(t-9.5)/3;}else if(t>=12.5&&t<14){a=4;b=5;u=(t-12.5)/1.5;}else if(t>=14&&t<17){a=5;b=6;u=(t-14)/3;}else if(t>=17&&t<18){a=b=6;u=0;}else if(t>=18){a=6;b=7;u=(t-18)/2;}
  const blend=smooth(u);for(let j=0;j<7;j++)data.ctrl[j]=poses[a][j]+blend*(poses[b][j]-poses[a][j]);
  const n=loads.reduce((s,x)=>s+x.normal,0),shear=loads.reduce((s,x)=>s+x.shear,0);
  if(feedback&&t>2.3&&t<14&&n>.05){if(compression>.18)grip=Math.max(.4,grip-.004);else if(shear/n>.46)grip=Math.min(4.5,grip+.003);}
  data.ctrl[7]=t<2||t>=17?5:-grip;
  const down=t>=5.5&&t<6.3?.12*Math.sin(Math.PI*(t-5.5)/.8):0,side=t>=10.5&&t<11.3?.10*Math.sin(Math.PI*(t-10.5)/.8):0;pulse=Math.hypot(down,side);
  data.xfrc_applied[object*6]=side;data.xfrc_applied[object*6+2]=-down;
  mj.mj_step(model,data);if(data.time<t)throw Error('Soft-body integration became unstable');contacts();
  compression=Math.max(0,1-distance(center(faces[0]),center(faces[1]))/restWidth);peakCompression=Math.max(peakCompression,compression);
  const p=center(all),offset=p[2]-data.site_xpos[site*3+2];if(t>4.8&&baseOffset===null)baseOffset=offset;
  if(baseOffset!==null&&t<17){slip=Math.max(0,baseOffset-offset);peakSlip=Math.max(peakSlip,slip);}
  if(t>=5.5&&!event){event=true;events.push({time:data.time,label:'Downward load',kind:'disturbance'});}
  if(event&&!recovered&&t>6.3&&p[2]>.12&&lastOffset!==null&&Math.abs(offset-lastOffset)/DT<.005&&slip<.03){recovered=true;events.push({time:data.time,label:'Stable soft grasp',kind:'recovery'});}
  lastOffset=offset;done=data.time>=DURATION-1e-8;
 }
 function snapshot(){
  const p=center(all),placed=done&&Math.abs(p[0]-.46)<.035&&Math.abs(p[1]-.25)<.035&&p[2]>.020&&p[2]<.055,success=placed&&peakCompression<.35;
  let phase=data.time<2?'Approach':data.time<3?'Establish contact':data.time<5.5?'Lift':data.time<8?(recovered?'Grip recovered':'Respond to load'):data.time<9.5?'Clear the divider':data.time<12.5?'Turn & transfer':data.time<14?'Align with tray':data.time<17?'Lower into tray':data.time<18?'Release & rebound':'Withdraw';
  if(data.time>5.5&&data.time<14&&p[2]<.08)phase='Object dropped';if(done)phase=!placed?'Placement failed':success?'Placed & recovered':'Excess compression';
  return {time:Number(data.time.toFixed(6)),phase,normal:loads.map(x=>x.normal),shear:loads.map(x=>x.shear),patches:loads.map(x=>x.points),tangent:loads.map(x=>x.tangent),grip,slip,peakSlip,pulse,object:p,compression,peakCompression,recovered,done,placed,success,soft:softVertices()};
 }
 function bodyFrames(){const out=[];for(let i=0;i<model.nbody;i++)out.push(...data.xpos.subarray(i*3,i*3+3),data.xquat[i*4+1],data.xquat[i*4+2],data.xquat[i*4+3],data.xquat[i*4]);return out;}
 return {model,data,step,snapshot,bodyFrames,events,dt:DT,ids:{hand,pads,soft:0},dispose(){forceBuffer.delete();scratch.delete();data.delete();model.delete();}};
}
