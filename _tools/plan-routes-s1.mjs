/* 生成场景一 SH-06 的航线数据：data/routes-s1.js
 *
 * 设计要点（对照场景二 js/flight06.js 的形态，但铺满整片任务区）：
 *   1) 所有区内航段横平竖直：竖腿南北向（平行任务区左右边），横段东西向（平行上下边）。
 *   2) 光电：每架一个竖直窄长闭环，按“列 × 行”铺满 40x40km 任务区；
 *      格子从西北的大格逐列/逐行收窄到东南的小格 —— 闭环宽度（两腿间距）与格子一起变小，
 *      画面上西北稀、东南密。
 *   3) 雷达 SAR（6 架）：南北向平行腿按腿数切成 6 段，每架在自己带内蛇形往返；
 *      腿距由西 2.4km 收到东 1.6km（稀疏 → 密集）。
 *   4) 雷达 GMTI（2 架）：东南山地区一条东西向跑道环，两架半圈错开。
 *   5) 电子：南北长轴的正置跑道环，两架半圈错开；通信：中心中继环 + 走廊环，各两架。
 *   6) 编组航线：二次贝塞尔曲线（向外张开），生成时自动降曲率直到两两不交叉。
 *
 *   node _tools/plan-routes-s1.mjs            生成并自检
 *   node _tools/plan-routes-s1.mjs --verify   只校验已生成文件
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "data", "routes-s1.js");

/* ---------- 几何基准（与 data/scenarios.js 的 scene-1 一致） ---------- */
const AREA = { w: 120.82616, e: 121.22204, s: 24.65562, n: 25.01738 };
const RALLY = { w: 121.28021, e: 121.31979, s: 25.10291, n: 25.13909 };
const M_LAT = 111030;
const M_LON = 111320 * Math.cos((24.84 * Math.PI) / 180);
const CX = (AREA.w + AREA.e) / 2;
const CY = (AREA.s + AREA.n) / 2;
const HALF_X = ((AREA.e - AREA.w) * M_LON) / 2;   // ≈ 20.0 km
const HALF_Y = ((AREA.n - AREA.s) * M_LAT) / 2;   // ≈ 20.1 km

/* ---------- 可调参数 ---------- */
const COLOR = { photo: "#38bdf8", sar: "#facc15", gmti: "#f59e0b", ewar: "#f87171", comm: "#4ade80" };
const SCAN_R = 2800;                  // 光电扫描半径（同场景二）
const OVERLAP = 0.85;                 // 排版系数：有效半径 = 扫描半径 × 该系数（<1 表示相邻带重叠）
const R_EFF = Math.round(SCAN_R * OVERLAP);
/* 光电格子（km，从西到东 / 从北到南），合计 40km；西北大、东南小 */
const GMTI_BUDGET = 2;                // 雷达 GMTI：2 架，同一条东西向跑道环
const LEG_MIN = 800, LEG_MAX = 4400;

/* ---------- 坐标换算 ---------- */
const xy = (lon, lat) => [(lon - CX) * M_LON, (lat - CY) * M_LAT];
const ll = (x, y) => [+(CX + x / M_LON).toFixed(5), +(CY + y / M_LAT).toFixed(5)];
const lenKm = (pts) => {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return +(s / 1000).toFixed(1);
};
/* ---------- 进场：集结区中心 + 折线工具 ---------- */
const RALLY_XY = xy((RALLY.w + RALLY.e) / 2, (RALLY.s + RALLY.n) / 2);

function segIntersect(a, b, c, d) {
  const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (Math.abs(den) < 1e-14) return false;
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
  const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
}
function polylinesCross(A, B) {
  for (let i = 1; i < A.length; i++)
    for (let j = 1; j < B.length; j++)
      if (segIntersect(A[i - 1], A[i], B[j - 1], B[j])) return true;
  return false;
}
const insideArea = (p) => Math.abs(p[0]) <= HALF_X + 1e-6 && Math.abs(p[1]) <= HALF_Y + 1e-6;

