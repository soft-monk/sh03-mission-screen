/* 场景一 SH-06 飞行仿真
 *
 * 与场景二 js/flight06.js 同构的“时间轴驱动”模型，但数据来自 data/routes-s1.js：
 *   集结区停机位 → 起飞 → 沿编组航线（4 条曲线）编队飞行 → 进入任务区 →
 *   转场到各自规划航路 → 在规划航路上盘旋（闭环绕圈 / SAR 蛇形往返）。
 *
 * 速度恒为 50 m/s；位置只由时间 t 决定（render(t) 唯一真相）。
 * 对外：TOTAL / V / T_LIFT / T_FORM / T_IN / phase(t) / simulate(t)
 */
window.FLIGHT_S1 = (function () {
  var V = 50;                      // m/s
  var T_LIFT = 20;                 // 起飞时刻
  var T_FORM = T_LIFT + 90;        // 编队完成
  var M_LAT = 111030;
  var M_LON = 111320 * Math.cos((24.84 * Math.PI) / 180);

  var RALLY = { lon: 121.3000, lat: 25.1210 };   // 集结区中心（与 scenarios.js 一致）
  var HIST_DT = 5, HIST_N = 60;                  // 尾迹：5 s 一点，保留 300 s

  var ICON = { photo: "blue", sar: "yellow", gmti: "yellow", ewar: "red", comm: "green" };
  var COLOR = { blue: "#38bdf8", yellow: "#facc15", red: "#f87171", green: "#4ade80" };

  /* 任务区（用于覆盖网格与扇区判定） */
  var TA = (window.ROUTES_S1 && window.ROUTES_S1.meta && window.ROUTES_S1.meta.taskArea) ||
           { w: 120.82616, e: 121.22204, s: 24.65562, n: 25.01738 };
  var ACX = (TA.w + TA.e) / 2, ACY = (TA.s + TA.n) / 2;
  var AHX = ((TA.e - TA.w) * M_LON) / 2, AHY = ((TA.n - TA.s) * M_LAT) / 2;

  /* 扫描 / 扇区 / 条带 / 覆盖格（参数与场景二 SH-06 一致） */
  var SCAN = { r0: 2000, r1: 2800, half: Math.PI / 6, seg: 10, rate: 10, fade: 0.6 };
  var FAN = { radar: { r0: 2000, r1: 35000 }, jam: { r0: 1000, r1: 34000 }, half: Math.PI / 4, seg: 28, fade: 0.6 };
  var SARB = { near: 8000, far: 10000, width: 100, fade: 0.6 };  // 西侧侧视（同场景二：地距 8~10km）
  var COV = { cell: 500, step: 10 };

  /* ---------- 折线工具 ---------- */
  function makePath(pts) {
    var seg = [], cum = [0], total = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = (pts[i][0] - pts[i - 1][0]) * M_LON;
      var dy = (pts[i][1] - pts[i - 1][1]) * M_LAT;
      var L = Math.hypot(dx, dy);
      seg.push(L); total += L; cum.push(total);
    }
    return { pts: pts, seg: seg, cum: cum, len: total };
  }
  function pointAt(P, d) {
    if (!P.len) {
      var p0 = P.pts[0];
      return { lon: p0[0], lat: p0[1], dx: 1, dy: 0 };
    }
    d = Math.max(0, Math.min(P.len, d));
    var k = 0;
    while (k < P.seg.length - 1 && d > P.cum[k + 1]) k++;
    var a = P.pts[k], b = P.pts[k + 1];
    var t = P.seg[k] ? (d - P.cum[k]) / P.seg[k] : 0;
    var dx = (b[0] - a[0]) * M_LON, dy = (b[1] - a[1]) * M_LAT;
    var L = Math.hypot(dx, dy) || 1;
    return { lon: a[0] + (b[0] - a[0]) * t, lat: a[1] + (b[1] - a[1]) * t, dx: dx / L, dy: dy / L };
  }
  /* 把折线整体沿法向平移 off 米（给同编组的各架一条独立航线） */
  function offsetPath(pts, off) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      var dx = (b[0] - a[0]) * M_LON, dy = (b[1] - a[1]) * M_LAT;
      var L = Math.hypot(dx, dy) || 1;
      var nx = -dy / L, ny = dx / L;
      out.push([pts[i][0] + (nx * off) / M_LON, pts[i][1] + (ny * off) / M_LAT]);
    }
    return out;
  }

  /* ---------- 组装每架无人机的“航程”：停机位 → 编组航线 → 转场 → 任务航路 ---------- */
  var drones = [];
  var T_IN = T_LIFT;
  var MAX_ORBIT = 0;
  var MAX_LOOP = 0;

  (function build() {
    var RS = window.ROUTES_S1;
    if (!RS) return;

    /* 停机位：集结区内 8 列方阵 */
    var PARK_COLS = 8, PARK_GAP = 350;
    var parked = 0;

    (RS.area || []).forEach(function (r) {
      /* 进场：先沿 4 条编组航线飞到任务区边界（车道由 r.lan 给出），再直飞自己的进场点 */
      var routes = window.ROUTES_S1.transit || [];
      var corr = null;
      for (var ri = 0; ri < routes.length; ri++) if (routes[ri].id === r.corr) { corr = routes[ri].pts; break; }
      var base = corr || [[RALLY.lon, RALLY.lat], r.pts[0]];
      if (!base[1]) return;
      var icon = ICON[r.group] || "blue";
      var color = COLOR[icon];
      var k = parked++;
      var col = k % PARK_COLS, row = Math.floor(k / PARK_COLS);
      var parkLon = RALLY.lon + ((col - (PARK_COLS - 1) / 2) * PARK_GAP) / M_LON;
      var parkLat = RALLY.lat - (row * PARK_GAP) / M_LAT;

      var transit = makePath(offsetPath(base, r.lan || 0));

      var enter = transit.pts[transit.pts.length - 1];
      var orbitPts = r.pts;
      var orbit = makePath(orbitPts);
      var closed = r.kind === "loop" || r.kind === "racetrack";
      /* 闭环：首尾相接（数据里已闭合）；SAR 蛇形：往返 */
      var pingpong = !closed;

      /* 转场：编组航线终点 → 本架任务航路起点 */
      var transfer = makePath([[enter[0], enter[1]], [orbitPts[0][0], orbitPts[0][1]]]);

      /* 引导段：停机位 → 编组航线起点（直线） */
      var taxi = makePath([[parkLon, parkLat], [transit.pts[0][0], transit.pts[0][1]]]);

      /* 把前三段串成一条“引导路径” */
      var leadPts = [];
      function push(pts) {
        for (var i = 0; i < pts.length; i++) {
          if (leadPts.length && i === 0) continue;
          leadPts.push(pts[i]);
        }
      }
      push(taxi.pts); push(transit.pts); push(transfer.pts);
      var lead = makePath(leadPts);

      var tIn = T_LIFT + lead.len / V;
      if (tIn > T_IN) T_IN = tIn;
      if (orbit.len > MAX_ORBIT) MAX_ORBIT = orbit.len;

      drones.push({
        icon: icon, color: color, group: r.group, kind: r.kind,
        park: [parkLon, parkLat],
        lead: lead, orbit: orbit, pingpong: pingpong,
        leadLen: lead.len, orbitLen: orbit.len
      });
    });
    /* 同一轨道成对的两架（GMTI / 电子 / 中继）：第二架从进入轨道起减速到一半速度，
       飞满一个周期后恢复，从而稳定落后半圈；全程不停机、不悬停 */
    var byTrack = {};
    drones.forEach(function (d) {
      var key = d.group + "|" + JSON.stringify(d.orbit.pts);
      (byTrack[key] = byTrack[key] || []).push(d);
    });
    /* 两架到达轨道的时间不同，相位差里已经含了 V×(t0b−t0a)；
       要凑成恰好半圈，需在此基础上补 want = L/2 − V×(t0b−t0a) 的距离。
       补法：第二架从进入轨道起以半速飞，缓慢把这 want 距离“欠”出来，再恢复原速。 */
    Object.keys(byTrack).forEach(function (k) {
      var list = byTrack[k];
      for (var i = 1; i < list.length; i += 2) {
        var a = list[i - 1], b = list[i];
        var t0a = T_LIFT + a.leadLen / V, t0b = T_LIFT + b.leadLen / V;
        var want = b.orbitLen / 2 - V * (t0b - t0a);
        want = ((want % b.orbitLen) + b.orbitLen) % b.orbitLen;
        if (want < 200) continue;                    /* 已经差半圈就不用减速 */
        b.slow = true;
        b.slowDist = want;
        b.slowDur = want / (V / 2);                  /* 半速飞行，欠满 want 为止 */
        b.slowT0 = t0b;
      }
    });
    /* ---------- 机场绕飞：20:08 起，离机场最近的两架光电脱离航路，绕机场 2.5km 圆逆时针盘旋，再回原航路 ---------- */
    var AIR = { lon: 120.939578, lat: 24.818188, r: 2500 };
    var DETOUR_T0 = 20 * 60 + 8;
    (function airportOrbit() {
      var photo = drones.filter(function (d) { return d.group === "photo"; });
      if (photo.length < 2) return;
      var cand = [];
      photo.forEach(function (d) {
        if (DETOUR_T0 <= T_LIFT + d.leadLen / V) return;      /* 20:08 前还没到位的不选 */
        var p = posOf(d, DETOUR_T0);
        var dx = (p.lon - AIR.lon) * M_LON, dy = (p.lat - AIR.lat) * M_LAT;
        cand.push({ d: d, p: p, dist: Math.hypot(dx, dy) });
      });
      cand.sort(function (a, b) { return a.dist - b.dist; });
      if (cand.length < 2) return;
      var A = cand[0], B = cand[1];
      var CIRC = 2 * Math.PI * AIR.r;
      var LAPS = 3;                                           /* 3 圈 ≈ 47 km ≈ 15.7 min + 转场 ≈ 20 min */
      var angA = Math.atan2((A.p.lat - AIR.lat) * M_LAT, (A.p.lon - AIR.lon) * M_LON);
      function circlePt(a) {
        return [AIR.lon + Math.cos(a) * AIR.r / M_LON, AIR.lat + Math.sin(a) * AIR.r / M_LAT];
      }
      var E = circlePt(angA);                                 /* 两架都飞向圆上同一点 */
      function buildDetour(from) {
        var pts = [[from.lon, from.lat], E];
        var N = 72 * LAPS;
        for (var i = 1; i <= N; i++) pts.push(circlePt(angA + (i / 72) * 2 * Math.PI));  /* 逆时针 */
        pts.push([from.lon, from.lat]);                       /* 回到离开航路的那一点 */
        return makePath(pts);
      }
      function legOf(from, to) { return Math.hypot((to[0] - from.lon) * M_LON, (to[1] - from.lat) * M_LAT); }
      function install(c, slowWant) {
        var d = c.d;
        var path = buildDetour(c.p);
        var entryT = DETOUR_T0 + legOf(c.p, E) / V;
        var extra = slowWant ? slowWant / V : 0;
        d.detour = {
          path: path, t0: DETOUR_T0, dur: path.len / V + extra,
          slow: false
        };
        d.detour.t1 = DETOUR_T0 + d.detour.dur;
        if (slowWant) {
          d.detour.slow = true;
          d.detour.slowDist = slowWant;
          d.detour.slowDur = 2 * slowWant / V;
          d.detour.slowT0 = entryT;
        }
        return entryT;
      }
      var entryA = install(A, 0);
      var entryB = install(B, 0);
      /* 第二架从进入圆起减速，直到落后半圈；want 里已扣掉两架进场时间差带来的相位 */
      var want = (CIRC / 2 - V * (entryB - entryA)) % CIRC;
      want = (want + CIRC) % CIRC;
      if (want > 200) {
        B.d.detour.slow = true;
        B.d.detour.slowDist = want;
        B.d.detour.slowDur = 2 * want / V;
        B.d.detour.slowT0 = entryB;
        B.d.detour.dur += want / V;
        B.d.detour.t1 = DETOUR_T0 + B.d.detour.dur;
      }
    })();

    T_IN = Math.ceil(T_IN);
    MAX_ORBIT = Math.ceil(MAX_ORBIT);
    /* 最晚“跑完一圈”的时刻：减速段/绕飞段都要算进去 */
    var lastDone = 0;
    drones.forEach(function (d) {
      var done;
      if (d.detour) done = d.detour.t1 + d.orbitLen / V;
      else done = T_LIFT + d.leadLen / V + (d.orbitLen + 2 * (d.slow ? d.slowDist : 0)) / V;
      if (done > lastDone) lastDone = done;
    });
    MAX_LOOP = lastDone;
  })();

  /* 总时长：全部进入盘旋后再留约 35 分钟 */
  var TOTAL = Math.max(3600, Math.ceil((MAX_LOOP + 300) / 60) * 60);

  function posOf(d, t) {
    if (t <= T_LIFT) return { lon: d.park[0], lat: d.park[1], dx: 0, dy: 0 };
    var tt = t;
    if (d.detour) {
      if (t >= d.detour.t0 && t < d.detour.t1) {
        var du = V * (t - d.detour.t0);
        if (d.detour.slow) {
          var dk = (t - d.detour.slowT0) / d.detour.slowDur;
          if (dk > 1) dk = 1;
          if (dk > 0) du -= dk * d.detour.slowDist;
        }
        if (du < 0) du = 0;
        if (du > d.detour.path.len) du = d.detour.path.len;
        return pointAt(d.detour.path, du);
      }
      if (t >= d.detour.t1) tt = t - d.detour.dur;      /* 回航路：整体时移 */
    }
    var dist = V * (tt - T_LIFT);
    var p;
    if (dist <= d.leadLen) {
      p = pointAt(d.lead, dist);
    } else {
      var u = dist - d.leadLen;
      if (d.slow) {
        /* 减速段：每经过 t 秒少走 V/2 米，累计 slowDist 后恢复原速 */
        var k = (t - d.slowT0) / d.slowDur;
        if (k > 1) k = 1;
        if (k > 0) u -= k * d.slowDist;
        if (u < 0) u = 0;
      }
      if (d.pingpong) {
        var m = u % (2 * d.orbitLen);
        p = pointAt(d.orbit, m <= d.orbitLen ? m : 2 * d.orbitLen - m);
        if (m > d.orbitLen) { p.dx = -p.dx; p.dy = -p.dy; }
      } else {
        p = pointAt(d.orbit, u % d.orbitLen);
      }
    }
    return p;
  }
  function headingOf(d, t) {
    var a = posOf(d, t);
    if (!a.dx && !a.dy) return 0;
    return (Math.atan2(a.dx, a.dy) * 180) / Math.PI;
  }

  function simulate(t) {
    t = Math.max(0, Math.min(TOTAL, t));
    var out = [];
    for (var i = 0; i < drones.length; i++) {
      var d = drones[i];
      var p = posOf(d, t);
      var trail = [];
      for (var h = HIST_N; h >= 0; h--) {
        var tt = t - h * HIST_DT;
        if (tt < 0) continue;
        var q = posOf(d, tt);
        trail.push([+q.lon.toFixed(5), +q.lat.toFixed(5)]);
      }
      out.push({
        type: d.icon, color: d.color,
        lon: +p.lon.toFixed(5), lat: +p.lat.toFixed(5),
        r: Math.round(headingOf(d, t)),
        trail: trail.length > 1 ? trail : []
      });
    }
    return out;
  }

  function phase(t) {
    if (t < T_LIFT) return "集结待命";
    if (t < T_FORM) return "起飞编队";
    if (t < T_IN) return "编队飞行";
    return "侦察盘旋";
  }

  /* ================= 扫描 / 扇区 / 条带 / 覆盖格 =================
     参数与场景二 SH-06 一致：光电 2–2.8km ±30°、SAR 地距 8–10km 带宽 2km、
     GMTI 2–35km ±45°、电子 1–30km ±45°；覆盖格 500m。 */
  var cells = null, covFirst = null, NX = 0, NY = 0, CW = 0, CH = 0;

  /* 该机“到位”时刻：飞到规划航路第一个点才开机扫描 */
  function tOnOf(d) { return T_LIFT + d.leadLen / V; }
  function inAreaM(p, margin) {
    return Math.abs((p.lon - ACX) * M_LON) <= AHX + margin &&
           Math.abs((p.lat - ACY) * M_LAT) <= AHY + margin;
  }
  function headingOfPos(p) { return Math.atan2(p.dx || 0, p.dy || 0); }
  /* 从 p 沿方位角 an、前进 dist 米、再横向偏移 lateral 米 */
  function ptAlong(p, an, dist, lateral) {
    var lan = an + Math.PI / 2;
    return [+(p.lon + (dist * Math.sin(an) + (lateral || 0) * Math.sin(lan)) / M_LON).toFixed(5),
            +(p.lat + (dist * Math.cos(an) + (lateral || 0) * Math.cos(lan)) / M_LAT).toFixed(5)];
  }
  function sectorQuad(p, hd, r0, r1, half, seg) {
    var quad = [], i, rel;
    for (i = 0; i <= seg; i++) { rel = -half + 2 * half * (i / seg); quad.push(ptAlong(p, hd + rel, r1, 0)); }
    for (i = seg; i >= 0; i--) { rel = -half + 2 * half * (i / seg); quad.push(ptAlong(p, hd + rel, r0, 0)); }
    quad.push(quad[0]);
    return quad;
  }

  function scans(t) {
    var out = [];
    if (t < T_LIFT) return out;
    for (var i = 0; i < drones.length; i++) {
      var d = drones[i];
      if (d.group !== "photo") continue;
      if (t < tOnOf(d)) continue;                 /* 未到位不开机 */
      var p = posOf(d, t);
      if (!inAreaM(p, 3000)) continue;
      var hd = headingOfPos(p);
      var el = Math.max(0, t - tOnOf(d));   /* 扇形/扫掠从“到位”开始走 */
      var sw = -SCAN.half + 2 * SCAN.half * (((el * SCAN.rate) / 60) % 1);
      out.push({
        quad: sectorQuad(p, hd, SCAN.r0, SCAN.r1, SCAN.half, SCAN.seg),
        sweep: [ptAlong(p, hd + sw, SCAN.r0, 0), ptAlong(p, hd + sw, SCAN.r1, 0)],
        k: Math.max(0, Math.min(1, el / SCAN.fade))
      });
    }
    return out;
  }

  function sarScans(t) {
    var out = [];
    if (t < T_LIFT) return out;
    for (var i = 0; i < drones.length; i++) {
      var d = drones[i];
      if (d.group !== "sar") continue;
      if (t < tOnOf(d)) continue;                 /* 未到位不开机 */
      var p = posOf(d, t);
      if (!inAreaM(p, 14000)) continue;
      /* 侧视只在南北向航段成立（同场景二） */
      if (Math.abs(Math.cos(headingOfPos(p))) < 0.5) continue;
      var side = -Math.PI / 2;                    /* 固定朝西（与覆盖判定一致） */
      var el = Math.max(0, t - tOnOf(d));   /* 扇形/扫掠从“到位”开始走 */
      out.push({
        band: [ptAlong(p, side, SARB.near, 0), ptAlong(p, side, SARB.far, 0)],
        rays: [[[p.lon, p.lat], ptAlong(p, side, SARB.near, -SARB.width / 2)],
               [[p.lon, p.lat], ptAlong(p, side, SARB.far, SARB.width / 2)]],
        k: Math.max(0, Math.min(1, el / SARB.fade))
      });
    }
    return out;
  }

  function fans(t) {
    var out = { radar: [], jam: [] };
    if (t < T_LIFT) return out;
    for (var i = 0; i < drones.length; i++) {
      var d = drones[i];
      var pr = d.group === "gmti" ? FAN.radar : (d.group === "ewar" ? FAN.jam : null);
      if (!pr) continue;
      if (t < tOnOf(d)) continue;                 /* 未到位不开机 */
      var p = posOf(d, t);
      if (!inAreaM(p, 3000)) continue;
      var el = Math.max(0, t - tOnOf(d));   /* 扇形/扫掠从“到位”开始走 */
      var item = {
        quad: sectorQuad(p, headingOfPos(p), pr.r0, pr.r1, FAN.half, FAN.seg),
        k: Math.max(0, Math.min(1, el / FAN.fade))
      };
      (d.group === "gmti" ? out.radar : out.jam).push(item);
    }
    return out;
  }

  /* 覆盖格：500m，按“首次被扫到的时刻”逐格点亮；首扫时刻表在第一次用到时才算 */
  function ensureCells() {
    if (cells) return;
    NX = Math.max(1, Math.round((2 * AHX) / COV.cell));
    NY = Math.max(1, Math.round((2 * AHY) / COV.cell));
    CW = (2 * AHX) / NX;
    CH = (2 * AHY) / NY;
    var hx = CW / 2 / M_LON, hy = CH / 2 / M_LAT;
    cells = [];
    for (var i = 0; i < NX; i++) {
      for (var j = 0; j < NY; j++) {
        var mx = -AHX + (i + 0.5) * CW, my = -AHY + (j + 0.5) * CH;
        var lon = ACX + mx / M_LON, lat = ACY + my / M_LAT;
        cells.push({
          mx: mx, my: my,
          ring: [[lon - hx, lat - hy], [lon + hx, lat - hy], [lon + hx, lat + hy], [lon - hx, lat + hy], [lon - hx, lat - hy]]
        });
      }
    }
  }

  function ensureFirst() {
    ensureCells();
    if (covFirst) return;
    var kinds = { photo: [], sar: [], gmti: [], ewar: [] };
    for (var i = 0; i < drones.length; i++) if (kinds[drones[i].group]) kinds[drones[i].group].push(drones[i]);
    covFirst = {};
    Object.keys(kinds).forEach(function (k) { covFirst[k] = new Float64Array(cells.length); covFirst[k].fill(Infinity); });

    var par = {
      photo: { r0: SCAN.r0, r1: SCAN.r1, cos: Math.cos(SCAN.half) },
      gmti: { r0: FAN.radar.r0, r1: FAN.radar.r1, cos: Math.cos(FAN.half) },
      ewar: { r0: FAN.jam.r0, r1: FAN.jam.r1, cos: Math.cos(FAN.half) },
      sar: { r0: SARB.near, r1: SARB.far, cos: 0 }
    };

    for (var tt = T_LIFT; tt <= TOTAL; tt += COV.step) {
      for (var k in kinds) {
        var pr = par[k], arr = covFirst[k], ds = kinds[k];
        if (!ds.length) continue;
        var r0e = Math.max(0, pr.r0 - 50), r1e = pr.r1 + 50;
        for (var di = 0; di < ds.length; di++) {
          var p = posOf(ds[di], tt);
          if (tt < tOnOf(ds[di])) continue;        /* 只算到位之后的扫描 */
          if (!inAreaM(p, k === "sar" ? 14000 : 3000)) continue;
          var hd = headingOfPos(p);
          var fx = Math.sin(hd), fy = Math.cos(hd);
          var px = (p.lon - ACX) * M_LON, py = (p.lat - ACY) * M_LAT;
          var i0 = Math.max(0, Math.floor((px - r1e + AHX) / CW));
          var i1 = Math.min(NX - 1, Math.floor((px + r1e + AHX) / CW));
          var j0 = Math.max(0, Math.floor((py - r1e + AHY) / CH));
          var j1 = Math.min(NY - 1, Math.floor((py + r1e + AHY) / CH));
          for (var ii = i0; ii <= i1; ii++) {
            for (var jj = j0; jj <= j1; jj++) {
              var ci = ii * NY + jj;
              if (arr[ci] <= tt) continue;
              var dx = cells[ci].mx - px, dy = cells[ci].my - py;
              if (k === "sar") {
                /* 固定朝西的侧视条带：西侧 8–10km、沿航向 ±1.1km */
                if (dx > -(SARB.near - 120) || dx < -(SARB.far + 120)) continue;   /* 条带边界各留 120m 抗缝 */
                if (Math.abs(dy) > 1100) continue;
              } else {
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < r0e || dist > r1e) continue;
                if ((dx * fx + dy * fy) / (dist || 1) < pr.cos) continue;
              }
              arr[ci] = tt;
            }
          }
        }
      }
    }
  }

  function coverage(t) {
    ensureFirst();
    var out = { photo: [], sar: [], gmti: [], ewar: [] };
    for (var k in out) {
      var arr = covFirst[k];
      for (var i = 0; i < arr.length; i++) if (arr[i] <= t) out[k].push(cells[i].ring);
    }
    return out;
  }

  return {
    TOTAL: TOTAL, V: V, T_LIFT: T_LIFT, T_FORM: T_FORM, T_IN: T_IN,
    phase: phase, simulate: simulate, count: function () { return drones.length; },
    scans: scans, sarScans: sarScans, fans: fans, coverage: coverage,
    /* 每架“到位”时刻（到达自己规划航路起点）与分组，供外壳判断目标揭示时机 */
    arrivals: function () {
      return drones.map(function (d) { return { group: d.group, arrive: T_LIFT + d.leadLen / V }; });
    }
  };
})();
