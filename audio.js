/* ══════ sound ═════════════════════════════════════════════════════════
   Everything here is synthesised in the browser - no recordings, nothing
   borrowed. A warm sustained bed plus soft felt-piano phrases over slow
   chords. Seven genres, each with its own voice so they are told apart at
   once. Nothing starts until a real tap, because Safari insists. */
window.AUD = (function(){
  "use strict";
  var ctx=null, master=null, duck=null, verb=null, comp=null, padLP=null;
  var on=true, timer=null, started=false, voices=[];
  var chordIdx=0, nextChordT=0, pend=[];
  var vol=.8;
  try{ on = localStorage.getItem("tofu.sound")!=="0"; }catch(e){}
  try{ var sv=parseFloat(localStorage.getItem("tofu.vol")); if(!isNaN(sv)) vol=Math.max(0,Math.min(1,sv)); }catch(e){}

  // Fmaj7 · Am7 · Dm9 · Bbmaj7 - warm, unresolved
  var DUSK=[
    { bass:87.31,  pad:[174.61,220.00,261.63],
      tune:[[0.5,440.00,.095],[2.3,523.25,.085],[4.5,440.00,.07],[6.0,392.00,.055]] },
    { bass:110.00, pad:[220.00,261.63,329.63],
      tune:[[0.4,659.25,.10],[2.4,523.25,.085],[4.6,440.00,.07]] },
    { bass:73.42,  pad:[174.61,220.00,293.66],
      tune:[[0.5,587.33,.095],[2.6,698.46,.09],[4.8,440.00,.07],[6.1,349.23,.05]] },
    { bass:58.27,  pad:[174.61,233.08,293.66],
      tune:[[0.4,698.46,.10],[2.5,587.33,.085],[4.7,523.25,.08]] }
  ];
  // D lydian, wide and floaty
  var DREAMY=[
    { bass:73.42,  pad:[146.83,185.00,220.00],
      tune:[[0.8,440.00,.085],[3.4,554.37,.075],[6.6,369.99,.055]] },
    { bass:110.00, pad:[220.00,277.18,329.63],
      tune:[[0.6,554.37,.09],[3.6,659.25,.07],[7.0,440.00,.05]] },
    { bass:61.74,  pad:[123.47,146.83,185.00],
      tune:[[0.9,369.99,.085],[3.8,554.37,.075],[7.2,293.66,.05]] },
    { bass:98.00,  pad:[196.00,246.94,293.66],
      tune:[[0.7,493.88,.09],[3.5,739.99,.065],[6.8,392.00,.055]] }
  ];
  // A minor, low and very sparse
  var NIGHT=[
    { bass:55.00,  pad:[110.00,130.81,164.81], tune:[[1.2,329.63,.075],[5.0,246.94,.055]] },
    { bass:43.65,  pad:[87.31,110.00,130.81],  tune:[[1.0,261.63,.08],[5.4,196.00,.05]] },
    { bass:65.41,  pad:[130.81,164.81,196.00], tune:[[1.3,392.00,.075],[5.2,293.66,.055]] },
    { bass:41.20,  pad:[82.41,98.00,123.47],   tune:[[1.1,246.94,.07],[5.6,164.81,.05]] }
  ];
  // C major, quicker, more movement
  var BRIGHT=[
    { bass:130.81, pad:[261.63,329.63,392.00],
      tune:[[0.3,523.25,.09],[1.7,659.25,.08],[3.2,587.33,.07],[4.6,523.25,.06]] },
    { bass:123.47, pad:[246.94,293.66,392.00],
      tune:[[0.3,493.88,.09],[1.8,587.33,.08],[3.3,784.00,.07],[4.7,659.25,.055]] },
    { bass:110.00, pad:[220.00,261.63,329.63],
      tune:[[0.3,659.25,.09],[1.7,523.25,.08],[3.2,440.00,.07],[4.8,523.25,.06]] },
    { bass:87.31,  pad:[174.61,220.00,261.63],
      tune:[[0.3,698.46,.095],[1.9,587.33,.08],[3.4,523.25,.07],[4.9,440.00,.055]] }
  ];
  // Em9 · Cmaj7 · Am7 · Bm7 - rain against a window at four in the afternoon
  var MONSOON=[
    { bass:82.41,  pad:[164.81,196.00,246.94],
      tune:[[0.4,493.88,.075],[2.6,587.33,.06],[5.0,659.25,.05],[7.8,493.88,.045]] },
    { bass:65.41,  pad:[164.81,196.00,246.94], tune:[[0.5,523.25,.07],[3.0,659.25,.055],[6.2,493.88,.05]] },
    { bass:110.00, pad:[261.63,329.63,392.00], tune:[[0.3,440.00,.07],[2.8,523.25,.055],[6.0,392.00,.05]] },
    { bass:123.47, pad:[293.66,369.99,440.00], tune:[[0.6,587.33,.065],[3.4,493.88,.05],[6.6,440.00,.045]] }
  ];
  // Dm9 · G7 · Cmaj9 · A7 - the lazy seventh-chord shuffle
  var LOFI=[
    { bass:73.42,  pad:[174.61,220.00,261.63],
      tune:[[0.4,587.33,.07],[2.2,523.25,.055],[4.6,440.00,.05],[6.8,349.23,.045]] },
    { bass:98.00,  pad:[246.94,293.66,349.23], tune:[[0.5,493.88,.065],[2.6,587.33,.05],[5.4,392.00,.05]] },
    { bass:65.41,  pad:[164.81,196.00,246.94], tune:[[0.3,523.25,.07],[3.0,659.25,.05],[6.0,587.33,.045]] },
    { bass:110.00, pad:[277.18,329.63,392.00], tune:[[0.6,440.00,.06],[3.2,554.37,.05],[6.2,329.63,.045]] }
  ];
  // a tanpura-ish drone on C and G, the line moving through Yaman
  var RAGA=[
    { bass:65.41, pad:[130.81,196.00,261.63],
      tune:[[0.4,261.63,.07],[1.8,293.66,.06],[3.2,329.63,.06],[4.8,369.99,.055],[6.6,392.00,.05],[8.4,440.00,.045]] },
    { bass:65.41, pad:[130.81,196.00,261.63],
      tune:[[0.4,493.88,.065],[2.0,440.00,.055],[3.8,392.00,.05],[5.6,369.99,.05],[7.6,329.63,.045]] },
    { bass:65.41, pad:[130.81,196.00,261.63],
      tune:[[0.5,523.25,.06],[2.4,493.88,.05],[4.4,440.00,.05],[7.0,392.00,.045]] },
    { bass:65.41, pad:[130.81,196.00,261.63],
      tune:[[0.6,329.63,.06],[2.8,293.66,.05],[5.2,261.63,.05],[8.0,196.00,.045]] }
  ];
  var TONES={
    felt:  { o1:"triangle", o2:"sine",     lp0:1500, lp1:620,  atk:.22, det:1.003 },
    glass: { o1:"sine",     o2:"sine",     lp0:3400, lp1:1500, atk:.10, det:1.006 },
    pluck: { o1:"triangle", o2:"triangle", lp0:2800, lp1:700,  atk:.035,det:1.002 },
    reed:  { o1:"sawtooth", o2:"sine",     lp0:1150, lp1:500,  atk:.30, det:1.004 },
    rain:  { o1:"sine",     o2:"triangle", lp0:1000, lp1:430,  atk:.26, det:1.008 }
  };
  var MOODS=[
    { id:"warm",    name:"Warm",       prog:DUSK,    bar:8.0,  tone:"felt",  cut:1000 },
    { id:"dreamy",  name:"Dreamy",     prog:DREAMY,  bar:11.0, tone:"glass", cut:1500 },
    { id:"night",   name:"Late night", prog:NIGHT,   bar:9.5,  tone:"felt",  cut:680  },
    { id:"bright",  name:"Bright",     prog:BRIGHT,  bar:6.5,  tone:"pluck", cut:1900 },
    { id:"monsoon", name:"Monsoon",    prog:MONSOON, bar:11.0, tone:"rain",  cut:780  },
    { id:"lofi",    name:"Lo-fi",      prog:LOFI,    bar:9.0,  tone:"pluck", cut:900  },
    { id:"raga",    name:"Raga",       prog:RAGA,    bar:10.5, tone:"reed",  cut:1250 }
  ];
  var moodIx=1;                               // Dreamy until she says otherwise
  try{
    var sm=localStorage.getItem("tofu.mood");
    for (var mi=0;mi<MOODS.length;mi++) if (MOODS[mi].id===sm) moodIx=mi;
  }catch(e){}
  var prog=MOODS[moodIx].prog, BAR=MOODS[moodIx].bar;
  var TN=TONES[MOODS[moodIx].tone]||TONES.felt;

  function init(){
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try{ ctx = new AC(); }catch(e){ return false; }
    master = ctx.createGain(); master.gain.value = on ? vol : 0;
    duck = ctx.createGain(); duck.gain.value = 1;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value=-24; comp.knee.value=30; comp.ratio.value=2.5;
    comp.connect(duck); duck.connect(master); master.connect(ctx.destination);

    verb = ctx.createGain(); verb.gain.value=.4;
    var d1=ctx.createDelay(2), d2=ctx.createDelay(2);
    d1.delayTime.value=.23; d2.delayTime.value=.37;
    var f1=ctx.createGain(); f1.gain.value=.44;
    var f2=ctx.createGain(); f2.gain.value=.38;
    var lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=2200; lp.Q.value=.3;
    verb.connect(d1); verb.connect(d2);
    d1.connect(f1); f1.connect(d1); d2.connect(f2); f2.connect(d2);
    d1.connect(lp); d2.connect(lp); lp.connect(comp);

    padLP = ctx.createBiquadFilter();
    padLP.type="lowpass"; padLP.frequency.value=MOODS[moodIx].cut||1000; padLP.Q.value=.35;
    padLP.connect(comp); padLP.connect(verb);
    for (var i=0;i<3;i++){
      var o=ctx.createOscillator(), g=ctx.createGain();
      o.type = i===1 ? "triangle" : "sine";
      o.frequency.value = prog[0].pad[i];
      o.detune.value = (i-1)*5;
      g.gain.value = .0001;
      var lfo=ctx.createOscillator(), lg=ctx.createGain();
      lfo.frequency.value = .055 + i*.021;     // 12-18s swells, all different
      lg.gain.value = .030;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(padLP);
      o.start(); lfo.start();
      g.gain.setValueAtTime(.034, ctx.currentTime);
      voices.push({o:o,g:g});
    }
    return true;
  }

  function felt(freq,t,v,dur){
    var o=ctx.createOscillator(), o2=ctx.createOscillator();
    var g=ctx.createGain(), lp=ctx.createBiquadFilter();
    o.type=TN.o1; o2.type=TN.o2;
    o.frequency.value=freq; o2.frequency.value=freq*TN.det;
    lp.type="lowpass"; lp.Q.value=.4;
    lp.frequency.setValueAtTime(TN.lp0,t);
    lp.frequency.linearRampToValueAtTime(TN.lp1,t+dur*.8);
    g.gain.setValueAtTime(.0001,t);
    g.gain.linearRampToValueAtTime(v,t+TN.atk);
    g.gain.linearRampToValueAtTime(v*.55,t+dur*.45);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    var g2=ctx.createGain(); g2.gain.value=.5;
    o.connect(lp); o2.connect(g2); g2.connect(lp);
    lp.connect(g); g.connect(comp); g.connect(verb);
    o.start(t); o2.start(t); o.stop(t+dur+.1); o2.stop(t+dur+.1);
    pend.push({g:g,o:o,o2:o2,end:t+dur+.1});
  }
  function low(freq,t){
    var o=ctx.createOscillator(), g=ctx.createGain(), lp=ctx.createBiquadFilter();
    o.type="sine"; o.frequency.value=freq;
    lp.type="lowpass"; lp.frequency.value=300; lp.Q.value=.3;
    g.gain.setValueAtTime(.0001,t);
    g.gain.linearRampToValueAtTime(.10,t+.5);
    g.gain.exponentialRampToValueAtTime(.0001,t+6.5);
    o.connect(lp); lp.connect(g); g.connect(comp);
    o.start(t); o.stop(t+6.6);
    pend.push({g:g,o:o,end:t+6.6});
  }
  function setPad(ch,t){
    for (var i=0;i<voices.length;i++)
      voices[i].o.frequency.linearRampToValueAtTime(ch.pad[i % ch.pad.length], t+3.0);
  }
  // switching genre takes effect at once, not at the next bar
  function cutover(){
    if (!ctx) return;
    var now=ctx.currentTime, i;
    for (i=0;i<pend.length;i++){
      var p=pend[i];
      if (p.end<=now) continue;
      try{
        var gv=p.g.gain;
        gv.cancelScheduledValues(now);
        gv.setValueAtTime(Math.max(gv.value,.0001), now);
        gv.exponentialRampToValueAtTime(.0001, now+.28);
        if (p.o)  p.o.stop(now+.33);
        if (p.o2) p.o2.stop(now+.33);
      }catch(e){}
    }
    pend=[];
    chordIdx=0; nextChordT=now+.06;
    var ch=prog[0];
    for (i=0;i<voices.length;i++){
      try{
        var f=voices[i].o.frequency;
        f.cancelScheduledValues(now);
        f.setValueAtTime(f.value, now);
        f.linearRampToValueAtTime(ch.pad[i % ch.pad.length], now+.75);
      }catch(e){}
    }
    if (padLP){
      try{
        padLP.frequency.cancelScheduledValues(now);
        padLP.frequency.setValueAtTime(padLP.frequency.value, now);
        padLP.frequency.linearRampToValueAtTime(MOODS[moodIx].cut||1000, now+.6);
      }catch(e){}
    }
    schedule();
  }
  function schedule(){
    if (!ctx || !on) return;
    if (pend.length>90){ var nw=ctx.currentTime; pend=pend.filter(function(p){ return p.end>nw; }); }
    var now=ctx.currentTime;
    while (nextChordT < now + 1.6){
      var ch=prog[chordIdx % prog.length];
      setPad(ch, nextChordT);
      low(ch.bass, nextChordT);
      for (var m=0;m<ch.tune.length;m++){
        var tn=ch.tune[m];
        felt(tn[1], nextChordT+tn[0], tn[2], 3.8);
        if (m===0) felt(tn[1]*0.5, nextChordT+tn[0]+.02, tn[2]*.4, 4.2);
      }
      chordIdx++; nextChordT += BAR;
    }
  }
  function tone(f1,f2,dur,type,v){
    if (!ctx || !on) return;
    var t=ctx.currentTime, o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type||"sine";
    o.frequency.setValueAtTime(f1,t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(f2,1),t+dur);
    g.gain.setValueAtTime(.0001,t);
    g.gain.linearRampToValueAtTime(v,t+.04);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g); g.connect(comp);
    o.start(t); o.stop(t+dur+.06);
  }
  function noiseBuf(dur){
    var n=Math.floor(ctx.sampleRate*dur), buf=ctx.createBuffer(1,n,ctx.sampleRate), d=buf.getChannelData(0);
    for (var i=0;i<n;i++) d[i]=Math.random()*2-1;
    return buf;
  }
  /* A purr is a low rumble switched on and off about 25 times a second,
     breathing in and out. Brown-ish noise through a lowpass, gated by an LFO. */
  function purr(){
    if (!ctx || !on) return;
    var t=ctx.currentTime, dur=2.6;
    var s=ctx.createBufferSource(); s.buffer=noiseBuf(dur);
    var lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=260; lp.Q.value=.7;
    var gate=ctx.createGain(); gate.gain.value=.0;
    var lfo=ctx.createOscillator(); lfo.type="sine"; lfo.frequency.value=24;
    var depth=ctx.createGain(); depth.gain.value=.5;
    lfo.connect(depth); depth.connect(gate.gain);
    var env=ctx.createGain();
    env.gain.setValueAtTime(.0001,t);
    env.gain.linearRampToValueAtTime(.55,t+.35);     // breathe in
    env.gain.linearRampToValueAtTime(.25,t+1.2);
    env.gain.linearRampToValueAtTime(.5,t+1.6);      // and out
    env.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(lp); lp.connect(gate); gate.connect(env); env.connect(comp);
    s.start(t); lfo.start(t); s.stop(t+dur); lfo.stop(t+dur);
  }
  var SFX = {
    soft:  function(){ felt(659.25,ctx.currentTime,.035,1.6); },
    open:  function(){ var t=ctx.currentTime; felt(523.25,t,.07,2.6); felt(659.25,t+.09,.055,2.8); },
    page:  function(){ var t=ctx.currentTime; felt(392,t,.05,2.0); felt(587.33,t+.12,.04,2.2); },
    tick:  function(v){ tone(980,900,.03,"sine",.022*(v||1)); },
    land:  function(){ var t=ctx.currentTime; [392,523.25,659.25].forEach(function(f,i){ felt(f,t+i*.1,.085,3.4); }); },
    found: function(){ var t=ctx.currentTime; [523.25,659.25,784,1046.5].forEach(function(f,i){ felt(f,t+i*.1,.08,3.2); }); },
    star:  function(){ var t=ctx.currentTime; felt(1046.5,t,.05,2.4); felt(1318.5,t+.07,.035,2.6); },
    no:    function(){ tone(220,150,.22,"sine",.05); },
    chime: function(){ var t=ctx.currentTime; [392,523.25,659.25,784,1046.5].forEach(function(f,i){ felt(f,t+i*.28,.085,5.0); }); },
    purr:  purr
  };
  function wake(){
    if (!init()) return;
    if (ctx.state!=="running" && ctx.resume) ctx.resume();
    if (!started){ started=true; nextChordT=ctx.currentTime+.08; }
    if (!timer) timer=setInterval(schedule,200);
  }
  // Safari is strict: retry on any later interaction too
  ["pointerdown","touchend","keydown"].forEach(function(ev){
    addEventListener(ev,function(){ if (on && started) wake(); },{passive:true});
  });
  // a hidden tab should not keep playing to nobody
  document.addEventListener("visibilitychange",function(){
    if (!ctx) return;
    if (document.hidden){ if (ctx.state==="running") ctx.suspend(); }
    else if (on && started){ ctx.resume(); }
  });

  return {
    start: wake,
    sfx: function(k,v){ if (ctx && on && SFX[k]) SFX[k](v); },
    moods: function(){ return MOODS.map(function(m){ return m.name; }); },
    moodIndex: function(){ return moodIx; },
    setMood: function(i){
      if (i<0||i>=MOODS.length) return moodIx;
      moodIx=i;
      try{ localStorage.setItem("tofu.mood",MOODS[i].id); }catch(e){}
      TN = TONES[MOODS[i].tone] || TONES.felt;
      prog=MOODS[i].prog; BAR=MOODS[i].bar;
      cutover();
      return moodIx;
    },
    duck: function(down){
      if (!ctx) return;
      var t=ctx.currentTime;
      duck.gain.cancelScheduledValues(t);
      duck.gain.setValueAtTime(duck.gain.value,t);
      duck.gain.linearRampToValueAtTime(down?.18:1,t+(down?.35:1.2));
    },
    isLive: function(){ return !!ctx && on && ctx.state==="running"; },
    isOn: function(){ return on; },
    setOn: function(v){
      on=!!v;
      try{ localStorage.setItem("tofu.sound", on?"1":"0"); }catch(e){}
      if (on){ wake(); }
      if (ctx) master.gain.linearRampToValueAtTime(on?vol:0, ctx.currentTime+.3);
      return on;
    },
    getVol: function(){ return vol; },
    setVol: function(v){
      vol=Math.max(0,Math.min(1,v));
      try{ localStorage.setItem("tofu.vol", String(vol)); }catch(e){}
      if (ctx && on) master.gain.linearRampToValueAtTime(vol, ctx.currentTime+.08);
      return vol;
    }
  };
})();
