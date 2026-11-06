/* 分支排片表（阶段A骨架）
   1) 公共前缀 SH-01/02/03：三场景完全一致，直接复用 js/timeline.js 的定义
   2) 场景二分支：直接引用 js/timeline.js 现有表，数值一字不动
   3) 场景一/三：SH-04/05/06 复用公共实现，其后为专属占位屏 SH-101.. / SH-201..
   依赖：必须在 js/timeline.js 之后加载 */
(function () {
  var BASE = window.TIMELINE;
  if (!BASE) return;

  function find(id) {
    for (var i = 0; i < BASE.screens.length; i++) if (BASE.screens[i].id === id) return BASE.screens[i];
    return null;
  }
  function cloneScreen(s) {
    if (!s) return null;
    return { id: s.id, t: s.t, dur: s.dur, ch: s.ch, title: s.title, points: s.points ? s.points.slice() : null, scene: s.scene };
  }

  var COMMON_IDS = ["SH-01", "SH-02", "SH-03"];
  var HEAD_IDS = ["SH-04", "SH-05", "SH-06"];
  var HOLD = [{ t: 25.5, screen: "SH-03", prompt: "请选择任务场景" }];

  function buildBranch(baseNo, shortName) {
    var screens = COMMON_IDS.concat(HEAD_IDS).map(function (id) { return cloneScreen(find(id)); }).filter(Boolean);
    var t = 109;
    for (var i = 1; i <= 6; i++) {
      screens.push({
        id: "SH-" + (baseNo + i),
        t: t,
        ch: i <= 3 ? 3 : 4,
        title: shortName + " · 环节" + i,
        points: ["界面待设计", "占位屏，仅用于打通分支流程"],
        scene: "placeholder"
      });
      t += 15;
    }
    var total = t;
    screens.forEach(function (s, i) {
      s.end = i + 1 < screens.length ? screens[i + 1].t : total;
      s.dur = s.end - s.t;
    });
    var chapters = [
      { key: "boot", name: "启动", t: 0 },
      { key: "p1", name: "场景确认", t: 14 },
      { key: "p2", name: "编组方案", t: 66 },
      { key: "p3", name: "方案确认", t: 94 },
      { key: "p4", name: "任务执行", t: 109 },
      { key: "p5", name: "任务收尾", t: 169 }
    ];
    var phases = [1, 2, 3, 4, 5].map(function (i) {
      var start = chapters[i].t;
      var end = i + 1 < chapters.length ? chapters[i + 1].t : total;
      return { key: chapters[i].key, name: chapters[i].name, start: start, end: end, dur: end - start };
    });
    return { total: total, chapters: chapters, screens: screens, subs: [], phases: phases, holds: HOLD };
  }

  var FLOWS = {
    "scene-1": buildBranch(100, "场景一"),
    "scene-2": BASE,
    "scene-3": buildBranch(200, "场景三")
  };
  window.TIMELINE_FLOWS = FLOWS;
  window.getTimelineFor = function (id) {
    return (id && FLOWS[id]) || BASE;
  };
})();