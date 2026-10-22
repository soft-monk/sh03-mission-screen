import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* 障碍：配置文件里的 8 个禁飞区 + 东侧原禁飞区 */
const ZONES = [
  [[114.54986,39.85959],[114.54534,39.81695],[114.63454,39.79919],[114.64710,39.83123],[114.69333,39.85322],[114.69183,39.88254],[114.62298,39.84647]],
  [[114.75939,39.97309],[114.74049,39.95014],[114.75620,39.92624],[114.75497,39.90101],[114.77044,39.90364],[114.77338,39.94393],[114.77706,39.96350]],
  [[114.83479,40.01720],[114.86133,39.98890],[114.90867,39.99687],[114.94363,39.99704],[114.95004,40.01313],[114.92327,40.03634],[114.89650,40.05012],[114.86865,40.02292]],
  [[114.97403,40.07834],[114.98344,40.05206],[115.00393,40.05263],[115.00932,40.06751],[114.99228,40.08241]],
  [[115.24096,39.61757],[115.25663,39.61131],[115.32519,39.65365],[115.30532,39.67454],[115.26237,39.67553],[115.26262,39.64167]],
  [[115.28945,39.89040],[115.29981,39.85772],[115.31911,39.86208],[115.30946,39.90249]],
  [[115.35244,39.83547],[115.39506,39.80506],[115.39355,39.77697],[115.39961,39.75717],[115.41135,39.75848],[115.42575,39.79939],[115.42632,39.82689],[115.40302,39.82093],[115.39677,39.82122]],
  [[115.40213,40.02273],[115.39217,39.99702],[115.39916,39.98456],[115.41164,39.98825],[115.41508,40.01422]],
  [[115.76302,39.79017],[115.76302,39.77525],[115.75437,39.76415],[115.77416,39.75983],[115.77600,39.77624],[115.78253,39.78558]]
];

const M_LAT = 111030, M_LON = 111320*Math.cos(39.85*Math.PI/180);
const PAD = 800;                 /* 与禁飞区的最小间距 */
const EDGE_X = 114.5700;         /* 任务区东边界（114.5664）外侧一点：航线到此为止 */
const d2 = (a,b)=>Math.hypot((b[0]-a[0])*M_LON,(b[1]-a[1])*M_LAT);

/* 四条航线：折线 + 2km 转角圆角（不再用样条，避免大圆弧） */
const ROUTES = [
  { name:"编组1", color:"#38bdf8", note:"贴禁飞区8/4 北缘外侧，从任务区东北角进入",
    cps:[[115.9050,39.7700],[115.7000,39.9500],[115.4500,40.0600],[115.0500,40.1000],[114.9000,40.1050],[114.7000,40.0800],[EDGE_X,40.0500]] },
  { name:"编组2", color:"#4ade80", note:"沿 39.94N 西进，从禁飞区1 北侧、禁飞区2 南侧的缝隙进任务区",
    cps:[[115.9050,39.7450],[115.6000,39.9400],[115.3500,39.9400],[115.0500,39.9300],[114.8500,39.9200],[114.7900,39.8920],[114.7000,39.8920],[EDGE_X,39.8950]] },
  { name:"编组3", color:"#f87171", note:"沿 39.74N 走廊西进（禁飞区5 上缘与禁飞区7 下缘之间）",
    cps:[[115.9050,39.7330],[115.5000,39.7400],[115.2000,39.7400],[114.9000,39.7400],[114.7500,39.7400],[EDGE_X,39.7450]] },
  { name:"编组4", color:"#facc15", note:"从禁飞区5 南侧通过（只在那一段下压），过了立刻北抬进任务区",
    cps:[[115.9050,39.7200],[115.6000,39.7000],[115.4000,39.6200],[115.3300,39.5900],[115.2300,39.5850],[115.0000,39.6100],[114.7000,39.6800],[EDGE_X,39.7000]] }
];