/* 从集结区沿方向 to 指到任务区边界的交点（走廊末端正好落在边界上） */
function boundaryAlong(from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  let t = Infinity;
  /* 集结区在任务区外，取“第一个正交点”（从外面进入任务区的那一点） */
  if (Math.abs(dx) > 1e-9) {
    for (const x of [HALF_X, -HALF_X]) { const tt = (x - from[0]) / dx; if (tt > 1e-6 && tt < t) t = tt; }
  }
  if (Math.abs(dy) > 1e-9) {
    for (const y of [HALF_Y, -HALF_Y]) { const tt = (y - from[1]) / dy; if (tt > 1e-6 && tt < t) t = tt; }
  }
  const p = [from[0] + dx * t, from[1] + dy * t];
  p[0] = Math.max(-HALF_X, Math.min(HALF_X, p[0]));
  p[1] = Math.max(-HALF_Y, Math.min(HALF_Y, p[1]));
  return p;
}

let transit = [];

/* ---------- 光电：方案 G —— 4×4 大格（10km）；城区大格切 2×2（5km），每格一条蛇形 ---------- */
const photoRoutes = [];
const photoCells = [];
const sarCells = [];
const PHOTO_G = { cols: 4, rows: 4, legGap: 2200, edge: 250 };
/* 与卫星截图判读一致的 6 个“城区”大格：[列 i, 行 j]，i 自西向东、j 自北向南 */
const PHOTO_CITY = ["3-0", "1-1", "3-1", "1-2", "2-2", "0-3"];
(function buildPhoto() {
  const bw = (2 * HALF_X) / PHOTO_G.cols;
  const bh = (2 * HALF_Y) / PHOTO_G.rows;
  let idx = 0;
  function addCell(x0, x1, yTop, yBot, width, rowIdx) {
    idx += 1;
    photoCells.push({
      kind: width > 9000 ? "photo-big" : "photo-city",
      ring: [[x0, yBot], [x1, yBot], [x1, yTop], [x0, yTop]]
    });
    const n = Math.max(2, Math.ceil(width / PHOTO_G.legGap));
    const step = width / n;
    const ya = yBot + PHOTO_G.edge, yb = yTop - PHOTO_G.edge;
    /* 奇偶行错开半个腿距，避免上下两格共线 */
    const phase = (rowIdx % 2 === 0) ? 0.5 : 0.0;
    const raw = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + step * (i + phase);
      if (i % 2 === 0) raw.push([x, ya], [x, yb]);
      else raw.push([x, yb], [x, ya]);
    }
    photoRoutes.push({
      id: "P-" + String(idx).padStart(2, "0"),
      group: "photo", kind: "serpentine",
      zone: width > 9000 ? "big" : "city",
      color: COLOR.photo, lenKm: lenKm(raw), pts: raw.map(([x, y]) => ll(x, y))
    });
  }
  for (let j = 0; j < PHOTO_G.rows; j++) {
    const yTop = HALF_Y - j * bh, yBot = yTop - bh;
    for (let i = 0; i < PHOTO_G.cols; i++) {
      const x0 = -HALF_X + i * bw, x1 = x0 + bw;
      if (PHOTO_CITY.indexOf(i + "-" + j) >= 0) {
        const hw = bw / 2, hh = bh / 2;
        addCell(x0, x0 + hw, yTop, yTop - hh, hw, j * 2);
        addCell(x0 + hw, x1, yTop, yTop - hh, hw, j * 2);
        addCell(x0, x0 + hw, yTop - hh, yBot, hw, j * 2 + 1);
        addCell(x0 + hw, x1, yTop - hh, yBot, hw, j * 2 + 1);
      } else {
        addCell(x0, x1, yTop, yBot, bw, j);
      }
    }
  }
})();

