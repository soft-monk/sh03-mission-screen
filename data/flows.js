/* 分支排片表（阶段A骨架）
   1) 三个场景的时间轴**完全独立**：
      - 场景二：直接用 js/timeline.js 的 BASE，本文件不克隆、不改；
      - 场景一 / 场景三：整张屏表就写在本文件里，各存一份。
      改任何一个场景的时间，都不会牵动另外两个。
   2) 公共前缀 SH-01/02/03 数值相同，但每个场景各存一份。
   依赖：必须在 js/timeline.js 之后加载 */
(function () {
  var BASE = window.TIMELINE;
  if (!BASE) return;

  /* SH-03 的等待点：播到 25.5 s 暂停，等人点场景卡 */
  var HOLD = [{ t: 25.5, screen: "SH-03", prompt: "请选择任务场景" }];

  var POINTS = {
    s4: ["战场态势建模，匹配三类任务模式", "AI 建议【敏捷拒止布控】并给出依据", "人工确认，任务正式下达"],
    s5: ["光电 / 雷达 / 电子 / 通信四型机能力与可用量", "三套编组方案横向展开，方案二推荐", "六个集群配比 + 六项预期指标"],
    s6: ["六个集群任务区逐个落图", "方案参数与航路确认", "下达任务，进入链路构建"]
  };

  /* 一个场景的屏表：SH-01..06 时刻由参数给定，其后 6 个占位屏各 15 s */
  function branch(shortName, baseNo, t4, t5, t6, tNext) {
    var arr = [
      { id: "SH-01", t: 0, ch: 0, title: "启动加载", scene: "boot" },
      { id: "SH-02", t: 6, ch: 0, title: "自检校验", scene: "selfcheck" },
      { id: "SH-03", t: 14, ch: 1, title: "任务态势主界面", scene: "situation" },
      { id: "SH-04", t: t4, ch: 1, title: "场景确认", points: POINTS.s4.slice() },
      { id: "SH-05", t: t5, ch: 1, title: "集群编组", points: POINTS.s5.slice() },
      { id: "SH-06", t: t6, ch: 1, title: "方案确认", points: POINTS.s6.slice() }
    ];
    var t = tNext;
    for (var i = 1; i <= 6; i++) {
      arr.push({
        id: "SH-" + (baseNo + i),
        t: t,
        ch: i <= 3 ? 3 : 4,
        title: shortName + " · 环节" + i,
        points: ["界面待设计", "占位屏，仅用于打通分支流程"],
        scene: "placeholder"
      });
      t += 15;
    }
    return { screens: arr, total: t };
  }

  function flowOf(shortName, baseNo, t4, t5, t6, tNext, p2t, p3t, p4t) {
    var b = branch(shortName, baseNo, t4, t5, t6, tNext);
    var screens = b.screens, total = b.total;
    screens.forEach(function (s, i) {
      s.end = i + 1 < screens.length ? screens[i + 1].t : total;
      s.dur = s.end - s.t;
    });
    var chapters = [
      { key: "boot", name: "启动", t: 0 },
      { key: "p1", name: "场景确认", t: 14 },
      { key: "p2", name: "编组方案", t: p2t },
      { key: "p3", name: "方案确认", t: p3t },
      { key: "p4", name: "任务执行", t: p4t },
      { key: "p5", name: "任务收尾", t: p4t + 60 }
    ];
    var phases = [1, 2, 3, 4, 5].map(function (i) {
      var start = chapters[i].t;
      var end = i + 1 < chapters.length ? chapters[i + 1].t : total;
      return { key: chapters[i].key, name: chapters[i].name, start: start, end: end, dur: end - start };
    });
    return { total: total, chapters: chapters, screens: screens, phases: phases, holds: HOLD };
  }

  var FLOWS = {
    /* 场景一：SH-04/05 读完语音 → 等 3 s → 2.8 s 模拟点击 → 进下一屏 */
    "scene-1": flowOf("场景一", 100, 26, 47.05, 79.6, 94.6, 47.05, 79.6, 94.6),
    /* 场景二：时间轴就是 js/timeline.js 的 BASE，本文件只引用不改 */
    "scene-2": BASE,
    /* 场景三：占位分支，独立一份 */
    "scene-3": flowOf("场景三", 200, 26, 66, 94, 109, 66, 94, 109)
  };
  window.TIMELINE_FLOWS = FLOWS;
  window.getTimelineFor = function (id) {
    return (id && FLOWS[id]) || BASE;
  };
})();
