import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const root=new URL('../docs/assets/workcell/',import.meta.url);
const bytes=p=>fs.readFileSync(new URL(p,root)),load=n=>JSON.parse(gunzipSync(bytes('data/'+n+'.json.gz'))),hash=b=>createHash('sha256').update(b).digest('hex');
const a=load('soft-contact-feedback'),b=load('soft-fixed-grip'),scene=load('soft-scene');
for(const e of [a,b])test(e.id+': synchronized physical shape, forces and poses',()=>{
 assert.equal(e.frames.length,1001);assert.equal(e.frames[0].time,0);assert.equal(e.frames.at(-1).time,20);
 assert.equal(e.controller_sha256,hash(bytes('soft-physics.js')));assert.equal(e.assets_sha256,hash(bytes('data/soft-physics.json.gz')));assert.equal(e.shared_assets_sha256,hash(bytes('data/physics.json.gz')));
 for(const f of e.frames){assert.equal(f.soft.length,24);assert.equal(f.bodies.length,scene.bodies*7);for(const x of [...f.soft,...f.bodies,...f.normal,...f.shear,f.compression,f.peakCompression])assert.ok(Number.isFinite(x));}
 assert.ok(e.frames.some(f=>f.object[2]>.27));assert.equal(e.frames.at(-1).placed,true);
 assert.ok(e.frames.at(-1).compression<.01,'elastic recovery after release');
 assert.ok(e.frames.some(f=>f.compression>.1));
});
test('matched soft task contrasts grip pressure without fabricating damage',()=>{
 assert.deepEqual(a.frames[0].qpos,b.frames[0].qpos);assert.deepEqual(a.disturbance,b.disturbance);
 assert.equal(a.frames.at(-1).success,true);assert.equal(b.frames.at(-1).success,false);
 assert.ok(a.frames.at(-1).peakCompression<.35);assert.ok(b.frames.at(-1).peakCompression>.45);
 assert.ok(a.frames.some(f=>f.grip<a.frames[0].grip-.2),'feedback must actually relax the grip');
 assert.equal(a.frames.at(-1).phase,'Placed & recovered');assert.equal(b.frames.at(-1).phase,'Excess compression');
 const xml=Buffer.from(load('soft-physics')['soft-scene.xml'],'base64').toString();assert.ok(!xml.includes('<weld'));assert.equal((xml.match(/name="sponge_spring_/g)||[]).length,24);
});

const rotate=(q,v)=>{const [x,y,z,w]=q,c=[y*v[2]-z*v[1],z*v[0]-x*v[2],x*v[1]-y*v[0]],cc=[y*c[2]-z*c[1],z*c[0]-x*c[2],x*c[1]-y*c[0]];return v.map((n,i)=>n+2*w*c[i]+2*cc[i]);};
const inverse=q=>[-q[0],-q[1],-q[2],q[3]];
test('rendered sponge surface stays outside sensor pads within submillimetre contact tolerance',()=>{
 const pads=scene.geoms.filter(g=>['left_pad','right_pad'].includes(g.name));let worst=0;
 for(const e of [a,b])for(const f of e.frames)for(const pad of pads){const body=f.bodies.slice(pad.body*7,pad.body*7+7);
  for(let k=0;k<f.soft.length;k+=3){const localBody=rotate(inverse(body.slice(3)),f.soft.slice(k,k+3).map((v,j)=>v-body[j]));const local=rotate(inverse(pad.quaternion),localBody.map((v,j)=>v-pad.position[j]));
   if(Math.abs(local[0])<=pad.size[0]&&Math.abs(local[2])<=pad.size[2])worst=Math.max(worst,pad.size[1]-Math.abs(local[1]));
  }
 }
 assert.ok(worst<.00025,`Surface penetrates pad by ${worst*1000} mm`);
});
