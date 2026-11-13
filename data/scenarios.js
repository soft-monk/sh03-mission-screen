/* 场景配置：地图区域、资源、AI语音、编组和后续流程。
   当前已实现的完整业务内容归属场景二；场景一、场景三为待设计占位分支。 */
(function () {
  var BASE = {
    id: "scene-2",
    name: "区域封控",
    short: "场景二",
    enabled: true,
    region: "东部区域封控区",
    camera: { center: [114.100, 39.880], zoom: 10.0, pitch: 38, bearing: -20 },
    mapBounds: [[113.20, 39.20], [116.40, 40.60]],
    minZoom: 10,
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
      { k: "光电无人机", img: "uav-blue.png", c: "56,189,248", total: 48, avail: 48, caps: ["侦察", "识别", "跟踪"], used: 20, rest: 28 },
      { k: "雷达无人机", img: "uav-yellow.png", c: "250,204,21", total: 32, avail: 32, caps: ["探测", "扫描", "测距"], used: 3, rest: 29 },
      { k: "电子无人机", img: "uav-red.png", c: "248,113,113", total: 28, avail: 28, caps: ["干扰", "压制", "侦测"], used: 6, rest: 22 },
      { k: "通信无人机", img: "uav-green.png", c: "74,222,128", total: 24, avail: 24, caps: ["中继", "通信", "数据"], used: 4, rest: 20 }
    ],
    res: [
      { k: "光电", img: "uav-blue.png", v: "48", c: "56,189,248" },
      { k: "雷达", img: "uav-yellow.png", v: "24", c: "250,204,21" },
      { k: "电子", img: "uav-red.png", v: "24", c: "248,113,113" },
      { k: "通信", img: "uav-green.png", v: "24", c: "74,222,128" }
    ],
    groups: [
      { n: "编组1", k: "光电无人机", img: "uav-blue.png", v: 10, target: "潜在目标部署区-1" },
      { n: "编组2", k: "光电无人机", img: "uav-blue.png", v: 10, target: "潜在目标部署区-2" },
      { n: "编组3", k: "电子无人机", img: "uav-red.png", v: 6, target: "潜在目标部署区-2" },
      { n: "编组4", k: "雷达无人机", img: "uav-yellow.png", v: 3, target: "潜在目标部署区-1" },
      { n: "编组5", k: "中继", img: "uav-green.png", v: 3, target: "" }
    ],
    reasons: ["大范围区域覆盖，提高整体态势感知能力", "通信中继保障稳定，支撑多域协同作战", "多方向侦察协同，增强目标发现效率", "电子压制能力强，压制敌方关键节点"],
    metrics: [{ k: "区域覆盖率", v: 93 }, { k: "链路稳定度", v: 96 }, { k: "目标发现效率", v: 91 }, { k: "电子压制能力", v: 94 }, { k: "任务成功率", v: 90 }, { k: "资源利用率", v: 86 }],
    voice: [],
    s4Dialog: [
      { key: "s4-task-header", who: "ai", at: 0.0, audio: ["assets/audio/001.wav"], text: "已接收任务指令，解析如下：" },
      { key: "s4-area-1", who: "ai", at: 0.0, audio: ["assets/audio/002.wav", "assets/audio/003.wav", "assets/audio/004.wav", "assets/audio/005.wav"], text: "潜在目标部署区1<br>中心点坐标：经度113.95度，纬度39.75度<br>区域形状：边长20km矩形<br>情报显示存在敌方机动装甲目标。" },
      { key: "s4-area-2", who: "ai", at: 14.7, audio: ["assets/audio/006.wav", "assets/audio/007.wav", "assets/audio/008.wav", "assets/audio/009.wav"], text: "潜在目标部署区2<br>中心点坐标：经度114.3度，纬度40.05度<br>区域形状：边长20km矩形<br>情报显示存在敌方雷达目标。" },
      { key: "s4-mission-requirement", who: "ai", at: 26.5, audio: ["assets/audio/010.wav"], text: "任务要求对两区域执行封控打击<br>持续40分钟时间。" }
    ],
    s4Audio: [
      { at: 0.5, srcs: ["assets/audio/001.wav", "assets/audio/002.wav", "assets/audio/003.wav", "assets/audio/004.wav", "assets/audio/005.wav", "assets/audio/006.wav", "assets/audio/007.wav", "assets/audio/008.wav", "assets/audio/009.wav", "assets/audio/010.wav"] }
    ],
    s5Dialog: [
      { key: "s5-plan-header", who: "ai", at: 0.0, audio: ["assets/audio/011.wav"], text: "推荐集群编组方案如下：" },
      { key: "s5-eo-1", who: "ai", at: 0.0, audio: ["assets/audio/012.wav"], text: "光电察打机10架<br>部署到潜在目标区1。" },
      { key: "s5-radar", who: "ai", at: 5.6, audio: ["assets/audio/013.wav"], text: "雷达侦察机3架<br>部署到潜在目标区1。" },
      { key: "s5-eo-2", who: "ai", at: 9.8, audio: ["assets/audio/014.wav"], text: "光电察打机10架<br>部署到潜在目标区2。" },
      { key: "s5-ew", who: "ai", at: 13.6, audio: ["assets/audio/015.wav"], text: "电子侦察机6架<br>部署到潜在目标区2。" },
      { key: "s5-relay", who: "ai", at: 17.3, audio: ["assets/audio/016.wav"], text: "中继通信机4架<br>部署保障通信。" }
    ],
    s5Audio: [
      { at: 0.5, srcs: ["assets/audio/011.wav", "assets/audio/012.wav", "assets/audio/013.wav", "assets/audio/014.wav", "assets/audio/015.wav", "assets/audio/016.wav"] }
    ],
    s6Dialog: [
      { key: "s6-06", who: "ai", at: 0.0, audio: ["assets/audio/017.wav"], text: "根据任务需求和编组方案，已生成蜂群作战方案。" },
      { key: "s6-07", who: "ai", at: 5.4, audio: ["assets/audio/018.wav", "assets/audio/019.wav"], text: "光电察打机10架<br>对于潜在目标区1网格化侦察<br>5分钟可完成区域遍历。" },
      { key: "s6-10", who: "ai", at: 12.3, audio: ["assets/audio/020.wav", "assets/audio/021.wav"], text: "雷达侦察机2架<br>使用GMTI模式<br>对于潜在目标区1，4分钟可完成区域遍历。" },
      { key: "s6-11", who: "ai", at: 19.2, audio: ["assets/audio/022.wav", "assets/audio/023.wav"], text: "雷达侦察机1架<br>使用SAR模式<br>对于潜在目标区1，40分钟可完成区域遍历。" },
      { key: "s6-08", who: "ai", at: 25.8, audio: ["assets/audio/024.wav", "assets/audio/025.wav"], text: "光电察打机10架<br>对于潜在目标区2网格化侦察<br>5分钟可完成区域遍历。" },
      { key: "s6-09", who: "ai", at: 32.3, audio: ["assets/audio/026.wav", "assets/audio/027.wav"], text: "电子侦察机6架<br>对于潜在目标区2广域协同搜索<br>6分钟可完成区域遍历。" }
    ],
    s6Audio: [
      { src: "assets/audio/001.wav" }, { src: "assets/audio/002.wav" }, { src: "assets/audio/003.wav" }, { src: "assets/audio/004.wav" }, { src: "assets/audio/005.wav" }, { src: "assets/audio/006.wav" }, { src: "assets/audio/007.wav" }, { src: "assets/audio/008.wav" }, { src: "assets/audio/009.wav" }, { src: "assets/audio/010.wav" }, { src: "assets/audio/011.wav" }, { src: "assets/audio/012.wav" }, { src: "assets/audio/013.wav" }, { src: "assets/audio/014.wav" }, { src: "assets/audio/015.wav" }, { src: "assets/audio/016.wav" }, { src: "assets/audio/017.wav" }, { src: "assets/audio/018.wav" }, { src: "assets/audio/019.wav" }, { src: "assets/audio/020.wav" }, { src: "assets/audio/021.wav" }, { src: "assets/audio/022.wav" }, { src: "assets/audio/023.wav" }, { src: "assets/audio/024.wav" }, { src: "assets/audio/025.wav" }, { src: "assets/audio/026.wav" }, { src: "assets/audio/027.wav" }, { src: "assets/audio/028.wav" }, { src: "assets/audio/029.wav" }, { src: "assets/audio/030.wav" }, { src: "assets/audio/031.wav" }, { src: "assets/audio/032.wav" }, { src: "assets/audio/033.wav" }, { src: "assets/audio/034.wav" }, { src: "assets/audio/035.wav" }, { src: "assets/audio/036.wav" }, { src: "assets/audio/037.wav" }, { src: "assets/audio/038.wav" }, { src: "assets/audio/039.wav" }, { src: "assets/audio/040.wav" }, { src: "assets/audio/041.wav" }, { src: "assets/audio/042.wav" }, { src: "assets/audio/043.wav" }, { src: "assets/audio/044.wav" }, { src: "assets/audio/045.wav" }, { src: "assets/audio/046.wav" }, { src: "assets/audio/047.wav" }
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
    /* 场景一：镜头锁定 zoom 11（离线瓦片只到 z11~z13，且兜底图不覆盖该纬度） */
    camera: { center: [121.073, 24.978], zoom: 11, pitch: 38, bearing: -20 },
    coordText: "121.07300, 24.97800",
    mapBounds: [[120.60, 24.40], [121.60, 25.40]],
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
      { k: "光电无人机", img: "uav-blue.png", c: "56,189,248", total: 48, avail: 48, caps: ["侦察", "识别", "跟踪"], used: 34, rest: 14 },
      { k: "雷达无人机", img: "uav-yellow.png", c: "250,204,21", total: 24, avail: 24, caps: ["探测", "扫描", "测距"], used: 8, rest: 16 },
      { k: "电子无人机", img: "uav-red.png", c: "248,113,113", total: 24, avail: 24, caps: ["干扰", "压制", "侦测"], used: 2, rest: 22 },
      { k: "通信无人机", img: "uav-green.png", c: "74,222,128", total: 24, avail: 24, caps: ["中继", "通信", "数据"], used: 4, rest: 20 }
    ],
    groups: [
      { n: "编组1", k: "光电无人机", img: "uav-blue.png", v: 34 },
      { n: "编组2", k: "雷达无人机", img: "uav-yellow.png", v: 8 },
      { n: "编组3", k: "电子无人机", img: "uav-red.png", v: 2 },
      { n: "编组4", k: "通信无人机", img: "uav-green.png", v: 4 }
    ],
    s4Dialog: [
      { key: "s4-task-header", who: "ai", at: 0.0, text: "任务分析：" },
      { key: "s4-area", who: "ai", at: 0.0, text: "沿海岛屿任务区<br>中心点坐标：经度121.02度，纬度24.84度<br>区域形状：边长40km矩形<br>情报显示：区域内岛屿与近岸目标分散，需全域覆盖侦察。" },
      { key: "s4-mission-requirement", who: "ai", at: 26.5, text: "上级任务要求<br>对沿海岛屿任务区全域执行侦察与封控<br>持续40分钟时间<br>按网格化分区覆盖，确保无盲区。" }
    ],
    s4Audio: [],
    s5Dialog: [
      { key: "s5-plan-header", who: "ai", at: 0.0, text: "推荐编组方案：" },
      { key: "s5-eo", who: "ai", at: 0.0, text: "光电无人机34架，部署到沿海岛屿任务区，负责全域目标探测与扫描。" },
      { key: "s5-radar", who: "ai", at: 5.5, text: "雷达无人机8架，部署到沿海岛屿任务区，负责全域目标探测与扫描。" },
      { key: "s5-ew", who: "ai", at: 11.0, text: "电子无人机2架，部署到沿海岛屿任务区，负责电子侦察与压制。" },
      { key: "s5-relay", who: "ai", at: 16.5, text: "通信无人机4架，随队部署，负责通信中继与数据回传。" }
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
      { k: "光电无人机", img: "uav-blue.png", c: "56,189,248", total: 24, avail: 24, caps: ["侦察", "识别", "跟踪"], used: 12, rest: 12 },
      { k: "雷达无人机", img: "uav-yellow.png", c: "250,204,21", total: 40, avail: 40, caps: ["探测", "扫描", "测距"], used: 8, rest: 32 },
      { k: "电子无人机", img: "uav-red.png", c: "248,113,113", total: 18, avail: 18, caps: ["干扰", "压制", "侦测"], used: 4, rest: 14 },
      { k: "通信无人机", img: "uav-green.png", c: "74,222,128", total: 30, avail: 30, caps: ["中继", "通信", "数据"], used: 6, rest: 24 }
    ],
    groups: [
      { n: "编组1", k: "雷达无人机", img: "uav-yellow.png", v: 14 },
      { n: "编组2", k: "通信无人机", img: "uav-green.png", v: 6 },
      { n: "编组3", k: "光电无人机", img: "uav-blue.png", v: 12 },
      { n: "编组4", k: "电子无人机", img: "uav-red.png", v: 4 }
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
  window.SCENARIO_ORDER = ["scene-1", "scene-2", "scene-3"];
  window.APP_STATE = window.APP_STATE || { scenarioId: null, flow: [] };
  window.getScenarioConfig = function (id) { return configs[id] || null; };
  window.getSelectedScenario = function () { return configs[window.APP_STATE.scenarioId] || null; };
})();
