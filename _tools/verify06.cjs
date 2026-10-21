const fs=require("fs"),vm=require("vm"),path=require("path");
const ROOT="D:\\dsh_workpath\\webMap\\FastHTML";
const sb={window:{},Math,console}; vm.createContext(sb);
for (const f of ["data/routes.js","js/flight06.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT,f),"utf8"),sb,{filename:f});
const FL=sb.window.FLIGHT06, R=sb.window.ROUTES[1].pts;
const MLAT=111030, MLON=111320*Math.cos(39.85*Math.PI/180);
const m=(a,b)=>Math.hypot((b[0]-a[0])*MLON,(b[1]-a[1])*MLAT);
const out=[]; const P=(...a)=>out.push(a.join(" "));

/* arc length along route 2 */
const seg=[]; let L=0;
for(let i=1;i<R.length;i++){ const d=m(R[i-1],R[i]); seg.push(d); L+=d; }
function project(p){ const g=R.map(q=>[q[0]*MLON,q[1]*MLAT]), q=[p[0]*MLON,p[1]*MLAT];
  let best=1e18,bs=0,acc=0;
  for(let i=1;i<g.length;i++){ const ax=g[i-1][0],ay=g[i-1][1],bx=g[i][0],by=g[i][1];
    const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy; let t=l2?((q[0]-ax)*dx+(q[1]-ay)*dy)/l2:0; t=Math.max(0,Math.min(1,t));
    const px=ax+dx*t,py=ay+dy*t,dd=Math.hypot(q[0]-px,q[1]-py);
    if(dd<best){best=dd;bs=acc+seg[i-1]*t;} acc+=seg[i-1]; }
  return {s:bs, err:best}; }

const ASM=[115.95742,39.74206], MID=[114.125,39.90];
const head=m(ASM,R[0]), tail=m(R[R.length-1],MID), TOTAL=head+L+tail;
P("takeoff "+head.toFixed(0)+" + route "+L.toFixed(0)+" + tail "+tail.toFixed(0)+" = "+(TOTAL/1000).toFixed(1)+" km, quarter "+(TOTAL/4).toFixed(0)+" m");
P("");
for(let k=0;k<3;k++){
  const f=[0.25,0.5,0.75][k];
  const want=TOTAL*f-head;
  /* loop centre = mean of the orbit footprint */
  let b={x0:9e9,x1:-9e9,y0:9e9,y1:-9e9};
  for(let t=8000;t<=9000;t+=1){ const s=FL.simulate(t)[20+k];
    b.x0=Math.min(b.x0,s.lon); b.x1=Math.max(b.x1,s.lon); b.y0=Math.min(b.y0,s.lat); b.y1=Math.max(b.y1,s.lat); }
  const c=[(b.x0+b.x1)/2,(b.y0+b.y1)/2];
  const pr=project(c);
  P("comm"+(k+1)+" ("+Math.round(f*100)+"%)  loop "+m([b.x0,0],[b.x1,0]).toFixed(0)+" x "+m([0,b.y0],[0,b.y1]).toFixed(0)+
    " m at "+c[0].toFixed(5)+","+c[1].toFixed(5)+
    "  | route mileage "+pr.s.toFixed(0)+" m (want "+want.toFixed(0)+", diff "+(pr.s-want).toFixed(0)+
    " m; offset from road "+pr.err.toFixed(0)+" m)  | journey "+((pr.s+head)/1000).toFixed(2)+" km");
}
/* the 4th */
let b={x0:9e9,x1:-9e9,y0:9e9,y1:-9e9};
for(let t=8000;t<=9000;t+=1){ const s=FL.simulate(t)[23];
  b.x0=Math.min(b.x0,s.lon); b.x1=Math.max(b.x1,s.lon); b.y0=Math.min(b.y0,s.lat); b.y1=Math.max(b.y1,s.lat); }
P("comm4 (100%) loop "+m([b.x0,0],[b.x1,0]).toFixed(0)+" x "+m([0,b.y0],[0,b.y1]).toFixed(0)+
  " m at "+((b.x0+b.x1)/2).toFixed(5)+","+((b.y0+b.y1)/2).toFixed(5)+"  (MID 114.12500,39.90000)");
P("");
/* equal spacing check */
const pts=[]; for(const f of [0.25,0.5,0.75]){ const s=TOTAL*f-head; pts.push(s); }
const all=[TOTAL*0.25,TOTAL*0.5,TOTAL*0.75,TOTAL];
P("journey marks (km): "+all.map(x=>(x/1000).toFixed(2)).join("  "));
P("segment lengths (m): "+[all[0],all[1]-all[0],all[2]-all[1],all[3]-all[2]].map(x=>x.toFixed(0)).join("  "));
P("");
P("plan lines @9000: "+FL.tracks(9000).length);
let worst=[0,""];
for(let t=5;t<=FL.TOTAL;t+=5){ const a=FL.simulate(t-5),b2=FL.simulate(t);
  for(let i=0;i<31;i++){ const d=m([a[i].lon,a[i].lat],[b2[i].lon,b2[i].lat]); if(d>worst[0]) worst=[d,"t="+t+" i="+i+" "+b2[i].type]; } }
P("largest 5 s step: "+worst[0].toFixed(0)+" m at "+worst[1]);
P("counts @9000: "+JSON.stringify(FL.simulate(9000).reduce((a,d)=>(a[d.type]=(a[d.type]||0)+1,a),{})));
fs.writeFileSync(path.join(ROOT,"_tools","verify06.log"),out.join("\r\n"),"utf8");