/* ---------- 雷达 SAR（6 架）：任务区 3×2 分块，每架在自己块内蛇形（南北腿 + 东西折返） ---------- */
const sarRoutes = [];
(function buildSar() {
  const BC = 3, BR = 2;                       // 3 列 × 2 行
  const bw = (2 * HALF_X) / BC, bh = (2 * HALF_Y) / BR;
  const SAR_LEG_GAP = 2000;                   // 腿距 = 测绘带宽度（8–10km 侧视，2km 才能无缝）
  const EDGE = 800;                           // 腿两端离块边的余量
  const SAR_SHIFT = 9000;                     // 侧视朝西 → 航路整体东移约 9km（条带中心）
  const PHASE_STEP = 250;                     // 相邻块错开，让不同航线看得出间隔
  let idx = 0;
  for (let bc = 0; bc < BC; bc++) {
    for (let br = 0; br < BR; br++) {
      idx += 1;
      const x0 = -HALF_X + bc * bw, x1 = x0 + bw;
      const y0 = -HALF_Y + br * bh, y1 = y0 + bh;
      sarCells.push({
        kind: "sar",
        ring: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
      });
      const ya = y0 + EDGE, yb = y1 - EDGE;
      /* 腿从块西侧 +0.5km 起，按测绘带铺到块东侧外 0.5km（西侧视才能盖住块东缘） */
      const legs = [];
      const K = Math.ceil((x1 - x0) / SAR_LEG_GAP);
      for (let k = 0; k <= K; k++) {
        const x = x0 + 500 + k * SAR_LEG_GAP;
        if (x > x1 - 500) continue;                      /* 腿不出本块，避免与邻块重叠/交叉 */
        legs.push(x);
      }
      const shift = SAR_SHIFT + ((idx - 1) % 4) * PHASE_STEP;
      const raw = [];
      legs.forEach((x0l, i) => {
        const x = x0l + shift;
        if (i % 2 === 0) raw.push([x, ya], [x, yb]);
        else raw.push([x, yb], [x, ya]);
      });
      sarRoutes.push({
        id: "R-" + String(idx).padStart(2, "0"),
        group: "sar", kind: "serpentine",
        zone: "block" + idx,
        color: COLOR.sar, lenKm: lenKm(raw), pts: raw.map(([x2, y2]) => ll(x2, y2))
      });
    }
  }
})();

/* 正置跑道环（南北长轴）：电子 / 通信 */
function raceTrack(cx, cy, legM, rM, n = 12) {
  const pts = [];
  for (let a = -legM / 2; a <= legM / 2; a += legM / 4) pts.push([cx - rM, cy + a]);
  for (let i = 1; i <= n; i++) {
    const ang = Math.PI - (Math.PI * i) / n;
    pts.push([cx + rM * Math.cos(ang), cy + legM / 2 + rM * Math.sin(ang)]);
  }
  for (let a = legM / 2 - legM / 4; a >= -legM / 2; a -= legM / 4) pts.push([cx + rM, cy + a]);
  for (let i = 1; i <= n; i++) {
    const ang = -(Math.PI * i) / n;
    pts.push([cx + rM * Math.cos(ang), cy - legM / 2 + rM * Math.sin(ang)]);
  }
  return pts;
}

/* 正置跑道环（东西长轴）：GMTI —— 直边平行任务区上下边 */
function raceTrackEW(cx, cy, legM, rM, n = 12) {
  const pts = [];
  for (let a = -legM / 2; a <= legM / 2; a += legM / 4) pts.push([cx + a, cy - rM]);
  for (let i = 1; i <= n; i++) {
    const ang = -Math.PI / 2 + (Math.PI * i) / n;
    pts.push([cx + legM / 2 + rM * Math.cos(ang), cy + rM * Math.sin(ang)]);
  }
  for (let a = legM / 2 - legM / 4; a >= -legM / 2; a -= legM / 4) pts.push([cx + a, cy + rM]);
  for (let i = 1; i <= n; i++) {
    const ang = Math.PI / 2 + (Math.PI * i) / n;
    pts.push([cx - legM / 2 + rM * Math.cos(ang), cy + rM * Math.sin(ang)]);
  }
  return pts;
}

/* 雷达 GMTI（2 架）：东南山地区一条东西向跑道，两架半圈错开 */
const gmtiRoutes = Array.from({ length: GMTI_BUDGET }, (_, i) => {
  const raw = raceTrackEW(8000, 9000, 16000, 1200, 12);
  return {
    id: "M-" + String(i + 1).padStart(2, "0"),
    group: "gmti", kind: "racetrack", zone: "east",
    color: COLOR.gmti, lenKm: lenKm(raw), pts: raw.map(([x, y]) => ll(x, y))
  };
});

const ewarRoutes = [1, 2].map((i) => {
  const raw = raceTrack(-4000, 4000, 3000, 1200, 12);
  return { id: "E-" + String(i).padStart(2, "0"), group: "ewar", kind: "racetrack", zone: "east",
    color: COLOR.ewar, lenKm: lenKm(raw), pts: raw.map(([x, y]) => ll(x, y)) };
});

