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
export function createWorkcell(container,description,onCameraChange){
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
 if(description.ids.object!==undefined){const object=bodies[description.ids.object];const stripe=new THREE.Mesh(new THREE.BoxGeometry(.0503,.0443,.004),new THREE.MeshStandardMaterial({color:'#eee2cc',roughness:.7}));stripe.position.z=.013;object.add(stripe);}
 let flexGeometry=null,flexVertexMap=null;
 if(description.flex){
  const rest=description.flex.rest;flexGeometry=new THREE.BufferGeometry();flexVertexMap=description.flex.triangles;
  const positions=[],uv=[];
  // Separate UVs per physical triangle avoid cylindrical seams across the foam faces.
  for(let k=0;k<flexVertexMap.length;k+=3){
   const ids=flexVertexMap.slice(k,k+3),v=ids.map(i=>new THREE.Vector3().fromArray(rest,i*3));
   const n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
   const axis=[Math.abs(n.x),Math.abs(n.y),Math.abs(n.z)].indexOf(Math.max(Math.abs(n.x),Math.abs(n.y),Math.abs(n.z))),axes=[0,1,2].filter(i=>i!==axis);
   for(const id of ids){positions.push(...rest.slice(id*3,id*3+3));uv.push(rest[id*3+axes[0]]/.05,rest[id*3+axes[1]]/.05);}
  }
  flexGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  flexGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));flexGeometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.95,side:THREE.DoubleSide});materials.apply(material,'foam');const sponge=new THREE.Mesh(flexGeometry,material);sponge.castShadow=true;sponge.receiveShadow=true;sponge.frustumCulled=false;scene.add(sponge);
 }
 const lamp=new THREE.DirectionalLight('#fff3e1',2.6);lamp.position.set(-.1,-.8,2.1);lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);Object.assign(lamp.shadow.camera,{left:-1.3,right:1.3,top:1.3,bottom:-1.3,near:.1,far:4});lamp.shadow.bias=-.00007;lamp.shadow.normalBias=.0006;lamp.shadow.radius=2;scene.add(lamp);
 const fill=new THREE.DirectionalLight('#c0e5eb',1.2);fill.position.set(-1,1,1);scene.add(fill);scene.add(new THREE.HemisphereLight('#e7f2f1','#3b4540',1.1));
 const softCenter=new THREE.Vector3();if(description.flex){const p=description.flex.rest;for(let i=0;i<p.length;i+=3)softCenter.add(new THREE.Vector3(p[i],p[i+1],p[i+2]));softCenter.multiplyScalar(3/p.length);}
 let view='contact',disposed=false,syncing=false;const qa=new THREE.Quaternion(),qb=new THREE.Quaternion();
 function render(){if(!disposed){renderer.domElement.dataset.camera=JSON.stringify([...camera.position.toArray(),...controls.target.toArray()].map(v=>+v.toFixed(6)));renderer.render(scene,camera);}}
 function setView(v){view=v;if(v==='contact'){if(description.flex){camera.position.copy(softCenter).add(new THREE.Vector3(.27,.25,.20));controls.target.copy(softCenter).add(new THREE.Vector3(0,0,.035));}else{camera.position.set(1.02,.52,.54);controls.target.set(.46,.12,.13);}}else{camera.position.set(.99,-1.14,.94);controls.target.set(.34,.08,.21);}camera.updateProjectionMatrix();controls.update();render();}
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
 const ro=new ResizeObserver(resize);ro.observe(container);function cameraChanged(){render();if(!syncing)onCameraChange?.({view,offset:camera.position.clone().sub(controls.target).toArray(),target:controls.target.toArray()});}
 controls.addEventListener('change',cameraChanged);
 function syncCamera(state){if(disposed)return;syncing=true;view=state.view;if(description.flex&&view==='contact')controls.target.copy(softCenter).add(new THREE.Vector3(0,0,.035));else controls.target.fromArray(state.target);camera.position.copy(controls.target).add(new THREE.Vector3().fromArray(state.offset));controls.update();render();syncing=false;}
 function pose(a,b=a,f=0,softA=null,softB=softA){for(let i=0;i<bodies.length;i++){const k=i*7;bodies[i].position.set(a[k]+(b[k]-a[k])*f,a[k+1]+(b[k+1]-a[k+1])*f,a[k+2]+(b[k+2]-a[k+2])*f);qa.fromArray(a,k+3);qb.fromArray(b,k+3);bodies[i].quaternion.copy(qa).slerp(qb,f);}if(flexGeometry&&softA){const nextCenter=new THREE.Vector3();for(let i=0;i<softA.length;i+=3)for(let j=0;j<3;j++)nextCenter.setComponent(j,nextCenter.getComponent(j)+(softA[i+j]+((softB||softA)[i+j]-softA[i+j])*f)*3/softA.length);if(view==='contact'){const delta=nextCenter.clone().sub(softCenter);camera.position.add(delta);controls.target.add(delta);syncing=true;controls.update();syncing=false;}softCenter.copy(nextCenter);const p=flexGeometry.attributes.position.array;for(let i=0;i<flexVertexMap.length;i++)for(let j=0;j<3;j++){const k=flexVertexMap[i]*3+j;p[i*3+j]=softA[k]+((softB||softA)[k]-softA[k])*f;}flexGeometry.attributes.position.needsUpdate=true;flexGeometry.computeVertexNormals();}render();}
 setView('contact');resize();
 return {pose,setView,syncCamera,render,get view(){return view;},dispose(){disposed=true;ro.disconnect();controls.dispose();const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.isMesh){gs.add(o.geometry);ms.add(o.material);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());materials.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
