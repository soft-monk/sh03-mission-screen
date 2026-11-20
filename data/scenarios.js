/* 场景配置：地图区域、资源、AI语音、编组和后续流程。
   当前已实现的完整业务内容归属场景二；场景一、场景三为待设计占位分支。 */
(function () {
  var BASE = {
    id: "scene-2",
    name: "区域封控",
    short: "场景二",
    enabled: true,
    region: "东部区域封控区",
    /* 总览机位：任务区（西）与集结区（东）同框，SH-04/05/06 共用；
       SH-06 的开场运镜从这个机位出发（见 scenes/s03-situation.js 的 S6_OVIEW） */
    camera: { center: [115.030, 39.970], zoom: 8.5, pitch: 30, bearing: -20 },
    mapBounds: [[111.30, 38.10], [117.70, 41.70]],
    minZoom: 8.5,
    area: {
      mission: [[113.62960, 39.51435], [114.56639, 39.51435], [114.56639, 40.25096], [113.62960, 40.25096]],
      targets: [
        { name: "潜在目标部署区-1", label: [113.9500, 39.7500], pts: [[113.8332, 39.6600], [114.0668, 39.6600], [114.0668, 39.8400], [113.8332, 39.8400]] },
        { name: "潜在目标部署区-2", label: [114.3000, 40.0500], pts: [[114.1832, 39.9600], [114.4168, 39.9600], [114.4168, 40.1400], [114.1832, 40.1400]] }
      ],
      reserve: [[115.93399, 39.72405], [115.98085, 39.72405], [115.98085, 39.76007], [115.93399, 39.76007]]
    },
    noFly: [
      { n: "禁飞区1", lp: [114.70333,39.88654], pts: [[114.54986,39.85959],[114.54534,39.81695],[114.63454,39.79919],[114.6471,39.83123],[114.69333,39.85322],[114.69183,39.88254],[114.62298,39.84647]] },
      { n: "禁飞区2", lp: [114.78706,39.97709], pts: [[114.75939,39.97309],[114.74049,39.95014],[114.7562,39.92624],[114.75497,39.90101],[114.77044,39.90364],[114.77338,39.94393],[114.77706,39.9635]] },
      { n: "禁飞区3", lp: [114.96004,40.05412], pts: [[114.83479,40.0172],[114.86133,39.9889],[114.90867,39.99687],[114.94363,39.99704],[114.95004,40.01313],[114.92327,40.03634],[114.8965,40.05012],[114.86865,40.02292]] },
      { n: "禁飞区4", lp: [115.01932,40.08641], pts: [[114.97403,40.07834],[114.98344,40.05206],[115.00393,40.05263],[115.00932,40.06751],[114.99228,40.08241]] },
      { n: "禁飞区5", lp: [115.33519,39.67953], pts: [[115.24096,39.61757],[115.25663,39.61131],[115.32519,39.65365],[115.30532,39.67454],[115.26237,39.67553],[115.26262,39.64167]] },
      { n: "禁飞区6", lp: [115.32911,39.90649], pts: [[115.28945,39.8904],[115.29981,39.85772],[115.31911,39.86208],[115.30946,39.90249]] },
      { n: "禁飞区7", lp: [115.43632,39.83947], pts: [[115.35244,39.83547],[115.39506,39.80506],[115.39355,39.77697],[115.39961,39.75717],[115.41135,39.75848],[115.42575,39.79939],[115.42632,39.82689],[115.40302,39.82093],[115.39677,39.82122]] },
      { n: "禁飞区8", lp: [115.42508,40.02673], pts: [[115.40213,40.02273],[115.39217,39.99702],[115.39916,39.98456],[115.41164,39.98825],[115.41508,40.01422]] },
      { n: "禁飞区9", lp: [115.79253,39.79417], pts: [[115.76302,39.79017],[115.76302,39.77525],[115.75437,39.76415],[115.77416,39.75983],[115.776,39.77624],[115.78253,39.78558]] }
    ],
    uavs: [
      { k: "光电无人机", name: "光电察打机", img: "uav-blue.png", c: "56,189,248", total: 48, avail: 48, caps: ["光电成像侦察", "跟踪", "打击"], used: 20, rest: 28 },
      { k: "雷达无人机", name: "雷达侦察机", img: "uav-yellow.png", c: "250,204,21", total: 32, avail: 32, caps: ["SAR 成像侦察", "GMTI 动目标侦察"], used: 3, rest: 29 },
      { k: "电子无人机", name: "电子侦察机", img: "uav-red.png", c: "248,113,113", total: 28, avail: 28, caps: ["电子侦察", "干扰诱骗"], used: 6, rest: 22 },
      { k: "通信无人机", name: "中继通信机", img: "uav-green.png", c: "74,222,128", total: 24, avail: 24, caps: ["中继", "通信", "数据"], used: 4, rest: 20 }
    ],
    res: [
      { k: "光电", img: "uav-blue.png", v: "48", c: "56,189,248" },
      { k: "雷达", img: "uav-yellow.png", v: "24", c: "250,204,21" },
      { k: "电子", img: "uav-red.png", v: "24", c: "248,113,113" },
      { k: "通信", img: "uav-green.png", v: "24", c: "74,222,128" }
    ],
    groups: [
      { n: "编组1", k: "光电察打机", img: "uav-blue.png", v: 10, target: "潜在目标部署区-1" },
      { n: "编组2", k: "光电察打机", img: "uav-blue.png", v: 10, target: "潜在目标部署区-2" },
      { n: "编组3", k: "电子侦察机", img: "uav-red.png", v: 6, target: "潜在目标部署区-2" },
      { n: "编组4", k: "雷达侦察机", img: "uav-yellow.png", v: 3, target: "潜在目标部署区-1" },
      { n: "编组5", k: "中继通信机", img: "uav-green.png", v: 4, target: "通信中继阵位" }
    ],
    reasons: ["大范围区域覆盖，提高整体态势感知能力", "通信中继保障稳定，支撑多域协同作战", "多方向侦察协同，增强目标发现效率", "电子压制能力强，压制敌方关键节点"],
    metrics: [{ k: "区域覆盖率", v: 93 }, { k: "链路稳定度", v: 96 }, { k: "目标发现效率", v: 91 }, { k: "电子压制能力", v: 94 }, { k: "任务成功率", v: 90 }, { k: "资源利用率", v: 86 }],
    voice: [],
    s4Dialog: [
      { key: "s4-task-header", who: "ai", at: 0.0, audio: ["assets/audio/s2/001.wav"], text: "已接收任务指令，解析如下：" },
      { key: "s4-area-1", who: "ai", at: 0.0, audio: ["assets/audio/s2/002.wav", "assets/audio/s2/003.wav", "assets/audio/s2/004.wav", "assets/audio/s2/005.wav", "assets/audio/s2/006.wav"], text: "潜在目标部署区1<br>中心点坐标：经度113.95度，纬度39.75度<br>区域形状：边长20km矩形<br>情报显示存在敌方机动装甲目标。" },
      { key: "s4-area-2", who: "ai", at: 14.7, audio: ["assets/audio/s2/007.wav", "assets/audio/s2/008.wav", "assets/audio/s2/009.wav", "assets/audio/s2/010.wav", "assets/audio/s2/011.wav"], text: "潜在目标部署区2<br>中心点坐标：经度114.3度，纬度40.05度<br>区域形状：边长20km矩形<br>情报显示存在敌方雷达目标。" },
      { key: "s4-mission-requirement", who: "ai", at: 26.5, audio: ["assets/audio/s2/012.wav"], text: "任务要求对两区域执行封控打击<br>持续40分钟时间。" }
    ],
    s4Audio: [
      { at: 0.5, srcs: ["assets/audio/s2/001.wav", "assets/audio/s2/002.wav", "assets/audio/s2/003.wav", "assets/audio/s2/004.wav", "assets/audio/s2/005.wav", "assets/audio/s2/006.wav", "assets/audio/s2/007.wav", "assets/audio/s2/008.wav", "assets/audio/s2/009.wav", "assets/audio/s2/010.wav", "assets/audio/s2/011.wav", "assets/audio/s2/012.wav"] }
    ],
    s5Dialog: [
      { key: "s5-plan-header", who: "ai", at: 0.0, audio: ["assets/audio/s2/013.wav"], text: "推荐集群编组方案如下：" },
      { key: "s5-eo-1", who: "ai", at: 0.0, audio: ["assets/audio/s2/014.wav"], text: "光电察打机10架<br>部署到潜在目标区1。" },
      { key: "s5-radar", who: "ai", at: 5.6, audio: ["assets/audio/s2/015.wav"], text: "雷达侦察机3架<br>部署到潜在目标区1。" },
      { key: "s5-eo-2", who: "ai", at: 9.8, audio: ["assets/audio/s2/016.wav"], text: "光电察打机10架<br>部署到潜在目标区2。" },
      { key: "s5-ew", who: "ai", at: 13.6, audio: ["assets/audio/s2/017.wav"], text: "电子侦察机6架<br>部署到潜在目标区2。" },
      { key: "s5-relay", who: "ai", at: 17.3, audio: ["assets/audio/s2/018.wav"], text: "中继通信机4架<br>部署保障通信。" }
    ],
    s5Audio: [
      { at: 0.5, srcs: ["assets/audio/s2/013.wav", "assets/audio/s2/014.wav", "assets/audio/s2/015.wav", "assets/audio/s2/016.wav", "assets/audio/s2/017.wav", "assets/audio/s2/018.wav"] }
    ],
    s6BlockUntil: 0,
    flow: ["SH-04", "SH-05", "SH-06"]
  };
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function variant(id, name, short, over) {
    var cfg = clone(BASE); cfg.id = id; cfg.name = name; cfg.short = short;
    Object.keys(over || {}).forEach(function (k) { cfg[k] = over[k]; });
    return cfg;
  }
  var S2 = variant("scene-1", "敏捷拒止布控", "场景一", {
    region: "沿海岛屿任务区",
    /* 总览机位：任务区（西南）与我方集结区（东北）同框；SH-04/05/06 共用，
       SH-06 的开场运镜从这个机位出发（见 scenes/s06-shell.js 的 S1_OVIEW） */
    camera: { center: [121.073, 24.850], zoom: 9.75, pitch: 30, bearing: -20 },
    coordText: "121.07300, 24.97800",
    mapBounds: [[118.60, 23.20], [123.60, 26.80]],
    minZoom: 8.5,
    area: {
      /* 任务区：以 121.0241, 24.8365 为中心 40x40km */
      mission: [[120.82616, 24.65562], [121.22204, 24.65562], [121.22204, 25.01738], [120.82616, 25.01738]],
      missionLabel: [121.02410, 24.83650],
      targets: [],
      /* 集结区：121.30, 25.121，4x4km */
      reserve: [[121.28021, 25.10291], [121.31979, 25.10291], [121.31979, 25.13909], [121.28021, 25.13909]],
      reserveLabel: [121.30000, 25.12100]
    },
    noFly: [],
    res: [{ k: "光电", img: "uav-blue.png", v: "48", c: "56,189,248" }, { k: "雷达", img: "uav-yellow.png", v: "24", c: "250,204,21" }, { k: "电子", img: "uav-red.png", v: "24", c: "248,113,113" }, { k: "通信", img: "uav-green.png", v: "24", c: "74,222,128" }],
    uavs: [
      { k: "光电无人机", name: "光电察打机", img: "uav-blue.png", c: "56,189,248", total: 48, avail: 48, caps: ["光电成像侦察", "跟踪", "打击"], used: 34, rest: 14 },
      { k: "雷达无人机", name: "雷达侦察机", img: "uav-yellow.png", c: "250,204,21", total: 24, avail: 24, caps: ["SAR 成像侦察", "GMTI 动目标侦察"], used: 8, rest: 16 },
      { k: "电子无人机", name: "电子侦察机", img: "uav-red.png", c: "248,113,113", total: 24, avail: 24, caps: ["电子侦察", "干扰诱骗"], used: 2, rest: 22 },
      { k: "通信无人机", name: "中继通信机", img: "uav-green.png", c: "74,222,128", total: 24, avail: 24, caps: ["中继", "通信", "数据"], used: 4, rest: 20 }
    ],
    groups: [
      { n: "编组1", k: "光电察打机", img: "uav-blue.png", v: 34 },
      { n: "编组2", k: "雷达侦察机", img: "uav-yellow.png", v: 8 },
      { n: "编组3", k: "电子侦察机", img: "uav-red.png", v: 2 },
      { n: "编组4", k: "中继通信机", img: "uav-green.png", v: 4 }
    ],
    /* 场景一气泡：at 只作兜底；有语音时由 s1 语音时长驱动（见 s03 的 startScenarioDialog） */
    s4Dialog: [
      { key: "s4-task-header", who: "ai", at: 0.0, audio: ["assets/audio/s1/001.wav"], text: "已接收任务指令，解析如下：" },
      { key: "s4-mission-requirement", who: "ai", at: 3.25, audio: ["assets/audio/s1/002.wav", "assets/audio/s1/003.wav", "assets/audio/s1/004.wav"], text: "发射侦察无人蜂群对任务区域1进行持续侦察监视，持续60分钟，上报识别目标并引导远程火力进行打击。" }
    ],
    s4Audio: [],
    s5Dialog: [
      { key: "s5-plan-header", who: "ai", at: 0.0, audio: ["assets/audio/s1/005.wav"], text: "推荐集群编组方案如下：" },
      { key: "s5-eo", who: "ai", at: 2.75, audio: ["assets/audio/s1/006.wav", "assets/audio/s1/007.wav"], text: "光电侦察无人机34架，执行光学遍历搜索和毁伤评估任务。" },
      { key: "s5-radar", who: "ai", at: 9.5, audio: ["assets/audio/s1/008.wav", "assets/audio/s1/009.wav"], text: "雷达侦察无人机6架，使用SAR成像模式对区域进行遍历搜索。" },
      { key: "s5-ew", who: "ai", at: 16.75, audio: ["assets/audio/s1/010.wav"], text: "电子侦察无人机2架，执行区域覆盖电子侦察任务。" },
      { key: "s5-relay", who: "ai", at: 22.5, audio: ["assets/audio/s1/011.wav"], text: "中继通信无人机4架 部署保障通信。" }
    ],
    s5Audio: [], s6Dialog: [], s6Audio: [],
    metrics: [{ k: "封控覆盖率", v: 91 }, { k: "边界完整度", v: 95 }, { k: "目标发现效率", v: 88 }, { k: "电子压制能力", v: 92 }, { k: "任务成功率", v: 89 }, { k: "资源利用率", v: 84 }],
    voice: []
  });
  var S3 = variant("scene-3", "要点防护", "场景三", {
    region: "北部要点防护区",
    camera: { center: [114.100, 39.880], zoom: 9.25, pitch: 38, bearing: -20 },
    area: {
      mission: [[114.02, 39.76], [114.78, 39.76], [114.78, 40.36], [114.02, 40.36]],
      targets: [{ name: "防护要点区-1", label: [114.38, 40.08], pts: [[114.28, 39.98], [114.48, 39.98], [114.48, 40.18], [114.28, 40.18]] }],
      reserve: [[113.92, 39.62], [114.00, 39.62], [114.00, 39.70], [113.92, 39.70]]
    },
    noFly: [{ n: "禁飞区-防护", lp: [114.55, 40.06], pts: [[114.42, 39.98], [114.68, 39.98], [114.68, 40.14], [114.42, 40.14]] }],
    res: [{ k: "光电", img: "uav-blue.png", v: "24", c: "56,189,248" }, { k: "雷达", img: "uav-yellow.png", v: "40", c: "250,204,21" }, { k: "电子", img: "uav-red.png", v: "18", c: "248,113,113" }, { k: "通信", img: "uav-green.png", v: "30", c: "74,222,128" }],
    uavs: [
      { k: "光电无人机", name: "光电察打机", img: "uav-blue.png", c: "56,189,248", total: 24, avail: 24, caps: ["光电成像侦察", "跟踪", "打击"], used: 12, rest: 12 },
      { k: "雷达无人机", name: "雷达侦察机", img: "uav-yellow.png", c: "250,204,21", total: 40, avail: 40, caps: ["SAR 成像侦察", "GMTI 动目标侦察"], used: 8, rest: 32 },
      { k: "电子无人机", name: "电子侦察机", img: "uav-red.png", c: "248,113,113", total: 18, avail: 18, caps: ["电子侦察", "干扰诱骗"], used: 4, rest: 14 },
      { k: "通信无人机", name: "中继通信机", img: "uav-green.png", c: "74,222,128", total: 30, avail: 30, caps: ["中继", "通信", "数据"], used: 6, rest: 24 }
    ],
    groups: [
      { n: "编组1", k: "雷达侦察机", img: "uav-yellow.png", v: 14 },
      { n: "编组2", k: "中继通信机", img: "uav-green.png", v: 6 },
      { n: "编组3", k: "光电察打机", img: "uav-blue.png", v: 12 },
      { n: "编组4", k: "电子侦察机", img: "uav-red.png", v: 4 }
    ],
    mapBounds: null,
    s4Dialog: [], s4Audio: [], s5Dialog: [], s5Audio: [], s6Dialog: [], s6Audio: [],
    metrics: [{ k: "要点防护率", v: 94 }, { k: "预警覆盖度", v: 96 }, { k: "通信稳定度", v: 95 }, { k: "目标识别效率", v: 90 }, { k: "任务成功率", v: 92 }, { k: "资源利用率", v: 88 }],
    voice: [
      { t: 1.5, who: "ai", text: "要点防护场景已加载，正在识别重点防护目标。" },
      { t: 5.0, who: "ai", text: "建议加强雷达预警和通信保障，建立多层防护圈。" },
      { t: 7.5, who: "user", text: "给出防护部署。" },
      { t: 9.5, who: "ai", text: "采用外围预警、要区防护和机动支援的分层防护方案。" }
    ]
  });
  var configs = { "scene-1": S2, "scene-2": BASE, "scene-3": S3 };
  window.SCENARIO_CONFIG = configs;
  window.SCENARIO_ORDER = ["scene-1", "scene-2"];
  window.APP_STATE = window.APP_STATE || { scenarioId: null, flow: [] };
  window.getScenarioConfig = function (id) { return configs[id] || null; };
  window.getSelectedScenario = function () { return configs[window.APP_STATE.scenarioId] || null; };
})();
