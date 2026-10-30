/* SH-03 任务态势：仿 mission-app 态势主界面
   左侧菜单栏 + 浮动工具条 + 右侧 AI 任务分析 + 底部状态栏 + 场景选择
   地图上不放任何区域图元，也不放无人机 */
window.SCENES = window.SCENES || {};

(function () {
function make(variant) {
  /* SH-03 进入 / 复位的固定机位：一次到位，不做动画 */
  var CAM03 = { center: [115.345, 39.809], zoom: 9.13, pitch: 38 };
  var IS_MISSION = variant === "mission";
  /* "frame" = 主框架（只有外壳，可复用）；"bare" 是旧名字，保留兼容 */
  var IS_BARE = (variant === "frame" || variant === "plan" || variant === "bare");   /* 都是"基于外壳" */
  var IS_PLAN = (variant === "plan" || variant === "bare");                          /* 三栏 + 确认按钮只在 SH-05 */
  var IS_SELECT = variant === "select";     /* 只有 SH-03 才有场景卡和提示条 */
  var hideHook = null;                        /* 本屏退场时的清理动作（SH-06 用） */
  var MENU = [
    { k: "态势", icon: "crosshair", on: true },
    { k: "任务", icon: "target" },
    { k: "目标", icon: "flag" },
    { k: "资源", icon: "nodes" },
    { k: "告警", icon: "bell" },
    { k: "设置", icon: "gear" }
  ];
  var TOOLS = ["浏览", "+ 新建", "量算", "场景", "计划", "图层", "复位"];
  var STATUS = [
    { icon: "check", k: "系统状态", v: "就绪", on: true },
    { icon: "wifi", k: "无人机状态", v: "在线", on: true },
    { icon: "link", k: "数据链路", v: "稳定", on: true },
    { icon: "pin", k: "定位状态", v: "正常", on: true },
    { icon: "chip", k: "AI决策引擎", v: "就绪", on: true },
    { icon: "shield", k: "安全状态", v: "安全", on: true }
  ];
  var CARDS = [
    { n: "场景一", t: "敏捷拒止布控", on: true },
    { n: "场景二", t: "区域封控（待设计）", on: false },
    { n: "场景三", t: "要点防护（待设计）", on: false }
  ];
  /* SH-04 的语音播报：时间点是"场景内秒"，与时间轴 27.5/31.0/33.5/35.5 对应（26 秒起播） */
  var VOICE = [
    { t: 1.5, who: "ai", text: "已完成战场态势建模，当前区域存在三类任务模式匹配结果。" },
    { t: 5.0, who: "ai", text: "检测到固定通信受限、敌方纵深防御明显，建议构建前沿局部任务体系。" },
    { t: 7.5, who: "user", text: "好的，解读一下。" },
    { t: 9.5, who: "ai", text: "敌方呈分散防御结构，通信节点暴露度较高，建议优先构建前沿局部任务体系，先侦察后打击。" }
  ];
  /* SH-05 三栏数据 */
  var UAVS = [
    { k: "光电无人机", img: "uav-blue.png",   c: "56,189,248",  total: 48, avail: 48, caps: ["侦察", "识别", "跟踪"], used: 20, rest: 28 },
    { k: "雷达无人机", img: "uav-yellow.png", c: "250,204,21",  total: 32, avail: 32, caps: ["探测", "扫描", "测距"], used: 3,  rest: 29 },
    { k: "电子无人机", img: "uav-red.png",    c: "248,113,113", total: 28, avail: 28, caps: ["干扰", "压制", "侦测"], used: 6,  rest: 22 },
    { k: "通信无人机", img: "uav-green.png",  c: "74,222,128",  total: 24, avail: 24, caps: ["中继", "通信", "数据"], used: 4,  rest: 20 }
  ];
  /* 每个编组只用一种机型，不同编组可以用同一种 */
  var GROUPS = [
    { n: "编组1", k: "光电无人机", img: "uav-blue.png",   v: 20 },
    { n: "编组2", k: "通信无人机", img: "uav-green.png",  v: 4 },
    { n: "编组3", k: "电子无人机", img: "uav-red.png",    v: 6 },
    { n: "编组4", k: "雷达无人机", img: "uav-yellow.png", v: 3 }
  ];
  var REASONS = [
    "大范围区域覆盖，提高整体态势感知能力",
    "通信中继保障稳定，支撑多域协同作战",
    "多方向侦察协同，增强目标发现效率",
    "电子压制能力强，压制敌方关键节点"
  ];
  var METRICS = [
    { k: "区域覆盖率", v: 93 }, { k: "链路稳定度", v: 96 }, { k: "目标发现效率", v: 91 },
    { k: "电子压制能力", v: 94 }, { k: "任务成功率", v: 90 }, { k: "资源利用率", v: 86 }
  ];  var RES = [
    { k: "光电", img: "uav-blue.png", v: "48", c: "56,189,248" },
    { k: "雷达", img: "uav-yellow.png", v: "24", c: "250,204,21" },
    { k: "电子", img: "uav-red.png", v: "24", c: "248,113,113" },
    { k: "通信", img: "uav-green.png", v: "24", c: "74,222,128" }
  ];
  /* 区域（真实经纬度）—— 只服务平面版
     任务区：80 x 80 km（用户给定四角），中心 114.098 / 39.883
     集结区：4 x 4 km，中心 116.38 / 39.87（东侧城区）
     潜在目标部署区：2 个，各约 5 x 5 km 的 6 点不规则多边形，都在任务区内的山地里（一北一南） */
  var AREA = {
    /* 任务区：用户给的 4 个顶点，约 80 x 82 km */
    mission: [[113.62960, 39.51435], [114.56639, 39.51435], [114.56639, 40.25096], [113.62960, 40.25096]],
    /* 潜在目标部署区：2 个 20x20km 矩形，位于 80x80km 任务区内（一南一北错开） */
    targets: [
      { name: "潜在目标部署区-1", label: [113.9500, 39.7500], pts: [[113.8332, 39.6600], [114.0668, 39.6600], [114.0668, 39.8400], [113.8332, 39.8400]] },
      { name: "潜在目标部署区-2", label: [114.3000, 40.0500], pts: [[114.1832, 39.9600], [114.4168, 39.9600], [114.4168, 40.1400], [114.1832, 40.1400]] }
    ],
    /* 禁飞区：用户给的 6 个顶点 */
    noFly: [[115.76302, 39.79017], [115.76302, 39.77525], [115.75437, 39.76415], [115.77416, 39.75983], [115.77600, 39.77624], [115.78253, 39.78558]],
    /* 走廊上的新增禁飞区：禁飞-2 (10x10km) / 禁飞-3 (10x9km) */
  noFly2: [[115.29160, 39.77500], [115.40840, 39.77500], [115.40840, 39.86500], [115.29160, 39.86500]],
  noFly3: [[114.74160, 39.85950], [114.85840, 39.85950], [114.85840, 39.94050], [114.74160, 39.94050]],
  /* 气象威胁区：wx-1 (14x12km) / wx-2 (12x12km) */
  wx1: [[115.51820, 39.66600], [115.68180, 39.66600], [115.68180, 39.77400], [115.51820, 39.77400]],
  wx2: [[114.97990, 39.70600], [115.12010, 39.70600], [115.12010, 39.81400], [114.97990, 39.81400]],
  /* 集结区：中心 115.95742 / 39.74206，4x4km */
    reserve: [[115.93399, 39.72405], [115.98085, 39.72405], [115.98085, 39.76007], [115.93399, 39.76007]]
  };
  var AO = { lon: 116.218, lat: 39.920 };

  function row(k, v, c) {
    return '<div class="s3-row"><span>' + k + '</span><b style="color:' + c + '">' + v + '</b></div>';
  }

  function build(root, sc) {
    var VOICE_HTML = IS_MISSION
      ? ('<section class="s4-voice">' +
          '<div class="s4-left"><div class="s4-title">AI 决策助手</div>' +
            '<div class="s4-btn">' + ic("mic", 18, "", 1.5) + '<span>AI语音解读</span></div></div>' +
          '<div class="s4-chat">' + VOICE.map(function (v) {
              return '<div class="s4-bub ' + v.who + '">' + v.text + '</div>';
            }).join("") + '</div>' +
          '<div class="s4-mic">' + ic("mic", 36, "", 1.6) + '</div>' +
        '</section>')
      : "";
    /* SH-05 三栏：左 无人机类型列表 / 中 推荐方案 / 右 推荐理由 + 预期效果 */
    var FRAME_HTML = IS_PLAN
      ? ('<aside class="s5-uav">' +
          '<div class="s5-h"><span>无人机类型列表</span><i>i</i></div>' +
          UAVS.map(function (u) {
            return '<div class="s5-uc" style="--c:' + u.c + '">' +
              '<div class="s5-top"><img src="assets/img/' + u.img + '" alt="">' +
                '<div class="s5-info"><b>' + u.k + '</b>' +
                  '<div class="s5-kv"><span>总数量</span><em>' + u.total + '</em></div>' +
                  '<div class="s5-kv"><span>可用数量</span><em>' + u.avail + '</em></div>' +
                '</div></div>' +
              '<div class="s5-cap"><span>任务能力</span>' + u.caps.map(function (c) { return '<i>' + c + '</i>'; }).join("") + '</div>' +
              '<div class="s5-al"><span>当前分配</span><b class="ok">已分配 ' + u.used + '</b><b class="wn">待分配 ' + u.rest + '</b></div>' +
            '</div>';
          }).join("") +
        '</aside>' +
        '<section class="s5-plan">' +
          '<div class="s5-ph"><b>推荐方案</b><i>AI推荐</i></div>' +
          GROUPS.map(function (g) {
            return '<div class="s5-g">' +
              '<div class="s5-gn">' + g.n + '</div>' +
              '<div class="s5-gk"><img src="assets/img/' + g.img + '" alt="">' + g.k.replace("无人机", "") + '</div>' +
              '<div class="s5-gv">' + g.v + '<em>架</em></div>' +
            '</div>';
          }).join("") +
        '</section>' +
        '<section class="s5-why">' +
          '<div class="s5-wh">推荐理由</div>' +
          '<ul class="s5-ul">' + REASONS.map(function (r) { return '<li>' + r + '</li>'; }).join("") + '</ul>' +
          '<div class="s5-wh">预期效果</div>' +
          '<div class="s5-metrics">' + METRICS.map(function (m) {
            return '<div class="s5-m"><span>' + m.k + '</span><b>' + m.v + '<i>%</i></b></div>';
          }).join("") + '</div>' +
        '</section>' +
        '<div class="s5-confirm"><i>&raquo;</i><span>确认推荐方案</span><i>&raquo;</i></div>')
      : "";

    /* SH-06 顶部工具条右侧：资源概况（在用/损毁/待用 合并为 20/0/28） */
    var RES6_HTML = (sc && sc.id === "SH-06")
      ? ('<section class="s6-res">' +
          '<div class="s6-grid">' +
            UAVS.map(function (u) {
              return '<div class="s6-col" data-uav="' + u.k + '" data-used="' + u.used + '" data-rest="' + u.rest + '" style="--c:' + u.c + '">' +
                '<img src="assets/img/' + u.img + '" alt="">' +
                '<div class="lb">' + u.k.replace("无人机", "") + '</div>' +
                '<div class="s6-nums"><b class="g s6-used">' + u.used + '</b><i>/</i><b class="r s6-lost">0</b><i>/</i><b class="b s6-rest">' + u.rest + '</b></div>' +
              '</div>';
            }).join("") +
          '</div>' +
        '</section>')
      : "";

    var SH06_RIGHT_HTML = "";
    if (sc && sc.id === "SH-06") {
      SH06_RIGHT_HTML =
        '<section class="s6-right">' +
          '<div class="s6-toolbox">' +
            '<div class="s6-toolbox-h"><span>目标</span><b class="s6-target-count">0</b></div>' +
            '<div class="s6-tb s6-target-item open" data-target="001" style="display:none">' +
              '<div class="s6-tb-head">' +
                '<span class="s6-tb-no">001</span>' +
                '<span class="s6-tb-name">001预警雷达</span>' +
                '<i class="s6-tb-sus">疑似</i>' +
                '<i class="s6-tb-arrow"></i>' +
              '</div>' +
              '<div class="s6-tb-body">' +
                '<div class="s6-tb-row"><span>类型</span><b>雷达目标</b></div>' +
                '<div class="s6-tb-row"><span>判定</span><b class="sus s6-tb-judge">疑似（未经确认）</b></div>' +
                '<div class="s6-tb-row"><span>来源</span><b>电子干扰机-01</b></div>' +
                '<div class="s6-tb-row"><span>区域</span><b>潜在目标部署区-2</b></div>' +
                '<div class="s6-tb-tags"><i>疑似雷达信号</i><i>待复核</i></div>' +
              '</div>' +
            '</div>' +
            '<div class="s6-tb s6-target-item open" data-target="002" style="display:none">' +
              '<div class="s6-tb-head">' +
                '<span class="s6-tb-no">002</span>' +
                '<span class="s6-tb-name">002火控雷达</span>' +
                '<i class="s6-tb-sus">疑似</i>' +
                '<i class="s6-tb-arrow"></i>' +
              '</div>' +
              '<div class="s6-tb-body">' +
                '<div class="s6-tb-row"><span>类型</span><b>雷达目标</b></div>' +
                '<div class="s6-tb-row"><span>判定</span><b class="sus s6-tb-judge">疑似（未经确认）</b></div>' +
                '<div class="s6-tb-row"><span>来源</span><b>电子干扰机-01</b></div>' +
                '<div class="s6-tb-row"><span>区域</span><b>潜在目标部署区-2</b></div>' +
                '<div class="s6-tb-tags"><i>疑似雷达信号</i><i>待复核</i></div>' +
              '</div>' +
            '</div>' +
            '<div class="s6-tb s6-target-item open" data-target="003" style="display:none">' +
              '<div class="s6-tb-head">' +
                '<span class="s6-tb-no">003</span>' +
                '<span class="s6-tb-name">003运动目标</span>' +
                '<i class="s6-tb-sus">疑似</i>' +
                '<i class="s6-tb-arrow"></i>' +
              '</div>' +
              '<div class="s6-tb-body">' +
                '<div class="s6-tb-row"><span>类型</span><b>地面运动目标</b></div>' +
                '<div class="s6-tb-row"><span>判定</span><b class="sus s6-tb-judge">疑似（未经确认）</b></div>' +
                '<div class="s6-tb-row"><span>来源</span><b>GMTI雷达</b></div>' +
                '<div class="s6-tb-row"><span>区域</span><b>潜在目标部署区-1</b></div>' +
                '<div class="s6-tb-row"><span>速度</span><b>90 km/h</b></div>' +
                '<div class="s6-tb-row"><span>方位</span><b>045° / 东北</b></div>' +
                '<div class="s6-tb-tags"><i>运动目标</i><i>待复核</i></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<section class="s6-ai">' +
            '<div class="s6-ai-h">' + ic("mic", 16, "", 1.6) + '<span>AI决策助手</span></div>' +
            '<div class="s6-chat s6-chat-scroll">' +
              '<div class="s6-ai-log"></div>' +
            '</div>' +
          '</section>' +
        '</section>';
    }

    var SH06_VIDEO_HTML = (sc && sc.id === "SH-06")
      ? ('<div class="s6-video-source">' +
          '<video class="s6-video-a" src="assets/video/goal001_A_ir.mp4" muted playsinline preload="auto"></video>' +
          '<video class="s6-video-b" src="assets/video/goal001_B_ir.mp4" muted playsinline preload="auto"></video>' +
          '<video class="s6-video-c" src="assets/video/goal001_A_ir.mp4" muted playsinline preload="auto"></video>' +
          '<video class="s6-video-d" src="assets/video/goal001_B_ir.mp4" muted playsinline preload="auto"></video>' +
          '<video class="s6-video-e" src="assets/video/goal001_A_ir.mp4" muted playsinline preload="auto"></video>' +
          '<video class="s6-video-f" src="assets/video/goal001_B_ir.mp4" muted playsinline preload="auto"></video>' +
        '</div>' +
        '<section class="s6-video-smallbar">' +
          '<div class="s6-video-card s6-video-small-card" data-video="A">' +
            '<div class="s6-video-title">17光电-攻击｜002火控雷达</div>' +
            '<canvas class="s6-video-small-canvas" data-video="A"></canvas>' +
          '</div>' +
          '<div class="s6-video-card s6-video-small-card" data-video="B">' +
            '<div class="s6-video-title">18光电-侦察｜002火控雷达</div>' +
            '<canvas class="s6-video-small-canvas" data-video="B"></canvas>' +
          '</div>' +
          '<div class="s6-video-card s6-video-small-card s6-video-extra" data-video="C" style="display:none">' +
            '<div class="s6-video-title">14光电-攻击｜001预警雷达</div>' +
            '<canvas class="s6-video-small-canvas" data-video="C"></canvas>' +
          '</div>' +
          '<div class="s6-video-card s6-video-small-card s6-video-extra" data-video="D" style="display:none">' +
            '<div class="s6-video-title">15光电-侦察｜001预警雷达</div>' +
            '<canvas class="s6-video-small-canvas" data-video="D"></canvas>' +
          '</div>' +
          '<div class="s6-video-card s6-video-small-card s6-video-third" data-video="E" style="display:none">' +
            '<div class="s6-video-title">09光电-攻击｜003运动目标</div>' +
            '<canvas class="s6-video-small-canvas" data-video="E"></canvas>' +
          '</div>' +
          '<div class="s6-video-card s6-video-small-card s6-video-third" data-video="F" style="display:none">' +
            '<div class="s6-video-title">10光电-侦察｜003运动目标</div>' +
            '<canvas class="s6-video-small-canvas" data-video="F"></canvas>' +
          '</div>' +
        '</section>' +
        '<section class="s6-video-large"><div class="s6-video-grid"></div></section>')
      : "";

    root.innerHTML =
      '<div class="s3-map"></div>' +
      '<aside class="s3-menu"></aside>' +
      '<div class="s3-toprow"><div class="s3-toolbar"></div>' + RES6_HTML + '</div>' +
      '<section class="s3-side"></section>' +
      '<div class="s3-scale"><b></b><span>2 km</span></div>' +
      '<div class="s3-coord">116.53850, 39.76102</div>' +
      (IS_SELECT ? '<div class="s3-cards"></div><div class="s3-prompt">请选择任务场景</div>' : (IS_MISSION ? VOICE_HTML : FRAME_HTML)) +
      SH06_RIGHT_HTML +
      SH06_VIDEO_HTML +
      '<button class="s3-mic">' + ic("mic", 26, "", 1.7) + '</button>' +
      '<footer class="s3-status"></footer>';


    [].slice.call(root.querySelectorAll(".s6-tb-head")).forEach(function (head) {
      head.addEventListener("click", function () {
        var item = head.parentNode;
        item.classList.toggle("open");
      });
    });
    /* 共享同一块地图：后面每一屏都复用，不重建 */
    var mapHost = root.querySelector(".s3-map");
    var map = MapViewShared(mapHost);
    if (map.onMoveEnd) map.onMoveEnd(root);
    var areaEls = [];
    var labelEls = [];

    /* 任务区：80x80km 橙黄色实线 */
    map.polygon("area-mission", AREA.mission, { fill: "#f59e0b", fillOpacity: 0, line: "#f59e0b", width: 5.5 });
    areaEls.push({ id: "area-mission", delay: 1.6 });
    labelEls.push({ h: map.label("任务区", [113.7900, 39.9400], "#fbbf24", 17), delay: 1.6 });

    /* 潜在目标部署区：2 个红色实线矩形（20x20km），无填充 */
    AREA.targets.forEach(function (tg, ti) {
      var tid = "area-target-" + ti;
      map.polygon(tid, tg.pts, { fill: "#ef4444", fillOpacity: 0, line: "#ef4444", width: 4.5 });
      areaEls.push({ id: tid, delay: 2.05 + ti * 0.22 });
      labelEls.push({ h: map.label(tg.name, tg.label, "#fca5a5", 15), delay: 2.05 + ti * 0.22 });
    });

    /* 禁飞区：红实线、无填充、无虚线。
       点位来自《态势计划-2026-10-22.json》（相邻重复顶点已去掉），
       外加原来的东侧禁飞区；编号按地理从西到东统一排布。 */
    var NOFLY = [
      { n: "禁飞区1", lp: [114.70333,39.88654], pts: [[114.54986,39.85959],[114.54534,39.81695],[114.63454,39.79919],[114.6471,39.83123],[114.69333,39.85322],[114.69183,39.88254],[114.62298,39.84647]] },
      { n: "禁飞区2", lp: [114.78706,39.97709], pts: [[114.75939,39.97309],[114.74049,39.95014],[114.7562,39.92624],[114.75497,39.90101],[114.77044,39.90364],[114.77338,39.94393],[114.77706,39.9635]] },
      { n: "禁飞区3", lp: [114.96004,40.05412], pts: [[114.83479,40.0172],[114.86133,39.9889],[114.90867,39.99687],[114.94363,39.99704],[114.95004,40.01313],[114.92327,40.03634],[114.8965,40.05012],[114.86865,40.02292]] },
      { n: "禁飞区4", lp: [115.01932,40.08641], pts: [[114.97403,40.07834],[114.98344,40.05206],[115.00393,40.05263],[115.00932,40.06751],[114.99228,40.08241]] },
      { n: "禁飞区5", lp: [115.33519,39.67953], pts: [[115.24096,39.61757],[115.25663,39.61131],[115.32519,39.65365],[115.30532,39.67454],[115.26237,39.67553],[115.26262,39.64167]] },
      { n: "禁飞区6", lp: [115.32911,39.90649], pts: [[115.28945,39.8904],[115.29981,39.85772],[115.31911,39.86208],[115.30946,39.90249]] },
      { n: "禁飞区7", lp: [115.43632,39.83947], pts: [[115.35244,39.83547],[115.39506,39.80506],[115.39355,39.77697],[115.39961,39.75717],[115.41135,39.75848],[115.42575,39.79939],[115.42632,39.82689],[115.40302,39.82093],[115.39677,39.82122]] },
      { n: "禁飞区8", lp: [115.42508,40.02673], pts: [[115.40213,40.02273],[115.39217,39.99702],[115.39916,39.98456],[115.41164,39.98825],[115.41508,40.01422]] },
      { n: "禁飞区9", lp: [115.79253,39.79417], pts: [[115.76302,39.79017],[115.76302,39.77525],[115.75437,39.76415],[115.77416,39.75983],[115.776,39.77624],[115.78253,39.78558]] }
    ];
    NOFLY.forEach(function (z, i) {
      map.polygon("area-nf" + (i + 1), z.pts, { fill: "#ef4444", fillOpacity: 0, line: "#ef4444", width: 4.5 });
      areaEls.push({ id: "area-nf" + (i + 1), delay: 2.45 });
      labelEls.push({ h: map.label(z.n, z.lp, "#fca5a5", 15), delay: 2.45 });
    });

    /* 我方集结区：绿色虚线 4x4km */
    map.polygon("area-reserve", AREA.reserve, { fill: "#22c55e", fillOpacity: 0.16, line: "#22c55e", width: 5, dash: [2.4, 1.6] });
    areaEls.push({ id: "area-reserve", delay: 2.75 });
    labelEls.push({ h: map.label("我方集结区", [115.9320, 39.7660], "#4ade80", 16), delay: 2.75 });

    /* 区域与标签不做淡入：建图即 100% 显示（预热期间就已经是最终画面） */
    areaEls.forEach(function (o) { map.setArea(o.id, 1); });
    labelEls.forEach(function (o) { o.h.set(1); });

    root.querySelector(".s3-menu").innerHTML = MENU.map(function (m) {
      return '<div class="s3-mi' + (m.on ? " on" : "") + '">' + ic(m.icon, 26, "", 1.55) + '<span>' + m.k + '</span></div>';
    }).join("");

    root.querySelector(".s3-toolbar").innerHTML = '<i class="s3-collapse">&laquo;</i>' +
      TOOLS.map(function (t, i) { return '<b class="' + (i === 0 ? "on" : "") + '">' + t + '</b>'; }).join("");
    /* 工具条：目前只有"复位"有行为——把相机拉回当前时间点的机位 */
    if (IS_PLAN) {
      var cf = root.querySelector(".s5-confirm");
      if (cf) cf.addEventListener("click", function () {
        var P = window.PLAYER; if (P) { P.seek(61); P.play(); }
      });
    }

    root.querySelector(".s3-toolbar").addEventListener("click", function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest("b") : null;
      if (!b) return;
      if (b.textContent === "复位") map.resetView();
    });

    root.querySelector(".s3-side").innerHTML =
      '<div class="s3-panel">' +
      '<div class="s3-sh">AI 任务分析</div>' +
      '<div class="s3-rows">' +
        row("当前区域威胁等级", "中", "#fbbf24") +
        row("敌方防御强度", "强", "#f87171") +
        row("通信干扰强度", "中", "#fbbf24") +
      '</div>' +
      '<div class="s3-desc-h">态势简述</div>' +
      '<div class="s3-desc">敌方呈分散防御结构，通信节点暴露度较高，建议优先构建前沿局部任务体系，先侦察后打击。</div>' +
      '</div>' +
      (IS_MISSION
        ? '<div class="s3-panel">' +
            '<div class="s3-tih">任务信息</div>' +
            '<div class="s3-tir"><span>任务名称</span><b>敏捷拒止布控（演示）</b></div>' +
            '<div class="s3-tir"><span>任务类型</span><b>侦察 / 打击</b></div>' +
            '<div class="s3-tir"><span>任务区域</span><b>西南方向山区</b></div>' +
            '<div class="s3-tir"><span>任务时间</span><b>2024-06-28 15:14</b></div>' +
            '<div class="s3-tir"><span>任务状态</span><b class="warn">任务准备中</b></div>' +
          '</div>' +
          '<div class="s3-go"><i>&raquo;</i><span>进入任务执行</span><i>&raquo;</i></div>'
        : '<div class="s3-panel s3-res">' +
            '<div class="s3-res-h">' + ic("nodes", 18, "", 1.6) + '<span>资源概况</span></div>' +
            '<div class="s3-grid">' +
              RES.map(function (r) {
                return '<div class="s3-col" style="--glow:rgba(' + r.c + ',.55)"><div class="lb">' + r.k + '</div>' +
                  '<img src="assets/img/' + r.img + '" alt="">' +
                  '<div class="num">' + r.v + '</div></div>';
              }).join("") +
            '</div>' +
          '</div>');

    if (IS_BARE) {
      var sideEl0 = root.querySelector(".s3-side");
      sideEl0.innerHTML = "";
      sideEl0.style.display = "none";
    }

    /* SH-06：把离线算好的 A* 航路画上去（data/routes.js，不在运行时计算） */
    if (sc && sc.id === "SH-06" && window.ROUTES) {
      window.ROUTES.forEach(function (r) {
        map.path("route-" + r.id, r.pts, { color: r.color, width: 3 });
        var mid = r.mid || r.pts[Math.floor(r.pts.length / 2)];
        labelEls.push({ h: map.label(r.name, mid, r.color, 15) });
      });
    }

    /* ---------- SH-06：飞行演示（进度条 / 倍速 / 开始执行） ---------- */
    if (sc && sc.id === "SH-06" && window.FLIGHT06) {
      ["blue", "yellow", "red", "green"].forEach(function (c) { map.image("uav-" + c, "assets/img/uav-" + c + ".png"); });
      var FL = window.FLIGHT06;
      var ctlHTML = '<section class="s6-ctl">' +
        '<div class="s6-line">' +
          '<button class="s6-go">开始执行</button>' +
          '<div class="s6-spds">' + [1, 2, 4, 8, 16, 32].map(function (v) {
            return '<b data-s="' + v + '"' + (v === 8 ? ' class="on"' : '') + '>' + v + '×</b>';
          }).join("") + '</div>' +
          '<div class="s6-tm"><b>00:00</b> / <span class="s6-tot">30:00</span></div>' +
        '</div>' +
        '<div class="s6-bar"><div class="s6-segs"></div><i class="s6-fill"></i><s class="s6-knob"></s></div>' +
        '<div class="s6-seglbls"></div>' +
      '</section>';
      root.insertAdjacentHTML("beforeend", ctlHTML);

      var ctl = root.querySelector(".s6-ctl");
      var bar = ctl.querySelector(".s6-bar"), fill = bar.querySelector(".s6-fill"), knob = bar.querySelector(".s6-knob");
      var segsBox = bar.querySelector(".s6-segs"), segLbls = ctl.querySelector(".s6-seglbls");
      var goBtn = ctl.querySelector(".s6-go"), tmLbl = ctl.querySelector(".s6-tm b");
      var phLbl = ctl.querySelector(".s6-ph");
      var totLbl = ctl.querySelector(".s6-tot");
      var spds = [].slice.call(ctl.querySelectorAll(".s6-spds b"));
      var st = { t: 0, speed: 8, run: false, started: false, last: 0, acc: 0 };
      var COLORS = { blue: "#38bdf8", yellow: "#facc15", red: "#f87171", green: "#4ade80" };

      var targetItems = [].slice.call(root.querySelectorAll(".s6-target-item"));
      var targetCountEl = root.querySelector(".s6-target-count");
      var targetOn = false;
      var T_SCAN = 3900;
      var T_VIDEO_002 = 4212.80;
      var T_CONFIRM_002 = 4212.81;
      var T_EXTRA_VIDEO = 4247.13;
      var T_CONFIRM_001 = 4247.14;
      var T003_SCAN = 4500.00;
      var RADAR_ICON_YELLOW = "data:image/png;base64,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";
      var RADAR_ICON_RED = "data:image/png;base64,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";
      var T003_ASSIGN = 4505.00;
      var T003_VIDEO = 4737.00;
      var T003_CONFIRM = 4737.10;
      var T003_DESTROY = 4820.00;
      var MAP_M_LON = 111320 * Math.cos(39.85 * Math.PI / 180);
      var MAP_M_LAT = 111030;
      var SUSPECTS = [
        { id: "s6-suspect-1", confirmedId: "s6-confirm-1", no: "001", name: "001预警雷达", center: [114.34, 40.02], label: [114.352, 40.024], confirmAt: T_CONFIRM_001 },
        { id: "s6-suspect-2", confirmedId: "s6-confirm-2", no: "002", name: "002火控雷达", center: [114.28, 40.08], label: [114.292, 40.084], confirmAt: T_CONFIRM_002 },
          { id: "s6-suspect-3", confirmedId: "s6-confirm-3", no: "003", name: "003运动目标", center: [113.86273, 39.70515], label: [113.875, 39.719], confirmAt: T003_CONFIRM, unlockAt: T003_SCAN, move: { start: [113.86273, 39.70515], speed: 90, heading: 45 } }
      ];
      var SR = 0.009;
      var targetsCreated = false;
      var confirmedState = { "001": null, "002": null, "003": null };
      var destroyedState = { "001": null, "002": null, "003": null };
      var renderedDestroyed = { "001": null, "002": null, "003": null };
      var itemByNo = {};
      targetItems.forEach(function (el) { itemByNo[el.getAttribute("data-target")] = el; });
      function ensureTargets() {
        if (targetsCreated) return;
        targetsCreated = true;
        SUSPECTS.forEach(function (s) {
          var c = s.center;
          var ring = [
            [c[0], c[1] + SR],
            [c[0] + SR * 1.2, c[1]],
            [c[0], c[1] - SR],
            [c[0] - SR * 1.2, c[1]],
            [c[0], c[1] + SR]
          ];
          map.polygon(s.id, ring, { fill: "#f59e0b", fillOpacity: 0.22, line: "#f59e0b", width: 2.4 });
          map.polygon(s.confirmedId, ring, { fill: "#ef4444", fillOpacity: 0.3, line: "#ef4444", width: 3 });
          s.targetLabel = map.label(s.name + "（疑似）", s.label, "#fbbf24", 14, "target-label-" + s.no);
          if (s.no !== "003" && map.targetIcon) s.targetIcon = map.targetIcon("target-icon-" + s.no, s.center, RADAR_ICON_YELLOW, RADAR_ICON_RED, 36);
        });
      }
      function setTargetItemState(s, confirmed, destroyed) {
        var no = s.no;
        var el = itemByNo[no];
        if (el) {
          el.classList.toggle("confirmed", confirmed && !destroyed);
          el.classList.toggle("destroyed", destroyed);
          var name = el.querySelector(".s6-tb-name");
          if (name) name.textContent = s.name;
          var badge = el.querySelector(".s6-tb-sus");
          if (badge) {
            if (destroyed) {
              badge.textContent = "已摧毁";
              badge.style.display = "";
              badge.classList.add("dest");
            } else if (confirmed) {
              badge.style.display = "none";
              badge.classList.remove("dest");
              badge.textContent = "疑似";
            } else {
              badge.style.display = "";
              badge.classList.remove("dest");
              badge.textContent = "疑似";
            }
          }
          var judge = el.querySelector(".s6-tb-judge");
          if (judge) {
            judge.textContent = destroyed ? "已摧毁" : confirmed ? "已确认" : "疑似（未经确认）";
            judge.classList.toggle("sus", !confirmed);
            judge.classList.toggle("confirmed", confirmed && !destroyed);
            judge.classList.toggle("destroyed", destroyed);
          }
          var tags = el.querySelector(".s6-tb-tags");
          if (tags) tags.innerHTML = destroyed ? "<i>雷达信号</i><i>已摧毁</i>" : confirmed ? "<i>雷达信号</i><i>已确认</i>" : "<i>疑似雷达信号</i><i>待复核</i>";
        }
        if (s.targetLabel) {
          s.targetLabel.setText(destroyed ? s.name + "（已摧毁）" : confirmed ? s.name : s.name + "（疑似）");
          s.targetLabel.setColor(confirmed || destroyed ? "#ef4444" : "#fbbf24");
        }
      }
      function movingTargetPos(s, t) {
        if (window.FLIGHT06 && FLIGHT06.target003Pos) return FLIGHT06.target003Pos(t);
        var dt = Math.max(0, Math.min(t, T003_DESTROY) - T003_SCAN);
        var dist = (s.move.speed / 3.6) * dt;
        var a = s.move.heading * Math.PI / 180;
        return [s.move.start[0] + (dist * Math.sin(a)) / MAP_M_LON,
                s.move.start[1] + (dist * Math.cos(a)) / MAP_M_LAT];
      }
      function renderTargetState(t) {
        var on = st.started && t >= T_SCAN;
        if (!on) {
          targetOn = false;
          targetItems.forEach(function (el) { el.style.display = "none"; });
          if (targetCountEl) targetCountEl.textContent = "0";
          if (targetsCreated) {
            SUSPECTS.forEach(function (s) {
              map.setVis([s.id], false);
              map.setVis([s.confirmedId], false);
              if (s.targetLabel) s.targetLabel.set(0);
              if (s.targetIcon) s.targetIcon.set(false);
              if (s.no === "003") map.setVis(["target003-circle"], false);
            });
          }
          ["001", "002", "003"].forEach(function (no) {
            confirmedState[no] = null; destroyedState[no] = null; renderedDestroyed[no] = null;
          });
          return;
        }
        targetOn = true;
        ensureTargets();
        assign003IfNeeded(t);
        var visibleCount = 0;
        SUSPECTS.forEach(function (s) {
          var visible = t >= (s.unlockAt || T_SCAN);
          var el = itemByNo[s.no];
          if (el) el.style.display = visible ? "" : "none";
          if (!visible) {
            map.setVis([s.id], false);
            map.setVis([s.confirmedId], false);
            if (s.targetLabel) s.targetLabel.set(0);
            if (s.targetIcon) s.targetIcon.set(false);
            if (s.no === "003") map.setVis(["target003-circle"], false);
            confirmedState[s.no] = null; destroyedState[s.no] = null; renderedDestroyed[s.no] = null;
            return;
          }
          visibleCount++;
          var confirmed = t >= s.confirmAt;
          var destroyed = !!destroyedState[s.no];
          var col = (confirmed || destroyed) ? "#ef4444" : "#fbbf24";
          if (s.move && s.targetLabel) {
            var mp = movingTargetPos(s, t);
            s.targetLabel.setLngLat(mp);
            map.movingCircle("target003-circle", mp, 100, col);
            map.setVis(["target003-circle"], true);
          }
          s.targetLabel.set(1);
          if (s.targetIcon) s.targetIcon.set(true, (confirmed || destroyed) ? "red" : "yellow");
          if (confirmedState[s.no] === confirmed && renderedDestroyed[s.no] === destroyed) return;
          confirmedState[s.no] = confirmed;
          renderedDestroyed[s.no] = destroyed;
          setTargetItemState(s, confirmed, destroyed);
          map.setVis([s.id], false);
          map.setVis([s.confirmedId], false);
        });
        if (targetCountEl) targetCountEl.textContent = String(visibleCount);
      }
      var smallBar = root.querySelector(".s6-video-smallbar");
      var largeBox = root.querySelector(".s6-video-large");
      var largeGrid = root.querySelector(".s6-video-grid");
      var videoA = root.querySelector(".s6-video-a");
      var videoB = root.querySelector(".s6-video-b");
      var videoC = root.querySelector(".s6-video-c");
      var videoD = root.querySelector(".s6-video-d");
      var videoE = root.querySelector(".s6-video-e");
      var videoF = root.querySelector(".s6-video-f");
      var smallCards = [].slice.call(root.querySelectorAll(".s6-video-small-card"));
      var extraCards = [].slice.call(root.querySelectorAll(".s6-video-extra"));
      var thirdCards = [].slice.call(root.querySelectorAll(".s6-video-third"));
      var smallCanvases = {
        A: root.querySelector(".s6-video-small-canvas[data-video=\"A\"]"),
        B: root.querySelector(".s6-video-small-canvas[data-video=\"B\"]"),
        C: root.querySelector(".s6-video-small-canvas[data-video=\"C\"]"),
        D: root.querySelector(".s6-video-small-canvas[data-video=\"D\"]"),
        E: root.querySelector(".s6-video-small-canvas[data-video=\"E\"]"),
        F: root.querySelector(".s6-video-small-canvas[data-video=\"F\"]")
      };
      var expanded = [];
      var largeMap = {};
      var removedChannels = {};
      var videoStarted = false;
      var extraStarted = false;
      var thirdStarted = false;
      var assigned003 = null;
      var mirrorGen = 0;
      var VIDEO_TITLES = { A: "17光电-攻击｜002火控雷达", B: "18光电-侦察｜002火控雷达", C: "14光电-攻击｜001预警雷达", D: "15光电-侦察｜001预警雷达", E: "09光电-攻击｜003运动目标", F: "10光电-侦察｜003运动目标" };
      var videoAiRules = [
        { key: "002-attack", group: "002", video: videoA, at: 41, text: "17光电开始攻击" },
        { key: "002-destroy", group: "002", video: videoB, at: 83, text: "智能毁伤评估，002火控雷达已被摧毁" },
        { key: "001-attack", group: "001", video: videoC, at: 41, text: "14光电开始攻击" },
        { key: "001-destroy", group: "001", video: videoD, at: 83, text: "智能毁伤评估，001预警雷达已被摧毁" },
        { key: "003-attack", group: "003", video: videoE, at: 41, text: "09光电开始攻击" },
        { key: "003-destroy", group: "003", video: videoF, at: 83, text: "智能毁伤评估，003运动目标已被摧毁。" }
      ];
      var videoAiFired = {};
      var photoResCol = root.querySelector(".s6-col");
      var opticalLost = 0;
      function updateOpticalResources() {
        if (!photoResCol) return;
        var baseUsed = +(photoResCol.getAttribute("data-used") || 20);
        var baseRest = +(photoResCol.getAttribute("data-rest") || 28);
        var usedEl = photoResCol.querySelector(".s6-used");
        var lostEl = photoResCol.querySelector(".s6-lost");
        var restEl = photoResCol.querySelector(".s6-rest");
        if (usedEl) usedEl.textContent = String(Math.max(0, baseUsed - opticalLost));
        if (lostEl) lostEl.textContent = String(opticalLost);
        if (restEl) restEl.textContent = String(baseRest);
      }
      function cardOf(key) {
        for (var i = 0; i < smallCards.length; i++) if (smallCards[i].getAttribute("data-video") === key) return smallCards[i];
        return null;
      }
      function updateSmallBarVisibility() {
        if (!smallBar) return;
        var any = false;
        smallCards.forEach(function (card) { if (card.style.display !== "none") any = true; });
        if (any) { smallBar.classList.add("on"); smallBar.style.pointerEvents = ""; }
        else { smallBar.classList.remove("on"); smallBar.style.pointerEvents = "none"; }
      }
      function assign003IfNeeded(t) {
        if (assigned003 || !st.started || t < T003_ASSIGN) return;
        if (!window.FLIGHT06 || !FLIGHT06.pickNearest003 || !FLIGHT06.assign003) return;
        var c = movingTargetPos(SUSPECTS[2], T003_ASSIGN);
        var picks = FLIGHT06.pickNearest003(c, T003_ASSIGN, 2);
        if (!picks.length) return;
        var atk = picks[0], rec = picks[1] || picks[0];
        assigned003 = { attack: atk, recon: rec };
        FLIGHT06.assign003(atk, rec, T003_ASSIGN);
        var a = atk < 10 ? "0" + atk : String(atk);
        var r = rec < 10 ? "0" + rec : String(rec);
        VIDEO_TITLES.E = a + "光电-攻击｜003运动目标";
        VIDEO_TITLES.F = r + "光电-侦察｜003运动目标";
        thirdCards.forEach(function (card) {
          var k = card.getAttribute("data-video");
          var title = card.querySelector(".s6-video-title");
          if (title) title.textContent = k === "E" ? VIDEO_TITLES.E : VIDEO_TITLES.F;
        });
        videoAiRules.forEach(function (rule) {
          if (rule.key === "003-attack") rule.text = a + "光电开始攻击";
        });
        AI_EVENTS.push({ t: T003_ASSIGN, who: "ai", text: "已分配" + a + "号、" + r + "号光电无人机进行003运动目标察打任务。" });
        AI_EVENTS.push({ t: FL.T003_TRACK_ARRIVE, who: "系统", t003: true, text: a + "号、" + r + "号光电无人机到达目标左右后方，开始跟踪。" });
        AI_EVENTS.push({ t: FL.T003_ORBIT_START + 6, who: "系统", t003: true, text: "打击完成，" + r + "号光电无人机转入盘旋确认。" });
        AI_EVENTS.sort(function (x, y) { return x.t - y.t; });
        renderAiLog(t);
      }
      function closeVideoChannel(key) {
        removedChannels[key] = true;
        var v = channelOf(key);
        if (v) { v.__dead = true; try { v.pause(); } catch (e) {} }
        var card = cardOf(key);
        if (card) card.style.display = "none";
        updateSmallBarVisibility();
        expanded = expanded.filter(function (k) { return k !== key; });
        reflowLarge();
      }
      function applyDestroyed(no, key) {
        if (destroyedState[no]) return;
        destroyedState[no] = true;
        opticalLost = Math.min(3, opticalLost + 1);
        updateOpticalResources();
        closeVideoChannel(key);
        renderTargetState(st.t);
      }
      function resetDestroyedState() {
        destroyedState["001"] = false;
        destroyedState["002"] = false;
        destroyedState["003"] = false;
        opticalLost = 0;
        updateOpticalResources();
      }
      function channelOf(key) { return key === "A" ? videoA : key === "B" ? videoB : key === "C" ? videoC : key === "D" ? videoD : key === "E" ? videoE : key === "F" ? videoF : null; }
      function makeFrameTracker(video) {
        var times = [], on = false;
        function tick(now, meta) {
          if (!on) return;
          times.push(meta.mediaTime);
          if (times.length > 12) times.shift();
          if (!video.ended) video.requestVideoFrameCallback(tick);
        }
        return {
          start: function () {
            times = [];
            if (!video || !video.requestVideoFrameCallback) return;
            on = true;
            video.requestVideoFrameCallback(tick);
          },
          stop: function () { on = false; },
          fifthFromEnd: function () {
            if (times.length >= 5) return times[times.length - 5];
            return Math.max(0, (video.duration || 0) - 5 / 30);
          }
        };
      }
      var trackerA = makeFrameTracker(videoA);
      var trackerB = makeFrameTracker(videoB);
      var trackerC = makeFrameTracker(videoC);
      var trackerD = makeFrameTracker(videoD);
      var trackerE = makeFrameTracker(videoE);
      var trackerF = makeFrameTracker(videoF);
      function setVideoRate() {
        var rate = st.speed;
        [videoA, videoB, videoC, videoD, videoE, videoF].forEach(function (v) {
          if (!v) return;
          try { v.playbackRate = rate; }
          catch (e) { try { v.playbackRate = Math.min(16, rate); } catch (e2) {} }
        });
      }
      function pauseVideos() {
        [videoA, videoB, videoC, videoD, videoE, videoF].forEach(function (v) { try { if (v) v.pause(); } catch (e) {} });
      }
      function freezeVideo(video, tracker, key) {
        if (!video || video.__frozen) return;
        video.__frozen = true;
        tracker.stop();
        var ft = tracker.fifthFromEnd();
        try { video.pause(); video.currentTime = ft; } catch (e) {}
        setTimeout(function () { paintKey(key); }, 0);
      }
      function blackenAttack(key) {
        var v = channelOf(key);
        if (v) v.__black = true;
        paintKey(key);
      }
      function resetExtraVideos() {
        extraStarted = false;
        delete videoAiFired["001-attack"];
        delete videoAiFired["001-destroy"];
        AI_EVENTS = AI_EVENTS.filter(function (ev) { return !(ev.videoAi && ev.group === "001"); });
        if (destroyedState["001"]) { destroyedState["001"] = false; opticalLost = Math.max(0, opticalLost - 1); updateOpticalResources(); }
        removedChannels.C = false;
        removedChannels.D = false;
        [videoC, videoD].forEach(function (v) { try { if (v) { v.pause(); v.__frozen = false; v.__dead = false; v.__black = false; v.currentTime = 0; } } catch (e) {} });
        trackerC.stop();
        trackerD.stop();
        extraCards.forEach(function (card) { card.style.display = "none"; });
        expanded = expanded.filter(function (k) { return k === "A" || k === "B"; });
        if (window.FLIGHT06 && FLIGHT06.resetAttack) FLIGHT06.resetAttack(14);
        reflowLarge();
        renderTargetState(st.t);
      }
      function resetThirdVideos() {
        thirdStarted = false;
        delete videoAiFired["003-attack"];
        delete videoAiFired["003-destroy"];
        AI_EVENTS = AI_EVENTS.filter(function (ev) { return !(ev.videoAi && ev.group === "003"); });
        if (destroyedState["003"]) { destroyedState["003"] = false; opticalLost = Math.max(0, opticalLost - 1); updateOpticalResources(); }
        removedChannels.E = false;
        removedChannels.F = false;
        [videoE, videoF].forEach(function (v) { try { if (v) { v.pause(); v.__frozen = false; v.__dead = false; v.__black = false; v.currentTime = 0; } } catch (e) {} });
        trackerE.stop(); trackerF.stop();
        thirdCards.forEach(function (card) { card.style.display = "none"; });
        expanded = expanded.filter(function (k) { return k !== "E" && k !== "F"; });
        if (window.FLIGHT06 && FLIGHT06.resetAttack) FLIGHT06.resetAttack(assigned003 ? assigned003.attack : 9);
        reflowLarge();
        renderTargetState(st.t);
      }
      function resetVideos() {
        videoStarted = false;
        extraStarted = false;
        thirdStarted = false;
        assigned003 = null;
        if (window.FLIGHT06 && FLIGHT06.resetTracking) FLIGHT06.resetTracking();
        videoAiFired = {};
        AI_EVENTS = AI_EVENTS.filter(function (ev) { return !ev.videoAi && !ev.t003; });
        mirrorGen++;
        pauseVideos();
        trackerA.stop();
        trackerB.stop();
        trackerC.stop();
        trackerD.stop();
        trackerE.stop();
        trackerF.stop();
        [videoA, videoB, videoC, videoD, videoE, videoF].forEach(function (v) {
          try { if (v) { v.__frozen = false; v.__dead = false; v.__black = false; v.currentTime = 0; } } catch (e) {}
        });
        removedChannels = {};
        smallCards.forEach(function (card) {
          var k = card.getAttribute("data-video");
          card.style.display = (k === "A" || k === "B") ? "" : "none";
        });
        VIDEO_TITLES.E = "09光电-攻击｜003运动目标"; VIDEO_TITLES.F = "10光电-侦察｜003运动目标";
        videoAiRules.forEach(function (rule) { if (rule.key === "003-attack") rule.text = "09光电开始攻击"; });
        resetDestroyedState();
        if (window.FLIGHT06 && FLIGHT06.resetAttacks) FLIGHT06.resetAttacks();
        expanded = [];
        reflowLarge();
        renderTargetState(st.started ? st.t : -1);
      }
      function playVideos() {
        setVideoRate();
        [videoA, videoB].forEach(function (v) {
          if (v && !v.__frozen && !v.__dead) {
            try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
          }
        });
      }
      function playExtraVideos() {
        setVideoRate();
        [videoC, videoD].forEach(function (v) {
          if (v && !v.__frozen && !v.__dead) {
            try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
          }
        });
      }
      function playThirdVideos() {
        setVideoRate();
        [videoE, videoF].forEach(function (v) {
          if (v && !v.__frozen && !v.__dead) {
            try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
          }
        });
      }
      function sizeCanvas(canvas) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var cw = Math.max(1, canvas.clientWidth || 1);
        var ch = Math.max(1, canvas.clientHeight || 1);
        var w = Math.round(cw * dpr), h = Math.round(ch * dpr);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      }
      function drawVideoToCanvas(src, canvas) {
        if (!src || !canvas) return false;
        sizeCanvas(canvas);
        var ctx = canvas.__ctx || (canvas.__ctx = canvas.getContext("2d"));
        if (!ctx) return false;
        var cw = canvas.width, ch = canvas.height;
        if (src.__black) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cw, ch); return true; }
        if (src.readyState < 2 || !src.videoWidth || !src.videoHeight) return false;
        ctx.clearRect(0, 0, cw, ch);
        var scale = Math.min(cw / src.videoWidth, ch / src.videoHeight);
        var dw = src.videoWidth * scale, dh = src.videoHeight * scale;
        var dx = (cw - dw) / 2, dy = (ch - dh) / 2;
        ctx.drawImage(src, dx, dy, dw, dh);
        return true;
      }
      function paintCell(key) {
        var entry = largeMap[key];
        if (!entry) return;
        if (drawVideoToCanvas(channelOf(key), entry.canvas)) entry.cell.style.visibility = "visible";
      }
      function paintSmall(key) {
        drawVideoToCanvas(channelOf(key), smallCanvases[key]);
      }
      function paintKey(key) {
        paintSmall(key);
        paintExpanded(key);
      }
      function paintExpanded(key) {
        if (expanded.indexOf(key) < 0) return;
        paintCell(key);
      }
      function createLargeCell(key) {
        if (!channelOf(key)) return;
        var cell = document.createElement("div");
        cell.className = "s6-video-cell";
        cell.style.visibility = "hidden";
        var title = document.createElement("div");
        title.className = "s6-video-title";
        title.textContent = VIDEO_TITLES[key] || key;
        var canvas = document.createElement("canvas");
        canvas.className = "s6-video-canvas";
        cell.appendChild(title);
        cell.appendChild(canvas);
        largeGrid.appendChild(cell);
        largeMap[key] = { cell: cell, canvas: canvas, ctx: null };
        requestAnimationFrame(function () { paintCell(key); });
      }
      function layoutLargeGrid() {
        var n = expanded.length;
        if (!n) return;
        var cols = n >= 2 ? 2 : 1;
        var rows = n >= 3 ? 2 : 1;
        var gap = 10, titleH = 28, border = 2;
        var W = largeBox.clientWidth, H = largeBox.clientHeight;
        var maxByW = (W - (cols - 1) * gap) / cols;
        var maxByH = ((H - (rows - 1) * gap) / rows - titleH - border) * 16 / 9 + border;
        var cellW = Math.max(120, Math.min(maxByW, maxByH));
        var canvasW = Math.max(1, cellW - border);
        var cellH = canvasW * 9 / 16 + titleH + border;
        var gridW = cols * cellW + (cols - 1) * gap;
        var gridH = rows * cellH + (rows - 1) * gap;
        largeGrid.style.gridTemplateColumns = "repeat(" + cols + "," + cellW.toFixed(2) + "px)";
        largeGrid.style.gridTemplateRows = "repeat(" + rows + "," + cellH.toFixed(2) + "px)";
        largeGrid.style.width = gridW.toFixed(2) + "px";
        largeGrid.style.height = gridH.toFixed(2) + "px";
      }
      function reflowLarge() {
        largeGrid.innerHTML = "";
        largeMap = {};
        var n = expanded.length;
        if (!n) {
          largeBox.classList.remove("on");
          largeBox.style.display = "none";
          largeGrid.style.gridTemplateColumns = "";
          largeGrid.style.gridTemplateRows = "";
          return;
        }
        largeBox.style.display = "flex";
        largeBox.classList.add("on");
        expanded.forEach(createLargeCell);
        layoutLargeGrid();
      }
      function startMirror(key, video, gen) {
        if (!video) return;
        if (video.requestVideoFrameCallback) {
          function tick() {
            if (gen !== mirrorGen) return;
            paintKey(key);
            if (!video.ended) video.requestVideoFrameCallback(tick);
          }
          video.requestVideoFrameCallback(tick);
        } else {
          function loop() {
            if (gen !== mirrorGen) return;
            paintKey(key);
            requestAnimationFrame(loop);
          }
          requestAnimationFrame(loop);
        }
      }
      function startMirrors() {
        mirrorGen++;
        var gen = mirrorGen;
        startMirror("A", videoA, gen);
        startMirror("B", videoB, gen);
        startMirror("C", videoC, gen);
        startMirror("D", videoD, gen);
        startMirror("E", videoE, gen);
        startMirror("F", videoF, gen);
      }
      function toggleLarge(key) {
        if (removedChannels[key]) return;
        if (expanded.length === 1 && expanded[0] === key) expanded = [];
        else expanded = [key];
        reflowLarge();
      }
      smallCards.forEach(function (card) {
        card.addEventListener("click", function () {
          toggleLarge(card.getAttribute("data-video"));
          if (!st.run) push();
        });
      });
      [["A", videoA], ["B", videoB], ["C", videoC], ["D", videoD], ["E", videoE], ["F", videoF]].forEach(function (pair) {
        var key = pair[0], v = pair[1];
        if (!v) return;
        v.addEventListener("loadeddata", function () { paintKey(key); });
        v.addEventListener("seeked", function () { paintKey(key); });
      });
      [["B", videoB], ["D", videoD], ["F", videoF]].forEach(function (pair) {
        var key = pair[0], v = pair[1];
        if (!v) return;
        v.addEventListener("ended", function () { closeVideoChannel(key); });
      });
      [["A", videoA], ["C", videoC], ["E", videoE]].forEach(function (pair) {
        var key = pair[0], v = pair[1];
        if (!v) return;
        v.addEventListener("ended", function () { blackenAttack(key); });
      });
      function checkVideoAi() {
        var changed = false;
        videoAiRules.forEach(function (rule) {
          if (videoAiFired[rule.key]) return;
          if (rule.video && (rule.video.currentTime >= rule.at || rule.video.ended)) {
            videoAiFired[rule.key] = true;
            AI_EVENTS.push({ t: st.t, who: "ai", text: rule.text, videoAi: true, group: rule.group });
            if (rule.key === "002-attack" && window.FLIGHT06 && FLIGHT06.startAttack) FLIGHT06.startAttack(17, st.t);
            if (rule.key === "001-attack" && window.FLIGHT06 && FLIGHT06.startAttack) FLIGHT06.startAttack(14, st.t);
            if (rule.key === "002-destroy") { applyDestroyed("002", "A"); if (window.FLIGHT06 && FLIGHT06.endAttack) FLIGHT06.endAttack(17, st.t); }
            if (rule.key === "001-destroy") { applyDestroyed("001", "C"); if (window.FLIGHT06 && FLIGHT06.endAttack) FLIGHT06.endAttack(14, st.t); }
            if (rule.key === "003-attack" && window.FLIGHT06 && FLIGHT06.startAttack) FLIGHT06.startAttack(assigned003 ? assigned003.attack : 9, st.t, movingTargetPos(SUSPECTS[2], st.t + 27));
            if (rule.key === "003-destroy") { applyDestroyed("003", "E"); if (window.FLIGHT06 && FLIGHT06.endAttack) FLIGHT06.endAttack(assigned003 ? assigned003.attack : 9, st.t); }
            changed = true;
          }
        });
        if (changed) {
          AI_EVENTS.sort(function (a, b) { return a.t - b.t; });
          renderAiLog(st.t);
        }
      }
      function renderVideos(t) {
        if (!smallBar) return;
        var active = st.started && t >= T_VIDEO_002;
        var extraActive = st.started && t >= T_EXTRA_VIDEO;
        var thirdActive = st.started && t >= T003_VIDEO;
        if (!active) {
          resetVideos();
          smallBar.classList.remove("on");
          largeBox.classList.remove("on");
          largeBox.style.display = "none";
          return;
        }
        if (!expanded.length) { largeBox.classList.remove("on"); largeBox.style.display = "none"; }
        if (!videoStarted) {
          videoStarted = true;
          expanded = [];
          reflowLarge();
          [videoA, videoB].forEach(function (v) { try { if (v) { v.__frozen = false; v.currentTime = 0; } } catch (e) {} });
          trackerA.start();
          trackerB.start();
          startMirrors();
          playVideos();
          paintKey("A");
          paintKey("B");
        } else {
          setVideoRate();
        }
        if (extraActive) {
          extraCards.forEach(function (card) {
            var k = card.getAttribute("data-video");
            card.style.display = removedChannels[k] ? "none" : "";
          });
          if (!extraStarted) {
            extraStarted = true;
            [videoC, videoD].forEach(function (v) { try { if (v) { v.__frozen = false; v.currentTime = 0; } } catch (e) {} });
            trackerC.start();
            trackerD.start();
            playExtraVideos();
            paintKey("C");
            paintKey("D");
          }
        } else if (extraStarted) {
          resetExtraVideos();
        }
        if (thirdActive) {
          thirdCards.forEach(function (card) {
            var k = card.getAttribute("data-video");
            card.style.display = removedChannels[k] ? "none" : "";
          });
          if (!thirdStarted) {
            thirdStarted = true;
            [videoE, videoF].forEach(function (v) { try { if (v) { v.__frozen = false; v.currentTime = 0; } } catch (e) {} });
            trackerE.start(); trackerF.start();
            playThirdVideos();
            paintKey("E"); paintKey("F");
          }
        } else if (thirdStarted) {
          resetThirdVideos();
        }
        updateSmallBarVisibility();
        checkVideoAi();
        if (videoA && videoA.ended && !removedChannels.A && !videoA.__black) blackenAttack("A");
        if (videoB && videoB.ended && !removedChannels.B) closeVideoChannel("B");
        if (extraStarted) {
          if (videoC && videoC.ended && !removedChannels.C && !videoC.__black) blackenAttack("C");
          if (videoD && videoD.ended && !removedChannels.D) closeVideoChannel("D");
        }
        if (thirdStarted) {
          if (videoE && videoE.ended && !removedChannels.E && !videoE.__black) blackenAttack("E");
          if (videoF && videoF.ended && !removedChannels.F) closeVideoChannel("F");
        }
        if (!st.run) pauseVideos();
        else {
          if (!(videoA.__frozen && videoB.__frozen) &&
              ((!videoA.__frozen && videoA.paused) || (!videoB.__frozen && videoB.paused))) playVideos();
          if (extraStarted && !(videoC.__frozen && videoD.__frozen) &&
              ((!videoC.__frozen && videoC.paused) || (!videoD.__frozen && videoD.paused))) playExtraVideos();
          if (thirdStarted && !(videoE.__frozen && videoF.__frozen) &&
              ((!videoE.__frozen && videoE.paused) || (!videoF.__frozen && videoF.paused))) playThirdVideos();
        }
      }
      var aiChatEl = root.querySelector(".s6-chat-scroll");
      var aiLogEl = root.querySelector(".s6-ai-log");
      var T_JOIN = FL.T_LIFT + 90; /* matches TOFF in flight06.js */
      var T_ARRIVE = Math.min.apply(null, FL.T_ARR || [T_JOIN]);
      var AI_EVENTS = [
        { t: FL.T_LIFT, who: "ai", text: "无人机起飞。" },
        { t: T_JOIN, who: "ai", text: "无人机完成编队，开始沿规划航路飞行。" },
        { t: T_ARRIVE, who: "ai", text: "机群抵达任务区，开始分区侦察。" },
        { t: FL.T_TRACKS || 0, who: "ai", text: "光电集群开始网格扫描，雷达开始 SAR/GMTI 探测，电子集群开始干扰压制。" },
        { t: T_SCAN, who: "ai", text: "在“潜在目标部署区-2”扫描发现2个疑似雷达目标，已加入目标档案。" },
        { t: T_SCAN, who: "ai", text: "建议采用方案：为001预警雷达、002火控雷达两个疑似目标各派出两架光电无人机执行侦察和打击任务。" },
        { t: T_SCAN + 2, who: "user", text: "方案确认。" },
        { t: FL.T_REASSIGN || 0, who: "ai", text: "已分配14号、15号光电无人机进行001预警雷达察打任务。" },
        { t: FL.T_REASSIGN || 0, who: "ai", text: "已分配17号、18号光电无人机进行002火控雷达察打任务。" },
        { t: FL.T_REPLAN || 0, who: "ai", text: "重新规划“潜在目标部署区-2”剩余的6架光电无人机侦察方式。" },
        { t: T_CONFIRM_002, who: "ai", text: "智能评估对照，确认002火控雷达" },
        { t: T_CONFIRM_001, who: "ai", text: "智能评估对照，确认001预警雷达" },
        { t: 4392.33, who: "ai", text: "重新规划“潜在目标部署区-2”剩余的8架光电无人机侦察方式。" },
        { t: 4500.00, who: "ai", text: "在“潜在目标部署区-1”GMTI扫描发现1个运动目标，已加入目标档案。" },
        { t: 4500.00, who: "ai", text: "建议采用方案：为003运动目标派出两架光电无人机执行侦察和打击任务。" },
        { t: 4502.00, who: "user", text: "方案确认。" },
        { t: T003_CONFIRM, who: "ai", text: "智能评估对照，确认003雷达目标" },
      ].filter(function (ev) { return ev.t > 0; }).sort(function (a, b) { return a.t - b.t; });
      function renderAiLog(t) {
        if (!aiLogEl) return;
        var n = 0;
        for (var i = 0; i < AI_EVENTS.length; i++) if (t + 1e-6 >= AI_EVENTS[i].t) n++;
        if (aiLogEl.getAttribute("data-n") === String(n)) return;
        aiLogEl.setAttribute("data-n", String(n));
        var html = "";
        for (var j = 0; j < n; j++) {
          var who = AI_EVENTS[j].who || "ai";
          html += '<div class="s6-msg ' + who + '"><div class="s6-avatar">' + (who === "user" ? "用户" : "AI") + '</div><div class="s6-bubble">' + AI_EVENTS[j].text + '</div></div>';
        }
        aiLogEl.innerHTML = html;
        if (aiChatEl) aiChatEl.scrollTop = aiChatEl.scrollHeight;
      }

      function fmt(s) { var m = Math.floor(s / 60), ss = Math.floor(s % 60); var mm = m < 10 ? "0" + m : String(m); return mm + ":" + ("0" + ss).slice(-2); }
      function paint() {
        var r = st.t / FL.TOTAL;
        if (phLbl && FL.phase) phLbl.textContent = "阶段：" + FL.phase(st.t);
        if (totLbl) totLbl.textContent = fmt(FL.TOTAL);
        fill.style.width = (r * 100).toFixed(2) + "%";
        knob.style.left = (r * 100).toFixed(2) + "%";
        tmLbl.textContent = fmt(st.t);
      }
      /* 分段：集结待命 / 编队飞行 / 侦察，按仿真时间比例铺在进度条上 */
      (function buildSegs() {
        var t1 = FL.T_LIFT || 0;
        var t2 = Math.min.apply(null, FL.T_ARR || [t1 * 2]);
        if (!(t2 > t1)) t2 = t1 * 2;
        var marks = [[0, "集结待命"], [t1, "编队飞行"], [t2, "侦察"]];
        segsBox.innerHTML = "";
        segLbls.innerHTML = "";
        for (var i = 0; i < marks.length; i++) {
          var from = marks[i][0];
          var to = i + 1 < marks.length ? marks[i + 1][0] : FL.TOTAL;
          var L = (from / FL.TOTAL) * 100, W = ((to - from) / FL.TOTAL) * 100;
          var seg = document.createElement("b");
          seg.style.left = L + "%";
          seg.style.width = Math.max(W, 0.6) + "%";
          seg.className = "s6-seg s6-seg" + i;
          segsBox.appendChild(seg);
          if (W < 3) continue;      /* 段太窄就不放文字，只留隔断 */
          var lb = document.createElement("span");
          lb.style.left = L + "%";
          lb.textContent = marks[i][1];
          segLbls.appendChild(lb);
        }
        var videoJump = document.createElement("span");
        videoJump.className = "s6-jump";
        videoJump.style.left = (((T_VIDEO_002 - 10) / FL.TOTAL) * 100).toFixed(4) + "%";
        videoJump.innerHTML = "<b class=\"s6-lb-text\">光电察打</b>";
        videoJump.addEventListener("click", function () { st.t = Math.max(0, T_VIDEO_002 - 10); push(); });
        segLbls.appendChild(videoJump);
      })();

      function push() {
        if (!st.started) { renderAiLog(-1); renderTargetState(-1); renderVideos(-1); map.fleet("fleet", []); map.trails("trails", []); if (map.tracks) map.tracks("tracks", []); if (map.scan) map.scan("scan", []); if (map.fan) { map.fan("rfan", []); map.fan("jfan", []); } if (map.beam) map.beam("sbeam", []); if (map.cover) { map.cover("cov-photo", []); map.cover("cov-gmti", []); map.cover("cov-sar", []); map.cover("cov-ewar", []); } paint(); return; }
        renderAiLog(st.t);
        renderTargetState(st.t);
        renderVideos(st.t);
        if (map.fan && FL.fans) {
          var fs0 = FL.fans(st.t);
          map.fan("rfan", fs0.filter(function (f) { return f.kind === "radar"; }).map(function (s) {
            return { color: COLORS.yellow, quad: s.quad, k: s.k };
          }));
          map.fan("jfan", fs0.filter(function (f) { return f.kind === "jam"; }).map(function (s) {
            return { color: COLORS.red, quad: s.quad, k: s.k };
          }));
        }
        if (map.beam && FL.sarScans) map.beam("sbeam", FL.sarScans(st.t).map(function (s) {
          return { color: COLORS.yellow, band: s.band, rays: s.rays, k: s.k };
        }));
        if (map.cover && FL.coverage) {
          var cv = FL.coverage(st.t);
          if (cv !== lastCv) {                       /* 每 30 秒仿真时间才重建一次覆盖层 */
            lastCv = cv;
            map.cover("cov-photo", cv.photo, COLORS.blue);
            map.cover("cov-gmti", cv.gmti, COLORS.yellow);
            map.cover("cov-sar", cv.sar, "#f59e0b");
            map.cover("cov-ewar", cv.ewar, COLORS.red);
          }
        }
        if (visDirty) { applyVis(); visDirty = false; }
        if (map.scan && FL.scans) map.scan("scan", FL.scans(st.t).map(function (s) {
          return { color: COLORS.blue, quad: s.quad, rays: s.rays, sweep: s.sweep, box: s.box, links: s.links, k: s.k };
        }));
        var fleet = FL.simulate(st.t);
        fleet.forEach(function (d) { d.color = COLORS[d.type] || "#38bdf8"; });
        map.fleet("fleet", fleet);
        map.trails("trails", fleet.filter(function (d) { return d.trail && d.trail.length > 1; })
          .map(function (d) { return { color: COLORS[d.type] || "#38bdf8", pts: d.trail }; }));
        /* 规划航迹放在尾迹之后创建 => 图层压在尾迹上面，不被粗尾迹盖住 */
        if (map.tracks && FL.tracks) map.tracks("tracks", FL.tracks(st.t).map(function (d) { return { color: COLORS[d.type] || "#38bdf8", pts: d.pts }; }));
        paint();
      }

      spds.forEach(function (b) {
        b.addEventListener("click", function () {
          st.speed = +b.getAttribute("data-s");
          spds.forEach(function (o) { o.classList.toggle("on", o === b); });
          renderVideos(st.t);
        });
      });
      goBtn.addEventListener("click", function () {
        st.started = true;
        if (st.t >= FL.TOTAL) { st.t = 0; st.run = true; }
        else st.run = !st.run;
        goBtn.textContent = st.run ? "暂停" : (st.t >= FL.TOTAL ? "重播" : "继续");
        st.last = 0; push();
      });
      function seekFromEvent(ev) {
        var r = bar.getBoundingClientRect();
        var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
        st.t = Math.max(0, Math.min(1, x / r.width)) * FL.TOTAL;
        push();
      }
      var dragging = false;
      bar.addEventListener("pointerdown", function (ev) { dragging = true; try { bar.setPointerCapture(ev.pointerId); } catch (e) {} seekFromEvent(ev); });
      bar.addEventListener("pointermove", function (ev) { if (dragging) seekFromEvent(ev); });
      bar.addEventListener("pointerup", function () { dragging = false; });
      bar.addEventListener("pointercancel", function () { dragging = false; });

      function loop(now) {
        if (st.dead) return;                  /* 已退场：不再续命 */
        requestAnimationFrame(loop);
        if (!st.run || !root.classList.contains("on")) { st.last = now; return; }
        if (!st.last) { st.last = now; return; }
        var dt = Math.min(0.25, (now - st.last) / 1000);
        st.last = now;
        st.t = Math.min(FL.TOTAL, st.t + dt * st.speed);
        st.acc += dt;
        if (st.acc >= 0.08) { st.acc = 0; push(); }
        if (st.t >= FL.TOTAL) { st.run = false; goBtn.textContent = "重播"; }
      }
      root.__onSpace = function () { goBtn.click(); };   /* 空格 = 开始/暂停本演示 */
      root.__s6Refresh = function () { push(); };
      requestAnimationFrame(loop);
      var qF = new URLSearchParams(location.search), f0 = parseFloat(qF.get("fly"));
      if (!isNaN(f0)) { st.started = true; st.t = Math.max(0, Math.min(FL.TOTAL, f0)); goBtn.textContent = "继续"; }
      /* ---------- 图层面板：只放 4 个开关，默认全开 ---------- */
      if (!document.getElementById("css-s6lyr")) {
        var st6 = document.createElement("style");
        st6.id = "css-s6lyr";
        st6.textContent =
          ".s6-lyr-panel{position:absolute;left:116px;top:142px;width:200px;padding:10px 12px;border-radius:10px;" +
            "background:rgba(8,20,34,.94);border:1px solid rgba(56,189,248,.35);box-shadow:0 12px 32px rgba(0,0,0,.55);" +
            "display:none;z-index:30;font-size:14px;color:#cfe3f7;max-height:calc(100vh - 190px);overflow:auto}" +
          ".s6-lyr-panel.on{display:block}" +
          ".s6-lyr-h{display:flex;align-items:center;gap:8px;font-size:13px;color:#7dd3fc;letter-spacing:2px;" +
            "padding-bottom:8px;border-bottom:1px solid rgba(56,189,248,.18);margin-bottom:4px}" +
          ".s6-lyr-h b{margin-right:auto;font-weight:600}" +
          ".s6-lyr-h button{background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.3);color:#9fd0f5;" +
            "border-radius:5px;padding:2px 8px;font-size:12px;cursor:pointer}" +
          ".s6-lyr-h button:hover{background:rgba(56,189,248,.24)}" +
          ".s6-lyr{display:flex;align-items:center;gap:9px;padding:7px 2px;cursor:pointer;user-select:none}" +
          ".s6-lyr:hover{color:#eaf6ff}" +
          ".s6-lyr input{accent-color:#38bdf8;width:14px;height:14px;cursor:pointer}" +
          ".s6-lyr-sec{margin:8px 0 2px;padding:5px 2px 4px;border-top:1px solid rgba(56,189,248,.16);color:#7dd3fc;font-size:12px;letter-spacing:1px}" +
          ".s6-lyr-sec:first-of-type{border-top:0;margin-top:2px}";
        document.head.appendChild(st6);
      }
      root.insertAdjacentHTML("beforeend",
        '<section class="s6-lyr-panel">' +
          '<div class="s6-lyr-h"><b>图层</b><button data-all="1">全显</button><button data-all="0">全隐</button></div>' +
          '<label class="s6-lyr"><input type="checkbox" checked data-k="tracks"><span>规划航迹</span></label>' +
          '<label class="s6-lyr"><input type="checkbox" checked data-k="trails"><span>无人机航迹</span></label>' +
          '<div class="s6-lyr-sec">扫描矩形 / 覆盖层</div>' +
          [["光电扫描覆盖小格", "cov-photo"], ["GMTI 覆盖小格", "cov-gmti"], ["SAR 覆盖小格", "cov-sar"], ["电子干扰覆盖小格", "cov-ewar"]].map(function (o) {
            return '<label class="s6-lyr"><input type="checkbox" checked data-k="' + o[1] + '"><span>' + o[0] + '</span></label>';
          }).join("") +
          '<div class="s6-lyr-sec">扇形 / 扇区层</div>' +
          [["光电扫描扇形", "scan"], ["雷达 GMTI 扇区", "rfan"], ["电子干扰扇区", "jfan"], ["SAR 扫描条带", "sbeam"]].map(function (o) {
            return '<label class="s6-lyr"><input type="checkbox" checked data-k="' + o[1] + '"><span>' + o[0] + '</span></label>';
          }).join("") +
        '</section>');

      var lyrPanel = root.querySelector(".s6-lyr-panel");
      var lyrBoxes = [].slice.call(lyrPanel.querySelectorAll("input[data-k]"));
      var visState = { tracks: true, trails: true, "cov-photo": true, "cov-gmti": true, "cov-sar": true, "cov-ewar": true, scan: true, rfan: true, jfan: true, sbeam: true };
      var visDirty = true, lastCv = null;
      function applyVis() {
        if (!map.setVis) return;
        map.setVis(["tracks"], visState.tracks);
        map.setVis(["trails"], visState.trails);
        map.setVis(["cov-photo"], visState["cov-photo"]);
        map.setVis(["cov-gmti"], visState["cov-gmti"]);
        map.setVis(["cov-sar"], visState["cov-sar"]);
        map.setVis(["cov-ewar"], visState["cov-ewar"]);
        map.setVis(["scan"], visState.scan);
        map.setVis(["rfan"], visState.rfan);
        map.setVis(["jfan"], visState.jfan);
        map.setVis(["sbeam"], visState.sbeam);
      }
      lyrBoxes.forEach(function (cb) {
        cb.addEventListener("change", function () {
          visState[cb.getAttribute("data-k")] = cb.checked;
          visDirty = true; applyVis();
        });
      });
      [].slice.call(lyrPanel.querySelectorAll("button[data-all]")).forEach(function (b) {
        b.addEventListener("click", function () {
          var v = b.getAttribute("data-all") === "1";
          lyrBoxes.forEach(function (cb) { cb.checked = v; visState[cb.getAttribute("data-k")] = v; });
          visDirty = true; applyVis();
        });
      });
      (function () {
        var tb = root.querySelector(".s3-toolbar"), btn = null;
        if (!tb) return;
        [].slice.call(tb.querySelectorAll("b")).forEach(function (b) { if (b.textContent === "图层") btn = b; });
        if (!btn) return;
        btn.addEventListener("click", function (ev) {
          ev.stopPropagation();
          var on = lyrPanel.classList.toggle("on");
          btn.classList.toggle("on", on);
        });
      })();

      push();

      /* 退场：停掉自驱循环，并清掉本屏画在共享地图上的动态图层 */
      hideHook = function () {
        st.dead = true;
        try {
          map.fleet("fleet", []);
          map.trails("trails", []);
          if (map.tracks) map.tracks("tracks", []);
          if (map.scan) map.scan("scan", []);
          if (map.fan) { map.fan("rfan", []); map.fan("jfan", []); }
          if (map.beam) map.beam("sbeam", []);
          if (map.cover) { map.cover("cov-photo", []); map.cover("cov-gmti", []); map.cover("cov-sar", []); map.cover("cov-ewar", []); }
          if (targetsCreated) { SUSPECTS.forEach(function (s) { map.setVis([s.id], false); map.setVis([s.confirmedId], false); s.targetLabel.set(0); if (s.targetIcon) s.targetIcon.set(false); }); }
          pauseVideos();
          targetOn = false;
          confirmedState["001"] = null;
          confirmedState["002"] = null;
          confirmedState["003"] = null;
        } catch (e) {}
      };
    }

    var cardsHost = root.querySelector(".s3-cards");
    if (cardsHost) {
      cardsHost.innerHTML = CARDS.map(function (c) {
        return '<div class="s3-card' + (c.on ? " on" : "") + '"><div class="n">' + c.n + '</div><div class="t">' + c.t + '</div>' + (c.on ? '<div class="tag">当前</div>' : "") + '</div>';
      }).join("");
    }

    root.querySelector(".s3-status").innerHTML = STATUS.map(function (s) {
      return '<span class="s3-st' + (s.on ? "" : " off") + '">' + ic(s.icon, 15, "", 1.9) + '<em>' + s.k + '：</em><b>' + s.v + '</b></span>';
    }).join("");

    var cardsEl = root.querySelector(".s3-cards");
    var cardEls = cardsEl ? [].slice.call(cardsEl.children) : [];
    cardEls.forEach(function (el, i) {
      el.addEventListener("click", function () {
        if (i !== 0) return;
        var P = window.PLAYER;
        if (!P || Math.abs(P.time - 25.5) > 0.12) return;
        el.classList.add("picked");
        if (window.PLAYER && window.PLAYER.lockBack) window.PLAYER.lockBack();
        cardEls.forEach(function (o, j) { if (j) o.classList.add("fade"); });
        setTimeout(function () { P.seek(26); P.play(); }, 620);
      });
    });

    /* SH-04 的两个按钮 */
    if (IS_MISSION) {
      var goEl = root.querySelector(".s3-go"), backEl = root.querySelector(".s3-back");
      if (goEl) goEl.addEventListener("click", function () {
        var P = window.PLAYER; if (P) { P.seek(41); P.play(); }
      });
      if (backEl) backEl.addEventListener("click", function () {
        var P = window.PLAYER; if (P) { P.seek(25.5); P.pause(); }
      });
    }

    if (!document.getElementById("css-s03")) {
      var sty = document.createElement("style");
      sty.id = "css-s03";
      sty.textContent = [
        ".s3-map{position:absolute;inset:0}",
        ".s3-menu{position:absolute;left:0;top:74px;bottom:36px;width:96px;display:flex;flex-direction:column;gap:6px;padding-top:12px;",
        "  background:linear-gradient(180deg,rgba(9,20,34,.97),rgba(5,12,22,.99));border-right:1px solid rgba(56,189,248,.16);z-index:14}",
        ".s3-mi{width:76px;margin:0 auto;height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;",
        "  border-radius:9px;color:#6f8aa8;font-size:12px;letter-spacing:1px;opacity:0;border:1px solid transparent}",
        ".s3-mi.on{color:#bfe9ff;background:linear-gradient(180deg,rgba(56,189,248,.22),rgba(56,189,248,.05));",
        "  border-color:rgba(56,189,248,.55);box-shadow:0 0 20px rgba(56,189,248,.25) inset}",
        ".s3-toprow{position:absolute;left:116px;top:88px;height:46px;display:flex;align-items:stretch;gap:18px;z-index:13}",
        ".s3-toolbar{position:relative;height:46px;flex:none;display:flex;align-items:center;gap:4px;padding:0 8px;border-radius:9px;",
        "  background:rgba(7,16,28,.9);border:1px solid rgba(56,189,248,.2);opacity:0}",
        ".s3-collapse{width:26px;text-align:center;color:#5f7f9e;font-style:normal;font-size:15px}",
        ".s3-toolbar b{height:32px;padding:0 13px;display:flex;align-items:center;border-radius:6px;font-size:13px;font-weight:400;color:#9db4cc;letter-spacing:.5px;cursor:pointer}",
        ".s3-toolbar b.on{background:linear-gradient(180deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 0 18px rgba(37,99,235,.5)}",
        ".s3-side{position:absolute;right:32px;top:88px;width:344px;z-index:13;opacity:0;display:flex;flex-direction:column;gap:14px}",
        ".s3-map svg text{filter:drop-shadow(0 1px 3px rgba(0,0,0,.95))}",
        ".s3-panel{border-radius:10px;background:rgba(7,16,28,.94);border:1px solid rgba(56,189,248,.2);overflow:hidden}",
        ".s3-res-h{display:flex;align-items:center;gap:9px;padding:14px 18px;font-size:15px;letter-spacing:1px;color:#e8f4ff;border-bottom:1px solid rgba(56,189,248,.14)}",
        ".s3-res-h svg{color:#38bdf8}",
        ".s3-grid{display:grid;grid-template-columns:repeat(4,1fr)}",
        ".s3-col{display:flex;flex-direction:column;align-items:center;gap:9px;padding:16px 0 18px;border-right:1px solid rgba(56,189,248,.1)}",
        ".s3-col:last-child{border-right:0}",
        ".s3-col .lb{font-size:13px;color:#8fa8c4;letter-spacing:1px}",
        ".s3-col img{width:38px;height:auto;display:block;filter:drop-shadow(0 0 7px var(--glow))}",
        ".s3-col .num{font-family:var(--num);font-size:22px;color:#eaf4ff;line-height:1}",
        ".s3-sh{padding:15px 20px;font-size:16px;letter-spacing:1px;color:#e8f4ff;border-bottom:1px solid rgba(56,189,248,.14)}",
        ".s3-rows{padding:6px 20px 0}",
        ".s3-row{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid rgba(56,189,248,.09);font-size:14px}",
        ".s3-row span{color:#8fa8c4}",
        ".s3-row b{font-size:15px;font-weight:600}",
        ".s3-desc-h{padding:16px 20px 8px;font-size:12px;letter-spacing:2px;color:#5f83a6}",
        ".s3-desc{padding:0 20px;font-size:13px;line-height:1.7;color:#a9c2dd}",
        ".s3-scale{position:absolute;left:120px;bottom:100px;z-index:12;opacity:0}",
        ".s3-scale b{display:block;height:9px;border:1.5px solid rgba(226,240,252,.95);border-top:0;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,.7)}",
        ".s3-scale span{font-size:13px;color:#e2eefb;font-family:var(--num);text-shadow:0 1px 3px rgba(0,0,0,.85)}",
        ".s3-coord{position:absolute;left:120px;bottom:70px;font-family:var(--num);font-size:15px;color:#eaf4ff;z-index:12;opacity:0;letter-spacing:.5px;text-shadow:0 1px 4px rgba(0,0,0,.9)}",
        ".s3-status{position:absolute;left:0;right:0;bottom:0;height:36px;display:flex;align-items:center;gap:26px;padding:0 22px;",
        "  background:rgba(5,12,22,.96);border-top:1px solid rgba(56,189,248,.18);z-index:16;font-size:14px}",
        ".s3-st{display:flex;align-items:center;gap:7px;opacity:0}",
        ".s3-st svg{color:#22c55e}",
        ".s3-st em{font-style:normal;color:#93aac6}",
        ".s3-st b{color:#34d399;font-weight:500}",
        ".s3-st.off svg{color:#5a708c}",
        ".s3-st.off b{color:#8fa0b6}",
        ".s3-cards{position:absolute;left:0;right:0;bottom:86px;display:flex;justify-content:center;gap:26px;z-index:12}",
        ".s3-card{position:relative;width:420px;height:150px;border-radius:12px;padding:26px 30px;opacity:0;cursor:pointer;",
        "  background:rgba(8,18,32,.92);border:1px solid rgba(56,189,248,.16);",
        "  box-shadow:0 12px 34px rgba(2,10,20,.55);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}",
        ".s3-card .n{font-size:14px;letter-spacing:3px;color:#5f83a6}",
        ".s3-card .t{margin-top:14px;font-size:26px;color:#9fb6d4;letter-spacing:1px;line-height:1.2}",
        ".s3-card .tag{position:absolute;right:20px;top:20px;font-size:12px;letter-spacing:2px;color:#38bdf8;border:1px solid rgba(56,189,248,.5);padding:2px 9px;border-radius:3px}",
        ".s3-card.on{border-color:rgba(56,189,248,.7);background:linear-gradient(180deg,rgba(14,40,66,.95),rgba(8,20,34,.95));",
        "  box-shadow:0 0 0 1px rgba(56,189,248,.22),0 16px 44px rgba(14,165,233,.2)}",
        ".s3-card.on .n{color:#7dd3fc}",
        ".s3-card.on .t{color:#eaf6ff}",
        ".s3-card:hover{transform:translateY(-8px);border-color:rgba(56,189,248,.85);box-shadow:0 20px 46px rgba(14,165,233,.34)}",
        ".s3-card.picked{transform:scale(1.06) translateY(-8px);border-color:#7dd3fc;box-shadow:0 0 0 2px rgba(125,211,252,.55),0 24px 60px rgba(14,165,233,.5)}",
        ".s3-card.picked .t{color:#fff}",
        ".s3-card.fade{opacity:.25 !important;transform:scale(.96)}",
        ".s3-prompt{position:absolute;left:50%;transform:translateX(-50%);bottom:252px;font-size:19px;letter-spacing:7px;",
        "  color:#a5e4ff;opacity:0;z-index:12;white-space:nowrap;padding:10px 26px;border-radius:9px;",
        "  background:rgba(6,14,26,.9);border:1px solid rgba(56,189,248,.34);box-shadow:0 0 24px rgba(56,189,248,.38)}",
        ".s3-tih{padding:14px 18px;font-size:15px;letter-spacing:1px;color:#e8f4ff;border-bottom:1px solid rgba(56,189,248,.14)}",
        ".s3-tir{display:flex;align-items:center;gap:10px;padding:12px 18px;font-size:14px}",
        ".s3-tir span{color:#8fa8c4;flex:none;width:74px}",
        ".s3-tir b{color:#dbeafe;font-weight:600;letter-spacing:.5px}",
        ".s3-tir b.warn{color:#fbbf24}",
        ".s3-go{height:58px;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:16px;cursor:pointer;",
        "  font-size:19px;letter-spacing:3px;color:#eaf6ff;background:linear-gradient(180deg,#1d4ed8,#0b2a63);",
        "  border:1px solid rgba(56,189,248,.55);box-shadow:0 0 26px rgba(37,99,235,.45),0 0 0 1px rgba(56,189,248,.2) inset}",
        ".s3-go i{font-style:normal;color:#7dd3fc;letter-spacing:-3px;font-size:20px}",
        ".s3-back{height:52px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;",
        "  font-size:16px;letter-spacing:2px;color:#c7ddf2;background:rgba(8,18,32,.92);border:1px solid rgba(56,189,248,.28)}",
        ".s3-go:hover{filter:brightness(1.12)}",
        ".s3-back:hover{border-color:rgba(56,189,248,.6);color:#eaf6ff}",
        ".s4-voice{position:absolute;left:116px;right:376px;bottom:62px;height:206px;display:flex;align-items:center;gap:22px;",
        "  padding:0 22px;border-radius:12px;background:linear-gradient(180deg,rgba(6,18,32,.94),rgba(4,12,22,.96));",
        "  border:1px solid rgba(56,189,248,.22);z-index:12}",
        ".s4-left{width:188px;flex:none;display:flex;flex-direction:column;gap:14px}",
        ".s4-title{font-size:19px;letter-spacing:2px;color:#bfe9ff}",
        ".s4-btn{height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:9px;font-size:15px;color:#dbeafe;",
        "  background:linear-gradient(180deg,#123a6b,#0b2340);border:1px solid rgba(56,189,248,.45)}",
        ".s4-chat{flex:1;display:flex;flex-direction:column;gap:8px;justify-content:center;overflow:hidden}",
        ".s4-bub{max-width:86%;padding:8px 13px;border-radius:8px;font-size:13.5px;line-height:1.45;opacity:0;",
        "  background:rgba(12,34,58,.92);border:1px solid rgba(56,189,248,.22);color:#cfe6ff}",
        ".s4-bub.user{align-self:flex-end;background:rgba(22,101,52,.85);border-color:rgba(74,222,128,.45);color:#dcfce7}",
        ".s5-uav{position:absolute;left:116px;top:150px;width:300px;border-radius:12px;background:linear-gradient(180deg,rgba(6,18,32,.94),rgba(4,12,22,.96));",
        "  border:1px solid rgba(56,189,248,.22);padding:12px 10px;overflow:hidden;z-index:12;display:flex;flex-direction:column;gap:8px}",
        ".s5-h{display:flex;align-items:center;justify-content:space-between;font-size:16px;letter-spacing:1px;color:#e8f4ff;padding:2px 6px 10px;border-bottom:1px solid rgba(56,189,248,.16)}",
        ".s5-h i{font-style:normal;width:18px;height:18px;border-radius:50%;border:1px solid rgba(148,180,210,.6);color:#94b4d2;font-size:12px;display:grid;place-items:center}",
        ".s5-uc{flex:none;border-radius:9px;background:rgba(8,22,40,.9);border:1px solid rgba(56,189,248,.16);padding:9px 11px;display:flex;flex-direction:column;gap:6px}",
        ".s5-top{display:flex;align-items:center;gap:10px}",
        ".s5-top img{width:42px;height:auto;flex:none;filter:drop-shadow(0 0 7px rgba(var(--c),.6))}",
        ".s5-info{flex:1;min-width:0}",
        ".s5-info b{display:block;font-size:14px;color:#dbeafe;margin-bottom:4px;letter-spacing:.5px}",
        ".s5-kv{display:flex;justify-content:space-between;font-size:12px;color:#8fa8c4;line-height:1.5}",
        ".s5-kv em{font-style:normal;color:#cfe6ff;font-family:var(--num)}",
        ".s5-cap{display:flex;align-items:center;gap:5px;font-size:12px;color:#7d95ae}",
        ".s5-cap i{font-style:normal;padding:1px 7px;border-radius:3px;background:rgba(37,99,235,.22);border:1px solid rgba(56,189,248,.3);color:#bfe0ff}",
        ".s5-al{display:flex;align-items:center;gap:6px;font-size:12px;color:#7d95ae}",
        ".s5-al b{font-weight:600;padding:1px 7px;border-radius:3px;font-size:12px}",
        ".s5-al b.ok{color:#4ade80;background:rgba(34,197,94,.16);border:1px solid rgba(74,222,128,.35)}",
        ".s5-al b.wn{color:#fbbf24;background:rgba(251,191,36,.14);border:1px solid rgba(251,191,36,.35)}",
        ".s5-plan{position:absolute;left:50%;transform:translateX(-50%);top:150px;width:352px;min-height:452px;display:flex;flex-direction:column;border-radius:12px;background:linear-gradient(180deg,rgba(6,20,36,.95),rgba(4,12,22,.96));",
        "  border:1px solid rgba(56,189,248,.5);box-shadow:0 0 26px rgba(37,99,235,.28);padding:14px;z-index:12}",
        ".s5-ph{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 12px;border-bottom:1px solid rgba(56,189,248,.18)}",
        ".s5-ph b{font-size:17px;letter-spacing:2px;color:#eaf6ff}",
        ".s5-ph i{font-style:normal;font-size:12px;padding:3px 10px;border-radius:4px;color:#4ade80;background:rgba(34,197,94,.16);border:1px solid rgba(74,222,128,.45)}",
        ".s5-g{display:flex;align-items:center;gap:14px;padding:16px 14px;margin-top:14px;border-radius:9px;background:rgba(9,26,46,.9);border:1px solid rgba(56,189,248,.16)}",
        ".s5-gn{width:56px;flex:none;font-size:14px;color:#9fc4e6;letter-spacing:1px}",
        ".s5-gk{flex:1;display:flex;align-items:center;gap:9px;font-size:14px;color:#dbeafe}",
        ".s5-gk img{width:34px;height:auto}",
        ".s5-gv{font-family:var(--num);font-size:20px;color:#7dd3fc}",
        ".s5-gv em{font-style:normal;font-size:12px;color:#8fa8c4;margin-left:3px}",
        ".s5-why{position:absolute;left:auto;right:32px;top:88px;width:344px;border-radius:12px;background:linear-gradient(180deg,rgba(6,18,32,.94),rgba(4,12,22,.96));",
        "  border:1px solid rgba(56,189,248,.22);padding:14px 16px;z-index:12}",
        ".s5-wh{font-size:16px;letter-spacing:1px;color:#7dd3fc;padding:4px 0 10px}",
        ".s5-ul{list-style:none;margin:0;padding:0}",
        ".s5-ul li{position:relative;padding:5px 0 5px 18px;font-size:13.5px;color:#cfe6ff;line-height:1.45}",
        ".s5-ul li:before{content:'';position:absolute;left:2px;top:11px;width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,.8)}",
        ".s5-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:2px}",
        ".s5-m{border-radius:8px;background:rgba(9,26,46,.9);border:1px solid rgba(56,189,248,.18);padding:9px 8px;text-align:center}",
        ".s5-m span{display:block;font-size:12px;color:#8fa8c4;letter-spacing:.5px}",
        ".s5-m b{display:block;margin-top:5px;font-family:var(--num);font-size:23px;color:#38e0ff;text-shadow:0 0 14px rgba(56,189,248,.55)}",
        ".s5-confirm{position:absolute;right:32px;bottom:158px;width:344px;height:56px;border-radius:10px;z-index:13;cursor:pointer;",
        "  display:flex;align-items:center;justify-content:center;gap:12px;font-size:18px;letter-spacing:3px;color:#eaf6ff;",
        "  background:linear-gradient(180deg,#1d4ed8,#0b2a63);border:1px solid rgba(56,189,248,.55);",
        "  box-shadow:0 0 26px rgba(37,99,235,.45),0 0 0 1px rgba(56,189,248,.2) inset}",
        ".s5-confirm i{font-style:normal;color:#7dd3fc;letter-spacing:-3px;font-size:20px}",
        ".s6-res{position:relative;height:100%;flex:none;border-radius:9px;overflow:hidden;",
        "  background:linear-gradient(180deg,rgba(6,18,32,.95),rgba(4,12,22,.97));border:1px solid rgba(56,189,248,.22)}",
        ".s6-grid{height:100%;display:flex;align-items:center;padding:0 12px}",
        ".s6-col{height:100%;display:flex;align-items:center;gap:7px;padding:0 12px;border-right:1px solid rgba(56,189,248,.12)}",
        ".s6-col:last-child{border-right:0}",
        ".s6-col img{width:22px;height:auto;display:block;filter:drop-shadow(0 0 6px rgba(var(--c),.55))}",
        ".s6-col .lb{font-size:13px;color:#9fb6d4;white-space:nowrap}",
        ".s6-nums{display:flex;align-items:center;gap:2px;font-family:var(--num);font-size:14px;font-weight:600;white-space:nowrap}",
        ".s6-nums b{font-weight:600}",
        ".s6-nums i{font-style:normal;color:#64748b;font-weight:400;margin:0 1px}",
        ".s6-nums .g{color:#4ade80}",
        ".s6-nums .r{color:#f87171}",
        ".s6-nums .b{color:#eaf4ff}",

        ".s6-right{position:absolute;right:32px;top:88px;width:344px;z-index:13;display:flex;flex-direction:column;gap:18px}",
        ".s6-toolbox{position:relative;z-index:1;border-radius:10px;overflow:hidden;",
        "  background:linear-gradient(180deg,rgba(6,18,32,.97),rgba(4,12,22,.98));border:1px solid rgba(56,189,248,.28);",
        "  box-shadow:0 12px 32px rgba(0,0,0,.5),0 0 0 1px rgba(56,189,248,.08) inset}",
        ".s6-toolbox-h{display:flex;align-items:center;justify-content:space-between;padding:10px 13px;",
        "  font-size:15px;letter-spacing:1px;color:#e8f4ff;border-bottom:1px solid rgba(56,189,248,.2);",
        "  background:linear-gradient(180deg,rgba(56,189,248,.12),rgba(56,189,248,.02))}",
        ".s6-toolbox-h b{font-family:var(--num);font-size:12px;color:#7dd3fc;border:1px solid rgba(56,189,248,.38);",
        "  background:rgba(56,189,248,.1);border-radius:4px;padding:1px 7px;font-weight:500}",
        ".s6-tb{border-bottom:1px solid rgba(56,189,248,.12)}",
        ".s6-tb:last-child{border-bottom:0}",
        ".s6-tb-head{display:flex;align-items:center;gap:9px;padding:9px 12px;cursor:pointer;user-select:none;",
        "  background:rgba(7,16,28,.65);transition:background .15s ease,color .15s ease}",
        ".s6-tb-head:hover{background:rgba(20,48,78,.85)}",
        ".s6-tb.open .s6-tb-head{background:rgba(18,48,80,.92);color:#eaf6ff}",
        ".s6-tb-no{width:36px;flex:none;font-family:var(--num);font-size:12px;color:#38bdf8;letter-spacing:.5px}",
        ".s6-tb-name{flex:1;min-width:0;font-size:13.5px;color:#dbeafe;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
        ".s6-tb-arrow{width:6px;height:6px;border-right:1.5px solid #6f8aa8;border-bottom:1.5px solid #6f8aa8;",
        "  transform:rotate(-45deg);transition:transform .15s ease,border-color .15s ease;margin-right:3px}",
        ".s6-tb.open .s6-tb-arrow{transform:rotate(45deg);border-color:#7dd3fc}",
        ".s6-tb-body{display:none;padding:9px 12px 11px 57px;background:rgba(4,12,22,.5)}",
        ".s6-tb.open .s6-tb-body{display:block}",
        ".s6-tb-row{display:flex;align-items:center;gap:10px;padding:3px 0;font-size:12px;line-height:1.5}",
        ".s6-tb-row span{width:46px;flex:none;color:#6f8aa8}",
        ".s6-tb-row b{color:#cfe6ff;font-weight:500;font-variant-numeric:tabular-nums}",
        ".s6-tb-row b.high{color:#f87171}.s6-tb-row b.mid{color:#fbbf24}.s6-tb-row b.low{color:#4ade80}",
        ".s6-tb-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}",
        ".s6-tb-sus{font-style:normal;font-size:10px;color:#fbbf24;background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.38);",
        "  border-radius:3px;padding:1px 5px;margin-left:6px;white-space:nowrap}",
        ".s6-tb-row b.sus{color:#fbbf24}",
        ".s6-tb.confirmed .s6-tb-head{background:rgba(127,29,29,.55);box-shadow:inset 2px 0 0 #ef4444}",
        ".s6-tb.confirmed .s6-tb-no{color:#f87171}",
        ".s6-tb.confirmed .s6-tb-name{color:#fee2e2}",
        ".s6-tb.confirmed .s6-tb-arrow{border-color:#fca5a5}",
        ".s6-tb-row b.confirmed{color:#f87171}",
        ".s6-tb.confirmed .s6-tb-tags i{color:#fca5a5;background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.3)}",
        ".s6-tb.destroyed .s6-tb-head{background:rgba(70,10,10,.78);box-shadow:inset 2px 0 0 #dc2626}",
        ".s6-tb.destroyed .s6-tb-no,.s6-tb.destroyed .s6-tb-name{color:#fecaca}",
        ".s6-tb-sus.dest{color:#fecaca;background:rgba(127,29,29,.55);border-color:rgba(248,113,113,.65)}",
        ".s6-tb-row b.destroyed{color:#f87171}",
        ".s6-tb.destroyed .s6-tb-tags i{color:#fca5a5;background:rgba(127,29,29,.25);border-color:rgba(248,113,113,.45)}",
        ".s6-tb-tags i{font-style:normal;font-size:11px;color:#9fc4e6;background:rgba(56,189,248,.1);",
        "  border:1px solid rgba(56,189,248,.22);border-radius:3px;padding:1px 6px}",
        ".s6-ai{border-radius:12px;padding:12px 14px;background:linear-gradient(180deg,rgba(6,18,32,.97),rgba(4,12,22,.98));",
        "  border:1px solid rgba(56,189,248,.24);box-shadow:0 12px 32px rgba(0,0,0,.45)}",
        ".s6-ai-h{display:flex;align-items:center;gap:7px;font-size:14px;letter-spacing:1px;color:#bfe9ff;",
        "  padding-bottom:9px;border-bottom:1px solid rgba(56,189,248,.14)}",
        ".s6-ai-h svg{color:#38bdf8}",
        ".s6-chat{margin-top:10px;display:flex;flex-direction:column;gap:10px}",
        ".s6-chat-scroll{max-height:236px;overflow-y:auto;overscroll-behavior:contain;padding-right:4px;",
        "  scrollbar-width:thin;scrollbar-color:rgba(56,189,248,.35) transparent}",
        ".s6-chat-scroll::-webkit-scrollbar{width:5px}",
        ".s6-chat-scroll::-webkit-scrollbar-thumb{background:rgba(56,189,248,.35);border-radius:3px}",
        ".s6-chat-scroll::-webkit-scrollbar-track{background:transparent}",
        ".s6-ai-log{display:flex;flex-direction:column;gap:10px}",
        ".s6-msg{display:flex;align-items:flex-start;gap:8px}",
        ".s6-msg.user{flex-direction:row-reverse}",
        ".s6-avatar{width:32px;height:32px;flex:0 0 32px;min-width:32px;border-radius:50%;display:grid;place-items:center;white-space:nowrap;",
        "  font-size:10px;line-height:1;letter-spacing:0;font-weight:700;color:#eaf6ff;background:linear-gradient(180deg,#2563eb,#0b2a63);border:1px solid rgba(96,165,250,.5)}",
        ".s6-msg.user .s6-avatar{background:linear-gradient(180deg,#15803d,#0a3d22);border-color:rgba(74,222,128,.5);font-weight:500}",
        ".s6-bubble{position:relative;max-width:236px;padding:9px 11px;border-radius:9px;font-size:13px;line-height:1.6;",
        "  background:rgba(12,34,58,.95);border:1px solid rgba(56,189,248,.25);color:#cfe6ff}",
        ".s6-bubble:before{content:'';position:absolute;left:-5px;top:10px;border-top:5px solid transparent;",
        "  border-bottom:5px solid transparent;border-right:5px solid rgba(12,34,58,.95)}",
        ".s6-msg.user .s6-bubble{background:rgba(22,101,52,.88);border-color:rgba(74,222,128,.45);color:#dcfce7}",
        ".s6-msg.user .s6-bubble:before{left:auto;right:-5px;border-right:0;border-left:5px solid rgba(22,101,52,.88)}",
        ".s6-video-source{position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:.001;pointer-events:none;z-index:-1}",
        ".s6-video-source video{display:block;width:1px;height:1px}",
        ".s6-video-smallbar{position:absolute;left:7.8%;right:21%;top:60%;height:23%;display:none;align-items:center;justify-content:center;gap:16px;z-index:20;pointer-events:none;}",
        ".s6-video-smallbar.on{display:flex;pointer-events:auto}",
        ".s6-video-card{display:flex;flex-direction:column;min-width:0;border-radius:9px;overflow:hidden;background:transparent;",
        "  border:1px solid rgba(239,68,68,.65);box-shadow:0 0 24px rgba(239,68,68,.18)}",
        ".s6-video-small-card{width:calc(25% - 12px);flex:none;cursor:pointer}",
        ".s6-video-large{position:absolute;left:7.8%;right:21%;top:14%;height:45%;z-index:19;display:none;opacity:0;pointer-events:none;",
        "  transition:opacity .3s ease}",
        ".s6-video-large.on{display:flex;align-items:center;justify-content:center;opacity:1}",
        ".s6-video-grid{display:grid;gap:10px;width:auto;height:auto}",
        ".s6-video-cell{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;border-radius:9px;box-sizing:border-box;",
        "  border:1px solid rgba(239,68,68,.65);background:transparent;box-shadow:0 0 24px rgba(239,68,68,.18)}",
        ".s6-video-title{height:28px;line-height:28px;padding:0 12px;font-size:12px;letter-spacing:1px;color:#fecaca;",
        "  background:linear-gradient(180deg,rgba(127,29,29,.5),rgba(60,10,10,.6));border-bottom:1px solid rgba(239,68,68,.25)}",
        ".s6-video-small-canvas{display:block;width:100%;aspect-ratio:16/9;height:auto;background:transparent;pointer-events:none}",
        ".s6-video-canvas{display:block;flex:none;width:100%;aspect-ratio:16/9;height:auto;background:transparent;pointer-events:none}",
        ".s6-ctl{position:absolute;left:116px;right:376px;bottom:62px;z-index:14;border-radius:12px;padding:12px 16px 10px;",
        "  background:linear-gradient(180deg,rgba(6,18,32,.95),rgba(4,12,22,.97));border:1px solid rgba(56,189,248,.24)}",
        ".s6-line{display:flex;align-items:center;gap:14px}",
        ".s6-go{height:42px;padding:0 22px;border-radius:8px;cursor:pointer;font-size:15px;letter-spacing:2px;color:#eaf6ff;",
        "  background:linear-gradient(180deg,#1d4ed8,#0b2a63);border:1px solid rgba(56,189,248,.5);box-shadow:0 0 18px rgba(37,99,235,.4)}",
        ".s6-go:hover{filter:brightness(1.12)}",
        ".s6-spds{display:flex;gap:6px}",
        ".s6-spds b{height:30px;min-width:46px;display:flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer;",
        "  font-family:var(--num);font-size:14px;font-weight:600;color:#9db4cc;background:rgba(10,26,44,.9);border:1px solid rgba(56,189,248,.2)}",
        ".s6-spds b.on{color:#fff;background:linear-gradient(180deg,#2563eb,#1d4ed8);border-color:#3b82f6;box-shadow:0 0 14px rgba(37,99,235,.5)}",
        ".s6-tm{margin-left:auto;font-family:var(--num);font-size:14px;color:#8fa8c4;letter-spacing:1px}",
        ".s6-tm b{color:#7dd3fc}",
        ".s6-ph{margin-right:14px;color:#7dd3fc;letter-spacing:1px}",
        ".s6-bar{position:relative;height:12px;margin-top:12px;border-radius:6px;background:rgba(10,26,44,.95);",
        "  border:1px solid rgba(56,189,248,.2);cursor:pointer}",
        ".s6-fill{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:6px;background:linear-gradient(90deg,#0ea5e9,#38bdf8);z-index:2}",
        ".s6-knob{position:absolute;top:50%;left:0;width:14px;height:14px;margin-left:-7px;transform:translateY(-50%);border-radius:50%;background:#eaf6ff;box-shadow:0 0 10px rgba(56,189,248,.9);z-index:3;text-decoration:none}",
        ".s6-segs{position:absolute;inset:0;pointer-events:none}",
        ".s6-seg{position:absolute;top:0;bottom:0;border-right:1px solid rgba(125,211,252,.5)}",
        ".s6-seg0{background:rgba(148,163,184,.18)}",
        ".s6-seg1{background:rgba(56,189,248,.14)}",
        ".s6-seg2{background:rgba(74,222,128,.14)}",
        ".s6-seglbls{position:relative;height:21px;margin-top:6px;pointer-events:none}",
        ".s6-seglbls span{position:absolute;top:0;transform:translateX(-2px);font-size:11px;line-height:1;letter-spacing:.5px;white-space:nowrap;color:#9fb6d4;",
        "  background:rgba(8,20,34,.92);border:1px solid rgba(56,189,248,.22);border-radius:4px;padding:3px 7px;font-weight:500}",
        ".s6-seglbls span:before{content:'';position:absolute;left:0;top:-8px;width:1px;height:8px;background:rgba(125,211,252,.7);",
        ".s6-seglbls .s6-jump{background:none;border:0;padding:0}",
        ".s6-seglbls .s6-lb-text{position:absolute;top:0;display:inline-block;white-space:nowrap;font-style:normal;font-weight:500;",
        "  font-size:11px;line-height:1;letter-spacing:.5px;color:inherit;background:rgba(8,20,34,.92);",
        "  border:1px solid rgba(56,189,248,.22);border-radius:4px;padding:3px 7px}",
        ".s6-seglbls .s6-jump{pointer-events:auto;cursor:pointer;color:#fbbf24;text-shadow:0 1px 4px rgba(0,0,0,.9)}",
        ".s6-seglbls .s6-jump .s6-lb-text{left:12px}",
        ".s6-seglbls .s6-jump:before{background:#f59e0b;box-shadow:0 0 7px rgba(245,158,11,.75)}",
        "  box-shadow:0 0 5px rgba(56,189,248,.45)}",
        "  background:#eaf6ff;box-shadow:0 0 10px rgba(56,189,248,.9);text-decoration:none}",        ".s6-col .st.b{color:#60a5fa}",        ".s5-confirm:hover{filter:brightness(1.12)}",        ".s5-m b i{font-style:normal;font-size:12px;margin-left:1px}",        ".s4-mic{width:104px;height:104px;flex:none;border-radius:50%;display:grid;place-items:center;color:#eaf6ff;",
        "  background:radial-gradient(circle at 50% 35%,#2563eb,#0a1d3c 72%);border:1px solid rgba(96,165,250,.55);",
        "  box-shadow:0 0 34px rgba(37,99,235,.55),0 0 0 7px rgba(37,99,235,.12)}",
        ".s3-mic{position:absolute;right:28px;bottom:60px;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;color:#93c5fd;",
        "  background:radial-gradient(circle at 50% 35%,#1e40af,#0b1e3a 72%);border:1px solid rgba(96,165,250,.5);",
        "  box-shadow:0 0 26px rgba(37,99,235,.5);z-index:12;opacity:0;cursor:default}"
      ].join("\n");
      document.head.appendChild(sty);
    }

    return {
      map: map,
      host: mapHost,
      areaEls: areaEls,
      labelEls: labelEls,
      ao: GEO.px(AO.lon, AO.lat),
      menu: [].slice.call(root.querySelectorAll(".s3-mi")),
      toolbar: root.querySelector(".s3-toolbar"),
      side: root.querySelector(".s3-side"),
      res: root.querySelector(".s3-res"),
      scale: root.querySelector(".s3-scale"),
      scaleBar: root.querySelector(".s3-scale b"),
      scaleText: root.querySelector(".s3-scale span"),
      coord: root.querySelector(".s3-coord"),
      mic: root.querySelector(".s3-mic"),
      variant: variant,
      scid: sc && sc.id,
      voicePanel: root.querySelector(".s4-voice"),
      bubbles: [].slice.call(root.querySelectorAll(".s4-bub")),
      shown: [], shownAt: [],
      micBig: root.querySelector(".s4-mic"),
      cards: cardEls,
      prompt: root.querySelector(".s3-prompt"),
      status: [].slice.call(root.querySelectorAll(".s3-st")),
      picked: false
    };
  }

  function render(t, e) {
    /* 相机：12 秒缓慢推近关注区 */
    /* 相机：zoom 推近 + 俯仰/方位微调 */
    var cp = FX.easeInOut(FX.at(t, 0.2, 11.0));
    var is3d = !!(e.map && e.map.is3d);
    /* 平面版：斜着看的平整卫星图（pitch 只是相机倾斜，没有地形起伏） */
var zoom = is3d ? FX.lerp(10.95, 11.25, cp) : CAM03.zoom;
    var pitch = is3d ? FX.lerp(62, 70, cp) : CAM03.pitch;
    var bearing = is3d ? FX.lerp(-30, -18, cp) : -20;
    var center = is3d ? [116.218, 39.920] : CAM03.center.slice();
    /* 新任务区 80x80km：所有地图屏统一对着它 */
    if (e.scid === "SH-06") { center = [114.100, 39.880]; }
    /* 镜头跟随：平面版没有地形网格要重建，必须每帧跟着 t 动 ——
       原来 0.12 秒才跳一次 = 8fps 的镜头，肉眼看就是一格一格地卡。
       3D 版每次 jumpTo 都要重建地形网格，仍然保留 0.12 秒节流。 */
    var last = e._camLast;
    var moved, minGap;
    if (is3d) {
      moved = !last || Math.abs(zoom - last.zoom) > 0.004 ||
              Math.abs(pitch - last.pitch) > 0.35 || Math.abs(bearing - last.bearing) > 0.5;
      minGap = 0.12;
    } else {
      moved = !last || Math.abs(zoom - last.zoom) > 0.0002 ||
              Math.abs(pitch - last.pitch) > 0.02 || Math.abs(bearing - last.bearing) > 0.02 ||
              center[0] !== last.cx || center[1] !== last.cy;
      minGap = 0;
    }
    if (moved && Math.abs(t - (e._camT == null ? -99 : e._camT)) > minGap) {
      e._camT = t;
      e._camLast = { zoom: zoom, pitch: pitch, bearing: bearing, cx: center[0], cy: center[1] };
      e.map.setView({ center: center, zoom: zoom, pitch: pitch, bearing: bearing });
    }

    /* 区域图元与标签在 build 时就已经是最终透明度，这里不再逐帧驱动（不做淡入） */

    /* 左下角坐标 */
    e.coord.textContent = "116.21800, 39.92000";

    /* 比例尺：自动挑一个整数公里，条子落在 70~150px */
    var mpp = 156543.03 * Math.cos(39.920 * Math.PI / 180) / Math.pow(2, zoom);
    var cands = [1000, 2000, 5000, 10000, 20000];
    var pick = cands[0];
    for (var ci = 0; ci < cands.length; ci++) { if (cands[ci] / mpp <= 150) pick = cands[ci]; }
    e.scaleBar.style.width = (pick / mpp).toFixed(0) + "px";
    if (e.scaleText) e.scaleText.textContent = (pick / 1000) + " km";

    if (t < 3.4 || !e._settled) {
      /* SH-04 不重播进场动画：时间直接当已播完，界面一次性给到完成态 */
      var ti = e.variant === "select" ? t : 99;
      if (t >= 3.4) e._settled = true;
    /* 左侧菜单逐项浮入 */
    e.menu.forEach(function (n, i) {
      var p = FX.easeOut(FX.at(ti, 0.15 + i * 0.07, 0.6 + i * 0.07));
      n.style.opacity = p;
      n.style.transform = "translateX(" + ((1 - p) * -18).toFixed(1) + "px)";
    });

    /* 工具条 / 右侧面板 / 比例尺 / 麦克风 */
    var tp = FX.easeOut(FX.at(ti, 0.55, 1.15));
    e.toolbar.style.opacity = tp;
    e.toolbar.style.transform = "translateY(" + ((1 - tp) * -14).toFixed(1) + "px)";

    var sp = FX.easeOut(FX.at(ti, 0.85, 1.5));
    e.side.style.opacity = sp;
    e.side.style.transform = "translateX(" + ((1 - sp) * 26).toFixed(1) + "px)";

    var rp = FX.easeOut(FX.at(ti, 1.15, 1.8));
    if (e.res) {
      e.res.style.opacity = rp;
      e.res.style.transform = "translateY(" + ((1 - rp) * 18).toFixed(1) + "px)";
    }

    e.scale.style.opacity = FX.at(ti, 1.3, 1.9);
    e.coord.style.opacity = FX.at(ti, 1.4, 2.0);
    e.mic.style.opacity = FX.at(ti, 1.6, 2.2);

    /* 底部状态栏 */
    e.status.forEach(function (n, i) {
      n.style.opacity = FX.at(ti, 0.9 + i * 0.07, 1.35 + i * 0.07);
    });

    }

    /* 三张场景卡 */
    e.cards.forEach(function (n, i) {
      /* 顺序：先出「请选择任务场景」，再依次浮出三张场景卡 */
      var q = FX.easeOut(FX.at(t, 8.60 + i * 0.34, 9.30 + i * 0.34));
      n.style.opacity = q;
      n.style.transform = "translateY(" + ((1 - q) * 26).toFixed(1) + "px)";
    });

    /* 等待点：提示淡入 + 呼吸
       呼吸只用 transform 缩放（走合成层，不重绘）；阴影是 CSS 里写死的静态值。
       之前每帧改 box-shadow 会让三张卡片 + 提示条每帧重绘一大片，等待时自然发卡。 */
    /* SH-04：底部 AI 决策助手
       对话气泡常显（不按时间淡入）——这样从别的屏返回 SH-04 时对话还在，
       也不会出现"停在 t=0 时整块面板透明看不见"的情况。 */
    if (e.voicePanel && e.micBig) {
      /* 对话逐条播出：到点才出现（0.45 秒淡入 + 上浮）；
         已经出现过的气泡"说过就留下"——回退进度条或从别的屏返回都不会消失；
         重播时场景会重建，shown 归零，从头再来。 */
      e.bubbles.forEach(function (b, i) {
        var bt = VOICE[i] ? VOICE[i].t : 99;
        if (t >= bt) e.shown[i] = true;
        var q = 0;
        if (e.shown[i]) {
          /* 淡入进度按"播出时刻"算，直接跳到这一段也能正确显示为已完成 */
          q = (t < bt) ? 1 : FX.easeOut(Math.min(1, (t - bt) / 0.45));
        }
        b.style.opacity = q;
        b.style.transform = "translateY(" + ((1 - q) * 8).toFixed(1) + "px)";
      });
      var bs = 0.5 + 0.5 * Math.abs(Math.sin(t * 2.4));
      e.micBig.style.transform = "scale(" + (1 + bs * 0.05).toFixed(3) + ")";
    }

    if (e.prompt) {
      var hp = FX.easeOut(FX.at(t, 7.60, 8.15));
      var breath = 0.5 + 0.5 * Math.abs(Math.sin(t * 2.1));
      e.prompt.style.opacity = hp;
      e.prompt.style.transform = "translateX(-50%) translateY(" + ((1 - hp) * 14).toFixed(1) + "px) scale(" + (1 + breath * 0.012).toFixed(4) + ")";
      if (t >= 11.5) {
        e.cards.forEach(function (n) {
          if (n.classList.contains("picked") || n.classList.contains("fade")) return;
          n.style.transform = "translateY(0px) scale(" + (1 + breath * 0.006).toFixed(4) + ")";
        });
      }
      if (t < 11.2 && e.picked !== false) {
        e.picked = false;
        e.cards.forEach(function (n) { n.classList.remove("picked", "fade"); n.style.boxShadow = ""; });
      }
    }
  }

  /* 从预热状态切到前台时强制重绘一次，避免首次显示空白 */
  function onShow(e) {
    /* 切到前台：先把共享画布挂到自己容器上（若它还在别的屏里），再校准一次 */
    if (e && e.scid === "SH-06" && window.PLAYER) window.PLAYER.pause();   /* 这一屏交给飞行演示的独立时钟 */
    if (e && e.host && window.MapViewShared) window.MapViewShared(e.host);
    if (e && e.scid === "SH-06" && e.host && e.host.closest) {
      var scr = e.host.closest(".scr");
      if (scr && scr.__s6Refresh) scr.__s6Refresh();
    }
    if (e && e.map && e.map.repaint) e.map.repaint();
  }

  return {
    build: build, render: render, onShow: onShow, usesMap: true, ownSubs: IS_MISSION,
    onHide: function () { if (hideHook) { try { hideHook(); } catch (e) {} } }
  };
}

/* SH-03：带场景选择；SH-04：任务信息 + 两个按钮（同一套界面，同一套地图） */
window.SCENES["SH-03"] = make("select");
window.SCENES["SH-04"] = make("mission");
window.SCENES["SH-05"] = make("plan");   /* 主框架 + 三栏（机型/推荐方案/理由） */
window.SCENES["SH-06"] = make("frame");  /* 主框架 + A* 航路 */
})();
