import fs from 'node:fs';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import load from '../docs/assets/workcell/vendor/mujoco_wasm.js';
import {mountAssets,createSimulation} from '../docs/assets/workcell/physics.js';
const root=new URL('../docs/assets/workcell/',import.meta.url),pack=fs.readFileSync(new URL('data/physics.json.gz',root));
const mj=await load();mountAssets(mj,JSON.parse(zlib.gunzipSync(pack)));
const save=(name,value)=>fs.writeFileSync(new URL('data/'+name+'.json.gz',root),zlib.gzipSync(JSON.stringify(value),{level:9}));
const hash=b=>createHash('sha256').update(b).digest('hex');
const b64=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
let sceneSaved=false;const outcomes=[];
for(const feedback of [true,false]){
 const sim=createSimulation(mj,{feedback});const m=sim.model;
 if(!sceneSaved){
  const geometries={},geoms=[];
  for(let i=0;i<m.ngeom;i++){
   if(m.geom_group[i]===3)continue;
   const type=m.geom_type[i],mesh=m.geom_dataid[i],mat=m.geom_matid[i];
   if(type===7&&!geometries[mesh]){
    const v=m.mesh_vertadr[mesh]*3,n=m.mesh_vertnum[mesh]*3,f=m.mesh_faceadr[mesh]*3,fc=m.mesh_facenum[mesh]*3;
    geometries[mesh]={position:b64(new Float32Array(m.mesh_vert.slice(v,v+n))),index:b64(new Uint32Array(m.mesh_face.slice(f,f+fc)))};
   }
   const q=Array.from(m.geom_quat.slice(i*4,i*4+4));
   geoms.push({id:i,body:m.geom_bodyid[i],type,mesh,size:Array.from(m.geom_size.slice(i*3,i*3+3)),position:Array.from(m.geom_pos.slice(i*3,i*3+3)),quaternion:[q[1],q[2],q[3],q[0]],color:Array.from(mat>=0?m.mat_rgba.slice(mat*4,mat*4+4):m.geom_rgba.slice(i*4,i*4+4))});
  }
  save('scene',{geometries,geoms,bodies:m.nbody,ids:sim.ids});sceneSaved=true;
 }
 const frames=[];function capture(){frames.push({...sim.snapshot(),bodies:sim.bodyFrames(),qpos:Array.from(sim.data.qpos)});}
 capture();for(let i=0;i<8000;i++){sim.step();if((i+1)%10===0||i===7999)capture();}
 const final=frames.at(-1);const episode={schema_version:1,id:feedback?'contact-feedback':'fixed-grip',task:'gentle-grasp-v1',controller:feedback?'Scripted contact-force feedback':'Scripted fixed grip',engine:'MuJoCo '+mj.mj_versionString(),duration:final.time,physics_dt:.002,record_dt:.02,disturbance:{axis:'world -Z',peak_N:1.3,start_s:5.5,end_s:6.3},units:{position:'m',time:'s',force:'N',quaternion:'xyzw'},sensor:'Ideal pad contact forces; not optical tactile images',controller_sha256:hash(fs.readFileSync(new URL('physics.js',root))),assets_sha256:hash(pack),events:sim.events,frames};
 save(episode.id,episode);outcomes.push({id:episode.id,success:final.success,recovered:final.recovered,peakSlip_mm:final.peakSlip*1000,maxNormal_N:Math.max(...frames.map(f=>f.normal.reduce((s,v)=>s+v,0))),events:episode.events});sim.dispose();
}
fs.writeFileSync(new URL('data/outcomes.json',root),JSON.stringify(outcomes,null,2)+'\n');console.log(JSON.stringify(outcomes,null,2));