const commRoutes = (function () {
  const defs = [
    { id: "C-01", at: [0, 0], zone: "mid" },
    { id: "C-02", at: [0, 0], zone: "mid" },
    { id: "C-03", at: [4000, 13000], zone: "corridor" },
    { id: "C-04", at: [4000, 13000], zone: "corridor" }
  ];
  return defs.map((d) => {
    const raw = raceTrack(d.at[0], d.at[1], 2400, 800, 10);
    return { id: d.id, group: "comm", kind: "racetrack", zone: d.zone,
      color: COLOR.comm, lenKm: lenKm(raw), pts: raw.map(([x, y]) => ll(x, y)) };
  });
})();

const area = photoRoutes.concat(sarRoutes, gmtiRoutes, ewarRoutes, commRoutes);

/* ---------- 进场：4 条编组航线（按类型）；每架从“最近端”进场后直飞 ---------- */
(function buildCorridors() {
  const R = RALLY_XY;
  const distR = (p) => Math.hypot(p[0] - R[0], p[1] - R[1]);
  const TYPE = { photo: "G1", sar: "G2", gmti: "G2", ewar: "G3", comm: "G4" };
  const NAME = { G1: "编组1（光电）", G2: "编组2（雷达）", G3: "编组3（电子）", G4: "编组4（通信）" };
  const TCOLOR = { G1: COLOR.photo, G2: COLOR.sar, G3: COLOR.ewar, G4: COLOR.comm };
  const LANE_GAP = 2000;                 /* 车道间距 2 km */
  const MAX_LANES = 6;                   /* 每条航线最多 6 条车道，避免铺得过宽 */
  const groups = {};
  area.forEach((r) => {
    const P = r.pts.map((p) => xy(p[0], p[1]));
    const closed = r.kind === "loop" || r.kind === "racetrack";
    if (closed) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < r.pts.length - 1; i++) { const d = distR(P[i]); if (d < bd) { bd = d; best = i; } }
      if (best > 0) {
        const base = r.pts.slice(0, r.pts.length - 1);
        r.pts = base.slice(best).concat(base.slice(0, best));
        r.pts.push(r.pts[0]);
      }
    } else if (distR(P[P.length - 1]) < distR(P[0])) {
      r.pts = r.pts.slice().reverse();
    }
    const key = TYPE[r.group];
    const e = xy(r.pts[0][0], r.pts[0][1]);
    (groups[key] = groups[key] || { cx: 0, cy: 0, n: 0, list: [] });
    const g = groups[key];
    g.cx += e[0]; g.cy += e[1]; g.n += 1; g.list.push(r);
  });
  /* 4 个入口沿北边等距；用 4! 枚举选“集结区→入口→进场点”总距离最小的分配 */
  const keys = Object.keys(groups);
  const gates = [];
  for (let k = 1; k <= keys.length; k++) gates.push([HALF_X - k * (2 * HALF_X) / (keys.length + 1), HALF_Y]);
  let bestOrder = keys, bestCost = Infinity;
  (function permute(rest, cur) {
    if (!rest.length) {
      let cost = 0;
      cur.forEach(function (key, gi) {
        const g = groups[key], gate = gates[gi];
        for (const r of g.list) {
          const e = xy(r.pts[0][0], r.pts[0][1]);
          cost += Math.hypot(gate[0] - R[0], gate[1] - R[1]) + Math.hypot(e[0] - gate[0], e[1] - gate[1]);
        }
      });
      if (cost < bestCost) { bestCost = cost; bestOrder = cur.slice(); }
      return;
    }
    for (let i = 0; i < rest.length; i++) permute(rest.slice(0, i).concat(rest.slice(i + 1)), cur.concat([rest[i]]));
  })(keys, []);
  bestOrder.forEach((key, gi) => {
    const g = groups[key];
    const gate = gates[gi];
    const lanes = Math.min(MAX_LANES, g.list.length);
    g.list.forEach((r, i) => {
      r.corr = key;
      r.lan = Math.round(((i % lanes) - (lanes - 1) / 2) * LANE_GAP);
    });
    transit.push({
      id: key, name: NAME[key], group: "mixed", color: TCOLOR[key],
      lenKm: +(Math.hypot(gate[0] - R[0], gate[1] - R[1]) / 1000).toFixed(1),
      mid: ll((R[0] + gate[0]) / 2, (R[1] + gate[1]) / 2),
      pts: [ll(R[0], R[1]), ll(gate[0], gate[1])]
    });
  });
})();

