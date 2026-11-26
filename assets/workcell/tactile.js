// Optical gel illustration driven by MuJoCo contact loads. Directional RGB
// illumination + deforming marker grid follow GelSight's imaging principle.
// This is an analytic, uncalibrated renderer, not Taxim or sensor footage.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function drawTactile(canvas,frame,side){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 const n=frame.normal[side],shear=frame.tangent?.[side]||[0,0];
 const points=frame.patches[side].filter(p=>p[2]>.001);
 let cx=0,cy=0,weight=0;
 for(const [x,z,f] of points){cx+=x*f;cy+=z*f;weight+=f;}
 if(weight){cx/=weight;cy/=weight;}
 cx=clamp(cx/.032,-.24,.24);cy=clamp(-cy/.046,-.25,.25);
 const contact=1-Math.exp(-n/1.3),sx=clamp(shear[0]/2,-1,1),sy=clamp(-shear[1]/2,-1,1);
 // A compliant, flat object leaves a broad imprint with a smooth rim.
 const height=(x,y)=>{
  const dx=(x-cx)/.34,dy=(y-cy)/.36;
  const d=Math.pow(Math.abs(dx),8)+Math.pow(Math.abs(dy),8);
  return contact*.045/(1+Math.exp(clamp((d-1)*5,-40,40)));
 };
 const img=ctx.createImageData(w,h),d=img.data,eps=.006;
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){
  const x=(i+.5)/w-.5,y=(j+.5)/h-.5;
  const gx=(height(x+eps,y)-height(x-eps,y))/(2*eps),gy=(height(x,y+eps)-height(x,y-eps))/(2*eps);
  const norm=Math.hypot(gx,gy,1),nx=-gx/norm,ny=-gy/norm,nz=1/norm;
  const vignette=1-.38*Math.pow(Math.hypot(x*1.4,y*1.25),2);
  const grain=(Math.sin(i*127.1+j*311.7)*43758.5453)%1*2.1;
  const lights=[[-.8,-.4,.6],[.75,-.45,.6],[0,.8,.6]];
  const base=[126+22*Math.sin(y*4-x*2),145-20*Math.cos(y*3+x*2),148+18*Math.sin(x*4-y*2)];
  const k=(j*w+i)*4;
  for(let c=0;c<3;c++){
   const l=lights[c],shade=nx*l[0]+ny*l[1]+nz*l[2];
   d[k+c]=clamp((base[c]+70*(shade-.6)-height(x,y)*160)*vignette+grain,0,255);
  }
  d[k+3]=255;
 }
 ctx.putImageData(img,0,0);
 // Markers move with local shear; contact-free regions retain their grid.
 for(let row=0;row<10;row++)for(let col=0;col<8;col++){
  let x=(col+.65)/8.3-.5,y=(row+.7)/10.4-.5;
  const influence=height(x,y)/.045;
  x+=sx*.055*influence;y+=sy*.055*influence;
  const px=(x+.5)*w,py=(y+.5)*h,r=2.3;
  ctx.beginPath();ctx.ellipse(px,py,r*(1+Math.abs(sx)*.12*influence),r,sy*.15,0,Math.PI*2);
  ctx.fillStyle='rgba(21,36,37,.77)';ctx.fill();ctx.strokeStyle='rgba(8,23,26,.3)';ctx.lineWidth=.6;ctx.stroke();
 }
 const edge=ctx.createRadialGradient(w*.5,h*.5,w*.22,w*.5,h*.5,w*.72);edge.addColorStop(0,'#081b2200');edge.addColorStop(1,'#081b2260');ctx.fillStyle=edge;ctx.fillRect(0,0,w,h);
}
