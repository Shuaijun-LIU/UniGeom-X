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