/* ---------- 覆盖判定 ---------- */
function distToSeg(px, py, a, b) {
  const bx = b[0] - a[0], by = b[1] - a[1];
  const L2 = bx * bx + by * by;
  let t = L2 ? ((px - a[0]) * bx + (py - a[1]) * by) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - a[0] - bx * t, py - a[1] - by * t);
}

/* 两条航线集合的“互不重叠/不交叉”检查：共线重叠、交叉、最小间距 */
function sepCheck(list) {
  const legsOf = (r) => {
    const o = [];
    for (let k = 0; k + 1 < r._xy.length; k += 2) o.push([r._xy[k], r._xy[k + 1]]);
    return o;
  };
  const cross = (a, b, c, d) => {
    const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (Math.abs(den) < 1e-12) return false;
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
    const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
    return t > 1e-3 && t < 1 - 1e-3 && u > 1e-3 && u < 1 - 1e-3;
  };
  const segDist = (a, b) => {
    const d2 = (p, x, y) => {
      const bx = y[0] - x[0], by = y[1] - x[1];
      const L2 = bx * bx + by * by;
      let t = L2 ? ((p[0] - x[0]) * bx + (p[1] - x[1]) * by) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p[0] - x[0] - bx * t, p[1] - x[1] - by * t);
    };
    return Math.min(d2(a[0], b[0], b[1]), d2(a[1], b[0], b[1]), d2(b[0], a[0], a[1]), d2(b[1], a[0], a[1]));
  };
  let sameX = 0, nearMerge = 0, overlap = 0, crossPairs = 0, minD = Infinity;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const A = list[i]._xy, B = list[j]._xy;
      for (let a = 1; a < A.length; a++) for (let b = 1; b < B.length; b++) {
        if (cross(A[a - 1], A[a], B[b - 1], B[b])) crossPairs += 1;
        const d = segDist([A[a - 1], A[a]], [B[b - 1], B[b]]);
        if (d < minD) minD = d;
      }
      for (const a of legsOf(list[i])) for (const b of legsOf(list[j])) {
        const dx = Math.abs(a[0][0] - b[0][0]);
        const ay0 = Math.min(a[0][1], a[1][1]), ay1 = Math.max(a[0][1], a[1][1]);
        const by0 = Math.min(b[0][1], b[1][1]), by1 = Math.max(b[0][1], b[1][1]);
        const gapY = Math.max(0, Math.max(ay0, by0) - Math.min(ay1, by1));
        if (dx < 5) {
          sameX += 1;
          if (gapY < 300) nearMerge += 1;
          if (dx < 1) {
            const ov = Math.min(ay1, by1) - Math.max(ay0, by0);
            if (ov > 0) overlap += ov;
          }
        }
      }
    }
  }
  return { sameX, nearMerge, overlap, crossPairs, minD };
}

