import fs from 'node:fs';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import load from '../docs/assets/workcell/vendor/mujoco_wasm.js';
import {mountAssets} from '../docs/assets/workcell/physics.js';
import {createSimulation,DURATION,DT} from '../docs/assets/workcell/soft-physics.js';
const root=new URL('../docs/assets/workcell/',import.meta.url),pack=fs.readFileSync(new URL('data/physics.json.gz',root)),softPack=fs.readFileSync(new URL('data/soft-physics.json.gz',root));
const mj=await load();for(const b of [pack,softPack])mountAssets(mj,JSON.parse(zlib.gunzipSync(b)));
const save=(name,value)=>fs.writeFileSync(new URL('data/'+name+'.json.gz',root),zlib.gzipSync(JSON.stringify(value),{level:9}));
const hash=b=>createHash('sha256').update(b).digest('hex');let sceneSaved=false;const outcomes=[];
for(const feedback of [true,false]){
 const sim=createSimulation(mj,{feedback}),m=sim.model;
 if(!sceneSaved){
  const geoms=[];
  for(let i=0;i<m.ngeom;i++){if(m.geom_group[i]===3)continue;const mat=m.geom_matid[i],q=Array.from(m.geom_quat.slice(i*4,i*4+4));geoms.push({id:i,name:mj.mj_id2name(m,5,i),body:m.geom_bodyid[i],type:m.geom_type[i],mesh:m.geom_dataid[i],size:Array.from(m.geom_size.slice(i*3,i*3+3)),position:Array.from(m.geom_pos.slice(i*3,i*3+3)),quaternion:[q[1],q[2],q[3],q[0]],color:Array.from(mat>=0?m.mat_rgba.slice(mat*4,mat*4+4):m.geom_rgba.slice(i*4,i*4+4))});}
  const rest=sim.snapshot().soft,triangles=[0,2,3,0,3,1,4,5,7,4,7,6,0,1,5,0,5,4,2,6,7,2,7,3,0,4,6,0,6,2,1,3,7,1,7,5];
  save('soft-scene',{sharedGeometry:true,geoms,bodies:m.nbody,ids:sim.ids,flex:{rest,triangles,model:'eight-node spring proxy',mass_kg:.028}});sceneSaved=true;
 }
 const frames=[],capture=()=>frames.push({...sim.snapshot(),bodies:sim.bodyFrames(),qpos:Array.from(sim.data.qpos)});capture();
 for(let i=0;i<Math.round(DURATION/DT);i++){sim.step();if((i+1)%Math.round(.02/DT)===0)capture();}
 const final=frames.at(-1),episode={schema_version:2,id:'soft-'+(feedback?'contact-feedback':'fixed-grip'),task:'soft-sponge-v1',controller:feedback?'Ideal contact and compression feedback':'Fixed firm grip',engine:'MuJoCo '+mj.mj_versionString(),duration:final.time,physics_dt:DT,record_dt:.02,material:{discretization:"8 compliant contact nodes around a free carrier",spring_N_per_m:[200,80,200],damping_Ns_per_m:.15,mass_kg:.028},compression_limit:.35,disturbance:[{axis:'world -Z',peak_N:.12,start_s:5.5,end_s:6.3},{axis:'world +X',peak_N:.10,start_s:10.5,end_s:11.3}],units:{position:'m',time:'s',force:'N',compression:'fraction of initial opposite-face distance'},sensor:'Ideal elastic-node contact forces and simulated face separation; gel RGB is an uncalibrated illustration',controller_sha256:hash(fs.readFileSync(new URL('soft-physics.js',root))),assets_sha256:hash(softPack),shared_assets_sha256:hash(pack),events:sim.events,frames};
 save(episode.id,episode);outcomes.push({id:episode.id,success:final.success,placed:final.placed,peakCompression:final.peakCompression,finalCompression:final.compression,peakSlip_mm:final.peakSlip*1000,maxNormal_N:Math.max(...frames.map(f=>f.normal.reduce((s,v)=>s+v,0)))});sim.dispose();console.log(outcomes.at(-1));
}
fs.writeFileSync(new URL('data/soft-outcomes.json',root),JSON.stringify(outcomes,null,2)+'\n');