/* 折线转角圆角：每段两端各收 r 米，用二次贝塞尔过渡 */
function roundCorners(pts, r, per=10){
  const out=[pts[0]];
  for(let i=1;i<pts.length-1;i++){
    const p0=pts[i-1], p1=pts[i], p2=pts[i+1];
    const L0=d2(p0,p1), L1=d2(p1,p2);
    if(L0<1||L1<1) continue;
    const r0=Math.min(r, L0*0.45), r1=Math.min(r, L1*0.45);
    const a=[p1[0]+(p0[0]-p1[0])*r0/L0, p1[1]+(p0[1]-p1[1])*r0/L0];
    const b=[p1[0]+(p2[0]-p1[0])*r1/L1, p1[1]+(p2[1]-p1[1])*r1/L1];
    out.push(a);
    for(let s=1;s<=per;s++){
      const t=s/per, u=1-t;
      out.push([u*u*a[0]+2*u*t*p1[0]+t*t*b[0], u*u*a[1]+2*u*t*p1[1]+t*t*b[1]]);
    }
  }
  out.push(pts[pts.length-1]);
  return out;
}
function resample(pts, step=250){
  /* 沿折线按固定里程插值取点：长直段也要插点，否则校验会漏检、转弯也不平滑 */
  const out=[pts[0]];
  let acc=0, cur=pts[0];
  for(let i=1;i<pts.length;i++){
    let b=pts[i];
    let L=d2(cur,b);
    while(acc+L>=step){
      const need=step-acc, t=need/L;
      const p=[cur[0]+(b[0]-cur[0])*t, cur[1]+(b[1]-cur[1])*t];
      out.push(p); cur=p; L-=need; acc=0;
    }
    acc+=L; cur=b;
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
  for(let i=0;i<poly.length;i++) d=Math.min(d,pSeg(p[0],p[1],poly[i][0],poly[i][1],poly[(i+1)%poly.length][0],poly[(i+1)%poly.length][1]));
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

const built = ROUTES.map((r,i)=>{
  const pts = resample(roundCorners(r.cps, 2000), 250);
  let len=0; for(let k=1;k<pts.length;k++) len+=d2(pts[k-1],pts[k]);
  return { id:"G"+(i+1), name:r.name, color:r.color, note:r.note, pts, len };
});

let bad=0;
for(const r of built){
  let minD=Infinity, inside=0;
  for(const p of r.pts) for(const z of ZONES){
    if(inPoly(p,z)) inside++;
    minD=Math.min(minD, distZone(p,z));
  }
  r.minD=Math.round(minD); r.inside=inside;
  if(inside>0){ console.log("× "+r.name+" 有 "+inside+" 个点落在禁飞区内"); bad++; }
  else if(minD<PAD){ console.log("× "+r.name+" 离禁飞区仅 "+Math.round(minD)+"m（要求 >= "+PAD+"）"); bad++; }
}
const NEAR0 = 2000, CENTER=[115.9050,39.7450];
for(let i=0;i<built.length;i++) for(let j=i+1;j<built.length;j++){
  let m=Infinity, wc=null;
  const A=built[i].pts.filter(p=>d2(p,CENTER)>NEAR0), B=built[j].pts.filter(p=>d2(p,CENTER)>NEAR0);
  for(const p of A) for(const q of B){ const d=d2(p,q); if(d<m){ m=d; wc=p; } }
  console.log("  "+built[i].name+" <-> "+built[j].name+" 最近 "+Math.round(m)+" m @ "+(wc?wc[0].toFixed(3)+","+wc[1].toFixed(3):""));
}
built.forEach(r=>console.log(r.name+"："+r.pts.length+" 点 / "+(r.len/1000).toFixed(1)+" km / 离禁飞区最近 "+r.minD+"m / 终点 "+r.pts[r.pts.length-1].map(v=>v.toFixed(4)).join(",")));
if(bad){ console.log("\n校验未通过（"+bad+" 项），未写文件"); process.exit(1); }

const out = built.map(r=>{
  let acc=0, want=r.len*0.45, mid=r.pts[0];
  for(let i=1;i<r.pts.length;i++){
    const L=d2(r.pts[i-1],r.pts[i]);
    if(acc+L>=want){ const t=L?(want-acc)/L:0;
      mid=[+(r.pts[i-1][0]+(r.pts[i][0]-r.pts[i-1][0])*t).toFixed(5), +(r.pts[i-1][1]+(r.pts[i][1]-r.pts[i-1][1])*t).toFixed(5)]; break; }
    acc+=L;
  }
  return { id:r.id, name:r.name, color:r.color, lenKm:+(r.len/1000).toFixed(1), mid, pts:r.pts.map(p=>[+p[0].toFixed(5),+p[1].toFixed(5)]) };
});
fs.writeFileSync(path.join(R,"data","routes.js"),
  "/* 由 _tools/plan-routes.mjs 生成：四条独立航线（折线+2km 圆角），避开 9 个禁飞区，到任务区边界为止 */\nwindow.ROUTES = "+JSON.stringify(out,null,1)+";\n");
console.log("\n✓ data/routes.js 已写入 "+out.length+" 条");