/* SAR 覆盖：固定西侧 8–10km 侧视条带，沿航向 ±1.1km 容差（与画面一致） */
function sarBandCoverage(routes) {
  const step = 500;
  const nx = Math.max(2, Math.round((2 * HALF_X) / step));
  const ny = Math.max(2, Math.round((2 * HALF_Y) / step));
  let hit = 0, total = 0;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const x = -HALF_X + ((i + 0.5) / nx) * 2 * HALF_X;
      const y = -HALF_Y + ((j + 0.5) / ny) * 2 * HALF_Y;
      total += 1;
      let ok = false;
      for (const r of routes) {
        for (let k = 1; k < r._xy.length && !ok; k++) {
          const a = r._xy[k - 1], b = r._xy[k];
          if (Math.abs(b[0] - a[0]) > 1) continue;          /* 只认南北向腿 */
          const y0 = Math.min(a[1], b[1]) - 1100, y1 = Math.max(a[1], b[1]) + 1100;
          if (y < y0 || y > y1) continue;
          const dx = x - a[0];
          if (dx <= -8000 && dx >= -10000) ok = true;   /* 条带在航路西侧 8–10km */
        }
        if (ok) break;
      }
      if (ok) hit += 1;
    }
  }
  return total ? +((hit / total) * 100).toFixed(1) : 0;
}
function coverage(routes, radius, filter) {
  const step = 500;
  const nx = Math.max(2, Math.round((2 * HALF_X) / step));
  const ny = Math.max(2, Math.round((2 * HALF_Y) / step));
  let hit = 0, total = 0;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const x = -HALF_X + ((i + 0.5) / nx) * 2 * HALF_X;
      const y = -HALF_Y + ((j + 0.5) / ny) * 2 * HALF_Y;
      if (filter && !filter(x, y)) continue;
      total += 1;
      let best = Infinity;
      for (const r of routes) {
        for (let k = 1; k < r._xy.length && best > radius; k++) best = Math.min(best, distToSeg(x, y, r._xy[k - 1], r._xy[k]));
        if (best <= radius) break;
      }
      if (best <= radius) hit += 1;
    }
  }
  return total ? +((hit / total) * 100).toFixed(1) : 0;
}

