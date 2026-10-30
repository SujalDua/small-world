/* Night sky backdrop: gradient, stars, moon, fireflies, the odd shooting star.
   Draws only while a night chapter is on screen. */
(function(){
"use strict";
if (!window.THREE) return;
var cv=document.getElementById("sky");
var R;
try{
  R=new THREE.WebGLRenderer({canvas:cv, antialias:false, alpha:false, powerPreference:"low-power"});
}catch(e){ return; }               // the CSS gradient on the canvas stays as the sky
var small=Math.min(innerWidth,innerHeight)<700;
var DPR=Math.min(window.devicePixelRatio||1, small?1.5:2);
R.setPixelRatio(DPR);
R.setClearColor(0x0C1012,1);
R.toneMapping=THREE.ACESFilmicToneMapping; R.toneMappingExposure=1.0;   // lit stage scenes only; the sky's own shaders ignore it
R.outputColorSpace=THREE.SRGBColorSpace;
var scene=new THREE.Scene();
var cam=new THREE.PerspectiveCamera(55, innerWidth/innerHeight, .1, 400);
cam.position.set(0,0,0);

/* ── the backdrop: one big quad, coloured in the shader ───────────────── */
var bgMat=new THREE.ShaderMaterial({
  depthWrite:false, depthTest:false,
  uniforms:{ uTime:{value:0}, uPhase:{value:0}, uAspect:{value:innerWidth/innerHeight} },
  vertexShader:"varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.999,1.0); }",
  fragmentShader:[
    "uniform float uTime,uPhase,uAspect; varying vec2 vUv;",
    "float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }",
    "float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);",
    "  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }",
    "float fbm(vec2 p){ float v=0.0,a=.5; for(int i=0;i<4;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }",
    "void main(){",
    "  float y=vUv.y;",
    "  vec3 top=vec3(.020,.028,.045);",
    "  vec3 midN=vec3(.040,.055,.060);",
    "  vec3 duskH=vec3(.30,.17,.13), nightH=vec3(.075,.095,.075), dawnH=vec3(.36,.18,.22);",
    "  float ph=uPhase;",
    "  vec3 hor=mix(duskH,nightH,smoothstep(.0,.30,ph));",
    "  hor=mix(hor,dawnH,smoothstep(.78,1.0,ph));",
    "  vec3 c=mix(hor,midN,smoothstep(.0,.42,y));",
    "  c=mix(c,top,smoothstep(.40,1.0,y));",
    // aurora: a slow olive curtain high in the sky, strongest mid-page
    "  vec2 q=vec2(vUv.x*uAspect*1.6, y*3.0);",
    "  float band=smoothstep(.45,.75,y)*(1.0-smoothstep(.82,1.0,y));",
    "  float cur=fbm(vec2(q.x*.8+uTime*.015, q.y*.35-uTime*.02));",
    "  float rays=pow(.5+.5*sin(q.x*6.0+cur*6.0+uTime*.05),3.0);",
    "  float a=band*cur*rays*(.35+.65*sin(ph*3.1416));",
    "  c+=vec3(.36,.52,.24)*a*.30 + vec3(.55,.30,.38)*a*a*.10;",
    // a little grain so the gradient never bands
    "  c+= (h(vUv*vec2(1920.0,1080.0)+uTime)-.5)/255.0*2.0;",
    "  gl_FragColor=vec4(c,1.0);",
    "}"
  ].join("\n")
});
var bg=new THREE.Mesh(new THREE.PlaneGeometry(2,2), bgMat);
bg.frustumCulled=false; bg.renderOrder=-10;
scene.add(bg);

/* ── stars: three depths so they drift past at different speeds ───────── */
function starField(count, zMin, zMax, size){
  var g=new THREE.BufferGeometry(), pos=new Float32Array(count*3), ph=new Float32Array(count), sz=new Float32Array(count), col=new Float32Array(count*3);
  for (var i=0;i<count;i++){
    var z=-(zMin+Math.random()*(zMax-zMin)), spread=-z*1.25;
    pos[i*3]=(Math.random()*2-1)*spread*1.4;
    pos[i*3+1]=(Math.random()*1.25-.25)*spread*.9;
    pos[i*3+2]=z;
    ph[i]=Math.random()*6.283;
    sz[i]=size*(.35+Math.pow(Math.random(),3)*1.6);
    var warm=Math.random();
    col[i*3]=1.0; col[i*3+1]=.92+warm*.06; col[i*3+2]=.82+(1-warm)*.18;
  }
  g.setAttribute("position",new THREE.BufferAttribute(pos,3));
  g.setAttribute("phase",new THREE.BufferAttribute(ph,1));
  g.setAttribute("size",new THREE.BufferAttribute(sz,1));
  g.setAttribute("color",new THREE.BufferAttribute(col,3));
  var m=new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{uTime:{value:0}, uDpr:{value:DPR}},
    vertexShader:[
      "attribute float phase; attribute float size; attribute vec3 color;",
      "uniform float uTime,uDpr; varying float vA; varying vec3 vC;",
      "void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0);",
      "  float tw=.55+.45*sin(uTime*(.6+fract(phase)*1.4)+phase);",
      "  vA=tw; vC=color;",
      "  gl_PointSize=size*uDpr*(.75+.5*tw);",
      "  gl_Position=projectionMatrix*mv; }"
    ].join("\n"),
    fragmentShader:[
      "varying float vA; varying vec3 vC;",
      "void main(){ vec2 p=gl_PointCoord-.5; float d=length(p);",
      "  float core=smoothstep(.5,.0,d); float a=pow(core,2.2)*vA;",
      "  gl_FragColor=vec4(vC*a,a); }"
    ].join("\n")
  });
  var pts=new THREE.Points(g,m); pts.frustumCulled=false;
  scene.add(pts); return pts;
}
var far=starField(small?900:1600, 120, 220, 3.2);
var mid=starField(small?380:700, 60, 120, 4.4);
var near=starField(small?60:110, 30, 60, 6.5);

