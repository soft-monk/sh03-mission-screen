const fs=require("fs"),vm=require("vm"),path=require("path");
const ROOT="D:\\dsh_workpath\\webMap\\FastHTML";
const sb={window:{},Math,console}; vm.createContext(sb);
for (const f of ["data/routes.js","js/flight06.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT,f),"utf8"),sb,{filename:f});
const FL=sb.window.FLIGHT06, RT=sb.window.ROUTES;
const MLAT=111030, MLON=111320*Math.cos(39.85*Math.PI/180);
const m=(a,b)=>Math.hypot((b[0]-a[0])*MLON,(b[1]-a[1])*MLAT);
const out=[]; const P=(...a)=>out.push(a.join(" "));

P("四条航线:");
RT.forEach((r,i)=>{
  let len=0; for(let k=1;k<r.pts.length;k++) len+=m(r.pts[k-1],r.pts[k]);
  P("  "+r.name+"  "+(len/1000).toFixed(1)+" km  起点 "+r.pts[0].map(v=>v.toFixed(4))+"  终点 "+r.pts[r.pts.length-1].map(v=>v.toFixed(4)));
});
P("");
P("TARR(到达航路末端时刻): "+FL.T_ARR.map(x=>x.toFixed(0)).join(" / "));
P("计数: "+JSON.stringify(FL.simulate(9000).reduce((a,d)=>(a[d.type]=(a[d.type]||0)+1,a),{})));
P("plan lines @9000: "+FL.tracks(9000).length);
P("扫描锥 @9000: "+FL.scans(9000).length);
let worst=[0,""];
for(let t=5;t<=FL.TOTAL;t+=5){ const a=FL.simulate(t-5),b=FL.simulate(t);
  for(let i=0;i<31;i++){ const d=m([a[i].lon,a[i].lat],[b[i].lon,b[i].lat]); if(d>worst[0]) worst=[d,"t="+t+" i="+i+" "+b[i].type]; } }
P("最大 5 秒位移: "+worst[0].toFixed(0)+" m @ "+worst[1]);
/* 通信两组的环心 */
const MM=(a,b)=>Math.hypot((b[0]-a[0])*MLON,(b[1]-a[1])*MLAT);
for (const pair of [[20,21],[22,23]]) {
  let b={x0:9e9,x1:-9e9,y0:9e9,y1:-9e9};
  for(let t=8000;t<=9000;t+=1){ const d=FL.simulate(t)[pair[0]];
    b.x0=Math.min(b.x0,d.lon);b.x1=Math.max(b.x1,d.lon);b.y0=Math.min(b.y0,d.lat);b.y1=Math.max(b.y1,d.lat); }
  const c=[(b.x0+b.x1)/2,(b.y0+b.y1)/2];
  let drift=0; const mids=[];
  for(let t=8000;t<=9000;t+=50){ const a=FL.simulate(t)[pair[0]],d2=FL.simulate(t)[pair[1]];
    mids.push([(a.lon+d2.lon)/2,(a.lat+d2.lat)/2]); }
  for(const q of mids) drift=Math.max(drift,MM(q,mids[0]));
  P("通信 "+pair.join("/")+" 环心 "+c[0].toFixed(5)+","+c[1].toFixed(5)+" 尺寸 "+MM([b.x0,0],[b.x1,0]).toFixed(0)+" x "+MM([0,b.y0],[0,b.y1]).toFixed(0)+" m 半圈中点漂移 "+drift.toFixed(1)+" m");
}
fs.writeFileSync(path.join(ROOT,"_tools","verify06.log"),out.join("\r\n"),"utf8");
