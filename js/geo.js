/* 经纬度 -> 底图像素。底图是 Web 墨卡托 z14 瓦片拼的，所以投影和地图软件一致 */
window.GEO = (function () {
  const M = window.FAST_MAP;
  const N = Math.pow(2, M.z) * M.size;
  const OX = M.x0 * M.size, OY = M.y0 * M.size;
  const R = Math.PI / 180;

  function px(lon, lat) {
    const wx = (lon + 180) / 360 * N;
    const wy = (1 - Math.log(Math.tan(lat * R) + 1 / Math.cos(lat * R)) / Math.PI) / 2 * N;
    return { x: wx - OX, y: wy - OY };
  }
  function unpx(x, y) {
    const lon = (x + OX) / N * 360 - 180;
    const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + OY) / N))) * 180 / Math.PI;
    return [lon, lat];
  }
  const proj = list => list.map(p => px(p[0], p[1]));
  const d = list => list.map(p => (p.key || p.name ? "M" + proj(p.polygon).map((q, i) => (i ? "L" : "") + q.x.toFixed(1) + " " + q.y.toFixed(1)).join("") + "Z" : "")).join(" ");

  function centroid(list) {
    let x = 0, y = 0;
    for (const p of list) { const q = px(p[0], p[1]); x += q.x; y += q.y; }
    return { x: x / list.length, y: y / list.length };
  }
  function bbox(list) {
    const pts = proj(list);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of pts) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  /* 折线：总长 / 按进度取点 / 截取已走段落 */
  function plen(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return s;
  }
  function pointAt(pts, p) {
    if (pts.length < 2) return pts[0] || { x: 0, y: 0 };
    p = Math.max(0, Math.min(1, p));
    let total = plen(pts), want = total * p, acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (acc + seg >= want) {
        const k = seg ? (want - acc) / seg : 0;
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
      }
      acc += seg;
    }
    return pts[pts.length - 1];
  }
  function chord(pts, p) {
    if (p <= 0) return [];
    if (p >= 1) return pts.slice();
    const total = plen(pts), want = total * p;
    let acc = 0;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (acc + seg >= want) {
        const k = seg ? (want - acc) / seg : 0;
        out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k });
        break;
      }
      acc += seg;
      out.push(pts[i]);
    }
    return out;
  }
  const path = (pts, close) => pts.map((q, i) => (i ? "L" : "M") + q.x.toFixed(1) + " " + q.y.toFixed(1)).join(" ") + (close ? " Z" : "");
  /* 二次贝塞尔采样：给航线一点弧度，看着不像折线 */
  function arc(a, b, bend, n) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const cx = mx - dy / L * bend, cy = my + dx / L * bend;
    const out = [];
    for (let i = 0; i <= (n || 24); i++) {
      const t = i / (n || 24), u = 1 - t;
      out.push({ x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y });
    }
    return out;
  }
  return { px, unpx, proj, centroid, bbox, plen, pointAt, chord, path, arc };
})();