/* ── the moon ─────────────────────────────────────────────────────────── */
function moonTex(){
  var c=document.createElement("canvas"); c.width=c.height=256;
  var x=c.getContext("2d");
  var g=x.createRadialGradient(118,112,10,128,128,120);
  g.addColorStop(0,"#FFF8E6"); g.addColorStop(.7,"#F2E6C8"); g.addColorStop(1,"#E2D2AE");
  x.fillStyle=g; x.beginPath(); x.arc(128,128,118,0,6.283); x.fill();
  // soft maria and craters
  [[96,90,26,.10],[150,120,34,.08],[120,170,22,.09],[170,80,14,.07],[80,150,12,.08],[140,64,10,.06]].forEach(function(k){
    var r=x.createRadialGradient(k[0],k[1],0,k[0],k[1],k[2]);
    r.addColorStop(0,"rgba(150,135,110,"+k[3]+")"); r.addColorStop(1,"rgba(150,135,110,0)");
    x.fillStyle=r; x.beginPath(); x.arc(k[0],k[1],k[2],0,6.283); x.fill();
  });
  // a faint terminator so it reads as round
  var t=x.createRadialGradient(165,150,60,128,128,150);
  t.addColorStop(0,"rgba(0,0,0,0)"); t.addColorStop(1,"rgba(40,30,20,.14)");
  x.fillStyle=t; x.beginPath(); x.arc(128,128,118,0,6.283); x.fill();
  var tx=new THREE.CanvasTexture(c); tx.colorSpace=THREE.SRGBColorSpace; return tx;
}
/* Glows are painted as colour on black and added, never alpha-blended:
   canvas gradients are dithered, and at near-zero alpha the colour channels
   quantize into visible coloured specks once they're un-premultiplied. */
