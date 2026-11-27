import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const root=new URL('../docs/assets/workcell/',import.meta.url);
const load=name=>JSON.parse(gunzipSync(fs.readFileSync(new URL('data/'+name+'.json.gz',root))));
const a=load('contact-feedback'),b=load('fixed-grip'),scene=load('scene');
const hash=buf=>createHash('sha256').update(buf).digest('hex');
for(const e of [a,b])test(e.id+': complete, finite, synchronized physics record',()=>{
 assert.equal(e.frames[0].time,0);assert.equal(e.frames.at(-1).time,20);assert.equal(e.frames.length,1001);
 for(let i=0;i<e.frames.length;i++){
  const f=e.frames[i];if(i)assert.ok(f.time>e.frames[i-1].time);
  assert.equal(f.bodies.length,scene.bodies*7);
  for(const n of [...f.bodies,...f.qpos,...f.normal,...f.shear,f.grip,f.slip,f.pulse])assert.ok(Number.isFinite(n));
  for(let j=0;j<scene.bodies;j++)assert.ok(Math.abs(Math.hypot(...f.bodies.slice(j*7+3,j*7+7))-1)<1e-5);
  assert.ok(f.normal.every(n=>n>=0));assert.ok(f.shear.every(n=>n>=0));
 }
 assert.equal(e.controller_sha256,hash(fs.readFileSync(new URL('physics.js',root))));
 assert.equal(e.assets_sha256,hash(fs.readFileSync(new URL('data/physics.json.gz',root))));
});
test('matched scene produces distinct physical outcomes without altering target',()=>{
 assert.equal(a.assets_sha256,b.assets_sha256);assert.deepEqual(a.frames[0].qpos,b.frames[0].qpos);assert.deepEqual(a.disturbance,b.disturbance);
 assert.equal(a.frames.at(-1).success,true);assert.equal(b.frames.at(-1).success,false);
 assert.ok(a.frames.some(f=>f.object[2]>.18));assert.ok(b.frames.some(f=>f.object[2]>.18));
 assert.ok(a.frames.at(-1).peakSlip<.03);assert.ok(b.frames.at(-1).peakSlip>.1);
 assert.ok(a.frames.some(f=>f.grip>3));assert.ok(b.frames.every(f=>f.grip===1.8));
 assert.equal(a.frames.at(-1).phase,'Seated in pocket');assert.equal(b.frames.at(-1).phase,'Placement failed');
});
test('extended task clears the divider, rotates and seats after two disturbances',()=>{
 assert.equal(a.duration,20);assert.equal(a.disturbance.length,2);
 const crossing=a.frames.filter(f=>f.object[1]>.09&&f.object[1]<.16);
 assert.ok(crossing.length>10);assert.ok(crossing.every(f=>f.object[2]-.033>.11));
 assert.ok(a.frames.at(-1).angleError<.22);assert.ok(a.frames.at(-1).object[2]<.047);
 assert.ok(a.frames.some(f=>f.time>10.5&&f.time<11.3&&f.pulse>.6));
 for(const f of a.frames)for(const v of f.tangent.flat())assert.ok(Number.isFinite(v));
 assert.equal(scene.geoms.filter(g=>g.name?.startsWith('leg_')).length,4);
});

test('dropped block stays at its landing position without later scripted loads',()=>{
 const dropped=b.frames.find(f=>f.dropped);assert.ok(dropped);assert.ok(dropped.time<7);
 const rest=b.frames.filter(f=>f.time>=7),position=rest[0].object;
 for(const f of rest){assert.equal(f.pulse,0);assert.ok(Math.hypot(...f.object.map((v,i)=>v-position[i]))<.0001);assert.equal(f.dropped,true);}
 assert.equal(rest.at(-1).phase,'Placement failed');
});
