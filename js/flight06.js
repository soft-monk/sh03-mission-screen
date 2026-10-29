/* SH-06 flight sim v5
   - counts: photon 20 / comm 4 / ewar 6 / radar 3 = 33
   - trail: true FIFO history, 1 sample / 5 s, 300 s back (~61 pts)
   - photon: 10 per zone (5 cols x 2 rows of 4x10 km cells), each flies a 2x10 km narrow loop
   - 3905 s: blue 14/15, 17/18 orbit two suspects; remaining zone-2 blue replan as 3x2 loops
   - radar SAR (1): 10 N-S legs 2 km apart (2 km swath), side-looking beam 8-10 km, perpendicular to track
   - radar GMTI (2): one E-W race track SOUTH of zone-1, 20 km wide x 10 km tall, half-lap apart
   - ewar (4): 2 south race tracks outside zone-2, 2 each, half-lap apart
   - comm: 1 relay between the two zones, other 3 evenly split on assembly->mid corridor */
window.FLIGHT06 = (function () {
  var TOTAL = 9000, V = 50, T_LIFT = 20, TOFF = 90;
  var TJOIN = T_LIFT + TOFF;                    /* park -> route start handover */
  var HIST_DT = 5, HIST_N = 60;                 /* 300 秒历史，5 秒一点 */
  var M_LAT = 111030, M_LON = 111320 * Math.cos(39.85 * Math.PI / 180);

  var ASSEMBLY = [115.9050, 39.7450];
  var ASM_C    = [115.95742, 39.74206];         /* 集结区几何中心 */
  var POT1 = [113.95000, 39.75000];             /* 部署区-1 */
  var POT2 = [114.30000, 40.05000];             /* 部署区-2 */
  var MID  = [(POT1[0]+POT2[0])/2, (POT1[1]+POT2[1])/2];

  /* ---------- 几何 ---------- */
  function poly(pts){ var seg=[],t=0; for(var i=1;i<pts.length;i++){var L=Math.hypot((pts[i][0]-pts[i-1][0])*M_LON,(pts[i][1]-pts[i-1][1])*M_LAT); seg.push(L); t+=L;} return {pts:pts,seg:seg,len:t}; }
  function at(P,d,noWrap){
    if(!P.len) return {lon:P.pts[0][0],lat:P.pts[0][1],dx:1,dy:0};
    if(noWrap) d=Math.max(0,Math.min(P.len,d)); else d=((d%P.len)+P.len)%P.len;
    var k=0; while(k<P.seg.length-1 && d>P.seg[k]){ d-=P.seg[k]; k++; }
    var a=P.pts[k],b=P.pts[k+1],t=P.seg[k]?d/P.seg[k]:0;
    var dx=(b[0]-a[0])*M_LON, dy=(b[1]-a[1])*M_LAT, L=Math.hypot(dx,dy)||1;
    return {lon:a[0]+(b[0]-a[0])*t, lat:a[1]+(b[1]-a[1])*t, dx:dx/L, dy:dy/L};
  }
  function rotOf(p){ return Math.atan2(p.dx,p.dy)*180/Math.PI; }
  function rectLoop(cx,cy,wM,hM){
    var gx=wM/2/M_LON, gy=hM/2/M_LAT;
    return poly([[cx-gx,cy-gy],[cx+gx,cy-gy],[cx+gx,cy+gy],[cx-gx,cy+gy],[cx-gx,cy-gy]]);
  }
  /* 跑道形：直边 legM，半径 rM，竖直摆 */
  function raceTrack(c, legM, rM, n){
    var pts=[],i,y, gx=rM/M_LON, gy=legM/2/M_LAT, ry=rM/M_LAT;
    for(y=-legM/2;y<=legM/2;y+=legM/4) pts.push([c[0]-gx, c[1]+y/M_LAT]);
    for(i=1;i<=n;i++){ var a1=Math.PI-Math.PI*(i/n); pts.push([c[0]+(rM*Math.cos(a1))/M_LON, c[1]+legM/2/M_LAT+(rM*Math.sin(a1))/M_LAT]); }
    for(y=legM/2;y>=-legM/2;y-=legM/4) pts.push([c[0]+gx, c[1]+y/M_LAT]);
    for(i=1;i<=n;i++){ var a2=-Math.PI*(i/n); pts.push([c[0]+(rM*Math.cos(a2))/M_LON, c[1]+(-legM/2)/M_LAT+(rM*Math.sin(a2))/M_LAT]); }
    return poly(pts);
  }
  function raceTrackAt(p0, legM, rM, n){
    return raceTrack([p0[0] + rM/M_LON, p0[1] + legM/2/M_LAT], legM, rM, n);
  }
  /* E-W race track: straights legM along east-west, semicircle radius rM */
  function raceTrackEW(c, legM, rM, n){
    var pts=[],i,x, gx=legM/2/M_LON, ry=rM/M_LAT;
    for(x=-legM/2;x<=legM/2;x+=legM/4) pts.push([c[0]+x/M_LON, c[1]-ry]);
    for(i=1;i<=n;i++){ var a1=-Math.PI/2+Math.PI*(i/n); pts.push([c[0]+gx+(rM*Math.cos(a1))/M_LON, c[1]+(rM*Math.sin(a1))/M_LAT]); }
    for(x=legM/2;x>=-legM/2;x-=legM/4) pts.push([c[0]+x/M_LON, c[1]+ry]);
    for(i=1;i<=n;i++){ var a2=Math.PI/2+Math.PI*(i/n); pts.push([c[0]-gx+(rM*Math.cos(a2))/M_LON, c[1]+(rM*Math.sin(a2))/M_LAT]); }
    return poly(pts);
  }
  /* serpentine scan: legs N-S legs of legM, box widthM wide, starts at NE corner */
  function serpentine(cx, cy, legM, widthM, legs) {
    var gy = legM/2/M_LAT, step = widthM/(legs-1)/M_LON, x0 = cx + widthM/2/M_LON, pts = [], i, x;
    for (i = 0; i < legs; i++) {
      x = x0 - i*step;
      if (i % 2 === 0) { pts.push([x, cy+gy]); pts.push([x, cy-gy]); }
      else             { pts.push([x, cy-gy]); pts.push([x, cy+gy]); }
    }
    return poly(pts);
  }
  function circle(c,r,n){
    var o=[]; for(var i=0;i<=n;i++){ var a=(i/n)*Math.PI*2; o.push([c[0]+(r*Math.cos(a))/M_LON, c[1]+(r*Math.sin(a))/M_LAT]); }
    return poly(o);
  }

  /* ---------- 航线（data/routes.js） ---------- */
  var R = window.ROUTES || [];
  function routePoly(i){
    var r=R[i];
    return r ? poly(r.pts.map(function(p){return [p[0],p[1]];})) : poly([ASSEMBLY, POT1]);
  }
  var RT = [routePoly(0), routePoly(1), routePoly(2), routePoly(3)];
  var TARR = RT.map(function(p){ return TJOIN + p.len / V; });

  /* ---------- 各任务航迹 ---------- */
  /* 光电：每区 5 列 x 2 行 = 10 格（各 4km x 10km），每格一架。
     格内飞"2km 宽 x 10km 长"的窄闭环（两条南北腿，间距 2km）：
     扫描覆盖 2.8km > 腿距 2km => 相邻扫描带重叠 0.8km（允许），但航路互不重叠。 */
  var PHOTO_COLS = 5, PHOTO_CELL_W = 4000, PHOTO_CELL_H = 10000, PHOTO_LEG_GAP = 2000;
  var PHOTO_AHEAD = 2800;                                   /* 扇区前视 2.8km */
  var PHOTO_LEG_LEN = PHOTO_CELL_H - 2 * PHOTO_AHEAD;       /* 腿长 4.4km，两端各留 2.8km */
  var PHOTO = { A: [], B: [] };
  for (var k = 0; k < 10; k++) {
    var col = k % PHOTO_COLS, row = Math.floor(k / PHOTO_COLS);     /* 5 列 x 2 行 */
    [POT1, POT2].forEach(function (c, zi) {
      var cx = c[0] + ((col - 2) * PHOTO_CELL_W) / M_LON;
      var cy = c[1] + ((row ? 5000 : -5000)) / M_LAT;
      var y0 = cy - PHOTO_LEG_LEN / 2 / M_LAT, y1 = cy + PHOTO_LEG_LEN / 2 / M_LAT;
      var x1 = cx - PHOTO_LEG_GAP / 2 / M_LON, x2 = cx + PHOTO_LEG_GAP / 2 / M_LON;
      var loop = poly([[x1, y0], [x1, y1], [x2, y1], [x2, y0], [x1, y0]]);
      (zi === 0 ? PHOTO.A : PHOTO.B).push(loop);
    });
  }
  var Z_HALF_LON = 10000 / M_LON, Z_HALF_LAT = 10000 / M_LAT;   /* deployed zone half size 10 km */
  /* SAR: serpentine east of zone-1, 4.3 km clear of its east edge, bbox 20 x 20 km */
  /* SAR：侧视成像，测绘带宽 2km（地距 8~10km）=> 20km 宽的疑似区需要 10 条平行腿、间距 2km */
  var SAR_LEGS = 10, SAR_STEP = 2000, SAR_LEGLEN = 22000;
  var SAR_TRACK = (function () {
    var y0 = POT1[1] - SAR_LEGLEN / 2 / M_LAT, y1 = POT1[1] + SAR_LEGLEN / 2 / M_LAT;
    var pts = [], i, x;
    for (i = 0; i < SAR_LEGS; i++) {
      x = POT1[0] + (i * SAR_STEP) / M_LON;          /* 从疑似区中心向东排到 +18km */
      if (i % 2 === 0) { pts.push([x, y0]); pts.push([x, y1]); }
      else             { pts.push([x, y1]); pts.push([x, y0]); }
    }
    pts.push([POT1[0], y0]);                          /* 南侧回程，闭合 */
    return poly(pts);
  })();
  /* GMTI: E-W race track south of zone-1, 20 km wide x 10 km tall, 4.4 km clear of its south edge */
  var RADAR_GAP = 4400, RADAR_LEG = 3000, RADAR_R = 1500;
  var RADAR_CY = POT1[1] - Z_HALF_LAT - (RADAR_R + RADAR_GAP) / M_LAT;
  /* 长轴南北：南北直边 3000 + 上下半圆 1500 => 6000(南北) x 3000(东西) */
  var RADAR_TRACK = raceTrack([POT1[0], RADAR_CY], RADAR_LEG, RADAR_R, 12);
  /* 电子两条跑道：区域外侧（南），各 8km 直边、2km 半径，左右并排 */
  /* 电子干扰：3 条南北长轴跑道环（线性 x1.1），每环 2 架半圈错开 */
  var JAM_LEG = 2640, JAM_R = 825;
  var JAM_GAP = 2000;                       /* 相邻环之间留 2 km 空档 */
  var JAM_STEP = JAM_R * 2 + JAM_GAP;       /* 环心间距 3650 m */
  var JAM_NS = JAM_LEG / 2 + JAM_R;         /* 南北半跨度 2145 m */
  var JAM_CY = POT2[1] - Z_HALF_LAT - (JAM_NS + 4000) / M_LAT;
  var JAM_TRACKS = [-1, 0, 1].map(function (i) {
    return raceTrack([POT2[0] + (i * JAM_STEP) / M_LON, JAM_CY], JAM_LEG, JAM_R, 10);
  });
  /* 通信中继跑道 */
  var RELAY_MID = raceTrack(MID, 3120, 975, 10);          /* 1950 x 5070 m (+30%) */
  /* 通信链：集结区中心 -> 最后一个无人机(两区之间)，按【沿路里程】四等分，四架排成一列 */
  var RT2 = RT[1], RT2_END = RT2.pts[RT2.pts.length - 1];
  var RELAY_HEAD = Math.hypot((RT2.pts[0][0] - ASM_C[0]) * M_LON, (RT2.pts[0][1] - ASM_C[1]) * M_LAT);
  var RELAY_TAIL = Math.hypot((MID[0] - RT2_END[0]) * M_LON, (MID[1] - RT2_END[1]) * M_LAT);
  var RELAY_LEN  = RELAY_HEAD + RT2.len + RELAY_TAIL;
  var RELAY_FRAC = [0.5];
  var RELAYS = RELAY_FRAC.map(function (f) {
    var s = RELAY_LEN * f - RELAY_HEAD;              /* 从航路起点算的里程 */
    var o = at(RT2, s);
    return { frac: f, s: s, lon: o.lon, lat: o.lat };
  });
  var RELAY_RING = raceTrack([RELAYS[0].lon, RELAYS[0].lat], 2340, 780, 8);   /* 1560 x 3900 m (+30%) */

  /* ---------- 待命方阵 ---------- */
  /* 待命方阵固定摆在我方集结区内（不再用航路起点） */
  var PARKC = {
    blue:   [115.9660, 39.7520],
    green:  [115.9490, 39.7520],
    red:    [115.9660, 39.7320],
    yellow: [115.9490, 39.7320]
  };
  function parkPos(type, k) {
    var c = PARKC[type], col = k % 5, row = Math.floor(k / 5);
    return { lon: c[0] + ((col - 2) * 200) / M_LON, lat: c[1] + ((row - 1) * 200) / M_LAT, r: 300 };
  }
  function laneOff(k){ return ((k % 5) - 2) * 260; }
  function alongOff(k){ return (k % 4) * 300; }

  /* ---------- 无人机定义 ---------- */
  var D = [];
  function mk(type, k, opt) { D.push(Object.assign({ type: type, k: k }, opt)); }

  for (k = 0; k < 20; k++) mk("blue", k, { route: RT[0], tArr: TARR[0], taskPath: k < 10 ? PHOTO.A[k] : PHOTO.B[k - 10], spd: V, sync: k < 10 ? "PA" : "PB" });
  for (k = 0; k < 2; k++) mk("green", k, {
    route: RT[1], tArr: TARR[1], half: k === 1,
    relay: { s: RELAYS[0].s, lon: RELAYS[0].lon, lat: RELAYS[0].lat, ring: RELAY_RING }
  });
  mk("green", 2, { route: RT[1], tArr: TARR[1], mid: true, half: false });
  mk("green", 3, { route: RT[1], tArr: TARR[1], mid: true, half: true });
  for (k = 0; k < 6; k++) mk("red", k, { route: RT[2], tArr: TARR[2], jam: JAM_TRACKS[Math.floor(k / 2)], half: k % 2 === 1 });
  mk("yellow", 0, { route: RT[3], tArr: TARR[3], radar: true, sar: true });
  mk("yellow", 1, { route: RT[3], tArr: TARR[3], radar: true, half: false });
  mk("yellow", 2, { route: RT[3], tArr: TARR[3], radar: true, half: true });

  function takeoffPos(d, t) {
    var a = parkPos(d.type, d.k);
    var b = at(d.route, 0);
    var off = 0;                     /* 起点不偏移，横向编队位在出港 2km 内渐入 */
    var bx = b.lon + (-b.dy * off) / M_LON, by = b.lat + (b.dx * off) / M_LAT;
    var f = Math.max(0, Math.min(1, (t - T_LIFT) / TOFF));
    var dx = (bx - a.lon) * M_LON, dy = (by - a.lat) * M_LAT;
    return { lon: a.lon + (bx - a.lon) * f, lat: a.lat + (by - a.lat) * f, r: Math.atan2(dx, dy) * 180 / Math.PI };
  }
  function transitPos(d, t) {
    var dist = Math.max(0, (t - TJOIN) * V - alongOff(d.k));
    var o = at(d.route, dist, true);
    var off = laneOff(d.k) * Math.min(1, dist / 2000);
    return { lon: o.lon + (-o.dy * off) / M_LON, lat: o.lat + (o.dx * off) / M_LAT, r: rotOf(o) };
  }
  function onPath(P, phase, t, t0, spd) {
    var o = at(P, (t - t0) * spd + phase);
    return { lon: o.lon, lat: o.lat, r: rotOf(o) };
  }

  /* SAR serpentine: ping-pong so it never teleports from one end to the other */
  function scanPos(d, t) {
    var L = d.path.len, per = 2 * L, x = ((t - d.tStart) * V) % per;
    if (x < 0) x += per;
    var back = x > L, o = at(d.path, back ? per - x : x);
    return { lon: o.lon, lat: o.lat, r: rotOf(o) + (back ? 180 : 0) };
  }
  D.forEach(function (d) {
    var P = d.relay ? d.relay.path : (d.mid ? RELAY_MID : (d.sar ? SAR_TRACK : (d.jam || (d.radar ? RADAR_TRACK : d.taskPath))));
    d.path = P;
    if (d.relay) {
      var rl = d.relay;
      rl.tOff = TJOIN + (rl.s + alongOff(d.k)) / V;    /* 沿航路飞到该里程的时刻 */
      var pr = transitPos(d, rl.tOff);
      rl.pA = [pr.lon, pr.lat];
      rl.path = rl.ring;                                     /* 两架共用一个环 */
      var e0 = at(rl.ring, d.half ? rl.ring.len / 2 : 0);
      rl.pB = [e0.lon, e0.lat];                              /* 从环的起点进入 */
      d.path = rl.path;
      var rdx = (rl.pB[0] - rl.pA[0]) * M_LON, rdy = (rl.pB[1] - rl.pA[1]) * M_LAT;
      rl.tOn = rl.tOff + Math.hypot(rdx, rdy) / (V * 0.9);
      rl.rot = Math.atan2(rdx, rdy) * 180 / Math.PI;
      return;
    }
    var pA = transitPos(d, d.tArr);
    var pB = at(P, d.half ? P.len / 2 : 0);
    d.pA = [pA.lon, pA.lat]; d.pB = [pB.lon, pB.lat];
    var dx = (pB.lon - pA.lon) * M_LON, dy = (pB.lat - pA.lat) * M_LAT;
    d.tTrans = Math.hypot(dx, dy) / (V * 0.9);
    d.transRot = Math.atan2(dx, dy) * 180 / Math.PI;
  });
  /* 同一条航迹上的机共用一个到点时刻，相位差才是严格的半圈 */
  D.forEach(function (d) { if (d.path) d.tStart = d.tArr + (d.tTrans || 0); });
  D.forEach(function (d, i) {
    if (!d.path || d.relay) return;
    var latest = d.tStart, key = d.sync;
    for (var j = 0; j < D.length; j++) {
      var same = key ? (D[j].sync === key) : (D[j].path === d.path);
      if (same && D[j].tStart > latest) latest = D[j].tStart;
    }
    D[i].tStart = latest;
  });
  /* 共环的通信机同样同步入场，相位差才是严格半圈 */
  D.forEach(function (d, i) {
    if (!d.relay) return;
    var latest = d.relay.tOn;
    for (var j = 0; j < D.length; j++) {
      if (D[j].relay && D[j].path === d.relay.path && D[j].relay.tOn > latest) latest = D[j].relay.tOn;
    }
    D[i].relay.tOn = latest;
  });

  function basePosOf(d, t) {
    if (t < T_LIFT) return parkPos(d.type, d.k);
    if (t < T_LIFT + TOFF) return takeoffPos(d, t);
    if (d.relay) {
      var rl = d.relay;
      if (t < rl.tOff) return transitPos(d, t);
      if (t < rl.tOn) {
        var rf = (t - rl.tOff) / (rl.tOn - rl.tOff);
        return { lon: rl.pA[0] + (rl.pB[0] - rl.pA[0]) * rf, lat: rl.pA[1] + (rl.pB[1] - rl.pA[1]) * rf, r: rl.rot };
      }
      return onPath(d.path, d.half ? d.path.len / 2 : 0, t, rl.tOn, V * 0.8);
    }
    if (t < d.tArr) return transitPos(d, t);
    if (t < d.tStart) {
      var f = (t - d.tArr) / (d.tStart - d.tArr);
      return { lon: d.pA[0] + (d.pB[0] - d.pA[0]) * f, lat: d.pA[1] + (d.pB[1] - d.pA[1]) * f, r: d.transRot };
    }
    if (d.pp) return scanPos(d, t);          /* 光电：单腿往返，不绕环 */
    var ph = d.half ? d.path.len / 2 : 0;
    var spd = (d.radar && !d.sar) ? V * 1.2 : (d.jam ? V * 0.8 : V);
    return onPath(d.path, ph, t, d.tStart, spd);
  }

  /* ---------- 3905 s: two suspects, four blue UAVs orbit, then replan six ---------- */
  var T_REASSIGN = 3905;
  var ORBIT_R = 2000;
  var ORBIT_W = V / ORBIT_R;
  var SUSPECTS = [
    { no: "001", center: [114.34, 40.02] },
    { no: "002", center: [114.28, 40.08] }
  ];
  function orbitPoint(center, a) {
    return [center[0] + (ORBIT_R * Math.cos(a)) / M_LON,
            center[1] + (ORBIT_R * Math.sin(a)) / M_LAT];
  }
  function tangentEntry(sp, center) {
    var px = (sp.lon - center[0]) * M_LON, py = (sp.lat - center[1]) * M_LAT;
    var dist = Math.hypot(px, py), phi = Math.atan2(py, px);
    if (dist > ORBIT_R + 1) {
      var al = Math.acos(Math.min(1, ORBIT_R / dist));
      var candidates = [phi + al, phi - al], best = null;
      for (var i = 0; i < candidates.length; i++) {
        var th = candidates[i];
        var p = orbitPoint(center, th);
        var vx = (p[0] - sp.lon) * M_LON, vy = (p[1] - sp.lat) * M_LAT;
        var tx = -Math.sin(th), ty = Math.cos(th);
        var dot = vx * tx + vy * ty;
        if (!best || dot > best.dot) best = { phase: th, point: p, dot: dot, tangent: [tx, ty], mode: "tangent" };
      }
      return best;
    }
    return { phase: phi, point: orbitPoint(center, phi), mode: "spiral" };
  }
  function spiralPos(center, r0, phi, delta, u) {
    var s = u * u * (3 - 2 * u), r = r0 + (ORBIT_R - r0) * s, a = phi + delta * u;
    return [center[0] + (r * Math.cos(a)) / M_LON, center[1] + (r * Math.sin(a)) / M_LAT];
  }
  function spiralDeriv(center, r0, phi, delta, u) {
    var s = u * u * (3 - 2 * u), ds = 6 * u * (1 - u);
    var r = r0 + (ORBIT_R - r0) * s, dr = (ORBIT_R - r0) * ds, a = phi + delta * u;
    return [dr * Math.cos(a) - r * delta * Math.sin(a), dr * Math.sin(a) + r * delta * Math.cos(a)];
  }
  function hermite(a, b, m0, m1, u) {
    var u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * b + (u3 - u2) * m1;
  }
  function hermiteDeriv(a, b, m0, m1, u) {
    var u2 = u * u;
    return (6 * u2 - 6 * u) * a + (3 * u2 - 4 * u + 1) * m0 + (-6 * u2 + 6 * u) * b + (3 * u2 - 2 * u) * m1;
  }
  function circleTrack(center, phase) {
    var track = [];
    for (var n = 0; n <= 64; n++) track.push(orbitPoint(center, phase + (n / 64) * Math.PI * 2));
    return track;
  }
  function spiralEntry(sp, center, endPhase) {
    var r0 = Math.hypot((sp.lon - center[0]) * M_LON, (sp.lat - center[1]) * M_LAT);
    var phi0 = Math.atan2((sp.lat - center[1]) * M_LAT, (sp.lon - center[0]) * M_LON);
    var delta = endPhase - phi0;
    while (delta <= 0) delta += Math.PI * 2;
    var len = 0, prev = [sp.lon, sp.lat];
    for (var q = 1; q <= 64; q++) {
      var cp = spiralPos(center, r0, phi0, delta, q / 64);
      len += Math.hypot((cp[0] - prev[0]) * M_LON, (cp[1] - prev[1]) * M_LAT);
      prev = cp;
    }
    var phase = phi0 + delta;
    return { mode: "spiral", phase: phase, start: sp, startPhase: phi0, r0: r0, delta: delta, tTrans: len / V, arrive: T_REASSIGN + len / V, track: circleTrack(center, phase) };
  }
  function hermiteEntry(sp, center, endPhase) {
    var r0 = Math.hypot((sp.lon - center[0]) * M_LON, (sp.lat - center[1]) * M_LAT);
    var phi0 = Math.atan2((sp.lat - center[1]) * M_LAT, (sp.lon - center[0]) * M_LON);
    var phi1 = endPhase;
    while (phi1 <= phi0) phi1 += Math.PI * 2;
    var target = orbitPoint(center, phi1);
    var chord = Math.hypot((target[0] - sp.lon) * M_LON, (target[1] - sp.lat) * M_LAT);
    var h0 = (sp.r || 0) * Math.PI / 180;
    var dur = Math.max(20, chord / V * 1.4);
    var dr0 = 0, dth0 = 0, dr1 = 0, dth1 = 0;
    for (var it = 0; it < 4; it++) {
      dr0 = V * dur * Math.sin(h0 + phi0);
      dth0 = V * dur * Math.cos(h0 + phi0) / r0;
      dr1 = 0;
      dth1 = V * dur / ORBIT_R;
      var len = 0, prev = null;
      for (var q = 1; q <= 64; q++) {
        var u = q / 64;
        var rr = hermite(r0, ORBIT_R, dr0, dr1, u);
        var aa = hermite(phi0, phi1, dth0, dth1, u);
        var pp = [center[0] + (rr * Math.cos(aa)) / M_LON, center[1] + (rr * Math.sin(aa)) / M_LAT];
        if (prev) len += Math.hypot((pp[0] - prev[0]) * M_LON, (pp[1] - prev[1]) * M_LAT);
        prev = pp;
      }
      dur = Math.max(20, len / V);
    }
    return { mode: "hermite", phase: phi1, start: sp, r0: r0, phi0: phi0, phi1: phi1, dr0: dr0, dth0: dth0, dr1: dr1, dth1: dth1, tTrans: dur, arrive: T_REASSIGN + dur, track: circleTrack(center, phi1) };
  }
  function attachOrbit(d, center, no, data) {
    data.center = center;
    data.no = no;
    d.orbit = data;
    ORBIT_DRONES.push(d);
  }
  var ORBIT_GROUPS = [
    { suspect: SUSPECTS[0], ks: [13, 14] },
    { suspect: SUSPECTS[1], ks: [16, 17] }
  ];
  var ORBIT_DRONES = [];
  ORBIT_GROUPS.forEach(function (g) {
    var refD = null, otherD = null;
    for (var j = 0; j < D.length; j++) {
      if (D[j].type !== "blue") continue;
      if (D[j].k === g.ks[0]) refD = D[j];
      if (D[j].k === g.ks[1]) otherD = D[j];
    }
    if (!refD || !otherD) return;
    var refSp = basePosOf(refD, T_REASSIGN);
    var refEnt = tangentEntry(refSp, g.suspect.center);
    var refPhase = refEnt.phase;
    if (refEnt.mode === "tangent") {
      var rdx = (refEnt.point[0] - refSp.lon) * M_LON, rdy = (refEnt.point[1] - refSp.lat) * M_LAT;
      attachOrbit(refD, g.suspect.center, g.suspect.no, {
        mode: "tangent", phase: refPhase, start: refSp, point: refEnt.point, tangent: refEnt.tangent,
        tTrans: Math.hypot(rdx, rdy) / V, arrive: T_REASSIGN + Math.hypot(rdx, rdy) / V, track: circleTrack(g.suspect.center, refPhase)
      });
    } else {
      attachOrbit(refD, g.suspect.center, g.suspect.no, spiralEntry(refSp, g.suspect.center, refPhase));
    }
    var otherPhase = refPhase + Math.PI;
    var otherSp = basePosOf(otherD, T_REASSIGN);
    var otherR = Math.hypot((otherSp.lon - g.suspect.center[0]) * M_LON, (otherSp.lat - g.suspect.center[1]) * M_LAT);
    var otherData = otherR > ORBIT_R + 1 ? hermiteEntry(otherSp, g.suspect.center, otherPhase) : spiralEntry(otherSp, g.suspect.center, otherPhase);
    attachOrbit(otherD, g.suspect.center, g.suspect.no, otherData);
    var early = refD.orbit.arrive <= otherD.orbit.arrive ? refD : otherD;
    var late = early === refD ? otherD : refD;
    var gap = late.orbit.arrive - early.orbit.arrive;
    var slowW = ORBIT_W * 0.45, fastW = ORBIT_W * 0.9;
    var lock = late.orbit.arrive + (slowW * gap) / (fastW - slowW);
    early.orbit.omegaBefore = slowW;
    late.orbit.omegaBefore = fastW;
    early.orbit.lockTime = lock;
    late.orbit.lockTime = lock;
  });
  function orbitAngleAt(o, t) {
    if (t < o.lockTime) return o.phase + (t - o.arrive) * o.omegaBefore;
    var lockPhase = o.phase + (o.lockTime - o.arrive) * o.omegaBefore;
    return lockPhase + (t - o.lockTime) * ORBIT_W;
  }
  var ATTACK_NUMBERS = { 17: true, 14: true };
  function attackDrone(no) {
    for (var i = 0; i < D.length; i++) if (D[i].type === "blue" && D[i].k === no - 1) return D[i];
    return null;
  }
  function startAttack(no, t, centerOverride) {
    var d = attackDrone(no);
    if (!d || (!d.orbit && !d.track3)) return;
    var o = d.orbit || null;
    var t0 = Math.max(T_REASSIGN, t);
    var c = centerOverride || (o ? o.center : target003Pos(t0));
    var p0 = posOf(d, t0);
    var a = o ? orbitAngleAt(o, t0) : 0;
    var tan0 = d.track3 ? target003Tangent(t0) : null;
    var tx = tan0 ? tan0[0] : -Math.sin(a), ty = tan0 ? tan0[1] : Math.cos(a);
    var P0 = [p0.lon, p0.lat], P1, P2;
    if (d.track3) {
      var dxc = (c[0] - p0.lon) * M_LON, dyc = (c[1] - p0.lat) * M_LAT;
      var len = Math.max(1, Math.hypot(dxc, dyc));
      var h0 = (p0.r || 0) * Math.PI / 180;
      var sx = Math.sin(h0), sy = Math.cos(h0);
      var te = target003Tangent(t0 + 27);
      P1 = [p0.lon + (sx * len * 0.32) / M_LON, p0.lat + (sy * len * 0.32) / M_LAT];
      P2 = [c[0] - (te[0] * len * 0.32) / M_LON, c[1] - (te[1] * len * 0.32) / M_LAT];
    } else {
      P1 = [P0[0] + (tx * 1400) / M_LON, P0[1] + (ty * 1400) / M_LAT];
      var vx = (p0.lon - c[0]) * M_LON, vy = (p0.lat - c[1]) * M_LAT;
      var vd = Math.max(1, Math.hypot(vx, vy));
      P2 = [c[0] + (vx / vd * 600) / M_LON, c[1] + (vy / vd * 600) / M_LAT];
    }
    var outAngle = Math.atan2((c[0]-P2[0])*M_LON, (c[1]-P2[1])*M_LAT);
    d.attack = { t0: t0, tHit: t0 + 27, tGone: Infinity, center: c, P0: P0, P1: P1, P2: P2, P3: [c[0], c[1]], outAngle: outAngle };
  }
  function endAttack(no, t) {
    var d = attackDrone(no);
    if (d && d.attack) d.attack.tGone = (t == null ? 0 : t);
  }
  function resetAttack(no) {
    var d = attackDrone(no);
    if (d) d.attack = null;
  }
  function resetAttacks() {
    for (var i = 0; i < D.length; i++) D[i].attack = null;
  }
  var T_REPLAN = T_REASSIGN + 0.1; /* start the six-UAV replan immediately after the 002 allocation message */
  var T_REPLAN2 = 4392.33; /* second replan: 60s after the last video ends */
  var PHOTO2 = [];
  (function () {
    var strip = 20000 / 6;
    for (var i = 0; i < 6; i++) {
      var cx = POT2[0] + ((i - 2.5) * strip) / M_LON;
      var x1 = cx - 1000 / M_LON, x2 = cx + 1000 / M_LON;
      var y0 = POT2[1] - 10000 / M_LAT, y1 = POT2[1] + 10000 / M_LAT;
      PHOTO2.push(poly([[x1, y0], [x1, y1], [x2, y1], [x2, y0], [x1, y0]]));
    }
  })();
  var PHOTO2_DRONES = D.filter(function (d) {
    return d.type === "blue" && d.k >= 10 && d.k !== 13 && d.k !== 14 && d.k !== 16 && d.k !== 17;
  });
  PHOTO2_DRONES.forEach(function (d, i) {
    var P = PHOTO2[i];
    var sp = basePosOf(d, T_REPLAN);
    var p0 = at(P, 0);
    var dx = (p0.lon - sp.lon) * M_LON, dy = (p0.lat - sp.lat) * M_LAT;
    var dist = Math.hypot(dx, dy);
    d.replan = { path: P, start: sp, tTrans: dist / V, tOn: T_REPLAN + dist / V };
  });
  var PHOTO2B = [];
  (function () {
    var strip = 20000 / 4;
    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < 4; col++) {
        var cx = POT2[0] + ((col - 1.5) * strip) / M_LON;
        var x1 = cx - 1600 / M_LON, x2 = cx + 1600 / M_LON;
        var y0 = POT2[1] + (row ? 0 : -10000) / M_LAT;
        var y1 = POT2[1] + (row ? 10000 : 0) / M_LAT;
        PHOTO2B.push(poly([[x1, y0], [x1, y1], [x2, y1], [x2, y0], [x1, y0]]));
      }
    }
  })();
  var PHOTO2B_DRONES = D.filter(function (d) {
    return d.type === "blue" && d.k >= 10 && d.k !== 13 && d.k !== 16;
  });
  PHOTO2B_DRONES.forEach(function (d, i) {
    var P = PHOTO2B[i];
    var sp = posOf(d, T_REPLAN2);
    var p0 = at(P, 0);
    var dx = (p0.lon - sp.lon) * M_LON, dy = (p0.lat - sp.lat) * M_LAT;
    var dist = Math.hypot(dx, dy);
    d.replan2 = { path: P, start: sp, tTrans: dist / V, tOn: T_REPLAN2 + dist / V };
  });
  var T003_ASSIGN = 4505.00;
  var T003_TRACK_ARRIVE = 4600.00;
  var T003_ORBIT_START = 4806.00;
  var T003_TRACK_DIST = 2000;
  var T003_ORBIT_R = 2000;
  var T003_MOVE_START = 4500.00;
  var T003_HIT = 4805.00;
  var T003_MOVE_STOP = 4805.00;
  var T003_SPEED = 90 / 3.6;
  var T003_PATH = [[113.87000,39.69000],[113.88400,39.70200],[113.90000,39.71600],[113.91800,39.73400],[113.93800,39.74600]];
  var T003_SEG = [], T003_LEN = 0;
  for (var ti = 1; ti < T003_PATH.length; ti++) {
    var pdx = (T003_PATH[ti][0] - T003_PATH[ti-1][0]) * M_LON;
    var pdy = (T003_PATH[ti][1] - T003_PATH[ti-1][1]) * M_LAT;
    var plen = Math.hypot(pdx, pdy);
    T003_SEG.push({ i: ti-1, len: plen, acc: T003_LEN });
    T003_LEN += plen;
  }
  function crv(a,b,c,d,u){var u2=u*u,u3=u2*u;return 0.5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u2+(-a+3*b-3*c+d)*u3);}
  function target003Pos(t) {
    var dt = Math.max(0, Math.min(t, T003_MOVE_STOP) - T003_MOVE_START);
    var dist = Math.min(T003_SPEED * dt, T003_LEN);
    var seg = T003_SEG[T003_SEG.length-1];
    for (var i = 0; i < T003_SEG.length; i++) { if (dist <= T003_SEG[i].acc + T003_SEG[i].len) { seg = T003_SEG[i]; break; } }
    var u = Math.max(0, Math.min(1, (dist - seg.acc) / Math.max(1e-6, seg.len)));
    var i0 = Math.max(0, seg.i-1), i1 = seg.i, i2 = Math.min(T003_PATH.length-1, seg.i+1), i3 = Math.min(T003_PATH.length-1, seg.i+2);
    var p0=T003_PATH[i0],p1=T003_PATH[i1],p2=T003_PATH[i2],p3=T003_PATH[i3];
    return [crv(p0[0],p1[0],p2[0],p3[0],u), crv(p0[1],p1[1],p2[1],p3[1],u)];
  }
  function target003Tangent(t) {
    var p1 = target003Pos(Math.max(0,t-0.5)), p2 = target003Pos(Math.min(T003_MOVE_STOP,t+0.5));
    var dx=(p2[0]-p1[0])*M_LON, dy=(p2[1]-p1[1])*M_LAT, d=Math.hypot(dx,dy)||1;
    return [dx/d, dy/d];
  }
  function pickNearest003(center, t, count) {
    var list = [];
    for (var i = 0; i < D.length; i++) {
      var d = D[i];
      if (d.type !== "blue" || d.k >= 10) continue;
      var p = posOf(d, t);
      var dx = (p.lon - center[0]) * M_LON, dy = (p.lat - center[1]) * M_LAT;
      list.push({ no: d.k + 1, dist: Math.hypot(dx, dy) });
    }
    list.sort(function (a, b) { return a.dist - b.dist; });
    return list.slice(0, count).map(function (x) { return x.no; });
  }
  function resetTracking() { for (var i = 0; i < D.length; i++) D[i].track3 = null; }
  function assignTracking(no, t, side) {
    var d = attackDrone(no);
    if (!d) return;
    var tanp = target003Tangent(T003_ORBIT_START);
    var basePhase = Math.atan2(tanp[0], -tanp[1]);
    d.track3 = { side: side, start: basePosOf(d, t), tTrans: Math.max(1e-6, T003_TRACK_ARRIVE - t), orbitPhase: basePhase + (side > 0 ? 0 : Math.PI) };
  }
  function assign003(attackNo, reconNo, t) {
    resetTracking();
    assignTracking(attackNo, t, 1);
    assignTracking(reconNo, t, -1);
  }
  function track3Point(d, t) {
    var tr = d.track3, aim = target003Pos(t), tan = target003Tangent(t);
    var nx = -tan[1], ny = tan[0];
    var standX = (tr.side * nx * T003_TRACK_DIST) / M_LON;
    var standY = (tr.side * ny * T003_TRACK_DIST) / M_LAT;
    var ex = aim[0] + standX, ey = aim[1] + standY;
    if (t < T003_TRACK_ARRIVE) {
      var u = Math.max(0, Math.min(1, (t - T003_ASSIGN) / Math.max(1e-6, tr.tTrans)));
      u = u * u * (3 - 2 * u);
      return [tr.start.lon + (ex - tr.start.lon) * u, tr.start.lat + (ey - tr.start.lat) * u];
    }
    if (t < T003_ORBIT_START) return [ex, ey];
    if (tr.orbitPhase == null) {
      var tanp = target003Tangent(T003_ORBIT_START);
      tr.orbitPhase = Math.atan2(tr.side * tanp[0], tr.side * (-tanp[1]));
    }
    var a = tr.orbitPhase + (t - T003_ORBIT_START) * ORBIT_W;
    return [aim[0] + (T003_ORBIT_R * Math.cos(a)) / M_LON,
            aim[1] + (T003_ORBIT_R * Math.sin(a)) / M_LAT];
  }
  function track3Heading(d, t) {
    var p1 = track3Point(d, Math.max(T003_ASSIGN, t - 0.5));
    var p2 = track3Point(d, t + 0.5);
    return Math.atan2((p2[0] - p1[0]) * M_LON, (p2[1] - p1[1]) * M_LAT) * 180 / Math.PI;
  }
  function posOf(d, t) {
    if (d.attack && t >= d.attack.t0) {
      var atk = d.attack;
      if (d.track3 && t >= atk.tHit) {
        return { lon: atk.P3[0], lat: atk.P3[1], r: atk.outAngle * 180 / Math.PI };
      }
      var u = Math.max(0, Math.min(1, (t - atk.t0) / 27));
      var v = 1 - u;
      var lon = v*v*v*atk.P0[0] + 3*v*v*u*atk.P1[0] + 3*v*u*u*atk.P2[0] + u*u*u*atk.P3[0];
      var lat = v*v*v*atk.P0[1] + 3*v*v*u*atk.P1[1] + 3*v*u*u*atk.P2[1] + u*u*u*atk.P3[1];
      var dx = 3*v*v*(atk.P1[0]-atk.P0[0]) + 6*v*u*(atk.P2[0]-atk.P1[0]) + 3*u*u*(atk.P3[0]-atk.P2[0]);
      var dy = 3*v*v*(atk.P1[1]-atk.P0[1]) + 6*v*u*(atk.P2[1]-atk.P1[1]) + 3*u*u*(atk.P3[1]-atk.P2[1]);
      return { lon: lon, lat: lat, r: Math.atan2(dx, dy) * 180 / Math.PI };
    }
    if (d.track3 && t >= T003_ASSIGN) {
      var p3t = track3Point(d, t);
      return { lon: p3t[0], lat: p3t[1], r: track3Heading(d, t) };
    }
    if (d.replan2 && t >= T_REPLAN2) {
      var rp2 = d.replan2;
      if (t < rp2.tOn) {
        var f3 = (t - T_REPLAN2) / Math.max(1e-6, rp2.tTrans);
        var q0 = at(rp2.path, 0);
        var dx3 = (q0.lon - rp2.start.lon) * M_LON;
        var dy3 = (q0.lat - rp2.start.lat) * M_LAT;
        return {
          lon: rp2.start.lon + (q0.lon - rp2.start.lon) * f3,
          lat: rp2.start.lat + (q0.lat - rp2.start.lat) * f3,
          r: Math.atan2(dx3, dy3) * 180 / Math.PI
        };
      }
      var q2 = at(rp2.path, (t - rp2.tOn) * V);
      return { lon: q2.lon, lat: q2.lat, r: rotOf(q2) };
    }
    if (d.orbit && t >= T_REASSIGN) {
      var o = d.orbit;
      if (t < o.arrive) {
        var u = Math.max(0, Math.min(1, (t - T_REASSIGN) / Math.max(1e-6, o.tTrans)));
        if (o.mode === "tangent") {
          return {
            lon: o.start.lon + (o.point[0] - o.start.lon) * u,
            lat: o.start.lat + (o.point[1] - o.start.lat) * u,
            r: Math.atan2(o.tangent[0], o.tangent[1]) * 180 / Math.PI
          };
        }
        if (o.mode === "spiral") {
          var cp = spiralPos(o.center, o.r0, o.startPhase, o.delta, u);
          var dv = spiralDeriv(o.center, o.r0, o.startPhase, o.delta, u);
          return { lon: cp[0], lat: cp[1], r: Math.atan2(dv[0], dv[1]) * 180 / Math.PI };
        }
        var rr = hermite(o.r0, ORBIT_R, o.dr0, o.dr1, u);
        var aa = hermite(o.phi0, o.phi1, o.dth0, o.dth1, u);
        var dr = hermiteDeriv(o.r0, ORBIT_R, o.dr0, o.dr1, u);
        var da = hermiteDeriv(o.phi0, o.phi1, o.dth0, o.dth1, u);
        var vx = dr * Math.cos(aa) - rr * da * Math.sin(aa);
        var vy = dr * Math.sin(aa) + rr * da * Math.cos(aa);
        return {
          lon: o.center[0] + (rr * Math.cos(aa)) / M_LON,
          lat: o.center[1] + (rr * Math.sin(aa)) / M_LAT,
          r: Math.atan2(vx, vy) * 180 / Math.PI
        };
      }
      var a2;
      if (t < o.lockTime) {
        a2 = o.phase + (t - o.arrive) * o.omegaBefore;
      } else {
        var lockPhase = o.phase + (o.lockTime - o.arrive) * o.omegaBefore;
        a2 = lockPhase + (t - o.lockTime) * ORBIT_W;
      }
      return {
        lon: o.center[0] + (ORBIT_R * Math.cos(a2)) / M_LON,
        lat: o.center[1] + (ORBIT_R * Math.sin(a2)) / M_LAT,
        r: Math.atan2(-Math.sin(a2), Math.cos(a2)) * 180 / Math.PI
      };
    }
    if (d.replan && t >= T_REPLAN) {
      var rp = d.replan;
      if (t < rp.tOn) {
        var f2 = (t - T_REPLAN) / Math.max(1e-6, rp.tTrans);
        var p0 = at(rp.path, 0);
        var dx2 = (p0.lon - rp.start.lon) * M_LON;
        var dy2 = (p0.lat - rp.start.lat) * M_LAT;
        return {
          lon: rp.start.lon + (p0.lon - rp.start.lon) * f2,
          lat: rp.start.lat + (p0.lat - rp.start.lat) * f2,
          r: Math.atan2(dx2, dy2) * 180 / Math.PI
        };
      }
      var o2 = at(rp.path, (t - rp.tOn) * V);
      return { lon: o2.lon, lat: o2.lat, r: rotOf(o2) };
    }
    return basePosOf(d, t);
  }
  function simulate(t) {
    t = Math.max(0, Math.min(TOTAL, t));
    var out = [];
    for (var i = 0; i < D.length; i++) {
      var d = D[i];
      if (d.attack && d.attack.tGone !== Infinity && t >= d.attack.tGone) continue;
      var p = posOf(d, t), trail = [];
      for (var h = HIST_N; h >= 0; h--) {
        var tt = t - h * HIST_DT;
        if (tt < 0) continue;
        if (d.replan && t >= T_REPLAN && tt < T_REPLAN) continue;
        if (d.replan2 && t >= T_REPLAN2 && tt < T_REPLAN2) continue;
        var q = posOf(d, tt);
        trail.push([+q.lon.toFixed(5), +q.lat.toFixed(5)]);
      }
      out.push({ type: d.type, lon: +p.lon.toFixed(5), lat: +p.lat.toFixed(5), r: Math.round(p.r || 0), trail: trail.length > 1 ? trail : [] });
    }
    return out;
  }
  /* ---------- 光电：60 度环形扇区（内 2km / 外 2.8km）+ 10 度每秒的扫描条带 ---------- */
  var SCAN = { r0: 2000, r1: 2800, half: Math.PI / 6, seg: 10, rate: 10, fade: 0.6 };
  function scanOf(p, t, tOn, aim) {
    var hd = aim ? Math.atan2((aim[0] - p.lon) * M_LON, (aim[1] - p.lat) * M_LAT) : (p.r || 0) * Math.PI / 180;
    function pt(dm, rel) {                            /* dm 米；rel 相对机头的角（弧度） */
      var an = hd + rel;
      return [+(p.lon + (dm * Math.sin(an)) / M_LON).toFixed(5),
              +(p.lat + (dm * Math.cos(an)) / M_LAT).toFixed(5)];
    }
    var quad = [], i, rel;
    for (i = 0; i <= SCAN.seg; i++) {                 /* 外弧：-30° → +30° */
      rel = -SCAN.half + 2 * SCAN.half * (i / SCAN.seg);
      quad.push(pt(SCAN.r1, rel));
    }
    for (i = SCAN.seg; i >= 0; i--) {                 /* 内弧：+30° → -30° */
      rel = -SCAN.half + 2 * SCAN.half * (i / SCAN.seg);
      quad.push(pt(SCAN.r0, rel));
    }
    quad.push(quad[0]);
    /* 扫描条带：内径→外径的径向连线，从左边缘扫到右边缘，10°/s，单程 6 秒 */
    var el = Math.max(0, t - tOn);
    var sw = -SCAN.half + 2 * SCAN.half * (((el * SCAN.rate) / 60) % 1);
    var k = Math.max(0, Math.min(1, el / SCAN.fade));
    return { quad: quad, rays: [], sweep: [pt(SCAN.r0, sw), pt(SCAN.r1, sw)], k: +k.toFixed(3) };
  }
  function scans(t) {
    var out = [];
    for (var i = 0; i < D.length; i++) {
      var d = D[i];
      if (d.type !== "blue" || !d.path || t < (d.tStart || 0)) continue;
      if (d.attack && d.attack.tGone !== Infinity && t >= d.attack.tGone) continue;
      var p = posOf(d, t);
      var aim = (d.orbit && t >= T_REASSIGN && !(d.replan2 && t >= T_REPLAN2)) ? d.orbit.center : (d.track3 && t >= T003_ASSIGN ? target003Pos(t) : null);
      out.push(scanOf(p, t, d.tStart, aim));
    }
    return out;
  }
  /* ---------- 雷达 GMTI：90 度环形扇区覆盖区（内径 2km / 外径 35km，朝向固定正北，无扫描） ---------- */
  var FAN = {
    radar: { r0: 2000, r1: 35000 },
    jam:   { r0: 1000, r1: 30000 },
    half: Math.PI / 4, seg: 28, fade: 0.6
  };
  function fanOf(p, t, tOn, R0, R1) {
    var hd = (p.r || 0) * Math.PI / 180;      /* 机头方位：扇形中轴对正机头 */
    var pts = [], i, th, an;
    for (i = 0; i <= FAN.seg; i++) {          /* 外弧：机头 -45° → +45° */
      th = -FAN.half + (2 * FAN.half) * (i / FAN.seg);
      an = hd + th;
      pts.push([+(p.lon + (R1 * Math.sin(an)) / M_LON).toFixed(5),
                +(p.lat + (R1 * Math.cos(an)) / M_LAT).toFixed(5)]);
    }
    for (i = FAN.seg - 1; i >= 1; i--) {      /* 内弧：机头 +45° → -45° */
      th = -FAN.half + (2 * FAN.half) * (i / FAN.seg);
      an = hd + th;
      pts.push([+(p.lon + (R0 * Math.sin(an)) / M_LON).toFixed(5),
                +(p.lat + (R0 * Math.cos(an)) / M_LAT).toFixed(5)]);
    }
    pts.push(pts[0]);
    var k = Math.max(0, Math.min(1, (t - tOn) / FAN.fade));
    return { quad: pts, k: +k.toFixed(3) };
  }
  function fans(t) {
    var out = [];
    for (var i = 0; i < D.length; i++) {
      var d = D[i];
      if (!d.path || t < (d.tStart || 0)) continue;
      if (d.radar && !d.sar) {                      /* 雷达 GMTI：2~35km */
        out.push(Object.assign(fanOf(posOf(d, t), t, d.tStart, FAN.radar.r0, FAN.radar.r1), { kind: "radar" }));
      } else if (d.jam) {                            /* 电子干扰：1~30km */
        out.push(Object.assign(fanOf(posOf(d, t), t, d.tStart, FAN.jam.r0, FAN.jam.r1), { kind: "jam" }));
      }
    }
    return out;
  }
  /* 规划航迹统一从那"第一架进入任务区"的时刻开始画 */
  var MISSION = { w: 113.62960, e: 114.56639, s: 39.51435, n: 40.25096 };
  function inMission(p) { return p.lon > MISSION.w && p.lon < MISSION.e && p.lat > MISSION.s && p.lat < MISSION.n; }
  var T_TRACKS = (function () {
    for (var tt = TJOIN; tt <= TOTAL; tt += 5) {
      for (var i = 0; i < D.length; i++) if (inMission(posOf(D[i], tt))) return tt;
    }
    return 0;
  })();
  /* ---------- SAR：始终指向疑似区中心的地面扫描条带（地距 8~10km，条带宽 100m） ---------- */
  var SARB = { near: 8000, far: 10000, width: 100, fade: 0.6 };
  function sarBeamOf(p, t, tOn) {
    var hd = (p.r || 0) * Math.PI / 180;
    if (Math.abs(Math.cos(hd)) < 0.5) return null;   /* 东西向的连接段/回程：侧视不成立，不画 */
    var ux = -1, uy = 0;                             /* 固定朝正西（垂直南北航向） */
    var nx = 0, ny = 1;
    function pt(dist, off) {
      return [+(p.lon + (ux * dist + nx * off) / M_LON).toFixed(5),
              +(p.lat + (uy * dist + ny * off) / M_LAT).toFixed(5)];
    }
    var kn = Math.max(0, Math.min(1, (t - tOn) / SARB.fade));
    return {
      band: [pt(SARB.near, 0), pt(SARB.far, 0)],
      ends: [pt(SARB.near, 0), pt(SARB.far, 0)],
      rays: [[[p.lon, p.lat], pt(SARB.near, -SARB.width / 2)],
             [[p.lon, p.lat], pt(SARB.far, SARB.width / 2)]],
      k: +kn.toFixed(3)
    };
  }
  function sarScans(t) {
    var out = [];
    for (var i = 0; i < D.length; i++) {
      var d = D[i];
      if (!d.sar || !d.path || t < (d.tStart || 0)) continue;
      var b = sarBeamOf(posOf(d, t), t, d.tStart);
      if (b) out.push(b);
    }
    return out;
  }
  /* ---------- 覆盖进度：把两个疑似区划成 2km 网格，算每格"首次被各类传感器扫到"的时刻 ---------- */
  var COV = { cell: 500, step: 30, cache: null, cacheT: -1 };
  (function () {
    var half = COV.cell / 2;
    var hx = half / M_LON, hy = half / M_LAT;
    var cells = [];
    [POT1, POT2].forEach(function (c, zi) {
      for (var i = 0; i < 40; i++) for (var j = 0; j < 40; j++) {
        var lon = c[0] + ((i - 19.5) * COV.cell) / M_LON;
        var lat = c[1] + ((j - 19.5) * COV.cell) / M_LAT;
        cells.push({
          zone: zi, mx: lon * M_LON, my: lat * M_LAT,
          ring: [[lon - hx, lat - hy], [lon + hx, lat - hy], [lon + hx, lat + hy], [lon - hx, lat + hy], [lon - hx, lat - hy]]
        });
      }
    });
    COV.cells = cells;
    COV.zoneSize = 1600;
    var kinds = { photo: [], gmti: [], sar: [], ewar: [] };
    D.forEach(function (d) {
      var k = d.type === "blue" ? "photo" : d.type === "red" ? "ewar" : (d.type === "yellow" ? (d.sar ? "sar" : "gmti") : null);
      if (k) kinds[k].push(d);
    });
    var first = {};
    Object.keys(kinds).forEach(function (k) {
      var arr = new Array(cells.length);
      for (var i = 0; i < cells.length; i++) arr[i] = Infinity;
      first[k] = arr;
    });
    var par = {
      photo: { r0: 2000, r1: 2800, cos: Math.cos(Math.PI / 6 + 0.35) },
      gmti:  { r0: 2000, r1: 35000, cos: Math.cos(Math.PI / 4 + 0.2) },
      ewar:  { r0: 1000, r1: 30000, cos: Math.cos(Math.PI / 4 + 0.2) },
      sar:   { r0: 8000, r1: 10000, cos: 0 }
    };
    for (var tt = TJOIN; tt <= TOTAL; tt += COV.step) {
      Object.keys(kinds).forEach(function (k) {
        var pr = par[k], r0e = Math.max(0, pr.r0 - 700), r1e = pr.r1 + 700;
        kinds[k].forEach(function (d) {
          if (tt < (d.tStart || 0)) return;
          if (d.attack && d.attack.tGone !== Infinity && tt >= d.attack.tGone) return;
          var p = posOf(d, tt);
          var hd = (d.orbit && tt >= T_REASSIGN && !(d.replan2 && tt >= T_REPLAN2)) ? Math.atan2((d.orbit.center[1] - p.lat) * M_LAT, (d.orbit.center[0] - p.lon) * M_LON) : (d.track3 && tt >= T003_ASSIGN) ? Math.atan2((target003Pos(tt)[1] - p.lat) * M_LAT, (target003Pos(tt)[0] - p.lon) * M_LON) : (p.r || 0) * Math.PI / 180;
          var fx = Math.sin(hd), fy = Math.cos(hd);
          var px = p.lon * M_LON, py = p.lat * M_LAT;
          var arr = first[k];
          var ciStart = 0, ciEnd = cells.length;
          if (k === "ewar") { ciStart = COV.zoneSize; }
          else if (k === "gmti" || k === "sar") { ciEnd = COV.zoneSize; }
          for (var ci = ciStart; ci < ciEnd; ci++) {
            if (arr[ci] <= tt) continue;
            var dx = cells[ci].mx - px, dy = cells[ci].my - py;
            if (dx > r1e || dx < -r1e || dy > r1e || dy < -r1e) continue;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < r0e || dist > r1e) continue;
            if (k === "sar") {
              if (dx >= 0 || Math.abs(dx) < dist * 0.80 || Math.abs(dy) > 1100) continue;
            } else if ((dx * fx + dy * fy) / dist < pr.cos) continue;
            arr[ci] = tt;
          }
        });
      });
    }
    COV.first = first;
    var afterPhoto = new Array(cells.length);
    for (var ai = 0; ai < cells.length; ai++) afterPhoto[ai] = Infinity;
    var ppr = par.photo, pr0 = Math.max(0, ppr.r0 - 700), pr1 = ppr.r1 + 700;
    for (var at = T_REPLAN; at <= TOTAL; at += COV.step) {
      kinds.photo.forEach(function (d) {
        if (at < (d.tStart || 0)) return;
        if (d.attack && d.attack.tGone !== Infinity && at >= d.attack.tGone) return;
        var p = posOf(d, at);
        var hd = (d.orbit && at >= T_REASSIGN && !(d.replan2 && at >= T_REPLAN2)) ? Math.atan2((d.orbit.center[1] - p.lat) * M_LAT, (d.orbit.center[0] - p.lon) * M_LON) : (d.track3 && at >= T003_ASSIGN) ? Math.atan2((target003Pos(at)[1] - p.lat) * M_LAT, (target003Pos(at)[0] - p.lon) * M_LON) : (p.r || 0) * Math.PI / 180;
        var fx = Math.sin(hd), fy = Math.cos(hd);
        var px = p.lon * M_LON, py = p.lat * M_LAT;
        for (var ci = 0; ci < cells.length; ci++) {
          if (afterPhoto[ci] <= at) continue;
          var dx = cells[ci].mx - px, dy = cells[ci].my - py;
          if (dx > pr1 || dx < -pr1 || dy > pr1 || dy < -pr1) continue;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < pr0 || dist > pr1) continue;
          if ((dx * fx + dy * fy) / dist < ppr.cos) continue;
          afterPhoto[ci] = at;
        }
      });
    }
    COV.afterPhoto = afterPhoto;
    var afterPhoto2 = new Array(cells.length);
    for (var ai2 = 0; ai2 < cells.length; ai2++) afterPhoto2[ai2] = Infinity;
    var ppr2 = par.photo, pr0b = Math.max(0, ppr2.r0 - 700), pr1b = ppr2.r1 + 700;
    for (var at2 = T_REPLAN2; at2 <= TOTAL; at2 += COV.step) {
      kinds.photo.forEach(function (d) {
        if (at2 < (d.tStart || 0)) return;
        if (d.attack && d.attack.tGone !== Infinity && at2 >= d.attack.tGone) return;
        var p = posOf(d, at2);
        var hd = (d.orbit && at2 >= T_REASSIGN && !(d.replan2 && at2 >= T_REPLAN2)) ? Math.atan2((d.orbit.center[1] - p.lat) * M_LAT, (d.orbit.center[0] - p.lon) * M_LON) : (d.track3 && at2 >= T003_ASSIGN) ? Math.atan2((target003Pos(at2)[1] - p.lat) * M_LAT, (target003Pos(at2)[0] - p.lon) * M_LON) : (p.r || 0) * Math.PI / 180;
        var fx = Math.sin(hd), fy = Math.cos(hd);
        var px = p.lon * M_LON, py = p.lat * M_LAT;
        for (var ci = 0; ci < cells.length; ci++) {
          if (afterPhoto2[ci] <= at2) continue;
          var dx = cells[ci].mx - px, dy = cells[ci].my - py;
          if (dx > pr1b || dx < -pr1b || dy > pr1b || dy < -pr1b) continue;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < pr0b || dist > pr1b) continue;
          if ((dx * fx + dy * fy) / dist < ppr2.cos) continue;
          afterPhoto2[ci] = at2;
        }
      });
    }
    COV.afterPhoto2 = afterPhoto2;
  })();
  function coverage(t) {
    var b = (t < T_REPLAN ? 0 : t < T_REPLAN2 ? 100000 : 200000) + Math.floor(t / COV.step);
    if (COV.cache && COV.cacheT === b) return COV.cache;
    var out = {};
    Object.keys(COV.first).forEach(function (k) {
      var arr = [], f = COV.first[k], af = COV.afterPhoto, af2 = COV.afterPhoto2;
      var iStart = 0, iEnd = COV.cells.length;
      if (k === "ewar") iStart = COV.zoneSize;
      else if (k === "gmti" || k === "sar") iEnd = COV.zoneSize;
      for (var i = iStart; i < iEnd; i++) {
        var cell = COV.cells[i];
        if (k === "photo" && cell.zone === 1) {
          var hit = t < T_REPLAN ? f[i] <= t : t < T_REPLAN2 ? af[i] <= t : af2[i] <= t;
          if (hit) arr.push(cell);
        } else if (f[i] <= t) {
          arr.push(cell);
        }
      }
      out[k] = arr;
    });
    COV.cache = out; COV.cacheT = b;
    return out;
  }
  function tracks(t) {
    var o = [];
    if (t < T_TRACKS) return o;
    for (var i = 0; i < D.length; i++) {
      var d = D[i];
      if (d.attack && d.attack.tGone !== Infinity && t >= d.attack.tGone) continue;
      if (d.track3 && t >= T003_ORBIT_START) {
        o.push({ type: d.type, pts: circleTrack(target003Pos(t), 0).map(function (p) { return [+p[0].toFixed(5), +p[1].toFixed(5)]; }) });
        continue;
      }
      if (d.replan2 && t >= T_REPLAN2) {
        o.push({ type: d.type, pts: d.replan2.path.pts.map(function (p) { return [+p[0].toFixed(5), +p[1].toFixed(5)]; }) });
        continue;
      }
      if (d.orbit && t >= T_REASSIGN) {
        o.push({ type: d.type, pts: d.orbit.track.map(function (p) { return [+p[0].toFixed(5), +p[1].toFixed(5)]; }) });
        continue;
      }
      var P = (d.replan && t >= T_REPLAN) ? d.replan.path : d.path;
      if (!P || !P.pts) continue;
      o.push({ type: d.type, pts: P.pts.map(function (p) { return [+p[0].toFixed(5), +p[1].toFixed(5)]; }) });
    }
    return o;
  }
  function phase(t) {
    if (t < T_LIFT) return "集结待命";
    var mn = Math.min.apply(null, TARR);
    if (t < mn) return "编队飞行";
    return "侦察";
  }
  return { TOTAL: TOTAL, V: V, T_LIFT: T_LIFT, T_ARR: TARR, T_REASSIGN: T_REASSIGN, T_REPLAN: T_REPLAN, HIST: HIST_DT * HIST_N, phase: phase, simulate: simulate, tracks: tracks, scans: scans, fans: fans, sarScans: sarScans, coverage: coverage, T_TRACKS: T_TRACKS, T003_ASSIGN: T003_ASSIGN, T003_TRACK_ARRIVE: T003_TRACK_ARRIVE, T003_ORBIT_START: T003_ORBIT_START, target003Pos: target003Pos, target003Tangent: target003Tangent, pickNearest003: pickNearest003, assign003: assign003, resetTracking: resetTracking, startAttack: startAttack, endAttack: endAttack, resetAttack: resetAttack, resetAttacks: resetAttacks };
})();