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

  var GROUP_ROUTE = { photo: "G1", sar: "G2", gmti: "G2", ewar: "G3", comm: "G4" };
  var ICON = { photo: "blue", sar: "yellow", gmti: "yellow", ewar: "red", comm: "green" };
  var COLOR = { blue: "#38bdf8", yellow: "#facc15", red: "#f87171", green: "#4ade80" };

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

  (function build() {
    var RS = window.ROUTES_S1;
    if (!RS) return;
    var routes = {};
    (RS.transit || []).forEach(function (r) { routes[r.id] = r.pts; });

    /* 停机位：集结区内 8 列方阵 */
    var PARK_COLS = 8, PARK_GAP = 350;
    var parked = 0;
    var laneCache = {};

    (RS.area || []).forEach(function (r) {
      var routeId = GROUP_ROUTE[r.group];
      var base = routes[routeId];
      if (!base) return;
      var icon = ICON[r.group] || "blue";
      var color = COLOR[icon];
      var k = parked++;
      var col = k % PARK_COLS, row = Math.floor(k / PARK_COLS);
      var parkLon = RALLY.lon + ((col - (PARK_COLS - 1) / 2) * PARK_GAP) / M_LON;
      var parkLat = RALLY.lat - (row * PARK_GAP) / M_LAT;

      /* 同一编组 5 条间隔 400 m 的并行航线 */
      var lane = k % 5;
      var key = routeId + "|" + lane;
      if (!laneCache[key]) laneCache[key] = makePath(offsetPath(base, (lane - 2) * 400));
      var transit = laneCache[key];

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

      drones.push({
        icon: icon, color: color,
        park: [parkLon, parkLat],
        lead: lead, orbit: orbit, pingpong: pingpong,
        leadLen: lead.len, orbitLen: orbit.len
      });
    });
    T_IN = Math.ceil(T_IN);
  })();

  /* 总时长：全部进入盘旋后再留约 35 分钟 */
  var TOTAL = Math.max(3600, Math.ceil((T_IN + 2100) / 60) * 60);

  function posOf(d, t) {
    if (t <= T_LIFT) return { lon: d.park[0], lat: d.park[1], dx: 0, dy: 0 };
    var dist = V * (t - T_LIFT);
    var p;
    if (dist <= d.leadLen) {
      p = pointAt(d.lead, dist);
    } else {
      var u = dist - d.leadLen;
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

  return {
    TOTAL: TOTAL, V: V, T_LIFT: T_LIFT, T_FORM: T_FORM, T_IN: T_IN,
    phase: phase, simulate: simulate, count: function () { return drones.length; }
  };
})();
