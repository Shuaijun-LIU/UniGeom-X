// Adapted from CarryQ's recordedWorkcell: one scene clock, pose interpolation,
// orbitable Three.js scene and explicit resource lifecycle. See CREDITS.md.
import * as THREE from './vendor/three.module.js';
import {createMaterials,roundedBox,studioEnvironment} from './materials.js';

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
 const materials=createMaterials(renderer),environment=studioEnvironment(renderer);scene.environment=environment.texture;
 const geometryCache={};
 for(const [key,g]of Object.entries(description.geometries)){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(array(g.position,Float32Array),3));geo.setIndex(new THREE.BufferAttribute(array(g.index,Uint32Array),1));geo.computeVertexNormals();geometryCache[key]=geo;}
 for(const g of description.geoms){
  let geo;const [x,y,z]=g.size;
  if(g.type===7)geo=geometryCache[g.mesh];
  else if(g.type===6)geo=roundedBox(x,y,z,g.name==='tabletop'?.004:g.name==='bench'?.002:.0008);
  else if(g.type===5){geo=new THREE.CylinderGeometry(x,x,y*2,64);geo.rotateX(Math.PI/2);}
  else if(g.type===2)geo=new THREE.SphereGeometry(x,24,16);
  else if(g.type===0)geo=new THREE.PlaneGeometry(100,100);
  else continue;
  const c=new THREE.Color(...g.color.slice(0,3));
  const material=new THREE.MeshStandardMaterial({color:c,roughness:g.type===7?.28:.67,metalness:g.type===7?.08:.03,envMapIntensity:.55});
  const mesh=new THREE.Mesh(geo,material);mesh.position.fromArray(g.position);mesh.quaternion.fromArray(g.quaternion);mesh.castShadow=g.type!==0;mesh.receiveShadow=true;bodies[g.body].add(mesh);
  if(g.name==='bench')materials.apply(material,'rubber');
  if(g.name==='tabletop')materials.apply(material,'laminate');
  if(g.type===0)materials.apply(material,'floor');
  if(g.name?.startsWith('leg')||g.name?.startsWith('apron'))materials.apply(material,'frame');
  if(g.name==='divider'||g.name?.startsWith('tray_'))materials.apply(material,'metal');
  if(g.name==='sample')materials.apply(material,'object');

 }
 // Hardware is visual only and follows the same world coordinates as the frame.
 const steel=new THREE.MeshStandardMaterial({color:'#9ba5a6',metalness:.86,roughness:.28,envMapIntensity:.7});
 const darkRubber=new THREE.MeshStandardMaterial({color:'#202829',roughness:.93});
 function cylinder(radius,height,material,x,y,z){const g=new THREE.CylinderGeometry(radius,radius,height,20);g.rotateX(Math.PI/2);const mesh=new THREE.Mesh(g,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
 for(const x of [-.33,.93])for(const y of [-.39,.47]){cylinder(.027,.012,darkRubber,x,y,-.593);cylinder(.012,.012,steel,x,y,-.581);}
 for(const x of [.405,.515])for(const y of [.202,.298]){cylinder(.0028,.0008,steel,x,y,.0043);const slit=new THREE.Mesh(new THREE.BoxGeometry(.003,.0005,.0001),darkRubber);slit.position.set(x,y,.00475);scene.add(slit);}
 const edge=new THREE.Mesh(roundedBox(.49*Math.SQRT2,.35*Math.SQRT2,.002,.001),new THREE.MeshStandardMaterial({color:'#666957',roughness:.53}));edge.position.set(.30,.04,-.053);edge.receiveShadow=true;scene.add(edge);
 // A non-colliding printed stripe makes object motion easy to follow.
 const object=bodies[description.ids.object];const stripe=new THREE.Mesh(new THREE.BoxGeometry(.0503,.0443,.004),new THREE.MeshStandardMaterial({color:'#eee2cc',roughness:.7}));stripe.position.z=.013;object.add(stripe);
 const lamp=new THREE.DirectionalLight('#fff3e1',2.6);lamp.position.set(-.1,-.8,2.1);lamp.castShadow=true;lamp.shadow.mapSize.set(2048,2048);Object.assign(lamp.shadow.camera,{left:-1.3,right:1.3,top:1.3,bottom:-1.3,near:.1,far:4});lamp.shadow.bias=-.00007;lamp.shadow.normalBias=.0006;lamp.shadow.radius=2;scene.add(lamp);
 const fill=new THREE.DirectionalLight('#c0e5eb',1.2);fill.position.set(-1,1,1);scene.add(fill);scene.add(new THREE.HemisphereLight('#e7f2f1','#3b4540',1.1));
 let view='overview',disposed=false;const qa=new THREE.Quaternion(),qb=new THREE.Quaternion();
 function render(){if(!disposed)renderer.render(scene,camera);}
 function setView(v){view=v;if(v==='contact'){camera.position.set(1.02,.52,.54);controls.target.set(.46,.12,.13);}else{camera.position.set(1.68,-2.10,1.20);controls.target.set(.29,.03,-.015);}camera.updateProjectionMatrix();controls.update();render();}
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
 const ro=new ResizeObserver(resize);ro.observe(container);controls.addEventListener('change',render);
 function pose(a,b=a,f=0){for(let i=0;i<bodies.length;i++){const k=i*7;bodies[i].position.set(a[k]+(b[k]-a[k])*f,a[k+1]+(b[k+1]-a[k+1])*f,a[k+2]+(b[k+2]-a[k+2])*f);qa.fromArray(a,k+3);qb.fromArray(b,k+3);bodies[i].quaternion.copy(qa).slerp(qb,f);}render();}
 setView('overview');resize();
 return {pose,setView,render,get view(){return view;},dispose(){disposed=true;ro.disconnect();controls.dispose();const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.isMesh){gs.add(o.geometry);ms.add(o.material);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());materials.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
