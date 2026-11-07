/* 排片表：改这里就是改"第几秒播哪屏"。
   时间单位=秒，从播片起点算。总长 308s = 05:08。
   依据《场景1-播片时间轴排片-20261019.md》 */
window.TIMELINE = (function () {
  const chapters = [
    { key: "boot", name: "启动", t: 0 },
    { key: "p1", name: "集结", t: 14 },
    { key: "p2", name: "分区侦察", t: 139 },
    { key: "p3", name: "融合识别", t: 177 },
    { key: "p4", name: "集群打击", t: 207 },
    { key: "p5", name: "毁伤复核", t: 267 }
  ];

  const screens = [
    { id: "SH-01", t: 0, dur: 6, ch: 0, title: "启动加载", scene: "boot" },
    { id: "SH-02", t: 6, dur: 8, ch: 0, title: "自检校验", scene: "selfcheck" },
    { id: "SH-03", t: 14, dur: 12, ch: 1, title: "任务态势主界面", scene: "situation" },
    { id: "SH-04", t: 26, dur: 15, ch: 1, title: "场景确认", points: ["战场态势建模，匹配三类任务模式", "AI 建议【敏捷拒止布控】并给出依据", "人工确认，任务正式下达"] },
    { id: "SH-05", t: 66, dur: 20, ch: 1, title: "集群编组", points: ["光电 / 雷达 / 电子 / 通信四型机能力与可用量", "三套编组方案横向展开，方案二推荐", "六个集群配比 + 六项预期指标"] },
    { id: "SH-06", t: 94, dur: 15, ch: 1, title: "方案确认", points: ["六个集群任务区逐个落图", "方案参数与航路确认", "下达任务，进入链路构建"] },
    { id: "SH-07", t: 109, dur: 15, ch: 1, title: "链路拓扑", points: ["自组网节点与链路关系", "链路按顺序逐条点亮", "拓扑健康度与冗余检查"] },
    { id: "SH-08", t: 124, dur: 15, ch: 1, title: "链路稳定", points: ["带宽 / 时延曲线绘制", "链路质量与丢包评估", "达到任务标准，允许前出"] },
    { id: "SH-09", t: 139, dur: 20, ch: 2, title: "侦察展开", points: ["六个集群分区展开", "前出轨迹拖尾 + 扫描圈扩散", "任务区覆盖与盲区检查"] },
    { id: "SH-10", t: 159, dur: 18, ch: 2, title: "侦察数据融合", points: ["光电 / 雷达 / 电子多源数据融合", "异常电磁热点标记", "形成潜在目标区"] },
    { id: "SH-11", t: 177, dur: 15, ch: 3, title: "目标列表", points: ["三处高置信目标", "目标卡翻入 + 红框脉动", "按威胁等级排序"] },
    { id: "SH-12", t: 192, dur: 15, ch: 3, title: "目标详情", points: ["目标 001 详情与情报来源", "定位飞行 + 锁定框收紧", "优先级判定建议"] },
    { id: "SH-13", t: 207, dur: 18, ch: 4, title: "AI 决策", points: ["三种打击方案生成", "按目标价值 / 暴露窗口 / 链路稳定性评估", "方案二推荐"] },
    { id: "SH-14", t: 225, dur: 15, ch: 4, title: "打击确认", points: ["方案二参数与兵力分配", "成功率与风险评估", "人工确认，下达打击指令"] },
    { id: "SH-15", t: 240, dur: 20, ch: 4, title: "执行态势", points: ["打击线飞行 + 命中闪光", "目标移动迹象提示", "光电集群调整观察角度"] },
    { id: "SH-16", t: 260, dur: 15, ch: 4, title: "引导控制", points: ["协同引导与末段修正", "命中概率 / 偏差数字", "打击过程监控"] },
    { id: "SH-17", t: 275, dur: 18, ch: 5, title: "毁伤评估", points: ["目标红 - 黄 - 灰三段变色", "毁伤判定与置信度", "回收轨迹拖出"] },
    { id: "SH-18", t: 293, dur: 15, ch: 5, title: "任务总结", points: ["报告数字滚动", "打击成功率 92%，主要威胁节点清除", "转入下一部署地域"] }
  ];


/* 等待点：播到这个时刻暂停，等人点击才继续 */
const holds = [
  { t: 25.5, screen: "SH-03", prompt: "请选择任务场景" }
];

const total = 308;

    screens.forEach((s, i) => { s.end = i + 1 < screens.length ? screens[i + 1].t : total; s.dur = s.end - s.t; });

  /* 主进度条：5 段等宽，段内按该段实际秒数匀速 */
  const phases = [1, 2, 3, 4, 5].map(i => {
    const start = chapters[i].t;
    const end = i + 1 < chapters.length ? chapters[i + 1].t : total;
    return { key: chapters[i].key, name: chapters[i].name, start, end, dur: end - start };
  });

  return { total, chapters, screens, phases, holds };
})();