function glowTex(r,g,b,k){
  var c=document.createElement("canvas"); c.width=c.height=256;
  var x=c.getContext("2d"); x.fillStyle="#000"; x.fillRect(0,0,256,256);
  var gr=x.createRadialGradient(128,128,0,128,128,128), f=function(a){ return "rgb("+Math.round(r*a)+","+Math.round(g*a)+","+Math.round(b*a)+")"; };
  gr.addColorStop(0,f(k)); gr.addColorStop(.12,f(k*.55)); gr.addColorStop(.3,f(k*.14)); gr.addColorStop(.6,f(k*.03)); gr.addColorStop(1,"#000");
  x.fillStyle=gr; x.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(c);
}
var moon=new THREE.Sprite(new THREE.SpriteMaterial({map:moonTex(), transparent:true, depthWrite:false, color:0xFFFFFF, toneMapped:false}));
var glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(255,226,180,.62), depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false}));
glow.renderOrder=1; moon.renderOrder=2;               // the disc sits on its halo, not under it
var moonG=new THREE.Group(); moonG.add(glow); moonG.add(moon);
scene.add(moonG);
function placeMoon(){
  var a=innerWidth/innerHeight, s=a>1?7.2:5.6;
  moon.scale.set(s,s,1); glow.scale.set(s*4.2,s*4.2,1);
  moonG.position.set(a>1 ? 34 : 12, a>1 ? 26 : 30, -90);
}
placeMoon();

/* ── fireflies, close enough to drift across the words ───────────────── */
var FF=small?36:64;
var fg=new THREE.BufferGeometry(), fp=new Float32Array(FF*3), fs=new Float32Array(FF), fc=new Float32Array(FF*3);
var palette=[[1,.86,.55],[1,.66,.70],[.80,.88,.55]];
for (var i=0;i<FF;i++){
  fp[i*3]=(Math.random()*2-1)*22; fp[i*3+1]=(Math.random()*2-1)*14; fp[i*3+2]=-(8+Math.random()*26);
  fs[i]=Math.random()*100;
  var pc=palette[i%3]; fc[i*3]=pc[0]; fc[i*3+1]=pc[1]; fc[i*3+2]=pc[2];
}
fg.setAttribute("position",new THREE.BufferAttribute(fp,3));
fg.setAttribute("seed",new THREE.BufferAttribute(fs,1));
fg.setAttribute("color",new THREE.BufferAttribute(fc,3));
var fm=new THREE.ShaderMaterial({
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  uniforms:{uTime:{value:0}, uDpr:{value:DPR}},
  vertexShader:[
    "attribute float seed; attribute vec3 color; uniform float uTime,uDpr; varying float vA; varying vec3 vC;",
    "void main(){ vec3 p=position;",
    "  p.x+=sin(uTime*.17+seed)*2.2; p.y+=sin(uTime*.23+seed*1.7)*1.6+cos(uTime*.11+seed)*.8;",
    "  vec4 mv=modelViewMatrix*vec4(p,1.0);",
    "  vA=pow(.5+.5*sin(uTime*(.7+fract(seed*.37))+seed*3.0),2.0);",
    "  vC=color; gl_PointSize=uDpr*(10.0+18.0*vA)*(18.0/-mv.z);",
    "  gl_Position=projectionMatrix*mv; }"
  ].join("\n"),
  fragmentShader:[
    "varying float vA; varying vec3 vC;",
    "void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.0,d); a=a*a*vA*.85;",
    "  gl_FragColor=vec4(vC*a,a); }"
  ].join("\n")
});
var flies=new THREE.Points(fg,fm); flies.frustumCulled=false; scene.add(flies);

