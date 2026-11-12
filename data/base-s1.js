/* 场景一 SH-06：岸基机场布局（按用户简图重排）。
   跑道两端点由用户给定（A 西南 → B 东北，约 3.6 km、方位 45.5°）；
   跑道 v=0；平行滑行道 v=+330 m（两端各缩进 80 m）；L 形连接在 u=2,800 m；
   目标按“沿跑道 u（米）+ 垂直 v（米，正=跑道东南侧）”摆放，加载时换算成经纬度。
   目标名称固定为“疑似××”；20:03 由 SAR 发现后统一标绘。 */
window.BASE_S1 = (function () {
  var A = [120.926775, 24.806753];
  var B = [120.952380, 24.829622];
  var M_LAT = 111030;
  var M_LON = 111320 * Math.cos(((A[1] + B[1]) / 2) * Math.PI / 180);
  var dx = (B[0] - A[0]) * M_LON;
  var dy = (B[1] - A[1]) * M_LAT;
  var len = Math.hypot(dx, dy);
  var ux = dx / len, uy = dy / len;           /* 沿跑道 A→B */
  var vx = uy, vy = -ux;                       /* 垂直，指向跑道右侧（东南） */
  function at(u, v) {
    return [+(A[0] + (ux * u + vx * v) / M_LON).toFixed(6),
            +(A[1] + (uy * u + vy * v) / M_LAT).toFixed(6)];
  }
  return {
    runway: {
      a: at(0, 0),
      b: at(len, 0),
      lenM: Math.round(len),
      bearing: Math.atan2(dx, dy) * 180 / Math.PI
    },
    taxiway: { a: at(80, 330), b: at(len - 80, 330) },
    link: { a: at(2800, 0), b: at(2800, 330) },
    targets: [
      { id: "radar-1", no: "001", kind: "radar", name: "001雷达站-1", pos: at(100, -260) },
      { id: "radar-2", no: "002", kind: "radar", name: "002雷达站-2", pos: at(3480, -260) },
      { id: "jet-1", no: "003", kind: "jet", name: "003战机-1", pos: at(2000, 330) },
      { id: "jet-2", no: "004", kind: "jet", name: "004战机-2", pos: at(2540, 330) },
      { id: "hangar-1", no: "005", kind: "hangar", name: "005机库-1", pos: at(300, 580) },
      { id: "hangar-2", no: "006", kind: "hangar", name: "006机库-2", pos: at(1120, 580) }
    ]
  };
})();