/* ---------- 校验 ---------- */
function verify() {
  const sandbox = {};
  new Function("window", fs.readFileSync(OUT, "utf8"))(sandbox);
  const D = sandbox.ROUTES_S1;
  const errs = [];
  const toXY = (p) => xy(p[0], p[1]);

  /* 1) 编组航线两两不交叉 */
  const tXY = D.transit.map((r) => r.pts.map(toXY));
  for (let i = 0; i < tXY.length; i++)
    for (let j = i + 1; j < tXY.length; j++)
      if (polylinesCross(tXY[i], tXY[j])) errs.push("编组航线交叉: " + D.transit[i].id + " x " + D.transit[j].id);

  /* 2) 编组航线：起点在集结区、终点在边界、途中不入区 */
  for (let i = 0; i < D.transit.length; i++) {
    const r = D.transit[i], pts = tXY[i];
    if (Math.hypot(pts[0][0] - RALLY_XY[0], pts[0][1] - RALLY_XY[1]) > 3000) errs.push(r.id + " 起点离集结区过远");
    const end = pts[pts.length - 1];
    if (Math.abs(Math.abs(end[0]) - HALF_X) > 300 && Math.abs(Math.abs(end[1]) - HALF_Y) > 300) errs.push(r.id + " 终点不在任务区边界");
    for (let k = 0; k < pts.length - 1; k++) if (insideArea(pts[k])) { errs.push(r.id + " 途中进入任务区内部"); break; }
  }

  /* 3) 区内航路：ID 唯一、点都在任务区内 */
  const seen = new Set();
  for (const r of D.area) {
    if (seen.has(r.id)) errs.push("ID 重复: " + r.id);
    seen.add(r.id);
    if (r.group !== "sar") for (const p of r.pts) if (!insideArea(toXY(p))) { errs.push(r.id + " 点跑出任务区"); break; }
  }

  /* 4) 横平竖直：光电与 SAR 的每一段必须是正南正北或正东正西；SAR 必须是多腿蛇形 */
  const axisish = D.area.filter((r) => r.group === "photo" || r.group === "sar");
  for (const r of axisish) {
    let legs = 0;
    for (let i = 1; i < r.pts.length; i++) {
      const a = toXY(r.pts[i - 1]), b = toXY(r.pts[i]);
      const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
      if (dx > 1 && dy > 1) { errs.push(r.id + " 出现斜段"); break; }
      if (r.group === "sar" && dy > 1000) legs += 1;
    }
    if (r.group === "sar" && legs < 3) errs.push(r.id + " 蛇形腿数不足（" + legs + " 条）");
  }

  /* 4b) GMTI：两架必须同一条跑道，且跑道在任务区内 */
  const gmti = D.area.filter((r) => r.group === "gmti");
  if (gmti.length === GMTI_BUDGET) {
    const sig = (r) => JSON.stringify(r.pts);
    if (gmti.some((r) => sig(r) !== sig(gmti[0]))) errs.push("GMTI 两架未共用同一条跑道");
  }

  /* 5) 计数 */
  const count = (g) => D.area.filter((r) => r.group === g).length;
  const wantPhoto = PHOTO_G.cols * PHOTO_G.rows - PHOTO_CITY.length + PHOTO_CITY.length * 4;
  const want = { photo: wantPhoto, sar: 6, gmti: 2, ewar: 2, comm: 4 };
  for (const g of Object.keys(want)) if (count(g) !== want[g]) errs.push("数量不符: " + g + "=" + count(g) + " 期望 " + want[g]);

  /* 6) 覆盖 */
  const withXY = D.area.map((r) => Object.assign({}, r, { _xy: r.pts.map(toXY) }));
  const photoXY = withXY.filter((r) => r.group === "photo");

  /* 5b) 光电两两分离：不得共线重叠、不得贴近并线、不得交叉 */
  const photoSep = sepCheck(photoXY);
  if (photoSep.overlap > 1) errs.push("光电两两共线重叠 " + Math.round(photoSep.overlap) + " m");
  if (photoSep.nearMerge > 0) errs.push("光电两两贴近并线（同 x 且 y 间隙<300m）" + photoSep.nearMerge + " 处");
  if (photoSep.crossPairs > 0) errs.push("光电两两交叉 " + photoSep.crossPairs + " 处");

  const sarXY = withXY.filter((r) => r.group === "sar");
  /* 5c) SAR 两两分离：同样不得共线重叠、不得交叉 */
  const sarSep = sepCheck(sarXY);
  if (sarSep.overlap > 1) errs.push("SAR 两两共线重叠 " + Math.round(sarSep.overlap) + " m");
  if (sarSep.crossPairs > 0) errs.push("SAR 两两交叉 " + sarSep.crossPairs + " 处");
  const covPhoto = coverage(photoXY, SCAN_R);
  const covSar = sarBandCoverage(sarXY);
  const covPhotoBig = coverage(photoXY.filter((r) => r.zone === "big"), SCAN_R);
  const covPhotoCity = coverage(photoXY.filter((r) => r.zone === "city"), SCAN_R);

  /* 7) 疏密可量化：西北 / 东南 1/4 区的“每 100km² 闭环数”与平均腿距 */
  const q = (pred) => photoXY.filter((r) => pred(r));
  const quadArea = (HALF_X * HALF_Y) / 1e6 / 4;   // 每个 1/4 区面积（km²）
  const centerOf = (r) => {
    let sx = 0, sy = 0;
    for (const p of r._xy) { sx += p[0]; sy += p[1]; }
    return [sx / r._xy.length, sy / r._xy.length];
  };
  const gapStat = (r) => {                       /* 相邻竖腿的平均间距 */
    const xs = [...new Set(r._xy.filter((_, i) => i % 2 === 0).map((p) => Math.round(p[0])))].sort((a, b) => a - b);
    if (xs.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < xs.length; i++) sum += xs[i] - xs[i - 1];
    return sum / (xs.length - 1);
  };
  const nw = q((r) => r.zone === "big");
  const se = q((r) => r.zone === "city");
  const dens = (arr) => (arr.length / (quadArea * 2) * 100).toFixed(2);
  const gapAvg = (arr) => arr.length ? (arr.reduce((s, r) => s + gapStat(r), 0) / arr.length / 1000).toFixed(2) : "-";

  console.log("[verify] 编组航线:", D.transit.map((r) => r.id + " " + r.lenKm + "km").join(" / "));
  console.log("[verify] 计数:", JSON.stringify({ photo: count("photo"), photoBig: D.area.filter((r) => r.group === "photo" && r.zone === "big").length,
    photoCity: D.area.filter((r) => r.group === "photo" && r.zone === "city").length, sar: count("sar"), gmti: count("gmti"), ewar: count("ewar"), comm: count("comm") }));
  console.log("[verify] SAR 蛇形腿数:", D.area.filter((r) => r.group === "sar").map((r) => {
    let n = 0;
    for (let i = 1; i < r.pts.length; i++) {
      const a = toXY(r.pts[i - 1]), b = toXY(r.pts[i]);
      if (Math.abs(b[1] - a[1]) > 1000 && Math.abs(b[0] - a[0]) < 1) n += 1;
    }
    return r.id + ":" + n + "腿/" + r.lenKm + "km";
  }).join(" "));
  console.log("[verify] GMTI:", D.area.filter((r) => r.group === "gmti").map((r) => r.id + " " + r.lenKm + "km").join(" / "));
  console.log("[verify] 光电分离: 共线重叠 " + Math.round(photoSep.overlap) + "m | 交叉 " + photoSep.crossPairs + " 处 | 同x竖腿 " + photoSep.sameX + " | 最小间距 " + Math.round(photoSep.minD) + "m");
  console.log("[verify] 光电覆盖 全区 " + covPhoto + "%（大格机 " + covPhotoBig + "% / 城区机 " + covPhotoCity + "%）");
  console.log("[verify] SAR 分离: 共线重叠 " + Math.round(sarSep.overlap) + "m | 交叉 " + sarSep.crossPairs + " 处 | 最小间距 " + Math.round(sarSep.minD) + "m");
  console.log("[verify] SAR 覆盖  全区 " + covSar + "%");
  console.log("[verify] 光电分区 大格: " + nw.length + " 架 / 平均腿距 " + gapAvg(nw) + "km");
  console.log("[verify] 光电分区 城区: " + se.length + " 架 / 平均腿距 " + gapAvg(se) + "km");
  if (errs.length) { console.error("[verify] 失败:\n - " + errs.join("\n - ")); process.exit(1); }
  console.log("[verify] 通过");
}

