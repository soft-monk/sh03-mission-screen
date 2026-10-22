/* SH-06 flight sim v5
   - counts: photon 20 / comm 4 / ewar 4 / radar 3 = 31
   - trail: true FIFO history, 1 sample / 5 s, 300 s back (~61 pts)
   - photon: 10 per zone (5 cols x 2 rows of 4x10 km cells), each loops its own cell
   - radar SAR (1): serpentine scan EAST of zone-1, bbox 20x20 km, ping-pong loop
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
  var PHOTO = { A: [], B: [] };
  for (var k = 0; k < 10; k++) {
    var col = k % 5, row = Math.floor(k / 5);
    var wKm = 4000, hKm = 10000;
    PHOTO.A.push(rectLoop(POT1[0] + ((col - 2) * wKm) / M_LON, POT1[1] + (row ? 5000 : -5000) / M_LAT, wKm, hKm));
    PHOTO.B.push(rectLoop(POT2[0] + ((col - 2) * wKm) / M_LON, POT2[1] + (row ? 5000 : -5000) / M_LAT, wKm, hKm));
  }
  var Z_HALF_LON = 10000 / M_LON, Z_HALF_LAT = 10000 / M_LAT;   /* deployed zone half size 10 km */
  /* SAR: serpentine east of zone-1, 4.3 km clear of its east edge, bbox 20 x 20 km */
  var SAR_GAP = 4300, SAR_LEG = 20000;
  var SAR_CX = POT1[0] + Z_HALF_LON + (SAR_LEG/2 + SAR_GAP) / M_LON;
  var SAR_LEGS = 7, SAR_W = 20000;
  var SAR_TRACK = serpentine(SAR_CX, POT1[1], SAR_LEG, SAR_W, SAR_LEGS);
  /* GMTI: E-W race track south of zone-1, 20 km wide x 10 km tall, 4.4 km clear of its south edge */
  var RADAR_GAP = 4400, RADAR_LEG = 3000, RADAR_R = 1500;
  var RADAR_CY = POT1[1] - Z_HALF_LAT - (RADAR_R + RADAR_GAP) / M_LAT;
  var RADAR_TRACK = raceTrackEW([POT1[0], RADAR_CY], RADAR_LEG, RADAR_R, 12);
  /* 电子两条跑道：区域外侧（南），各 8km 直边、2km 半径，左右并排 */
  var JAM_LEG = 2400, JAM_R = 750;
  var JAM_GAP = 2000;                       /* 两条跑道内侧留 2 km 空档 */
  var JAM_OFF = JAM_LEG/2 + JAM_R + JAM_GAP/2;
  var JAM_CY = POT2[1] - Z_HALF_LAT - (JAM_R + 4000) / M_LAT;
  var JAM_TRACK1 = raceTrackEW([POT2[0] - JAM_OFF/M_LON, JAM_CY], JAM_LEG, JAM_R, 10);
  var JAM_TRACK2 = raceTrackEW([POT2[0] + JAM_OFF/M_LON, JAM_CY], JAM_LEG, JAM_R, 10);
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
  for (k = 0; k < 4; k++)  mk("red", k, { route: RT[2], tArr: TARR[2], jam: k < 2 ? JAM_TRACK1 : JAM_TRACK2, half: k % 2 === 1 });
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

  function posOf(d, t) {
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
    if (d.sar) return scanPos(d, t);
    var ph = d.half ? d.path.len / 2 : 0;
    var spd = d.radar ? V * 1.2 : (d.jam ? V * 0.8 : V);
    return onPath(d.path, ph, t, d.tStart, spd);
  }

  function simulate(t) {
    t = Math.max(0, Math.min(TOTAL, t));
    var out = [];
    for (var i = 0; i < D.length; i++) {
      var d = D[i], p = posOf(d, t), trail = [];
      for (var h = HIST_N; h >= 0; h--) {
        var tt = t - h * HIST_DT;
        if (tt < 0) continue;
        var q = posOf(d, tt);
        trail.push([+q.lon.toFixed(5), +q.lat.toFixed(5)]);
      }
      out.push({ type: d.type, lon: +p.lon.toFixed(5), lat: +p.lat.toFixed(5), r: Math.round(p.r || 0), trail: trail.length > 1 ? trail : [] });
    }
    return out;
  }
  /* ---------- 光电：地面扫描投影（上宽下窄等腰梯形 + 4 条连线 + 扫掠线） ---------- */
  var SCAN = { d1: 1200, d2: 5500, w1: 800, w2: 2200, period: 2.4, fade: 0.6 };
  function scanOf(p, t, tOn) {
    var th = (p.r || 0) * Math.PI / 180;
    var fx = Math.sin(th), fy = Math.cos(th);       /* 前（航向） */
    var sx = Math.cos(th), sy = -Math.sin(th);      /* 右 */
    function pt(a, b) {
      return [+(p.lon + (a * fx + b * sx) / M_LON).toFixed(5),
              +(p.lat + (a * fy + b * sy) / M_LAT).toFixed(5)];
    }
    var A = pt(SCAN.d1, -SCAN.w1), B = pt(SCAN.d1, SCAN.w1);
    var C = pt(SCAN.d2, SCAN.w2), D = pt(SCAN.d2, -SCAN.w2);
    var ph = (t / SCAN.period) % 1;
    var u = ph < 0.5 ? ph * 2 : 2 - ph * 2;         /* 近边 → 远边 → 近边 */
    var a = SCAN.d1 + (SCAN.d2 - SCAN.d1) * u;
    var b = SCAN.w1 + (SCAN.w2 - SCAN.w1) * u;
    var k = Math.max(0, Math.min(1, (t - tOn) / SCAN.fade));
    return {
      quad: [A, B, C, D, A],
      rays: [[[p.lon, p.lat], A], [[p.lon, p.lat], B], [[p.lon, p.lat], C], [[p.lon, p.lat], D]],
      sweep: [pt(a, -b), pt(a, b)],
      k: +k.toFixed(3)
    };
  }
  function scans(t) {
    var out = [];
    for (var i = 0; i < D.length; i++) {
      var d = D[i];
      if (d.type !== "blue" || !d.path || t < (d.tStart || 0)) continue;
      out.push(scanOf(posOf(d, t), t, d.tStart));
    }
    return out;
  }
  function tracks(t) {
    var o = [];
    for (var i = 0; i < D.length; i++) {
      var d = D[i], P = d.path;
      if (!P || !P.pts || d.sar) continue;      /* SAR 只要尾迹，不要规划虚线 */
      var tOn = d.relay ? d.relay.tOn : (d.tStart || 0);
      if (t < tOn) continue;
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
  return { TOTAL: TOTAL, V: V, T_LIFT: T_LIFT, T_ARR: TARR, HIST: HIST_DT * HIST_N, phase: phase, simulate: simulate, tracks: tracks, scans: scans };
})();