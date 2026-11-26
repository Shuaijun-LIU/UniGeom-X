import * as THREE from './vendor/three.module.js';

// Deterministic, tileable material maps: color, micro-height and roughness.
// Generated in the browser, without external texture requests.
export function createMaterials(renderer){
 const textures=[];const size=256;
 const hash=(x,y)=>{let n=Math.imul(x+17,374761393)^Math.imul(y+31,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 function maps(hex,kind,repeat){
  const color=new THREE.Color(hex),rgb=[color.r,color.g,color.b].map(v=>THREE.ColorManagement.fromWorkingColorSpace(new THREE.Color(v,v,v),THREE.SRGBColorSpace).r*255);
  const albedo=new Uint8Array(size*size*4),height=new Uint8Array(albedo.length),rough=new Uint8Array(albedo.length);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const n=hash(x,y),broad=hash(Math.floor(x/8),Math.floor(y/8));let h=.5,shade=0,r=.8;
   if(kind==='rubber'){const px=(x%8)/8-.5,py=(y%8)/8-.5;h=.55-.32*Math.exp(-(px*px+py*py)*23)+(n-.5)*.1;shade=(h-.5)*.08;r=.87+n*.1;}
   else if(kind==='laminate'){h=.5+(n-.5)*.3;shade=(n-.5)*.045+(broad-.5)*.013;r=.55+n*.15;}
   else if(kind==='metal'){const line=hash(0,y);h=.5+(line-.5)*.35+(n-.5)*.12;shade=(line-.5)*.06;r=.33+line*.2;}
   else if(kind==='polymer'){h=.5+(n-.5)*.3;shade=(n-.5)*.035;r=.58+n*.2;}
   else {h=.5+(n-.5)*.22+(broad-.5)*.12;shade=(n-.5)*.07+(broad-.5)*.025;r=.87+n*.1;}
   const k=(y*size+x)*4;for(let c=0;c<3;c++){albedo[k+c]=Math.max(0,Math.min(255,rgb[c]*(1+shade)));height[k+c]=h*255;rough[k+c]=r*255;}albedo[k+3]=height[k+3]=rough[k+3]=255;
  }
  const make=(data,srgb=false)=>{const t=new THREE.DataTexture(data,size,size);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;textures.push(t);return t;};
  return {map:make(albedo,true),bumpMap:make(height),roughnessMap:make(rough),roughness:1};
 }
 const styles={
  rubber:{...maps('#426c62','rubber',[5,4]),bumpScale:.0004,metalness:0},
  laminate:{...maps('#c8c0ad','laminate',[3,2]),bumpScale:.00018,metalness:0},
  frame:{...maps('#334947','polymer',[2,5]),bumpScale:.00015,metalness:.3},
  metal:{...maps('#b8bfc0','metal',[2,3]),bumpScale:.000045,metalness:.82},
  object:{...maps('#b29261','metal',[1,2]),bumpScale:.000035,metalness:.6},
  floor:{...maps('#67777a','floor',[160,160]),bumpScale:.0004,metalness:0}
 };
 return {apply(material,key){material.color.set('#ffffff');Object.assign(material,styles[key]);material.envMapIntensity=.65;},dispose(){textures.forEach(t=>t.dispose());}};
}

// Round only the visual edge; the outer dimensions match the collision box.
export function roundedBox(x,y,z,radius){
 const r=Math.min(radius,x*.2,y*.2,z*.2),g=new THREE.BoxGeometry(2*x,2*y,2*z,6,6,6),p=g.attributes.position,n=g.attributes.normal;
 const v=new THREE.Vector3(),q=new THREE.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.set(THREE.MathUtils.clamp(v.x,-x+r,x-r),THREE.MathUtils.clamp(v.y,-y+r,y-r),THREE.MathUtils.clamp(v.z,-z+r,z-r));v.sub(q).normalize();n.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(r).add(q);p.setXYZ(i,v.x,v.y,v.z);}
 return g;
}

export function studioEnvironment(renderer){
 const room=new THREE.Scene();room.background=new THREE.Color('#56646b');
 const panel=(color,intensity,size,position)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));m.position.set(...position);m.lookAt(0,0,0);room.add(m);};
 panel('#fff3de',3,[4,3],[1,-3,4]);panel('#d4eaf4',1.7,[3,4],[-3,1,2]);panel('#ffffff',2.5,[1,4],[3,3,1]);
 const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(room,.08,.1,20);pmrem.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return target;
}