/* ---------- 序列化 ---------- */
function serialize() {
  const emit = (arr) => arr.map((r) => {
    const fields = [
      '"id": ' + JSON.stringify(r.id),
      r.name ? '"name": ' + JSON.stringify(r.name) : null,
      '"group": ' + JSON.stringify(r.group),
      r.kind ? '"kind": ' + JSON.stringify(r.kind) : null,
      r.zone ? '"zone": ' + JSON.stringify(r.zone) : null,
      r.corr ? '"corr": ' + JSON.stringify(r.corr) : null,
      r.lan != null ? '"lan": ' + r.lan : null,
      '"color": ' + JSON.stringify(r.color),
      '"lenKm": ' + r.lenKm,
      r.mid ? '"mid": [' + r.mid[0] + ", " + r.mid[1] + "]" : null
    ].filter(Boolean);
    const pts = r.pts.map((p) => "        [" + p[0] + ", " + p[1] + "]").join(",\n");
    return "    {\n      " + fields.join(",\n      ") + ',\n      "pts": [\n' + pts + "\n      ]\n    }";
  }).join(",\n");

  const head = [
    "/* 由 _tools/plan-routes-s1.mjs 生成，勿手改坐标；要调疏密改脚本参数后重跑。",
    "   所有区内航段横平竖直：光电为多腿蛇形（疏密渐变、奇偶行错开）、SAR 为多腿蛇形（3x2 分块）、GMTI 为东西向跑道环、",
    "   电子/通信为正置跑道环。格子由西北向东南收窄，闭环宽度随之变小 —— 西北稀、东南密。 */",
    "window.ROUTES_S1 = {",
    '  "meta": ' + JSON.stringify({
      taskArea: AREA,
      rallyArea: RALLY,
      scanRadius: SCAN_R,
      photoGrid: { cols: PHOTO_G.cols, rows: PHOTO_G.rows, bigKm: 10, cityKm: 5, legGap: PHOTO_G.legGap, cityBlocks: PHOTO_CITY },
      sarBand: [500, 2500], sarBlocks: "3x2"
    }, null, 2).replace(/\n/g, "\n  ") + ","
  ].join("\n");

  const cells = photoCells.concat(sarCells).map((c) => ({
    kind: c.kind,
    ring: c.ring.map(([x, y]) => ll(x, y))
  }));
  const cellsJson = JSON.stringify(cells, null, 2).replace(/\n/g, "\n  ");
  return head + '\n  "transit": [\n' + emit(transit) + '\n  ],\n  "area": [\n' + emit(area) + '\n  ],\n  "cells": ' +
    cellsJson + "\n};\n";
}

if (process.argv.includes("--verify")) {
  verify();
} else {
  fs.writeFileSync(OUT, serialize(), "utf8");
  console.log("[plan-routes-s1] 写入 " + path.relative(ROOT, OUT));
  verify();
}
