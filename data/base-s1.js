/* 场景一 SH-06：岸基机场布局。
   跑道两端点由用户给定（A 西南 → B 东北，约 3.6 km、方位 45.5°）；
   机库 / 雷达 / 飞机按“沿跑道 u（米）+ 垂直 v（米，正=跑道东南侧）”摆放，加载时换算成经纬度。
   目标状态：黄色 = 疑似（首次被光电扇形扫到），红色 = 确认（光电抵近到 ≤ 800 m）。 */
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
    name: "岸基机场",
    label: at(len / 2, -820),
    runway: {
      a: at(0, 0),
      b: at(len, 0),
      lenM: Math.round(len),
      bearing: Math.atan2(dx, dy) * 180 / Math.PI
    },
    taxiway: { a: at(160, 260), b: at(len - 160, 260) },
    targets: [
      { id: "radar-1", kind: "radar", name: "雷达站-1", pos: at(150, -260) },
      { id: "radar-2", kind: "radar", name: "雷达站-2", pos: at(len - 140, -260) },
      { id: "hangar-1", kind: "hangar", name: "机库-1", pos: at(820, 430) },
      { id: "hangar-2", kind: "hangar", name: "机库-2", pos: at(1080, 430) },
      { id: "jet-1", kind: "jet", name: "战机-1", pos: at(760, 300) },
      { id: "jet-2", kind: "jet", name: "战机-2", pos: at(980, 300) }
    ]
  };
})();
