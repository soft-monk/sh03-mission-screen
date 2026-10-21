const fs=require("fs"),vm=require("vm"),path=require("path");
const ROOT="D:\\dsh_workpath\\webMap\\FastHTML";
const sb={window:{},Math,console}; vm.createContext(sb);
for (const f of ["data/routes.js","js/flight06.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT,f),"utf8"),sb,{filename:f});
const FL=sb.window.FLIGHT06;
const out=[]; const P=(...a)=>out.push(a.join(" "));
const MLAT=111030, MLON=111320*Math.cos(39.85*Math.PI/180);
const POT1=[113.95,39.75], POT2=[114.30,40.05];
const gx=2000/MLON, gy=5000/MLAT;
function cell(k){ const kk = k<10?k:k-10; const c = k<10?POT1:POT2;
  const col=kk%5, row=Math.floor(kk/5);
  return [c[0]+((col-2)*4000)/MLON, c[1]+(row?5000:-5000)/MLAT]; }

/* normalised position inside own cell: u,v in [-1,1] */
function uv(d, k){ const c=cell(k); return [ (d.lon-c[0])/gx, (d.lat-c[1])/gy ]; }

let worstA=0, worstB=0, wAt=0;
for (let t=5000;t<=9000;t+=5){
  const s=FL.simulate(t);
  const ref=s[0], refB=s[10];
  const uA=uv(ref,0), uB=uv(refB,10);
  for (let k=1;k<10;k++){ const u=uv(s[k],k); worstA=Math.max(worstA, Math.hypot(u[0]-uA[0],u[1]-uA[1])); }
  for (let k=11;k<20;k++){ const u=uv(s[k],k); worstB=Math.max(worstB, Math.hypot(u[0]-uB[0],u[1]-uB[1])); }
}
P("zone-1 ten drones: max deviation of relative position = "+worstA.toFixed(4)+"  (0 = perfectly in sync)");
P("zone-2 ten drones: max deviation of relative position = "+worstB.toFixed(4));
const s=FL.simulate(7000);
P("");
P("t=7000 snapshot (normalised u,v inside each cell):");
for (let k=0;k<20;k+=1){ const u=uv(s[k],k); if(k<3||k===9||k===10||k===19) P("   #"+k+"  u="+u[0].toFixed(3)+" v="+u[1].toFixed(3)); }
P("");
/* cross-zone offset */
const uA=uv(FL.simulate(7000)[0],0), uB2=uv(FL.simulate(7000)[10],10);
P("zone-1 vs zone-2 offset at t=7000: "+Math.hypot(uA[0]-uB2[0],uA[1]-uB2[1]).toFixed(3)+" (0 would mean the two zones are also in phase)");
/* arrival / timing */
P("");
let firstOn=null,lastOn=null;
for (let t=0;t<=9000;t+=5){ const n=FL.tracks(t).length; if(firstOn===null&&n>0) firstOn=t; }
P("plan lines appear from t="+firstOn+"; count @9000 = "+FL.tracks(9000).length);
/* no jumps */
const m=(a,b)=>Math.hypot((b[0]-a[0])*MLON,(b[1]-a[1])*MLAT);
let worst=[0,""];
for(let t=5;t<=FL.TOTAL;t+=5){ const a=FL.simulate(t-5),b=FL.simulate(t);
  for(let i=0;i<31;i++){ const d=m([a[i].lon,a[i].lat],[b[i].lon,b[i].lat]); if(d>worst[0]) worst=[d,"t="+t+" i="+i+" "+b[i].type]; } }
P("largest 5 s step: "+worst[0].toFixed(0)+" m at "+worst[1]);
P("counts @9000: "+JSON.stringify(FL.simulate(9000).reduce((a,d)=>(a[d.type]=(a[d.type]||0)+1,a),{})));
fs.writeFileSync(path.join(ROOT,"_tools","verify06.log"),out.join("\r\n"),"utf8");