/* ── now and then, a shooting star ────────────────────────────────────── */
function streakTex(){
  var c=document.createElement("canvas"); c.width=256; c.height=8;
  var x=c.getContext("2d"); x.fillStyle="#000"; x.fillRect(0,0,256,8);
  var g=x.createLinearGradient(0,0,256,0);
  g.addColorStop(0,"#000"); g.addColorStop(.85,"rgb(166,156,143)"); g.addColorStop(1,"#fff");
  x.fillStyle=g; x.fillRect(0,2,256,4);
  return new THREE.CanvasTexture(c);
}
var shoot=new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.MeshBasicMaterial({map:streakTex(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0,toneMapped:false}));
shoot.scale.set(16,.35,1); scene.add(shoot);
var sh={t:-1, next:6+Math.random()*10, from:new THREE.Vector3(), dir:new THREE.Vector3()};
function launch(){
  var a=innerWidth/innerHeight;
  sh.from.set((Math.random()*1.2-.2)*30*Math.max(1,a), 18+Math.random()*16, -70);
  var ang=-(.35+Math.random()*.35);
  sh.dir.set(-Math.cos(ang), Math.sin(ang), 0);
  shoot.rotation.z=Math.atan2(sh.dir.y,sh.dir.x)+Math.PI;
  sh.t=0;
}


/* ══════ the stage ══════════════════════════════════════════════════════
   One renderer for every 3D moment in the night chapters. A chapter registers a
   scene anchored to an element on the page; the stage hands it a group that lives
   in camera space, a way to turn page pixels into positions, the element's box each
   frame, and the taps that land on it. Nothing renders unless something is on screen. */
var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
scene.add(cam);
var camSpace=new THREE.Group(); cam.add(camSpace);
var hemi=new THREE.HemisphereLight(0xBFD0FF,0x1A1410,.55); scene.add(hemi);
var moonLight=new THREE.DirectionalLight(0xFFE9C4,1.6); moonLight.position.set(30,40,-20); scene.add(moonLight);
var env=(function(){
  try{
    var pm=new THREE.PMREMGenerator(R), s2=new THREE.Scene(), g=new THREE.SphereGeometry(20,24,12), col=[], p=g.attributes.position;
    for (var i=0;i<p.count;i++){ var y=p.getY(i)/20, c=new THREE.Color(0x0E1424).lerp(new THREE.Color(0x3A3048),Math.max(0,-y)).lerp(new THREE.Color(0xFFE2B4),Math.max(0,y)*.18); col.push(c.r,c.g,c.b); }
    g.setAttribute("color",new THREE.Float32BufferAttribute(col,3));
    s2.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
    var m=new THREE.Mesh(new THREE.SphereGeometry(2.5,12,8),new THREE.MeshBasicMaterial({color:new THREE.Color(6,5,3.6)})); m.position.set(9,12,-6); s2.add(m);
    var t=pm.fromScene(s2,.04).texture; pm.dispose(); g.dispose(); return t;
  }catch(e){ return null; }
})();
var mods=[], ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
function anchorOf(a){ return typeof a==="string" ? document.getElementById(a) : a; }
var STAGE = window.STAGE = {
  THREE:THREE, renderer:R, scene:scene, camera:cam, env:env, dpr:DPR, small:small, reduced:RM,
  /* page pixels (client coordinates) -> a point in camera space, d units in front of the camera */
  toCam:function(px,py,d,out){
    var h=2*d*Math.tan(cam.fov*Math.PI/360), w=h*cam.aspect;
    return (out||new THREE.Vector3()).set((px/innerWidth-.5)*w,(.5-py/innerHeight)*h,-d);
  },
  /* how many world units one CSS pixel spans at distance d */
  unitsPerPx:function(d){ return 2*d*Math.tan(cam.fov*Math.PI/360)/innerHeight; },
  /* def: {id, anchor: element|id, hit?: element|id, build(api), update(api,state,t,dt), pick?(api,raycaster,event)}
     state: {rect, visible, progress (0 as the anchor enters from below .. 1 as it leaves at the top)} */
  add:function(def){
    var el=anchorOf(def.anchor); if (!el) return null;
    var g=new THREE.Group(); g.visible=false; camSpace.add(g);
    var m={def:def, el:el, group:g, state:{rect:null,visible:false,progress:0}};
    m.api={THREE:THREE, group:g, stage:STAGE, el:el};
    try{ def.build && def.build(m.api); }catch(e){ console.warn("stage:"+def.id, e); return null; }
    var hit=anchorOf(def.hit);
    if (hit && def.pick){
      var down=null;
      hit.addEventListener("pointerdown",function(e){ down={x:e.clientX,y:e.clientY}; },{passive:true});
      hit.addEventListener("pointerup",function(e){
        if (!down || Math.abs(e.clientX-down.x)+Math.abs(e.clientY-down.y)>10) return; down=null;
        ndc.set(e.clientX/innerWidth*2-1, -(e.clientY/innerHeight)*2+1);
        cam.updateMatrixWorld(); ray.setFromCamera(ndc,cam);
        try{ def.pick(m.api, ray, e); }catch(err){ console.warn("stage pick:"+def.id, err); }
      });
    }
    mods.push(m); return m.api;
  },
  anyVisible:function(){ return mods.some(function(m){ return m.state.visible; }); }
};
function updateMods(t,dt){
  var H=innerHeight;
  for (var i=0;i<mods.length;i++){
    var m=mods[i], r=m.el.getBoundingClientRect(), vis=r.bottom>-H*.25 && r.top<H*1.25;
    m.state.rect=r; m.state.visible=vis; m.group.visible=vis;
    m.state.progress=Math.max(0,Math.min(1,(H-r.top)/(H+r.height)));
    if (vis && m.def.update){ try{ m.def.update(m.api,m.state,t,dt); }catch(e){ console.warn("stage:"+m.def.id,e); m.def.update=null; } }
  }
}

