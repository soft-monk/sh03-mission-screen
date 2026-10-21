import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* 障碍：原禁飞区 + 新增禁飞区-2/-3 + 气象威胁区-1/-2 */
const ZONES = [
  [[115.76302,39.79017],[115.76302,39.77525],[115.75437,39.76415],[115.77416,39.75983],[115.77600,39.77624],[115.78253,39.78558]],
  [[115.29160,39.77500],[115.40840,39.77500],[115.40840,39.86500],[115.29160,39.86500]],
  [[114.74160,39.85950],[114.85840,39.85950],[114.85840,39.94050],[114.74160,39.94050]],
  [[115.51820,39.66600],[115.68180,39.66600],[115.68180,39.77400],[115.51820,39.77400]],
  [[114.97990,39.70600],[115.12010,39.70600],[115.12010,39.81400],[114.97990,39.81400]]
];

const M_LAT = 111030, M_LON = 111320*Math.cos(39.85*Math.PI/180);
const SEP = 600, PAD = 0;

/* 走廊骨架：在威胁区之间的缝隙里穿行 */
const SPINE = [
  [115.9050, 39.7450],
  [115.8000, 39.8020],
  [115.7000, 39.7955],
  [115.4800, 39.7820],
  [115.3000, 39.7180],
  [115.0400, 39.6680],
  [114.8000, 39.8100],
  [114.5750, 39.8500]
];
const LANES = [-0.0135, -0.0045, 0.0045, 0.0135];   /* 约 -1.5 / -0.5 / +0.5 / +1.5 km，相邻间距 1.0km */
const NAMES = ["编组1","编组2","编组3","编组4"];
const COLORS = ["#38bdf8","#4ade80","#f87171","#facc15"];

function catmull(cps, per=40){
  const P=[cps[0],...cps,cps[cps.length-1]], out=[];
  for(let i=1;i<P.length-2;i++){
    const p0=P[i-1],p1=P[i],p2=P[i+1],p3=P[i+2];
    for(let s=0;s<per;s++){
      const t=s/per,t2=t*t,t3=t2*t;
      out.push([
        0.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
        0.5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)
      ]);
    }
  }
  out.push(cps[cps.length-1]);
  return out;
}
function resample(pts, step=250){
  const out=[pts[0]]; let acc=0;
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i];
    acc+=Math.hypot((b[0]-a[0])*M_LON,(b[1]-a[1])*M_LAT);
    if(acc>=step){ out.push(b); acc=0; }
  }
  const l=pts[pts.length-1];
  if(out[out.length-1][0]!==l[0]||out[out.length-1][1]!==l[1]) out.push(l);
  return out;
}
function pSeg(px,py,ax,ay,bx,by){
  const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,L=vx*vx+vy*vy;
  let t=L?(wx*vx+wy*vy)/L:0; t=Math.max(0,Math.min(1,t));
  return Math.hypot((px-(ax+t*vx))*M_LON,(py-(ay+t*vy))*M_LAT);
}
function distZone(p, poly){
  let d=Infinity;
  for(let i=0;i<poly.length;i++){
    const a=poly[i], b=poly[(i+1)%poly.length];
    d=Math.min(d,pSeg(p[0],p[1],a[0],a[1],b[0],b[1]));
  }
  return d;
}
function inPoly(p, poly){
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i], b=poly[j];
    if((a[1]>p[1])!==(b[1]>p[1]) && p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) hit=!hit;
  }
  return hit;
}

const built = NAMES.map((nm,i)=>{
  const cps = SPINE.map(p=>[p[0], p[1]+LANES[i]]);
  const pts = resample(catmull(cps), 250);
  let len=0;
  for(let k=1;k<pts.length;k++) len+=Math.hypot((pts[k][0]-pts[k-1][0])*M_LON,(pts[k][1]-pts[k-1][1])*M_LAT);
  return { id:"G"+(i+1), name:nm, color:COLORS[i], pts, len };
});

let bad=0;
for(const r of built){
  let minD=Infinity, inside=0;
  for(const p of r.pts){
    for(const z of ZONES){
      if(inPoly(p,z)) inside++;
      minD=Math.min(minD, distZone(p,z));
    }
  }
  r.minD=Math.round(minD); r.inside=inside;
  if(inside>0){ console.log("× "+r.name+" 有 "+inside+" 个点落在威胁区内"); bad++; }
  else if(minD<PAD){ console.log("× "+r.name+" 离威胁区仅 "+Math.round(minD)+"m（要求 ≥"+PAD+"）"); bad++; }
}
for(let i=0;i<built.length;i++) for(let j=i+1;j<built.length;j++){
  let m=Infinity;
  for(const p of built[i].pts) for(const q of built[j].pts){
    const d=Math.hypot((p[0]-q[0])*M_LON,(p[1]-q[1])*M_LAT);
    if(d<m) m=d;
  }
  if(m<SEP){ console.log("× "+built[i].name+" ↔ "+built[j].name+" 仅 "+Math.round(m)+"m"); bad++; }
}
built.forEach(r=>console.log(r.name+"："+r.pts.length+" 点 / "+(r.len/1000).toFixed(1)+" km / 离威胁区最近 "+r.minD+"m"));
if(bad){ console.log("\n校验未通过（"+bad+" 项），未写文件"); process.exit(1); }

const out = built.map(r=>{
  let acc=0, want=r.len*0.45, mid=r.pts[0];
  for(let i=1;i<r.pts.length;i++){
    const L=Math.hypot((r.pts[i][0]-r.pts[i-1][0])*M_LON,(r.pts[i][1]-r.pts[i-1][1])*M_LAT);
    if(acc+L>=want){ const t=L?(want-acc)/L:0;
      mid=[+(r.pts[i-1][0]+(r.pts[i][0]-r.pts[i-1][0])*t).toFixed(5), +(r.pts[i-1][1]+(r.pts[i][1]-r.pts[i-1][1])*t).toFixed(5)]; break; }
    acc+=L;
  }
  return { id:r.id, name:r.name, color:r.color, lenKm:+(r.len/1000).toFixed(1), mid, pts:r.pts.map(p=>[+p[0].toFixed(5),+p[1].toFixed(5)]) };
});
fs.writeFileSync(path.join(R,"data","routes.js"),
  "/* 由 _tools/plan-routes.mjs 生成：走廊从威胁区缝隙中穿过，标签只写编组号 */\nwindow.ROUTES = "+JSON.stringify(out,null,1)+";\n");
console.log("\n✓ data/routes.js 已写入 "+out.length+" 条");