// Adapted from CarryQ's recordedWorkcell: one scene clock, pose interpolation,
// orbitable Three.js scene and explicit resource lifecycle. See CREDITS.md.
import * as THREE from './vendor/three.module.js';

import {OrbitControls} from './vendor/OrbitControls.js';
export async function loadPackedJson(url,signal){
 const r=await fetch(url,{signal});if(!r.ok)throw Error('Scene asset unavailable ('+r.status+')');
 const bytes=new Uint8Array(await r.arrayBuffer());
 return new Response(bytes[0]===31&&bytes[1]===139?new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')):bytes).json();
}
const array=(s,type)=>{const a=Uint8Array.from(atob(s),c=>c.charCodeAt(0));return new type(a.buffer);};
export function createWorkcell(container,description,surfaces){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#34434b');scene.fog=new THREE.Fog('#34434b',3,9);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.setAttribute('aria-label','Interactive Franka grasp workcell. Drag to orbit; use the camera buttons for preset views.');container.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(39,1,.002,15);camera.up.set(0,0,1);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=.12;controls.maxDistance=4;controls.maxPolarAngle=Math.PI*.49;
 const bodies=Array.from({length:description.bodies},()=>{const g=new THREE.Group();scene.add(g);return g;});
 // Deterministic fine-grain surfaces replace the original wood and denim.
 const textures=[];
 function grainTexture(color,repeat){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,128,128);let seed=417;for(let i=0;i<16384;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;ctx.fillStyle=seed%2?'#ffffff08':'#00000008';if(seed%5<3)ctx.fillRect(i%128,Math.floor(i/128),1,1);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);textures.push(t);return t;}
 const rubber=grainTexture('#507d77',5),laminate=grainTexture('#c5bda7',4),concrete=grainTexture('#68777c',220);
 const geometryCache={};
 for(const [key,g]of Object.entries(description.geometries)){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(array(g.position,Float32Array),3));geo.setIndex(new THREE.BufferAttribute(array(g.index,Uint32Array),1));geo.computeVertexNormals();geometryCache[key]=geo;}
 for(const g of description.geoms){
  let geo;const [x,y,z]=g.size;
  if(g.type===7)geo=geometryCache[g.mesh];
  else if(g.type===6)geo=new THREE.BoxGeometry(x*2,y*2,z*2);
  else if(g.type===5){geo=new THREE.CylinderGeometry(x,x,y*2,64);geo.rotateX(Math.PI/2);}
  else if(g.type===2)geo=new THREE.SphereGeometry(x,24,16);
  else if(g.type===0)geo=new THREE.PlaneGeometry(100,100);
  else continue;
  const c=new THREE.Color(...g.color.slice(0,3));
  const material=new THREE.MeshStandardMaterial({color:c,roughness:g.type===7?.32:.67,metalness:g.type===7?.12:.03});
  const mesh=new THREE.Mesh(geo,material);mesh.position.fromArray(g.position);mesh.quaternion.fromArray(g.quaternion);mesh.castShadow=g.type!==0;mesh.receiveShadow=true;bodies[g.body].add(mesh);
  if(g.name==='bench'){material.color.set('#ffffff');material.map=rubber;material.roughness=.95;}
  if(g.name==='tabletop'){material.color.set('#ffffff');material.map=laminate;material.roughness=.73;}
  if(g.type===0){material.color.set('#ffffff');material.map=concrete;material.roughness=.96;}
  if(g.name?.startsWith('leg')||g.name?.startsWith('apron')){material.roughness=.42;material.metalness=.48;}
 }
 // A non-colliding printed stripe makes object motion easy to follow.
 const object=bodies[description.ids.object];const stripe=new THREE.Mesh(new THREE.BoxGeometry(.0503,.0443,.004),new THREE.MeshStandardMaterial({color:'#eee2cc',roughness:.7}));stripe.position.z=.013;object.add(stripe);
 const lamp=new THREE.DirectionalLight('#fff3e1',3.2);lamp.position.set(.3,-.8,1.8);lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);Object.assign(lamp.shadow.camera,{left:-.8,right:.8,top:.8,bottom:-.8,near:.1,far:4});lamp.shadow.bias=-.0002;scene.add(lamp);
 const fill=new THREE.DirectionalLight('#c0e5eb',1.2);fill.position.set(-1,1,1);scene.add(fill);scene.add(new THREE.HemisphereLight('#e7f2f1','#3b4540',1.8));
 let view='overview',disposed=false;const qa=new THREE.Quaternion(),qb=new THREE.Quaternion();
 function render(){if(!disposed)renderer.render(scene,camera);}
 function setView(v){view=v;if(v==='contact'){camera.position.set(1.02,.52,.54);controls.target.set(.46,.12,.13);}else{camera.position.set(1.55,-1.95,1.18);controls.target.set(.29,.03,.05);}camera.updateProjectionMatrix();controls.update();render();}
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
 const ro=new ResizeObserver(resize);ro.observe(container);controls.addEventListener('change',render);
 function pose(a,b=a,f=0){for(let i=0;i<bodies.length;i++){const k=i*7;bodies[i].position.set(a[k]+(b[k]-a[k])*f,a[k+1]+(b[k+1]-a[k+1])*f,a[k+2]+(b[k+2]-a[k+2])*f);qa.fromArray(a,k+3);qb.fromArray(b,k+3);bodies[i].quaternion.copy(qa).slerp(qb,f);}render();}
 setView('overview');resize();
 return {pose,setView,render,get view(){return view;},dispose(){disposed=true;ro.disconnect();controls.dispose();const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.isMesh){gs.add(o.geometry);ms.add(o.material);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