/* ── loop ─────────────────────────────────────────────────────────────── */
var clock=new THREE.Clock(), pointer={x:0,y:0}, look={x:0,y:0};
addEventListener("pointermove",function(e){ pointer.x=e.clientX/innerWidth*2-1; pointer.y=e.clientY/innerHeight*2-1; },{passive:true});
function resize(){
  R.setSize(innerWidth,innerHeight,false);
  cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix();
  bgMat.uniforms.uAspect.value=cam.aspect; placeMoon();
}
addEventListener("resize",resize); resize();
var shown=false;
function frame(){
  requestAnimationFrame(frame);
  var dt=Math.min(clock.getDelta(),.05);
  if (document.hidden) return;
  var t0=clock.elapsedTime;
  if (window.SKY_ON===false){ updateMods(t0,dt); if (!STAGE.anyVisible()) return; }
  var t=clock.elapsedTime, ph=window.SKY_PHASE||0;
  bgMat.uniforms.uTime.value=t; bgMat.uniforms.uPhase.value=ph;
  far.material.uniforms.uTime.value=t; mid.material.uniforms.uTime.value=t; near.material.uniforms.uTime.value=t;
  fm.uniforms.uTime.value=t;
  // scroll lifts the camera slowly through the sky; the pointer leans it a little
  look.x+=(pointer.x-look.x)*.03; look.y+=(pointer.y-look.y)*.03;
  cam.position.x=look.x*1.4; cam.position.y=-ph*14+look.y*-.8;
  cam.rotation.x=ph*.10; cam.rotation.y=-look.x*.02;
  moonG.position.y += ((innerWidth>innerHeight?26:30) - ph*12 - moonG.position.y)*.05;
  far.rotation.z=t*.0015; mid.rotation.z=t*.002;
  if (sh.t<0){ sh.next-=dt; if (sh.next<=0) launch(); }
  else {
    sh.t+=dt; var k=sh.t/1.1;
    shoot.position.copy(sh.from).addScaledVector(sh.dir, k*60);
    shoot.material.opacity=Math.sin(Math.min(1,k)*Math.PI)*.9;
    if (k>=1){ sh.t=-1; sh.next=12+Math.random()*16; shoot.material.opacity=0; }
  }
  cam.updateMatrixWorld(); updateMods(t,dt);
  R.render(scene,cam);
  if (!shown){ shown=true; cv.style.background="none"; }
}
requestAnimationFrame(frame);
window.__sky={renderer:R, stage:STAGE, mods:mods};
})();
