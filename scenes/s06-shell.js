/* SH-06 外壳模板：三场景共用。
   只负责「框」：资源概况、右栏目标工具箱 + AI 助手、视频窗框架、播放控制条、图层面板、空地图占位。
   场景专属内容（地图绘制 / 飞行仿真 / 目标数据 / 视频源 / AI 事件）由各自适配层注入。 */
window.S06_SHELL = (function () {
  var LAYERS = [
    { k: "tracks", label: "规划航迹" },
    { k: "trails", label: "无人机航迹" },
    { k: "fleetno", label: "无人机编号" },
    { sec: "扫描矩形 / 覆盖层" },
    { k: "cov-photo", label: "光电覆盖小格" },
    { k: "cov-sar", label: "雷达SAR覆盖小格" },
    { k: "cov-ewar", label: "电子覆盖小格" },
    { sec: "扇形 / 扇区层" },
    { k: "scan", label: "光电扫描扇形" },
    { k: "jfan", label: "电子扫描扇区" },
    { k: "sbeam", label: "雷达SAR扫描条带" }
  ];
  var EMPTY_VIDEO_CARDS = [
    { k: "A", title: "视频通道 A · 待接入" },
    { k: "B", title: "视频通道 B · 待接入" },
    { k: "C", title: "视频通道 C · 待接入", cls: " s6-video-extra", hidden: true },
    { k: "D", title: "视频通道 D · 待接入", cls: " s6-video-extra", hidden: true },
    { k: "E", title: "视频通道 E · 待接入", cls: " s6-video-third", hidden: true },
    { k: "F", title: "视频通道 F · 待接入", cls: " s6-video-third", hidden: true }
  ];
  /* 常驻界面元素（外壳自带，不依赖 make() 内部变量） */
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

  function htmlRes(uavs) {
    return "<section class=\"s6-res\"><div class=\"s6-grid\">" + (uavs || []).map(function (u) {
      return "<div class=\"s6-col\" data-uav=\"" + u.k + "\" data-used=\"" + u.used + "\" data-rest=\"" + u.rest + "\" style=\"--c:" + u.c + "\">" +
        "<img src=\"assets/img/" + u.img + "\" alt=\"\">" +
        "<div class=\"lb\">" + u.k.replace("无人机", "") + "</div>" +
        "<div class=\"s6-nums\"><b class=\"g s6-used\">" + u.used + "</b><i>/</i><b class=\"r s6-lost\">0</b><i>/</i><b class=\"b s6-rest\">" + u.rest + "</b></div>" +
      "</div>";
    }).join("") + "</div></section>";
  }
  function htmlTargetItem(t) {
    var rows = (t.rows || []).map(function (r) {
      return "<div class=\"s6-tb-row\"><span>" + r[0] + "</span><b" + (r[2] ? " class=\"" + r[2] + "\"" : "") + ">" + r[1] + "</b></div>";
    }).join("");
    var tags = (t.tags || []).map(function (x) { return "<i>" + x + "</i>"; }).join("");
    return "<div class=\"s6-tb s6-target-item\" data-target=\"" + t.no + "\" style=\"display:none\">" +
      "<div class=\"s6-tb-head\">" +
        "<span class=\"s6-tb-no\">" + t.no + "</span>" +
        "<span class=\"s6-tb-name\">" + t.name + "</span>" +
        "<i class=\"s6-tb-sus\">" + (t.sus || "") + "</i>" +
        "<i class=\"s6-tb-arrow\"></i>" +
      "</div>" +
      "<div class=\"s6-tb-body\">" + rows + "<div class=\"s6-tb-tags\">" + tags + "</div></div>" +
    "</div>";
  }
  /* 右侧目标卡片（同场景 2-06）：6 个疑似目标，20:03 后显示 */
  function s1TargetCards() {
    if (!S1_BASE) return [];
    return S1_BASE.targets.map(function (o, i) {
      var second = (o.no === "007" || o.no === "008");
      return {
        no: o.no,
        name: o.name,
        sus: "疑似",
        rows: [
          ["类型", o.kind === "radar" ? "雷达目标" : o.kind === "jet" ? "空中目标" : "地面目标"],
          ["判定", "疑似（未经确认）", "sus s6-tb-judge"],
          ["来源", second ? "光电侦察机 06" : "雷达侦察机 SAR-01"],
          ["区域", second ? "任务区东侧" : "岸基机场"]
        ],
        tags: ["疑似目标", "待复核"]
      };
    });
  }
  function s1UpdateTargetPanel(root, t) {
    if (!root) return;
    var items = root.querySelectorAll(".s6-target-item");
    var cnt = root.querySelector(".s6-target-count");
    var times = s1BaseTimes();
    var n = 0;
    [].forEach.call(items, function (el) {
      var id = el.getAttribute("data-target");
      var tm = times[id];
      var show = !!(tm && t + 1e-6 >= tm.sus);
      el.style.display = show ? "" : "none";
      if (!show) { el.classList.remove("confirmed", "destroyed"); return; }
      n++;
      var st = tm.dest && t + 1e-6 >= tm.dest ? 3 : (tm.conf && t + 1e-6 >= tm.conf ? 2 : 1);
      el.classList.toggle("confirmed", st === 2);
      el.classList.toggle("destroyed", st === 3);
      var judge = el.querySelector(".s6-tb-judge");
      if (judge) {
        judge.textContent = st === 3 ? "已摧毁" : st === 2 ? "已确认" : "疑似（未经确认）";
        judge.className = "s6-tb-judge " + (st === 3 ? "destroyed" : st === 2 ? "confirmed" : "sus");
      }
      var sus = el.querySelector(".s6-tb-sus");
      if (sus) {
        sus.textContent = st === 3 ? "已摧毁" : st === 2 ? "已确认" : "疑似";
        sus.className = "s6-tb-sus" + (st === 3 ? " dest" : st === 2 ? " conf" : "");
      }
      var tags = el.querySelector(".s6-tb-tags");
      if (tags) tags.innerHTML = st === 3 ? "<i>已摧毁</i>" : st === 2 ? "<i>已确认</i>" : "<i>疑似目标</i><i>待复核</i>";
    });
    if (cnt) cnt.textContent = String(n);
    var empty = root.querySelector(".s6-tb-empty");
    if (empty) empty.style.display = n ? "none" : "";
  }
  /* SH-06：只继承前面 SH-04/05 的共享 AI 对话，本屏不新增消息 */
  function s1SharedAiMessages() {
    window.APP_STATE = window.APP_STATE || {};
    if (!window.APP_STATE.aiMessages) window.APP_STATE.aiMessages = [];
    return window.APP_STATE.aiMessages;
  }
  function s1RenderSharedAi(el, t) {
    if (!el) return;
    var tt = typeof t === "number" ? t : Infinity;
    var arr = s1SharedAiMessages();
    var pre = (window.APP_STATE && window.APP_STATE.scenarioId ? window.APP_STATE.scenarioId : "scene-1") + ":";
    var html = "";
    for (var i = 0; i < arr.length; i++) {
      if (!arr[i]) continue;
      var k = String(arr[i].key || "");
      var own = k.indexOf("s1-") === 0;                       /* 本屏 SH-06 自己的气泡 */
      var inh = k.indexOf(pre + "s4-") === 0 || k.indexOf(pre + "s5-") === 0;   /* SH-04/05 已经说过的 */
      if (!own && !inh) continue;
      /* 只有本屏气泡跟进度；前面两屏的一直保留 */
      if (own && typeof arr[i].t === "number" && tt + 1e-6 < arr[i].t) continue;
      var who = arr[i].who || "ai";
      html += '<div class="s6-msg ' + who + '"><div class="s6-avatar">' + (who === "user" ? "用户" : "AI") +
        '</div><div class="s6-bubble">' + arr[i].text + '</div></div>';
    }
    el.innerHTML = html;
    var sc = el.closest ? el.closest(".s6-chat-scroll") : null;
    if (sc) sc.scrollTop = sc.scrollHeight;
  }
  function htmlRight(targets) {
    return "<section class=\"s6-right\">" +
      "<section class=\"s6-ai\">" +
        "<div class=\"s6-ai-h\">" + ic("mic", 16, "", 1.6) + "<span>AI决策助手</span></div>" +
        "<div class=\"s6-chat s6-chat-scroll\"><div class=\"s6-ai-log\"></div></div>" +
      "</section>" +
      "<div class=\"s6-toolbox\">" +
        "<div class=\"s6-toolbox-h\"><span>目标</span><b class=\"s6-target-count\">0</b></div>" +
        ((targets && targets.length) ? targets.map(htmlTargetItem).join("") : "") +
        "<div class=\"s6-tb-empty\">暂无目标</div>" +
      "</div>" +
    "</section>";
  }
  function htmlVideo(cards, sources) {
    var src = (sources || []).map(function (s) {
      return "<video class=\"s6-video-" + s[0] + "\" src=\"assets/video/" + s[1] + "\" muted playsinline preload=\"none\"></video>";
    }).join("");
    var small = (cards || []).map(function (c) {
      return "<div class=\"s6-video-card s6-video-small-card" + (c.cls || "") + "\" data-video=\"" + c.k + "\"" + (c.hidden ? " style=\"display:none\"" : "") + ">" +
        "<div class=\"s6-video-title\">" + c.title + "</div>" +
        "<canvas class=\"s6-video-small-canvas\" data-video=\"" + c.k + "\"></canvas>" +
      "</div>";
    }).join("");
    return "<div class=\"s6-video-source\">" + src + "</div>" +
      "<section class=\"s6-video-smallbar\">" + small + "</section>" +
      "<section class=\"s6-video-large\"><div class=\"s6-video-grid\"></div></section>";
  }
  function htmlControls(totalText) {
    return "<section class=\"s6-ctl\">" +
      "<div class=\"s6-line\">" +
        "<button class=\"s6-go\" aria-label=\"播放\"><img class=\"s6-ic-play\" src=\"assets/img/play.png\" alt=\"\"><img class=\"s6-ic-pause\" src=\"assets/img/pause.png\" alt=\"\"></button>" +
        "<div class=\"s6-spds\">" + [1, 2, 4].map(function (v) { return "<b data-s=\"" + v + "\"" + (v === 1 ? " class=\"on\"" : "") + ">" + v + "×</b>"; }).join("") + "</div>" +
        "<div class=\"s6-tm\"><b>00:00</b> / <span class=\"s6-tot\">" + (totalText || "30:00") + "</span></div>" +
      "</div>" +
      "<div class=\"s6-bar\"><div class=\"s6-segs\"></div><i class=\"s6-fill\"></i><s class=\"s6-knob\"></s></div>" +
      "<div class=\"s6-seglbls\"></div>" +
    "</section>";
  }
  function htmlLayers(layers) {
    return "<section class=\"s6-lyr-panel\">" +
      "<div class=\"s6-lyr-h\"><b>图层</b><button data-all=\"1\">全显</button><button data-all=\"0\">全隐</button></div>" +
      (layers || []).map(function (o) {
        if (o.sec) return "<div class=\"s6-lyr-sec\">" + o.sec + "</div>";
        if (o.children && o.children.length) {
          return "<div class=\"s6-lyr-grp\" data-grp=\"" + o.k + "\">" +
            "<div class=\"s6-lyr-head\"><i class=\"s6-lyr-caret\"></i>" +
              "<input type=\"checkbox\" checked data-k=\"" + o.k + "\"><span>" + o.label + "</span></div>" +
            "<div class=\"s6-lyr-sub\">" +
              o.children.map(function (c) {
                return "<label class=\"s6-lyr\"><input type=\"checkbox\" checked data-k=\"" + c.k + "\"><span>" + c.label + "</span></label>";
              }).join("") +
            "</div></div>";
        }
        return "<label class=\"s6-lyr\"><input type=\"checkbox\"" + (o.off ? "" : " checked") + " data-k=\"" + o.k + "\"><span>" + o.label + "</span></label>";
      }).join("") +
    "</section>";
  }
  function htmlEmptyMap(text) {
    return "<div class=\"s6-map-empty\"><div class=\"s6-map-empty-t\">" + text + "</div></div>";
  }
  function fmt(s) {
    var m = Math.floor(s / 60), ss = Math.floor(s % 60);
    var mm = m < 10 ? "0" + m : String(m);
    return mm + ":" + ("0" + ss).slice(-2);
  }
  function ensureLayerCss() {
    if (document.getElementById("css-s6lyr")) return;
    var st = document.createElement("style");
    st.id = "css-s6lyr";
    st.textContent = [
      ".s6-lyr-panel{position:absolute;left:116px;top:142px;width:200px;padding:10px 12px;border-radius:10px;",
      "  background:rgba(8,20,34,.94);border:1px solid rgba(56,189,248,.35);box-shadow:0 12px 32px rgba(0,0,0,.55);",
      "  display:none;z-index:30;font-size:14px;color:#cfe3f7;max-height:calc(100vh - 190px);overflow:auto}",
      ".s6-lyr-panel.on{display:block}",
      ".s6-lyr-h{display:flex;align-items:center;gap:8px;font-size:13px;color:#7dd3fc;letter-spacing:2px;",
      "  padding-bottom:8px;border-bottom:1px solid rgba(56,189,248,.18);margin-bottom:4px}",
      ".s6-lyr-h b{margin-right:auto;font-weight:600}",
      ".s6-lyr-h button{background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.3);color:#9fd0f5;",
      "  border-radius:5px;padding:2px 8px;font-size:12px;cursor:pointer}",
      ".s6-lyr{display:flex;align-items:center;gap:9px;padding:7px 2px;cursor:pointer;user-select:none}",
      ".s6-lyr input{accent-color:#38bdf8;width:14px;height:14px;cursor:pointer}",
      ".s6-lyr-sec{margin:8px 0 2px;padding:5px 2px 4px;border-top:1px solid rgba(56,189,248,.16);color:#7dd3fc;font-size:12px;letter-spacing:1px}",
      ".s6-lyr-sec:first-of-type{border-top:0;margin-top:2px}",
      ".s6-lyr-grp{margin:0}",
      ".s6-lyr-head{display:flex;align-items:center;gap:9px;padding:7px 2px;cursor:pointer;user-select:none}",
      ".s6-lyr-head input{accent-color:#38bdf8;width:14px;height:14px;cursor:pointer}",
      ".s6-lyr-caret{flex:none;width:9px;height:9px;border-right:1.6px solid #7dd3fc;border-bottom:1.6px solid #7dd3fc;",
      "  transform:rotate(-45deg);transition:transform .15s ease;margin-right:2px}",
      ".s6-lyr-grp.on .s6-lyr-caret{transform:rotate(45deg)}",
      ".s6-lyr-sub{display:none;padding-left:17px}",
      ".s6-lyr-grp.on .s6-lyr-sub{display:block}"
    ].join("\n");
    document.head.appendChild(st);
  }
  function ensureEmptyCss() {
    if (document.getElementById("css-s6empty")) return;
    var st = document.createElement("style");
    st.id = "css-s6empty";
    st.textContent = [
      ".s6-map-empty{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,#0b1a2c,#040a12 72%)}",
      ".s6-map-empty-t{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:16px;",
      "  letter-spacing:4px;color:#4c6480;border:1px dashed rgba(56,189,248,.25);padding:10px 22px;",
      "  border-radius:8px;background:rgba(8,18,32,.5)}",
      ".s6-tb-empty{padding:14px 4px;font-size:13px;color:#4c6480;letter-spacing:1px}",
      /* 目标卡片（同场景二 SH-06）：头部可点开/收起 */
      ".s6-right{position:absolute;right:32px;top:88px;width:344px;z-index:13;display:flex;flex-direction:column;gap:18px;height:calc(100% - 108px)}",
      ".s6-toolbox{position:relative;z-index:1;border-radius:10px;overflow-y:auto;flex:0 1 auto;min-height:0;",
      "  background:linear-gradient(180deg,rgba(6,18,32,.97),rgba(4,12,22,.98));border:1px solid rgba(56,189,248,.28);",
      "  box-shadow:0 12px 32px rgba(0,0,0,.5),0 0 0 1px rgba(56,189,248,.08) inset;",
      "  scrollbar-width:thin}",
      ".s6-toolbox-h{display:flex;align-items:center;justify-content:space-between;padding:10px 13px;",
      "  font-size:15px;letter-spacing:1px;color:#e8f4ff;border-bottom:1px solid rgba(56,189,248,.2);",
      "  background:linear-gradient(180deg,rgba(56,189,248,.12),rgba(56,189,248,.02))}",
      ".s6-toolbox-h b{font-family:var(--num);font-size:12px;color:#7dd3fc;border:1px solid rgba(56,189,248,.38);",
      "  background:rgba(56,189,248,.1);border-radius:4px;padding:1px 7px;font-weight:500}",
      ".s6-tb{border-top:1px solid rgba(56,189,248,.14);background:rgba(6,20,36,.72)}",
      ".s6-tb:first-of-type{border-top:0}",
      ".s6-tb-head{display:flex;align-items:center;gap:9px;padding:9px 12px;cursor:pointer;user-select:none;",
      "  color:#bcd6f0;font-size:13.5px;transition:background .16s}",
      ".s6-tb-head:hover{background:rgba(20,48,78,.85)}",
      ".s6-tb.open .s6-tb-head{background:rgba(18,48,80,.92);color:#eaf6ff}",
      ".s6-tb-no{font-family:var(--num);font-size:12px;color:#7dd3fc;min-width:26px}",
      ".s6-tb-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".s6-tb-sus{font-style:normal;font-size:11px;color:#fbbf24;border:1px solid rgba(251,191,36,.5);",
      "  border-radius:4px;padding:0 5px}",
      ".s6-tb-arrow{width:6px;height:6px;border-right:1.5px solid #6f8aa8;border-bottom:1.5px solid #6f8aa8;",
      "  transform:rotate(-45deg);transition:transform .16s}",
      ".s6-tb.open .s6-tb-arrow{transform:rotate(45deg);border-color:#7dd3fc}",
      ".s6-tb-body{display:none;padding:9px 12px 11px 57px;background:rgba(4,12,22,.5)}",
      ".s6-tb.open .s6-tb-body{display:block}",
      ".s6-tb-row{display:flex;gap:10px;font-size:12.5px;line-height:1.75;color:#8fb0d0}",
      ".s6-tb-row span{color:#6f8aa8;min-width:42px}",
      ".s6-tb-row b{font-weight:500;color:#dbeafe}",
      ".s6-tb-row b.sus{color:#fbbf24}",
      ".s6-tb-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}",
      ".s6-tb-tags i{font-style:normal;font-size:11px;color:#7dd3fc;background:rgba(56,189,248,.1);",
      "  border:1px solid rgba(56,189,248,.25);border-radius:4px;padding:1px 6px}",
      /* AI 对话面板（同场景二） */
      ".s6-ai{border-radius:12px;padding:12px 14px;background:linear-gradient(180deg,rgba(6,18,32,.97),rgba(4,12,22,.98));",
      "  border:1px solid rgba(56,189,248,.24);box-shadow:0 12px 32px rgba(0,0,0,.45);display:flex;flex-direction:column;height:400px;flex:none}",
      ".s6-ai-h{display:flex;align-items:center;gap:7px;font-size:14px;letter-spacing:1px;color:#bfe9ff;",
      "  padding-bottom:9px;border-bottom:1px solid rgba(56,189,248,.14)}",
      ".s6-ai-h svg{color:#38bdf8}",
      ".s6-chat{margin-top:10px;display:flex;flex-direction:column;gap:10px;flex:1 1 auto;min-height:0}",
      ".s6-chat-scroll{max-height:none;overflow-y:auto;overscroll-behavior:contain;padding-right:4px;",
      "  scrollbar-width:thin;scrollbar-color:rgba(56,189,248,.35) transparent;flex:1 1 auto;min-height:0}",
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
      ".s6-msg.user .s6-bubble:before{left:auto;right:-5px;border-right:0;border-left:5px solid rgba(22,101,52,.88)}"
    ].join("\n");
    document.head.appendChild(st);
  }
  /* 场景一 SH-06：SAR 影像窗 / 侦察视频窗 / 目标三态样式 */
  function ensureS1Css() {
    if (document.getElementById("css-s1-play")) return;
    var st = document.createElement("style");
    st.id = "css-s1-play";
    st.textContent = [
      ".s1-sar-win{position:absolute;left:28%;top:14%;width:40%;z-index:23;display:none;",
      "  background:#04101f;border:1px solid rgba(56,189,248,.45);border-radius:10px;overflow:hidden;",
      "  box-shadow:0 20px 60px rgba(0,0,0,.65);cursor:zoom-in}",
      ".s1-sar-win.on{display:block}",
      ".s1-sar-win.zoom{left:12%;top:9%;width:70%;cursor:zoom-out}",
      ".s1-sar-win img{display:block;width:100%;height:auto;max-height:620px;object-fit:contain;background:#000}",
      ".s1-sar-cap{padding:6px 10px;font-size:12px;letter-spacing:1px;color:#9fd0f5;background:rgba(4,16,30,.92)}",
      ".s6-video-source{position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:.001;pointer-events:none;z-index:-1}",
      ".s6-video-source video{display:block;width:1px;height:1px}",
      ".s6-video-smallbar{position:absolute;left:7.8%;right:21%;top:60%;height:23%;display:none;align-items:center;justify-content:center;gap:16px;z-index:20;pointer-events:none}",
      ".s6-video-smallbar.on{display:flex;pointer-events:auto}",
      ".s6-video-card{display:flex;flex-direction:column;min-width:0;border-radius:9px;overflow:hidden;background:transparent;",
      "  border:1px solid rgba(239,68,68,.65);box-shadow:0 0 24px rgba(239,68,68,.18)}",
      ".s6-video-small-card{width:calc(25% - 12px);flex:none;cursor:pointer}",
      ".s6-video-large{position:absolute;left:7.8%;right:21%;top:14%;height:45%;z-index:19;display:none;opacity:0;pointer-events:none;transition:opacity .3s ease}",
      ".s6-video-large.on{display:flex;align-items:center;justify-content:center;opacity:1;pointer-events:auto;cursor:pointer}",
      ".s6-video-grid{display:grid;gap:10px;width:auto;height:auto}",
      ".s6-video-cell{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;border-radius:9px;box-sizing:border-box;",
      "  border:1px solid rgba(239,68,68,.65);background:transparent;box-shadow:0 0 24px rgba(239,68,68,.18)}",
      ".s6-video-title{height:28px;line-height:28px;padding:0 12px;font-size:12px;letter-spacing:1px;color:#fecaca;",
      "  background:linear-gradient(180deg,rgba(127,29,29,.5),rgba(60,10,10,.6));border-bottom:1px solid rgba(239,68,68,.25)}",
      ".s6-video-small-canvas{display:block;width:100%;aspect-ratio:16/9;height:auto;background:transparent;pointer-events:none}",
      ".s6-video-canvas{display:block;flex:none;width:100%;aspect-ratio:16/9;height:auto;background:transparent;pointer-events:none}",
      ".s1-summary{position:absolute;left:116px;top:137px;width:1404px;height:893px;display:none;z-index:40;",
      "  flex-direction:column;gap:14px;padding:20px 24px;box-sizing:border-box;border-radius:12px;",
      "  background:linear-gradient(180deg,rgba(6,16,30,.975),rgba(4,10,20,.99));",
      "  border:1px solid rgba(56,189,248,.38);box-shadow:0 24px 80px rgba(0,0,0,.65)}",
      ".s1-summary.on{display:flex}",
      ".s1-sum-head b{font-size:26px;letter-spacing:2px;color:#eaf4ff;padding-left:14px;border-left:4px solid #38bdf8}",
      ".s1-sum-kpis{display:flex;gap:16px;margin-bottom:14px}",
      ".s1-sum-kpi{flex:1;background:linear-gradient(180deg,#152741,#101d32);border:1px solid #23395a;",
      "  border-left:4px solid #22c55e;border-radius:10px;padding:12px 18px;display:flex;flex-direction:column;gap:4px}",
      ".s1-sum-kpi.cy{border-left-color:#38bdf8}",
      ".s1-sum-kpi span{font-size:12px;color:#7c9bbd}",
      ".s1-sum-kpi b{font-size:30px;color:#eaf4ff;line-height:1.1}",
      ".s1-sum-kpi em{font-style:normal;font-size:12px;color:#4ade80}",
      ".s1-sum-main{display:flex;gap:16px;flex:1;min-height:0}",
      ".s1-sum-panel{flex:1;background:rgba(12,26,44,.8);border:1px solid #1f3556;border-radius:10px;padding:12px 16px;",
      "  display:flex;flex-direction:column;gap:10px}",
      ".s1-sum-panel h4{margin:0;font-size:16px;color:#e2efff;padding-left:10px;border-left:3px solid #38bdf8}",
      ".s1-sum-rows{display:flex;flex-direction:column;gap:10px}",
      ".s1-sum-tr{display:flex;align-items:center;gap:10px;background:#151f31;border:1px solid #243755;",
      "  border-radius:8px;padding:8px 12px;font-size:13px;color:#eaf4ff}",
      ".s1-sum-tr b{flex:1;font-weight:500}",
      ".s1-sum-tr em{font-style:normal;font-size:11.5px;color:#f87171;border:1px solid #ef4444;",
      "  background:#2a1218;border-radius:4px;padding:2px 8px}",
      ".s1-sum-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 40px;font-size:14px;color:#cfe0f5}",
      ".s1-sum-grid span{display:flex;gap:10px}",
      ".s1-sum-grid b{color:#7dd3fc;font-weight:600}",
      ".s1-sum-loss{margin-top:auto;padding-top:10px;border-top:1px solid #1f3556;font-size:14px;color:#cfe0f5}",
      ".s1-sum-loss b{color:#4ade80;margin-left:6px}",
      ".s1-sum-foot{display:flex;justify-content:center}",
      ".s1-sum-back{width:640px;height:56px;border-radius:10px;border:1px solid #2b4a70;background:#0f1e33;",
      "  color:#9fd0f5;font-size:17px;letter-spacing:1px;cursor:pointer;font-family:inherit}",
      ".s6-tb.confirmed .s6-tb-head{background:rgba(127,29,29,.55);box-shadow:inset 2px 0 0 #ef4444}",
      ".s6-tb.confirmed .s6-tb-no,.s6-tb.confirmed .s6-tb-name{color:#fecaca}",
      ".s6-tb.destroyed .s6-tb-head{background:rgba(70,10,10,.78);box-shadow:inset 2px 0 0 #dc2626}",
      ".s6-tb-sus.conf{color:#fca5a5;border-color:rgba(248,113,113,.5);background:rgba(239,68,68,.12)}",
      ".s6-tb-sus.dest{color:#fecaca;border-color:rgba(248,113,113,.65);background:rgba(127,29,29,.55)}",
      ".s6-tb-row b.confirmed{color:#f87171}",
      ".s6-tb-row b.destroyed{color:#fca5a5}"
    ].join("\n");
    document.head.appendChild(st);
  }
  /* ---------- 场景一 SH-06：编组航线 + 任务区规划航路 ----------
     transit 用实线 path + 地名标签（同场景二编组航线）；area 用虚线 tracks（同场景二规划航迹）。
     数据来自 data/routes-s1.js（离线生成），这里只负责画、开关、清理。 */
  var S1_PLAN_ID = "tracks-s1";
  /* 规划航迹按机型分层：颜色沿用机型色，再靠线型/线宽区分 */
  var S1_PLAN_STYLES = {
    photo: { dash: [2, 3], width: 2.0, opacity: 0.75 },
    sar:   { dash: [6, 3], width: 3.2, opacity: 0.95 },
    gmti:  { dash: [1, 2, 6, 2], width: 3.0, opacity: 0.95 },
    ewar:  { dash: [0.6, 2.6], width: 3.0, opacity: 0.95 },
    comm:  { dash: [3.5, 2], width: 3.6, opacity: 0.95 }
  };
  /* ---------- 场景一 SH-06：开场运镜 + 航路逐句揭示（与场景二同一套逻辑） ----------
     3 句机型台词（S1_AI_EVENTS 里的 013/016/019）= 3 段镜头：
       ① 画出该型的编组航线  ② 镜头从集结区沿这条航线推到任务区
       ③ 拉回「任务区视角」  ④ 在这个视角下画出该型的规划航路（+ 对应侦察格网）
     通信（编组4）没有台词：开局直接画；第 5 句「任务计划已下达」把镜头拉回总览。
     全部是「内层时间 t 的纯函数」，拖动 / 暂停 / 回退都一致。 */
  var S1_SHOT_IN = 0.22, S1_SHOT_GO = 0.72, S1_SHOT_OUT = 0.88;
  /* 中段机位：10.4（≈100 km 视野）。不能再往上：相机 zoom ≥10.5 时 MapLibre 改取 z11/z12 瓦片，
     而 z11/z12 在集结区以北（北纬 25.25 以上）没铺满，镜头朝北看海面会露出阶梯状补丁 */
  var S1_SHOT_ZOOM = 10.4, S1_SHOT_PITCH = 44;
  var S1_SHOTS = [
    { audio: "assets/audio/s1/013.wav", route: "G1", items: ["photo"], grid: "photo" },   /* 光电 */
    { audio: "assets/audio/s1/016.wav", route: "G2", items: ["sar", "gmti"], grid: "sar" },/* 雷达 */
    { audio: "assets/audio/s1/019.wav", route: "G3", items: ["ewar"], grid: null },       /* 电子 */
    { audio: "assets/audio/s1/022.wav", route: "G4", items: ["comm"], grid: null }        /* 中继：说话时才画 */
  ];
  var S1_TAIL_AUDIO = "assets/audio/s1/023.wav";     /* 任务计划已下达：拉回总览 */
  function s1Transit(routeId) {
    var RS = window.ROUTES_S1;
    if (!RS) return null;
    for (var i = 0; i < (RS.transit || []).length; i++) if (RS.transit[i].id === routeId) return RS.transit[i];
    return null;
  }
  /* 折线上按里程取点（编组航线是两点直线，这里也兼容多点） */
  function s1RoutePt(pts, f) {
    if (!pts || !pts.length) return null;
    if (pts.length < 2) return [pts[0][0], pts[0][1]];
    var segs = [], total = 0, i;
    for (i = 1; i < pts.length; i++) {
      var dx = (pts[i][0] - pts[i - 1][0]) * 111320 * Math.cos(pts[i][1] * Math.PI / 180);
      var dy = (pts[i][1] - pts[i - 1][1]) * 111030;
      var L = Math.hypot(dx, dy);
      segs.push(L); total += L;
    }
    var want = Math.max(0, Math.min(1, f)) * total, acc = 0;
    for (i = 0; i < segs.length; i++) {
      if (acc + segs[i] >= want) {
        var k = segs[i] > 0 ? (want - acc) / segs[i] : 0;
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
      }
      acc += segs[i];
    }
    return [pts[pts.length - 1][0], pts[pts.length - 1][1]];
  }
  /* 每句的时间窗：直接取自 S1_AI_SCHED（气泡与语音共用的那张真实时长表） */
  function s1ShotWins() {
    var win = {};
    if (!S1_AI_SCHED.length) return win;
    S1_AI_SCHED.forEach(function (it) {
      var a = it.ev && it.ev.audio;
      if (a && a.length) win[a[0]] = { start: it.start, end: it.end };
    });
    return win;
  }
  function s1CamCopy(c) {
    return { center: [c.center[0], c.center[1]], zoom: c.zoom, pitch: c.pitch, bearing: c.bearing };
  }
  function s1CamMix(a, b, k) {
    return {
      center: [FX.lerp(a.center[0], b.center[0], k), FX.lerp(a.center[1], b.center[1], k)],
      zoom: FX.lerp(a.zoom, b.zoom, k),
      pitch: FX.lerp(a.pitch, b.pitch, k),
      bearing: a.bearing
    };
  }
  /* 场景一机场：跑道 / 滑行道 / 目标（黄=疑似、红=确认） */
  var S1_BASE = window.BASE_S1;
  /* 第二波目标（光电机06 在 36:40 扫描外弧中点发现）：007 导弹发射车 / 008 火控雷达。
     007 就落在该点，008 向东 250 m、向南 150 m，避免图标重叠 */
  (function addSecondWaveTargets() {
    if (!S1_BASE || !S1_BASE.targets) return;
    if (S1_BASE.targets.some(function (t) { return t.no === "007"; })) return;
    S1_BASE.targets.push(
      { id: "tel-1", no: "007", kind: "tel", name: "007导弹发射车", pos: [121.123070, 24.926122] },
      { id: "radar-3", no: "008", kind: "radar", name: "008火控雷达", pos: [121.125550, 24.924771] }
    );
  })();
  var S1_BASE_TIMES = null;
  /* 场景一扫描/覆盖图层分组：mapview 每个 source 对应一个 <id>-l 图层 */
  var S1_VIS = {
    scan: ["scan-f", "scan-r", "scan-o", "scan-s", "scan-bf", "scan-bo", "scan-bl"],
    sbeam: ["sbeam-b", "sbeam-r"],
    rfan: ["rfan-f", "rfan-o"],
    jfan: ["jfan-f", "jfan-o"],
    "cov-photo": ["cov-photo-f", "cov-photo-l"],
    "cov-gmti": ["cov-gmti-f", "cov-gmti-l"],
    "cov-sar": ["cov-sar-f", "cov-sar-l"],
    "cov-ewar": ["cov-ewar-f", "cov-ewar-l"]
  };
  /* 直接按图层 id 切显隐（尾迹这类不走 <id>-l 命名规则的图层） */
  function s1SetLayers(mv, layerIds, on) {
    var raw = null;
    try { raw = mv && mv.map && mv.map(); } catch (err) {}
    if (!raw) return;
    var vis = on ? "visible" : "none";
    layerIds.forEach(function (lid) {
      try { if (raw.getLayer(lid)) raw.setLayoutProperty(lid, "visibility", vis); } catch (err) {}
    });
  }
  function s1SetGroupVisible(mv, key, on) {
    var ids = S1_VIS[key];
    if (!ids) return;
    var raw = null;
    try { raw = mv && mv.map && mv.map(); } catch (err) {}
    if (!raw) return;
    var vis = on ? "visible" : "none";
    ids.forEach(function (lid) {
      try { if (raw.getLayer(lid + "-l")) raw.setLayoutProperty(lid + "-l", "visibility", vis); } catch (err) {}
    });
  }

  /* ---------- 机场（场景一 SH-06） ---------- */
  function s1InPoly(pt, ring) {
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /* 目标出现：1030 s（17:10）后，6 个疑似目标一起标绘 */
  var S1_TGT_T0 = 1030;
  /* 场景一 SH-06 剧情：SAR 发现 → 逐个入列 → 光电盘旋确认 → 远火打击 → 侦察确认毁伤
     说明：SAR 条带物理上仍在 980 s 首次进入机场圆；这里把「发现」的显示节奏整体后移 50 s
     （980→1030 / 988→1038 / 992→1042），只动显示，不动飞行模型 */
  var S1_SAR_IMG_T0 = 1030;                 /* 1030（17:10）：SAR 影像窗开始（窗长 7 s） */
  var S1_SAR_IMG_DUR = 7;
  var S1_TGT_SUS = { "001": 1030, "002": 1030, "003": 1030, "004": 1030, "005": 1030, "006": 1030, "007": 2200, "008": 2200 };
  var S1_TGT_CONF = { "001": 1038, "002": 1038, "003": 1038, "004": 1038, "005": 1038, "006": 1038, "007": 2212, "008": 2212 };
  var S1_TGT_DEST = 1234;                   /* 1234：视频播完、「目标被击中」气泡出现后，目标列表才变已摧毁 */
  var S1_TGT_DEST2 = { "007": 2420, "008": 2420 };   /* 第二波（光电机06 跟踪打击）的摧毁时刻 */
  var S1_VID_T0 = 1158;                     /* 1158（19:18）：05/06 抵达评估阵位，视频开始（打击在第 16 秒） */
  var S1_VID_DUR = 76;
  var S1_VID_T1 = 2200;                     /* 2200（36:40）：光电机06 跟踪打击视频开播（4:40） */
  var S1_VID_DUR1 = 280.6;
  var S1_AI_EVENTS = [
    /* 起场 4 句：没有语音，按 4 字/秒串行（不写 t，由 S1_AI_SCHED 按字数串出来）；
       第一句落在 0.01 s，进屏时时钟还是 0，所以点播放 / 拖动进度条之后才出现。 */
    { opening: true, text: "根据任务需求和编组方案，已生成蜂群作战方案。", audio: ["assets/audio/s1/012.wav"] },
    { opening: true, text: "光电侦察无人机34架 根据目标预测概率执行分块遍历搜索，最大遍历周期8分钟。", audio: ["assets/audio/s1/013.wav", "assets/audio/s1/014.wav", "assets/audio/s1/015.wav"] },
    { opening: true, text: "雷达侦察无人机6架 采用编队协同搜索模式对任务区域进行SAR条带成像侦察，遍历周期20分钟。", audio: ["assets/audio/s1/016.wav", "assets/audio/s1/017.wav", "assets/audio/s1/018.wav"] },
    { opening: true, text: "电子侦察机2架 对于任务区域进行广域协同搜索 遍历周期10分钟。", audio: ["assets/audio/s1/019.wav", "assets/audio/s1/020.wav", "assets/audio/s1/021.wav"] },
    { opening: true, text: "中继通信机4架，双阵位保障编队链路畅通。", audio: ["assets/audio/s1/022.wav"] },
    { opening: true, text: "任务计划已下达给各无人机。", audio: ["assets/audio/s1/023.wav"] },
    { t: 363,   text: "各编组已经抵达任务区，开始执行侦察任务。", audio: ["assets/audio/s1/024.wav"] },
    { t: 1030,  text: "雷达侦察无人机 SAR-01 回传的 SAR 图像识别岸基机场存在 6 个目标：2 架作战飞机，2 部雷达，2 个单体机库，型号已完成识别匹配，置信度99%。", audio: ["assets/audio/s1/025.wav", "assets/audio/s1/026.wav", "assets/audio/s1/027.wav", "assets/audio/s1/028.wav", "assets/audio/s1/029.wav"] },
    { t: 1038,  text: "目标已编批，目标坐标已上报。", audio: ["assets/audio/s1/030.wav"] },
    { t: 1042,  text: "接收上级指令，三分钟后将对机场目标进行远程打击，已分配光电察打机 11、19 执行毁伤评估任务，预计 3 分钟后达到评估阵位。", audio: ["assets/audio/s1/031.wav", "assets/audio/s1/032.wav", "assets/audio/s1/033.wav"] },
    { t: 1158,  text: "光电察打机11已抵达评估阵位，开始回传视频。", audio: ["assets/audio/s1/034.wav"] },
    { t: 1164,  text: "光电察打机19已抵达评估阵位，开始回传视频。", audio: ["assets/audio/s1/035.wav"] },
    { t: 1234,  text: "目标被击中，图像已上传，正在进行毁伤效果判读评估。", audio: ["assets/audio/s1/036.wav", "assets/audio/s1/037.wav"] },
    { t: 1240,  text: "飞机目标003、004已被完全摧毁，雷达目标001、002已被完全摧毁，机库目标005、006被击中，打击效果良好，评估结果已上传。", audio: ["assets/audio/s1/038.wav", "assets/audio/s1/039.wav", "assets/audio/s1/040.wav", "assets/audio/s1/041.wav"] },
    { t: 1246,  text: "光电察打机11、19回归原侦察阵位。", audio: ["assets/audio/s1/042.wav"] },
    /* ---- 第二波：光电机06 跟踪打击（2200 = 36:40 起，视频 4:40） ---- */
    { t: 2200,  text: "光电侦察无人机6发现疑似目标，视频已回传，光电侦察无人机6转入跟踪目标。", audio: ["assets/audio/s1/043.wav", "assets/audio/s1/044.wav"] },
    { t: 2212,  text: "光电侦察无人机6识别导弹发射车、火控雷达目标，置信度95%，目标信息已编批上报。", audio: ["assets/audio/s1/045.wav", "assets/audio/s1/046.wav", "assets/audio/s1/047.wav"] },
    { t: 2222,  text: "接收上级指令，空中打击单元三分钟后将对目标进行打击，光电侦察无人机6执行毁伤评估任务。", audio: ["assets/audio/s1/048.wav", "assets/audio/s1/049.wav", "assets/audio/s1/050.wav"] },
    { t: 2420,  text: "目标被击中，图像已上传，正在进行毁伤效果判读评估。", audio: ["assets/audio/s1/051.wav", "assets/audio/s1/052.wav"] },
    { t: 2426,  text: "目标007、008已被完全摧毁，打击效果良好，评估结果已上传。", audio: ["assets/audio/s1/053.wav", "assets/audio/s1/054.wav"] },
    { t: 2490,  text: "光电察打机06回归原侦察阵位。", audio: ["assets/audio/s1/055.wav"] }
  ];
  /* 慢速语音估算：3 字/秒 + 标点 0.35 s + 起播 0.6 s（后续接真实语音时替换） */
  function s1VoiceDur(text) {
    var t = String(text || "");
    var chars = t.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "").length;
    var punct = (t.match(/[，。：、；！？,.:;]/g) || []).length;
    return 0.6 + chars / 3.0 + punct * 0.35;
  }
  /* 起场 4 句的读文案时长：4 字/秒（标点、空格都算字，<br> 不计） */
  function s1ReadSec(text) {
    var s = String(text || "").replace(/<br\s*\/?>/gi, "").replace(/<[^>]*>/g, "");
    return Math.max(0.5, s.length / 4);
  }
  /* 气泡表：必须与语音表使用同一份"真实时长"，否则气泡会比语音晚 1~10 s。
     时长来自 43 条 wav 的预载（window.s1AudioDur）。只有"全部时长就绪"才建表；
     不再用挂钟兜底（旧的"5 秒后强制估算"会在用户停在选场景页时把表定死成字数估算，
     造成气泡与语音错位、同一句被反复起播）。预载彻底结束（含失败）才允许估算兜底。 */
  var S1_AI_SCHED = [];
  var s1SchedBuilt = false;
  var S1_AI_GAP = 0.25;                 /* 气泡/语音之间的最小间隔（秒），要求 ≥ 200 ms */
  function s1BuildAiSched(force) {
    if (s1SchedBuilt) return true;
    var out = [], prevEnd = -1, missing = 0;
    S1_AI_EVENTS.forEach(function (ev) {
      var list = (ev.audio && ev.audio.length) ? ev.audio : null;
      var dur = 0, missEv = 0;
      if (list) {
        for (var i = 0; i < list.length; i++) {
          var d = window.s1AudioDur ? window.s1AudioDur(list[i]) : 0;
          if (!d) missEv++;
          dur += d;
        }
      }
      if (!list || missEv) {
        dur = s1VoiceDur(ev.text);                        /* 缺时长：按字数估算 */
        if (!ev.silent) missing++;                        /* 显式标记 silent 的事件不算“缺语音” */
      }
      var base = typeof ev.t === "number" ? ev.t : (prevEnd >= 0 ? prevEnd : 0.01);
      /* 相邻气泡/语音之间至少留 S1_AI_GAP 的间隔：
         原来 start = max(base, prevEnd)，两条挨着的事件会「上一条刚读完、下一条立刻起播」，
         甚至因为播放起播/多段拼接的几十毫秒延迟，把上一条的尾音切掉。 */
      var start = prevEnd >= 0 ? Math.max(base, prevEnd + S1_AI_GAP) : base;
      out.push({ ev: ev, start: start, dur: dur, end: start + dur });
      prevEnd = start + dur;
    });
    if (missing && !force) return false;
    S1_AI_SCHED = out;
    s1SchedBuilt = true;
    return true;
  }
  /* 预载每就绪一条就 poke：集齐即建表，并把"用旧时刻推过的本屏气泡"清掉，避免残留错位 */
  window.__s1SchedPoke = function () {
    if (s1SchedBuilt) return;
    if (!s1BuildAiSched(false)) return;
    var arr = s1SharedAiMessages();
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i] && String(arr[i].key || "").indexOf("s1-") === 0) arr.splice(i, 1);
    }
  };
  /* 预载全部结束（有文件失败时）：退回估算，保证演示不至于整屏没气泡没声音 */
  window.__s1SchedFinal = function () { s1BuildAiSched(true); };
  s1BuildAiSched(false);   /* 若预载已完成（如热重载），立刻建表 */
  /* ---------- 场景一语音：42 条 wav 全部预取成 blob（照场景二 ensureScenarioAudioPreload） ----------
     播放时直接用内存里的 Audio，不再"到点才请求"，避免起播失败/延后 */
  window.ensureS1AudioPreload = function () {
    window.APP_STATE = window.APP_STATE || {};
    if (window.APP_STATE.s1AudioPreload) return window.APP_STATE.s1AudioPreload;
    var map = {}, dur = {}, count = 55, settled = 0;
    var box = window.APP_STATE.s1AudioPreload = { map: map, dur: dur, count: count };
    function settledOne() {
      settled++;
      if (window.__s1SchedPoke) window.__s1SchedPoke();          /* 集齐即建表 */
      if (settled >= count && window.__s1SchedFinal) window.__s1SchedFinal();   /* 有失败文件时兜底 */
    }
    for (var i = 1; i <= count; i++) {
      (function (base, src) {
        fetch(src).then(function (r) { return r.blob(); }).then(function (blob) {
          var a = new Audio(URL.createObjectURL(blob));
          a.preload = "auto";
          a.addEventListener("loadedmetadata", function () {
            try { dur[base] = a.duration; } catch (e) {}
            map[base] = a;
            settledOne();
          }, { once: true });
          a.addEventListener("error", settledOne, { once: true });
          a.load();
        }).catch(function () { settledOne(); });
      })("assets/audio/s1/" + ("00" + i).slice(-3) + ".wav",
         "assets/audio/s1/" + ("00" + i).slice(-3) + ".wav" + (window.__BUILD__ ? "?v=" + window.__BUILD__ : ""));
    }
    return box;
  };
  window.s1AudioDur = function (src) {
    var p = window.APP_STATE && window.APP_STATE.s1AudioPreload;
    return (p && p.dur && p.dur[src]) || 0;
  };
  function s1BaseTimes() {
    if (S1_BASE_TIMES) return S1_BASE_TIMES;
    var out = {};
    if (S1_BASE) S1_BASE.targets.forEach(function (o) {
      out[o.id] = { sus: S1_TGT_SUS[o.no] || S1_TGT_T0, conf: S1_TGT_CONF[o.no] || 0, dest: S1_TGT_DEST2[o.no] || S1_TGT_DEST };
      out[o.no] = out[o.id];                 /* 目标列表按编号（001…006）查时间 */
    });
    S1_BASE_TIMES = out;
    return out;
  }

  function s1DrawBase(mv, acc) {
    if (!S1_BASE || !mv) return;
    var B = S1_BASE;
    try {
      mv.image("base-radar-y", "assets/img/radar-target-yellow.png");
      mv.image("base-radar-r", "assets/img/radar-target-red.png");
      mv.image("base-hangar-y", "assets/img/hangar-yellow.png");
      mv.image("base-hangar-r", "assets/img/hangar-red.png");
      mv.image("base-jet-y", "assets/img/jet-yellow.png");
      mv.image("base-jet-r", "assets/img/jet-red.png");
      mv.image("base-tel-y", "assets/img/tel-yellow.png");
      mv.image("base-tel-r", "assets/img/tel-red.png");
    } catch (e) {}
    try { mv.path("base-runway", [B.runway.a, B.runway.b], { color: "#94a3b8", width: 14, opacity: 0.95 }); } catch (e) {}
    try { mv.path("base-taxiway", [B.taxiway.a, B.taxiway.b], { color: "#64748b", width: 5, opacity: 0.9 }); } catch (e) {}
    if (B.link) { try { mv.path("base-link", [B.link.a, B.link.b], { color: "#64748b", width: 5, opacity: 0.9 }); } catch (e) {} }
    try { mv.path("base-centerline", [B.runway.a, B.runway.b], { color: "#f8fafc", width: 1.6, dash: [7, 6], opacity: 0.95 }); } catch (e) {}
    var feats = B.targets.filter(function (o) { return o._st >= 1; }).map(function (o) {
      return { icon: "base-" + o.kind + (o._st >= 2 ? "-r" : "-y"), lon: o.pos[0], lat: o.pos[1], r: B.runway.bearing };
    });
    try { mv.symbols("base-targets", feats, { size: 1 }); } catch (e) {}
    B.targets.forEach(function (o) {
      var ring = [];
      for (var k = 0; k <= 16; k++) {
        var a = k / 16 * Math.PI * 2;
        ring.push([o.pos[0] + Math.cos(a) * 0.0026, o.pos[1] + Math.sin(a) * 0.0029]);
      }
      try { mv.polygon("base-ring-" + o.id, ring, { fill: "#f59e0b", fillOpacity: 0.16, line: "#f59e0b", width: 2 }); } catch (e) {}
      try {
        var raw0 = mv.map();
        ["base-ring-" + o.id + "-f", "base-ring-" + o.id + "-l"].forEach(function (id) {
          if (raw0 && raw0.getLayer(id)) raw0.setLayoutProperty(id, "visibility", "none");
        });
      } catch (e) {}
      try { o._lbl = mv.label(o.name, [o.pos[0] + 0.0013, o.pos[1] + 0.0018], "#fbbf24", 13, "base-lbl-" + o.id); } catch (e) {}
    });
    acc.base = true;
  }

  function s1UpdateBase(mv, acc, t) {
    if (!acc.base || !S1_BASE || !mv) return;
    var times = s1BaseTimes();
    var feats = [], changed = false;
    S1_BASE.targets.forEach(function (o) {
      var tm = times[o.id] || { sus: 0, conf: 0, dest: 0 };
      var nx = 0;
      if (tm.sus && t >= tm.sus) nx = 1;
      if (tm.conf && t >= tm.conf) nx = 2;
      if (tm.dest && t >= tm.dest) nx = 3;
      if (nx !== o._st) { o._st = nx; changed = true; }
      if (nx >= 1) feats.push({ icon: "base-" + o.kind + (nx >= 2 ? "-r" : "-y"), lon: o.pos[0], lat: o.pos[1], r: S1_BASE.runway.bearing });
      if (nx && o._lbl) {
        try {
          o._lbl.setText(nx >= 3 ? o.name + "（已摧毁）" : nx >= 2 ? o.name : o.name + "（疑似）");
          o._lbl.setColor(nx >= 3 ? "#fca5a5" : nx >= 2 ? "#f87171" : "#fbbf24");
        } catch (e) {}
      }
      if (o._lbl) o._lbl.set(nx ? 1 : 0);
    });
    if (!changed) return;
    try { mv.symbols("base-targets", feats, { size: 1 }); } catch (e) {}
    var raw = null;
    try { raw = mv.map(); } catch (e) {}
    if (!raw) return;
    S1_BASE.targets.forEach(function (o) {
      var col = o._st >= 3 ? "#dc2626" : o._st >= 2 ? "#ef4444" : "#f59e0b";
      var vis = o._st ? "visible" : "none";
      try {
        ["base-ring-" + o.id + "-f", "base-ring-" + o.id + "-l"].forEach(function (id) {
          if (!raw.getLayer(id)) return;
          raw.setLayoutProperty(id, "visibility", vis);
          if (o._st) raw.setPaintProperty(id, id.indexOf("-f") > 0 ? "fill-color" : "line-color", col);
        });
      } catch (e) {}
    });
  }

  function s1ClearBase(mv, acc) {
    if (!acc.base || !S1_BASE || !mv) return;
    var raw = null;
    try { raw = mv.map(); } catch (e) {}
    S1_BASE.targets.forEach(function (o) {
      o._st = 0;
      try { if (o._lbl) o._lbl.set(0); } catch (e) {}
      try {
        ["base-ring-" + o.id + "-f", "base-ring-" + o.id + "-l"].forEach(function (id) {
          if (raw && raw.getLayer(id)) raw.setLayoutProperty(id, "visibility", "none");
        });
      } catch (e) {}
    });
    try { mv.symbols("base-targets", [], {}); } catch (e) {}
    ["base-runway-l", "base-taxiway-l", "base-link-l", "base-centerline-l"].forEach(function (id) {
      try { if (raw && raw.getLayer(id)) raw.setLayoutProperty(id, "visibility", "none"); } catch (e) {}
    });
    acc.base = false;
  }

  /* 侦察格网：光电 34 格（大格 + 城区小格）与 SAR 6 块，仅作辅助线显示 */
  function s1DrawGrid(mv, acc) {
    var RS = window.ROUTES_S1;
    if (!mv || !RS || !RS.cells || !RS.cells.length) return;
    var photo = [], sar = [];
    RS.cells.forEach(function (c) { (c.kind === "sar" ? sar : photo).push(c.ring); });
    try { if (photo.length) mv.polygons("s1-grid-photo", photo, { fill: "#38bdf8", fillOpacity: 0.015, line: "#38bdf8", width: 1.1, dash: [4, 4] }); } catch (e) {}
    try { if (sar.length) mv.polygons("s1-grid-sar", sar, { fill: "#facc15", fillOpacity: 0.02, line: "#facc15", width: 1.3, dash: [7, 4] }); } catch (e) {}
    acc.grid = true;
  }
  function s1SetGridVisible(mv, on, which) {
    var raw = null;
    try { raw = mv && mv.map && mv.map(); } catch (e) {}
    if (!raw) return;
    var ids = [];
    if (!which || which === "all" || which === "photo") ids.push("s1-grid-photo-f", "s1-grid-photo-l");
    if (!which || which === "all" || which === "sar") ids.push("s1-grid-sar-f", "s1-grid-sar-l");
    ids.forEach(function (id) {
      try { if (raw.getLayer(id)) raw.setLayoutProperty(id, "visibility", on ? "visible" : "none"); } catch (e) {}
    });
  }
  function s1Draw(mv, acc) {
    var RS = window.ROUTES_S1;
    if (!mv || !RS) return;
    s1DrawGrid(mv, acc);
    acc.ids.length = 0;
    acc.labels.length = 0;
    acc.planIds.length = 0;
    (RS.transit || []).forEach(function (r) {
      try {
        mv.path("s1-route-" + r.id, r.pts, { color: r.color, width: 3 });
        acc.ids.push("s1-route-" + r.id);
      } catch (err) {}
    });
    if (mv.tracks) {
      var groups = {};
      (RS.area || []).forEach(function (p) { (groups[p.group] = groups[p.group] || []).push(p); });
      Object.keys(S1_PLAN_STYLES).forEach(function (g) {
        var list = groups[g];
        if (!list || !list.length) return;
        var st = S1_PLAN_STYLES[g];
        try {
          mv.tracks(S1_PLAN_ID + "-" + g, list.map(function (p) { return { color: p.color, pts: p.pts }; }),
            { color: list[0].color, dash: st.dash, width: st.width, opacity: st.opacity });
          acc.planIds.push(S1_PLAN_ID + "-" + g);
        } catch (err) {}
      });
      acc.plan = true;
    }
    s1DrawBase(mv, acc);
  }

  function s1SetVisible(mv, acc, on, target) {
    var raw = null;
    try { raw = mv && mv.map && mv.map(); } catch (err) {}
    var rev = acc && acc.rev;                 /* 逐句揭示：用户开关 AND 已揭示 */
    if (target === "routes" || target === undefined) {
      acc.ids.forEach(function (id) {
        var vis = (on && (!rev || rev[String(id).replace("s1-route-", "")] !== false)) ? "visible" : "none";
        try { if (raw && raw.getLayer(id + "-l")) raw.setLayoutProperty(id + "-l", "visibility", vis); } catch (err) {}
      });
      acc.labels.forEach(function (h) { try { if (h && h.set) h.set(on ? 1 : 0); } catch (err) {} });
    }
    if (target === "plan" || target === undefined) {
      (acc.planIds || []).forEach(function (id) {
        var vis = (on && (!rev || rev[String(id).replace(S1_PLAN_ID + "-", "")] !== false)) ? "visible" : "none";
        try { if (raw && raw.getLayer(id + "-l")) raw.setLayoutProperty(id + "-l", "visibility", vis); } catch (err) {}
      });
    }
  }

  function s1Clear(mv, acc) {
    if (!mv) return;
    if (acc.plan && mv.tracks) {
      (acc.planIds || []).forEach(function (id) { try { mv.tracks(id, []); } catch (err) {} });
    }
    acc.planIds = [];
    var raw = null;
    try { raw = mv.map && mv.map(); } catch (err) {}
    acc.ids.forEach(function (id) {
      try {
        if (!raw) return;
        if (raw.getLayer(id + "-l")) raw.removeLayer(id + "-l");
        if (raw.getSource(id)) raw.removeSource(id);
      } catch (err) {}
    });
    acc.labels.forEach(function (h) { try { if (h && h.set) h.set(0); } catch (err) {} });
    acc.ids.length = 0;
    acc.labels.length = 0;
    acc.plan = false;
    s1ClearBase(mv, acc);
    s1SetGridVisible(mv, false);
    acc.grid = false;
  }

  /* 空地图层装配：完整外壳 + 无地图、无目标、无视频源、无 AI 事件 */
  function mountEmpty(root, sc, cfg) {
    ensureLayerCss();
    ensureEmptyCss();
    ensureS1Css();
    var uavs = (cfg && cfg.uavs) || [];
    var hasMap = !!(cfg && cfg.mapBounds);   /* 场景一有自己的一套瓦片与边界 */
    if (hasMap) root.classList.add("s3-scene-menu");
    var mapHost = null;
    var s1acc = { ids: [], labels: [], plan: false, planIds: [], base: false, grid: false, showRoutes: true };
    var s1AiLog = null, s1AiLen = -1, s1AiArrLen = -1;
    function s1PumpAi(t) {
      var arr = s1SharedAiMessages();
      S1_AI_SCHED.forEach(function (it, i) {
        if (t + 1e-6 < it.start) return;
        var key = "s1-" + i;
        for (var k = 0; k < arr.length; k++) if (arr[k] && arr[k].key === key) return;
        arr.push({ key: key, who: "ai", t: it.start, text: it.ev.text });
      });
    }
    function s1SyncAi(t) {
      var tt = typeof t === "number" ? t : 0;
      var arr = s1SharedAiMessages(), n = 0;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && typeof arr[i].t === "number" && tt + 1e-6 < arr[i].t) continue;
        n++;
      }
      if (n === s1AiLen && arr.length === s1AiArrLen) return;
      s1AiLen = n; s1AiArrLen = arr.length;
      s1RenderSharedAi(s1AiLog, tt);
    }
    var FL = (hasMap && window.FLIGHT_S1) ? window.FLIGHT_S1 : null;
    var total = FL ? FL.TOTAL : ((window.FLIGHT06 && window.FLIGHT06.TOTAL) || 9000);
    var CH = { MENU: MENU, TOOLS: TOOLS, STATUS: STATUS };
    /* 场景一：规划航迹做成“总开关 + 5 个机型子开关”，默认折叠 */
    var shellLayers = LAYERS;
    if (hasMap) {
      shellLayers = [];
      LAYERS.forEach(function (o) {
        if (o.k === "tracks") {
          shellLayers.push({ k: "tracks", label: "规划航迹", children: [
            { k: "tracks-photo", label: "光电察打机" },
            { k: "tracks-sar", label: "雷达侦察机" },
            { k: "tracks-ewar", label: "电子侦察机" },
            { k: "tracks-comm", label: "中继通信机" }
          ] });
        } else shellLayers.push(o);
      });
      shellLayers = [{ k: "s1routes", label: "编组航线" }, {
        k: "s1grid", label: "侦察格网", children: [
          { k: "s1grid-photo", label: "光电格网" },
          { k: "s1grid-sar", label: "雷达 SAR 格网" }
        ]
      }].concat(shellLayers);
    }
    root.innerHTML =
      (hasMap ? "<div class=\"s3-map\"></div>" : htmlEmptyMap("地图数据待接入")) +
      "<aside class=\"s3-menu\"></aside>" +
      "<div class=\"s3-toprow\"><div class=\"s3-toolbar\"></div>" + htmlRes(uavs) + "</div>" +
      "<section class=\"s3-side\"></section>" +
      "<div class=\"s3-scale\"><b></b><span>2 km</span></div>" +
      "<div class=\"s3-coord\">" + ((cfg && cfg.coordText) || "--") + "</div>" +
      htmlRight(s1TargetCards()) +
      (hasMap ? htmlVideo([
        { k: "A", title: "11号光电察打机 ｜ 侦察确认" },
        { k: "B", title: "19号光电察打机 ｜ 侦察确认" },
        { k: "C", title: "光电机06 ｜ 跟踪监视" }
      ], [["a", "scene1_A_ir.mp4"], ["b", "scene1_B_ir.mp4"], ["c", "scene1_2_ir.mp4"]]) : "") +
      "<section class=\"s1-sar-win\"><img src=\"assets/img/s1-sar-airfield.jpg\" alt=\"\">" +
        "<div class=\"s1-sar-cap\">SAR 扫描影像 · 岸基机场</div></section>" +
      "<section class=\"s1-summary\"><div class=\"s1-sum-head\"><b>任务总结</b></div>" +
        "<div class=\"s1-sum-body\"></div>" +
        "<div class=\"s1-sum-foot\"><button class=\"s1-sum-back\">↩ 返回场景选择</button></div></section>" +
      "<button class=\"s3-mic\">" + ic("mic", 26, "", 1.7) + "</button>" +
      "<footer class=\"s3-status\"></footer>" +
      htmlControls(fmt(total)) +
      htmlLayers(shellLayers);
    var menuEl = root.querySelector(".s3-menu");
    if (menuEl && CH.MENU) menuEl.innerHTML = CH.MENU.map(function (m, i) {
      return "<div class=\"s3-mi" + (i === 0 ? " on" : "") + "\">" + ic(m.icon, 26, "", 1.55) + "<span>" + m.k + "</span></div>";
    }).join("");
    var tbEl = root.querySelector(".s3-toolbar");
    if (tbEl && CH.TOOLS) tbEl.innerHTML = "<i class=\"s3-collapse\">&laquo;</i>" + CH.TOOLS.map(function (t, i) {
      return "<b class=\"" + (i === 0 ? "on" : "") + "\">" + t + "</b>";
    }).join("");
    var stEl = root.querySelector(".s3-status");
    if (stEl && CH.STATUS) stEl.innerHTML = CH.STATUS.map(function (s) {
      return "<span class=\"s3-st" + (s.on ? "" : " off") + "\">" + ic(s.icon, 15, "", 1.9) + "<em>" + s.k + "：</em><b>" + s.v + "</b></span>";
    }).join("");
    /* 空壳没有淡入动画：把 CSS 里默认 opacity:0 的框架元素直接设为可见 */
    [].slice.call(root.querySelectorAll(".s3-mi, .s3-toolbar, .s3-side, .s3-scale, .s3-coord, .s3-mic, .s3-st")).forEach(function (n) {
      n.style.opacity = "1";
    });
    s1AiLog = root.querySelector(".s6-ai-log");
    /* 视频缓冲提示（到点没画面时暂停时钟，见 s1VideoGate） */
    var s1Buf = null;
    if (hasMap && !document.getElementById("css-s1buf")) {
      var s1b = document.createElement("style");
      s1b.id = "css-s1buf";
      s1b.textContent = ".s1-buf{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);z-index:45;padding:10px 24px;border-radius:10px;" +
        "background:rgba(6,18,32,.94);border:1px solid rgba(56,189,248,.4);color:#bfe9ff;font-size:15px;letter-spacing:3px;" +
        "opacity:0;pointer-events:none;transition:opacity .15s}.s1-buf.on{opacity:1}";
      document.head.appendChild(s1b);
    }
    if (hasMap) {
      s1Buf = document.createElement("div");
      s1Buf.className = "s1-buf";
      s1Buf.textContent = "视频缓冲中…";
      root.appendChild(s1Buf);
    }
    var s1SarWin = root.querySelector(".s1-sar-win");
    var s1Sum = root.querySelector(".s1-summary");
    var s1SumBuilt = false;
    function buildS1Summary() {
      if (!s1Sum || s1SumBuilt) return;
      s1SumBuilt = true;
      var body = s1Sum.querySelector(".s1-sum-body");
      var tg = (window.BASE_S1 && window.BASE_S1.targets) || [];
      var rows = tg.map(function (o) {
        return '<div class="s1-sum-tr"><b>' + o.no + " " + o.name + "</b><em>已摧毁</em></div>";
      }).join("");
      body.innerHTML =
        '<div class="s1-sum-kpis">' +
          '<div class="s1-sum-kpi"><span>目标处置</span><b>' + tg.length + " / " + tg.length + '</b><em>全部摧毁</em></div>' +
          '<div class="s1-sum-kpi cy"><span>任务闭环</span><b>已达成</b><em>发现 → 确认 → 打击 → 评估</em></div>' +
        '</div>' +
        '<div class="s1-sum-main">' +
          '<div class="s1-sum-panel"><h4>目标处置明细</h4><div class="s1-sum-rows">' + rows + "</div></div>" +
          '<div class="s1-sum-panel"><h4>资源使用统计</h4><div class="s1-sum-grid">' +
            "<span>光电察打机<b>34 架</b></span>" +
            "<span>雷达侦察机<b>6 架</b></span>" +
            "<span>电子侦察机<b>2 架</b></span>" +
            "<span>中继通信机<b>4 架</b></span>" +
          "</div><div class=\"s1-sum-loss\">无人机战损<b>0 架</b></div></div>" +
        "</div>";
      var back = s1Sum.querySelector(".s1-sum-back");
      if (back) back.addEventListener("click", function () {
        var r = document.querySelector('[data-act="replay"]');
        if (r) r.click();
      });
    }
    /* ---------- 场景一 SH-06 视频：与场景二 SH-06 同一套流程 ----------
       隐藏 <video> 源 → canvas 镜像 → 底部小窗；点小窗开上方大窗（同一时刻只开一个），点大窗收起；
       播放由飞行时钟驱动（到点起播、倍速跟随、暂停跟随、拖动跟着 seek）；
       两路都是“侦察确认”，播完按侦察态收小卡。 */
    var S1V_START = { A: S1_VID_T0, B: S1_VID_T0, C: S1_VID_T1 };
    var S1V_DUR = { A: S1_VID_DUR, B: S1_VID_DUR, C: S1_VID_DUR1 };
    var s1vBar = root.querySelector(".s6-video-smallbar");
    var s1vLarge = root.querySelector(".s6-video-large");
    var s1vGrid = root.querySelector(".s6-video-grid");
    var s1vVid = { A: root.querySelector(".s6-video-a"), B: root.querySelector(".s6-video-b"), C: root.querySelector(".s6-video-c") };
    var s1vCard = {}, s1vCanvas = {};
    ["A", "B", "C"].forEach(function (k) {
      s1vCard[k] = root.querySelector('.s6-video-small-card[data-video="' + k + '"]');
      s1vCanvas[k] = root.querySelector('.s6-video-small-canvas[data-video="' + k + '"]');
    });
    var s1vExpanded = [], s1vLargeMap = {}, s1vRemoved = {};
    var s1vStarted = false, s1vMirrorGen = 0, s1vLastT = -1;
    function s1vKeys() { return ["A", "B", "C"]; }
    function s1vTitle(k) {
      var el = s1vCard[k] && s1vCard[k].querySelector(".s6-video-title");
      return el ? el.textContent : k;
    }
    function s1vSize(cv) {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.round(Math.max(1, cv.clientWidth || 1) * dpr);
      var h = Math.round(Math.max(1, cv.clientHeight || 1) * dpr);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    }
    function s1vDraw(v, cv) {
      if (!v || !cv) return false;
      s1vSize(cv);
      var ctx = cv.__ctx || (cv.__ctx = cv.getContext("2d"));
      if (!ctx) return false;
      if (v.readyState < 2 || !v.videoWidth) return false;
      ctx.clearRect(0, 0, cv.width, cv.height);
      var sc = Math.min(cv.width / v.videoWidth, cv.height / v.videoHeight);
      var dw = v.videoWidth * sc, dh = v.videoHeight * sc;
      ctx.drawImage(v, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
      return true;
    }
    function s1vPaintSmall(k) {
      if (s1vRemoved[k]) return;
      s1vDraw(s1vVid[k], s1vCanvas[k]);
    }
    function s1vPaintCell(k) {
      var e = s1vLargeMap[k];
      if (!e) return;
      if (s1vDraw(s1vVid[k], e.canvas)) e.cell.style.visibility = "visible";
    }
    function s1vPaintKey(k) { s1vPaintSmall(k); s1vPaintCell(k); }
    function s1vCreateCell(k) {
      if (!s1vVid[k]) return;
      var cell = document.createElement("div");
      cell.className = "s6-video-cell";
      cell.style.visibility = "hidden";
      var ti = document.createElement("div");
      ti.className = "s6-video-title";
      ti.textContent = s1vTitle(k);
      var cv = document.createElement("canvas");
      cv.className = "s6-video-canvas";
      cell.appendChild(ti); cell.appendChild(cv);
      s1vGrid.appendChild(cell);
      s1vLargeMap[k] = { cell: cell, canvas: cv };
      requestAnimationFrame(function () { s1vPaintCell(k); });
    }
    function s1vLayoutGrid() {
      if (!s1vExpanded.length) return;
      var titleH = 28, border = 2;
      var W = s1vLarge.clientWidth || 1367, H = s1vLarge.clientHeight || 486;
      var maxByH = (H - titleH - border) * 16 / 9 + border;
      var cellW = Math.max(120, Math.min(W, maxByH));
      var canvasW = Math.max(1, cellW - border);
      var cellH = canvasW * 9 / 16 + titleH + border;
      s1vGrid.style.gridTemplateColumns = "repeat(1," + cellW.toFixed(2) + "px)";
      s1vGrid.style.gridTemplateRows = "repeat(1," + cellH.toFixed(2) + "px)";
      s1vGrid.style.width = cellW.toFixed(2) + "px";
      s1vGrid.style.height = cellH.toFixed(2) + "px";
    }
    function s1vReflow() {
      s1vGrid.innerHTML = "";
      s1vLargeMap = {};
      if (!s1vExpanded.length) {
        s1vLarge.classList.remove("on");
        s1vLarge.style.display = "none";
        return;
      }
      s1vLarge.style.display = "flex";
      s1vLarge.classList.add("on");
      s1vExpanded.forEach(s1vCreateCell);
      s1vLayoutGrid();
    }
    function s1vToggleLarge(k) {
      if (s1vRemoved[k]) return;
      s1vExpanded = (s1vExpanded.length === 1 && s1vExpanded[0] === k) ? [] : [k];
      s1vReflow();
    }
    function s1vStartMirror(k, v, gen) {
      if (!v) return;
      if (v.requestVideoFrameCallback) {
        var tick = function () {
          if (gen !== s1vMirrorGen) return;
          s1vPaintKey(k);
          if (!v.ended) v.requestVideoFrameCallback(tick);
        };
        v.requestVideoFrameCallback(tick);
      } else {
        var loop = function () {
          if (gen !== s1vMirrorGen) return;
          s1vPaintKey(k);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }
    }
    function s1vStartMirrors() {
      s1vMirrorGen++;
      var gen = s1vMirrorGen;
      s1vKeys().forEach(function (k) { s1vStartMirror(k, s1vVid[k], gen); });
    }
    function s1vSetRate() {
      var rate = st.speed || 1;
      s1vKeys().forEach(function (k) {
        var v = s1vVid[k];
        if (!v) return;
        try { v.playbackRate = rate; } catch (e) { try { v.playbackRate = Math.min(16, rate); } catch (e2) {} }
      });
    }
    function s1vPause() {
      s1vKeys().forEach(function (k) { var v = s1vVid[k]; if (v) { try { v.pause(); } catch (e) {} } });
    }
    function s1vPlay() {
      s1vSetRate();
      s1vKeys().forEach(function (k) {
        var v = s1vVid[k];
        if (v && !s1vRemoved[k] && v.readyState >= 1 && !v.__pendSeek) { try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
      });
    }
    function s1vOpen(k) {
      s1vRemoved[k] = false;
      if (s1vCard[k]) s1vCard[k].style.display = "";
    }
    function s1vClose(k) {
      if (s1vRemoved[k]) return;
      s1vRemoved[k] = true;
      var v = s1vVid[k];
      if (v) { try { v.pause(); } catch (e) {} }
      if (s1vCard[k]) s1vCard[k].style.display = "none";
      s1vExpanded = s1vExpanded.filter(function (x) { return x !== k; });
      s1vReflow();
      s1vUpdateBar();
    }
    function s1vUpdateBar() {
      var any = false;
      s1vKeys().forEach(function (k) { if (!s1vRemoved[k]) any = true; });
      s1vBar.classList.toggle("on", !!any && s1vStarted);
    }
    /* 定位 + 起播：元数据没到就先记下目标，等 loadedmetadata 再定位，
       避免「先把视频从 0 播起来、seek 又没生效」看起来像从头播 */
    function s1vSeekVid(v, target, play) {
      if (!v) return;
      function apply() {
        var d = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
        var tgt = Math.max(0, d ? Math.min(target, Math.max(0, d - 0.05)) : target);
        try { v.currentTime = tgt; } catch (e) {}
        if (play) { try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e2) {} }
        else { try { v.pause(); } catch (e3) {} }
      }
      if (v.readyState >= 1) { apply(); return; }
      v.__pendSeek = apply;
      if (!v.__pendHooked) {
        v.__pendHooked = true;
        v.addEventListener("loadedmetadata", function () {
          var f = v.__pendSeek; v.__pendSeek = null;
          if (f) f();
        });
      }
    }
    function s1vSeekTo(t, play) {
      s1vKeys().forEach(function (k) {
        var v = s1vVid[k];
        if (!v) return;
        var t0 = S1V_START[k];
        if (t + 1e-6 < t0) { try { v.pause(); v.currentTime = 0; } catch (e) {} return; }
        var dur = isFinite(v.duration) && v.duration > 0 ? v.duration : (S1V_DUR[k] || S1_VID_DUR);
        var endT = t0 + dur;
        if (s1vRemoved[k] && t + 1e-6 < endT - 0.5) s1vOpen(k);
        if (s1vRemoved[k]) { try { v.pause(); } catch (e) {} return; }
        var mt = Math.max(0, t - t0);
        if (mt >= dur - 0.05) { s1vSeekVid(v, dur - 0.05, false); return; }   /* 已经播完：只定格末帧，不起播 */
        s1vSeekVid(v, mt, play);
      });
      s1vKeys().forEach(function (k) { s1vPaintKey(k); });
    }
    function s1vReset() {
      s1vMirrorGen++;
      s1vPause();
      s1vLastT = -1;
      s1vExpanded = []; s1vReflow();
      s1vKeys().forEach(function (k) {
        s1vRemoved[k] = false;
        var v = s1vVid[k];
        if (v) { try { v.currentTime = 0; } catch (e) {} }
        if (s1vCard[k]) s1vCard[k].style.display = "";
        s1vPaintKey(k);
      });
      s1vBar.classList.remove("on");
    }
    /* 每帧：到点起播 → 时钟跳变跟 seek → 播完收卡 → 播放/暂停跟随 */
    function s1vRender(t) {
      if (!s1vBar) return;
      if (t + 1e-6 < S1_VID_T0) {
        if (s1vStarted) { s1vStarted = false; s1vReset(); }
        return;
      }
      if (!s1vStarted) {
        s1vStarted = true;
        s1vRemoved = {};
        s1vExpanded = []; s1vReflow();
        /* 每一路按自己的起点开：C（光电机06 跟踪打击）要到 2200 才出现 */
        s1vKeys().forEach(function (k) { if (S1V_START[k] <= t + 1e-6) s1vOpen(k); else s1vClose(k); });
        s1vStartMirrors();
        /* 不在激活时从 0 起播：定位交给 s1vSeekTo，播放由本函数末尾的“掉线补播”兜底 */
      } else {
        s1vSetRate();
      }
      /* 每一路按自己的窗口判定：到点打开；进度条拖回起点之前则收起
         （不做这一步的话，拖过 2200 再往回拖，C 路小窗会一直挂着——场景二用每组 started 标志兜的就是这件事） */
      s1vKeys().forEach(function (k) {
        var t0 = S1V_START[k];
        if (t + 1e-6 < t0) {
          if (!s1vRemoved[k]) s1vClose(k);            /* 还没到点：收起卡片/大窗，bar 按剩余卡片重算 */
          return;
        }
        if (!s1vRemoved[k]) return;
        if (t < t0 + (S1V_DUR[k] || S1_VID_DUR) - 0.5) s1vOpen(k);
      });
      if (s1vLastT < 0 || Math.abs(t - s1vLastT) > 0.5) s1vSeekTo(t, st.run);
      s1vLastT = t;
      s1vKeys().forEach(function (k) {
        var v = s1vVid[k];
        if (!v || s1vRemoved[k]) return;
        var dur = isFinite(v.duration) && v.duration > 0 ? v.duration : (S1V_DUR[k] || S1_VID_DUR);
        if (t - S1V_START[k] >= dur - 0.05) s1vClose(k);
      });
      if (!st.run) s1vPause();
      else {
        var need = false;
        s1vKeys().forEach(function (k) { var v = s1vVid[k]; if (v && !s1vRemoved[k] && v.paused) need = true; });
        if (need) s1vPlay();
      }
      s1vUpdateBar();
      s1vKeys().forEach(function (k) { s1vPaintKey(k); });
    }
    if (s1vBar) {
      s1vKeys().forEach(function (k) {
        if (s1vCard[k]) s1vCard[k].addEventListener("click", function () { s1vToggleLarge(k); });
        var v = s1vVid[k];
        if (v) {
          v.addEventListener("loadeddata", function () { s1vPaintKey(k); });
          v.addEventListener("seeked", function () { s1vPaintKey(k); });
        }
      });
      if (s1vLarge) s1vLarge.addEventListener("click", function () {
        if (!s1vExpanded.length) return;
        s1vExpanded = []; s1vReflow();
      });
    }
    /* ---------- SH-06 语音：跟着飞行时钟播（照场景二 syncAudio：暂停/拖动/重进都对得上） ---------- */
    var s1AiAud = { idx: -1, gen: 0, on: false, els: [], defer: false };
    var S1_AI_AUDIO = null;
    function s1EvAudio(ev) { return ev && ev.audio && ev.audio.length ? ev.audio : null; }
    /* 语音表：按真实时长顺排（start = max(事件时刻, 上一条语音结束)）。
       气泡时刻不动；语音连续播、不叠音、也不会被下一句截断。 */
    /* 语音表：直接复用气泡表（同一份真实时长），保证"气泡出现"与"语音起播"逐条对齐 */
    function s1AudioSched() {
      if (S1_AI_AUDIO) return S1_AI_AUDIO;
      if (!S1_AI_SCHED.length) return null;   /* 气泡表还没建好（等预载时长），下一帧再试 */
      S1_AI_AUDIO = S1_AI_SCHED;
      return S1_AI_AUDIO;
    }
    function s1AiAudioStop() {
      s1AiAud.gen++;
      s1AiAud.on = false;
      s1AiAud.idx = -1;
      s1AiAud.els.forEach(function (a) { try { a.onended = null; a.pause(); } catch (e) {} });
      s1AiAud.els = [];
    }
    function s1AiAudioStart(idx, offset) {
      s1AiAudioStop();
      var sch = s1AudioSched();
      var it = sch && sch[idx];
      var list = s1EvAudio(it && it.ev);
      if (!list) return;
      var pre = (window.APP_STATE && window.APP_STATE.s1AudioPreload) || { map: {} };
      var acc = 0, k0 = 0, sk = 0;
      for (var i = 0; i < list.length; i++) {
        var d = window.s1AudioDur ? window.s1AudioDur(list[i]) : 0;
        if (offset < acc + d - 0.05 || i === list.length - 1) { k0 = i; sk = Math.max(0, offset - acc); break; }
        acc += d;
      }
      s1AiAud.idx = idx;
      s1AiAud.on = true;
      var gen = s1AiAud.gen;
      (function step(k) {
        if (gen !== s1AiAud.gen) return;
        if (k >= list.length) { s1AiAud.on = false; return; }
        var src = list[k];
        var audio = (pre.map && pre.map[src]) || new Audio(src);
        s1AiAud.els.push(audio);
        audio.onended = function () { step(k + 1); };
        try { audio.currentTime = (k === k0 ? sk : 0); } catch (e) {}
        var pr = audio.play();
        if (pr && pr.catch) pr.catch(function () {});
        if (audio.readyState < 2) {
          audio.addEventListener("canplay", function () {
            if (gen !== s1AiAud.gen) return;
            if (audio.paused && !audio.ended) { try { audio.play(); } catch (e) {} }
          }, { once: true });
        }
      })(k0);
    }
    function s1AiAudioSync(t) {
      if (!st.run) { if (s1AiAud.on) s1AiAudioStop(); return; }
      var sch = s1AudioSched();
      if (!sch) return;
      var idx = -1;
      for (var i = 0; i < sch.length; i++) { if (sch[i].start <= t + 1e-6) idx = i; else break; }
      if (idx < 0) { if (s1AiAud.on) s1AiAudioStop(); return; }
      var it = sch[idx];
      if (s1AiAud.on && s1AiAud.idx === idx) return;
      /* 上一条语音还在播（多段拼接时每换一段都有几十~几百毫秒延迟，实际结束晚于表上时刻）：
         等它自然播完再切下一条，最多多等 4 s；否则会把上一条的尾音切掉。 */
      if (s1AiAud.on && s1AiAud.idx >= 0) {
        var prev = sch[s1AiAud.idx];
        if (prev && t < prev.end + 4.0) { s1AiAud.defer = true; return; }
      }
      if (t >= it.end) { if (s1AiAud.on) s1AiAudioStop(); return; }
      /* 因为等上一条而晚开：从头播，别把下一条的开头跳掉 */
      var off = s1AiAud.defer ? 0 : Math.max(0, t - it.start);
      s1AiAud.defer = false;
      s1AiAudioStart(idx, off);
    }
    if (s1SarWin) s1SarWin.addEventListener("click", function () { s1SarWin.classList.toggle("zoom"); });
    s1SyncAi(0);
    if (hasMap && window.MapViewShared) {
      mapHost = root.querySelector(".s3-map");
      var mv = window.MapViewShared(mapHost);
      if (window.MapViewSetScenario) window.MapViewSetScenario(cfg);
      /* 机群图标（与场景二同名：uav-blue/yellow/red/green） */
      ["blue", "yellow", "red", "green"].forEach(function (c) { mv.image("uav-" + c, "assets/img/uav-" + c + ".png"); });
      var cam = cfg.camera || null;
      if (mv && mv.setView && cam) mv.setView({ center: cam.center, zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing });
      /* 建屏时还没 .on，容器尺寸为 0；等两帧后容器有尺寸再校准一次 */
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (mv && mv.repaint) mv.repaint(); }); });
      setTimeout(function () { if (mv && mv.repaint) mv.repaint(); }, 160);
      /* 场景一的任务区 / 集结区：共享地图上重画一次（离开 SH-05 时图元已被清掉） */
      try {
        if (cfg.area && cfg.area.mission) {
          mv.polygon("area-mission", cfg.area.mission, { fill: "#f59e0b", fillOpacity: 0, line: "#f59e0b", width: 5.5 });
          if (mv.setArea) mv.setArea("area-mission", 1);
        }
        if (cfg.area && cfg.area.reserve) {
          mv.polygon("area-reserve", cfg.area.reserve, { fill: "#22c55e", fillOpacity: 0.16, line: "#22c55e", width: 5, dash: [2.4, 1.6] });
          if (mv.setArea) mv.setArea("area-reserve", 1);
        }
        if (cfg.area && cfg.area.missionLabel) { var L1 = mv.label("任务区", cfg.area.missionLabel, "#fbbf24", 17); if (L1 && L1.set) L1.set(1); }
        if (cfg.area && cfg.area.reserveLabel) { var L2 = mv.label("我方集结区", cfg.area.reserveLabel, "#4ade80", 16); if (L2 && L2.set) L2.set(1); }
      } catch (err) {}
      /* 场景一：编组航线 + 任务区规划航路（进入即显示，与场景二“先规划、后动态”的节奏一致） */
      s1Draw(mv, s1acc);
      window.__s6ShellMap = mv; window.__s6ShellCam = cam;
    }

    var ctl = root.querySelector(".s6-ctl");
    var bar = ctl.querySelector(".s6-bar"), fill = bar.querySelector(".s6-fill"), knob = bar.querySelector(".s6-knob");
    var segsBox = bar.querySelector(".s6-segs"), segLbls = ctl.querySelector(".s6-seglbls");
    var goBtn = ctl.querySelector(".s6-go"), tmLbl = ctl.querySelector(".s6-tm b"), totLbl = ctl.querySelector(".s6-tot");
    var spds = [].slice.call(ctl.querySelectorAll(".s6-spds b"));
    var st = { t: 0, speed: 1, run: false, last: 0, acc: 0, dead: false };

    /* ---------- 场景一：机位（总览 / 任务区视角）+ 运镜 ---------- */
    var S1_OVIEW = (cam && cam.center) ? {
      center: [cam.center[0], cam.center[1]],
      zoom: (cam.zoom == null ? 9.75 : cam.zoom),
      pitch: (cam.pitch == null ? 30 : cam.pitch),
      bearing: (cam.bearing == null ? 0 : cam.bearing)
    } : null;
    var S1_TASK = (function () {
      var m = (cfg && cfg.area && cfg.area.mission) || null;
      if (!S1_OVIEW || !m || m.length < 3) return null;
      var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      m.forEach(function (q) {
        x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]);
        y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);
      });
      var zoom = cfg.flatMap && !mv.is3d ? Math.max(9.8, cfg.flatMap.minZoom) : 9.8;
      return { center: [(x0 + x1) / 2, (y0 + y1) / 2], zoom: zoom, pitch: 30, bearing: S1_OVIEW.bearing };
    })();
    /* 场景一 SH-06：不做运镜，全程锁定在"任务区视角"（能看清全貌）。
       原来的逐句推近/拉回/俯仰变化已停用；航线与规划航路的揭示仍按台词时间窗独立驱动。 */
    function s1CamAt() {
      if (!S1_OVIEW) return null;
      return s1CamCopy(S1_TASK || S1_OVIEW);
    }
    /* 比例尺：原来 SH-06 一直是写死的 "2 km"，加了运镜后必须跟着 zoom 走 */
    var s1ScaleBar = root.querySelector(".s3-scale b"), s1ScaleTxt = root.querySelector(".s3-scale span");
    var s1ScaleZ = -1;
    function s1ApplyScale(z, lat) {
      if (!s1ScaleBar) return;
      var q = Math.round(z * 1000) / 1000;
      if (q === s1ScaleZ) return;
      s1ScaleZ = q;
      var mpp = 40075016.686 * Math.cos((lat == null ? 24.85 : lat) * Math.PI / 180) / (512 * Math.pow(2, z));
      var cands = [1000, 2000, 5000, 10000, 20000], pick = cands[0];
      for (var i = 0; i < cands.length; i++) if (cands[i] / mpp <= 150) pick = cands[i];
      s1ScaleBar.style.width = (pick / mpp).toFixed(0) + "px";
      if (s1ScaleTxt) s1ScaleTxt.textContent = (pick / 1000) + " km";
    }
    /* 逐句揭示：G4（通信）+ comm 开局直接画；其余按台词出现 */
    var s1RevSig = "";
    function s1PlanChecked(g) {
      var sub = lyrPanel && lyrPanel.querySelector('input[data-k="tracks-' + g + '"]');
      return sub ? sub.checked : false;
    }
    function s1GridChecked(which) {
      var cb = lyrPanel && lyrPanel.querySelector('input[data-k="s1grid-' + which + '"]');
      return cb ? cb.checked : true;
    }
    function s1ApplyReveal() {
      if (!mv || st.dead) return;
      var win = s1ShotWins(), t = st.t;
      /* 每个键都必须显式给值：未揭示 = false（漏写会变成 undefined，被判定为已揭示） */
      var rev = { G1: false, G2: false, G3: false, G4: false, photo: false, sar: false, gmti: false, ewar: false, comm: false, gridPhoto: false, gridSar: false };
      S1_SHOTS.forEach(function (s) {
        var w = win[s.audio];
        if (!w) return;
        if (t + 1e-6 >= w.start) rev[s.route] = true;                              /* 气泡一开始 → 编组航线 */
        if (t + 1e-6 >= w.start + S1_SHOT_OUT * (w.end - w.start)) {               /* 拉回之后 → 规划航路 + 格网 */
          s.items.forEach(function (k) { rev[k] = true; });
          if (s.grid === "photo") rev.gridPhoto = true;
          if (s.grid === "sar") rev.gridSar = true;
        }
      });
      var sig = [];
      ["G1", "G2", "G3", "G4", "photo", "sar", "gmti", "ewar", "comm"].forEach(function (k) { sig.push(rev[k] ? 1 : 0); });
      sig.push(rev.gridPhoto ? 1 : 0, rev.gridSar ? 1 : 0);
      var sigS = sig.join("");
      if (sigS === s1RevSig) return;
      s1RevSig = sigS;
      s1acc.rev = rev;
      s1SetVisible(mv, s1acc, s1acc.showRoutes !== false, "routes");
      PLAN_KEYS.forEach(function (g) { setPlanLayer(g, s1PlanChecked(g)); });
      s1SetGridVisible(mv, rev.gridPhoto && s1GridChecked("photo"), "photo");
      s1SetGridVisible(mv, rev.gridSar && s1GridChecked("sar"), "sar");
    }
    /* 进屏自动开播（只在本屏还没播过时点一次）。先等语音表建好，避免“时钟跑了、气泡没来” */
    function s1AutoStart() {
      if (!hasMap || !goBtn) return;
      if (st.dead || st.run || st.t > 0.5) return;
      var waited = 0;
      (function waitSched() {
        if (st.dead || st.run || st.t > 0.5) return;
        if (!S1_AI_SCHED.length && waited < 150) { waited++; setTimeout(waitSched, 100); return; }
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            if (!st.run && st.t <= 0.5) goBtn.click();
          });
        });
      })();
    }
    totLbl.textContent = fmt(total);
    /* 场景一飞行仿真：按时间取机群位置与尾迹（与场景二 SH-06 同款数据流）
       地图数据更新比进度条贵得多，所以这里做两件事：
       1) 渲染合并到下一帧：拖拽时每个 pointermove 不再各自重算一次；
       2) 时间没变（或已退场）就不重发数据。 */
    var lastFlightT = -1, flightPending = false;
    function renderFlight(force) {
      if (!FL || !mv || st.dead) return;
      if (!force && lastFlightT >= 0 && Math.abs(st.t - lastFlightT) < 1e-6) return;
      lastFlightT = st.t;
      var f = FL.simulate(st.t);
      mv.fleet("s1-fleet", f.map(function (d) {
        return { type: d.type, color: d.color, lon: d.lon, lat: d.lat, r: d.r, no: d.no, g: d.g };
      }));
      mv.trails("s1-trails", f.filter(function (d) { return d.trail && d.trail.length > 1; })
        .map(function (d) { return { color: d.color, pts: d.trail }; }));
      /* 扫描扇形 / SAR 条带 / GMTI 与电子扇区 */
      if (FL.scans) mv.scan("scan", FL.scans(st.t));
      if (FL.sarScans) mv.beam("sbeam", FL.sarScans(st.t));
      if (FL.fans) {
        var fans = FL.fans(st.t);
        mv.fan("rfan", fans.radar.map(function (x) { x.color = "#f59e0b"; return x; }));
        mv.fan("jfan", fans.jam.map(function (x) { x.color = "#f87171"; return x; }));
      }
      renderCover(force);
      s1UpdateBase(mv, s1acc, st.t);
      s1UpdateTargetPanel(root, st.t);
      s1PumpAi(st.t);
      /* 播完显示任务总结，停在 SH-06 */
      if (s1Sum) {
        var onSum = FL && st.t + 1e-6 >= FL.TOTAL;
        if (onSum) buildS1Summary();
        s1Sum.classList.toggle("on", !!onSum);
      }
      /* SAR 影像窗（7 s，可点击放大） */
      if (s1SarWin) s1SarWin.classList.toggle("on", st.t + 1e-6 >= S1_SAR_IMG_T0 && st.t < S1_SAR_IMG_T0 + S1_SAR_IMG_DUR);
      s1SyncAi(st.t);
    }
    var lastCovBucket = -1, lastCovAt = 0;
    /* 覆盖小格：每 30 仿真秒才重建一次；拖拽时先跳过，松手补一次；
       另外限制最快 4 次/秒，避免高倍速/快速拖动时连续重建上千个格子 */
    function renderCover(force) {
      if (!FL || !FL.coverage || !mv) return;
      if (dragging && !force) return;
      var bucket = Math.floor(st.t / 30);
      if (!force && bucket === lastCovBucket) return;
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      if (!force && now - lastCovAt < 250) return;
      lastCovAt = now;
      lastCovBucket = bucket;
      var cv = FL.coverage(st.t);
      mv.cover("cov-photo", cv.photo, "#38bdf8");
      mv.cover("cov-sar", cv.sar, "#f59e0b");
      mv.cover("cov-gmti", cv.gmti, "#facc15");
      mv.cover("cov-ewar", cv.ewar, "#f87171");
    }
    var flightForce = false;
    function requestFlight(force) {
      if (force) flightForce = true;
      if (flightPending || st.dead) return;
      flightPending = true;
      requestAnimationFrame(function () {
        flightPending = false;
        var f = flightForce; flightForce = false;
        renderFlight(f);
      });
    }
    function clearFlight() {
      lastFlightT = -1;
      lastCovBucket = -1;
      if (!mv) return;
      try { mv.fleet("s1-fleet", []); } catch (err) {}
      try { mv.trails("s1-trails", []); } catch (err) {}
      try { mv.scan("scan", []); } catch (err) {}
      try { mv.beam("sbeam", []); } catch (err) {}
      try { mv.fan("rfan", []); } catch (err) {}
      try { mv.fan("jfan", []); } catch (err) {}
      try { mv.cover("cov-photo", [], "#38bdf8"); } catch (err) {}
      try { mv.cover("cov-sar", [], "#f59e0b"); } catch (err) {}
      try { mv.cover("cov-gmti", [], "#facc15"); } catch (err) {}
      try { mv.cover("cov-ewar", [], "#f87171"); } catch (err) {}
    }
    /* 进度条很便宜，每帧刷新；地图绘制交给 requestFlight 合并 + 节流 */
    function paintBar() {
      var r = st.t / total;
      fill.style.width = (r * 100).toFixed(2) + "%";
      knob.style.left = (r * 100).toFixed(2) + "%";
      tmLbl.textContent = fmt(st.t);
    }
    function paint() {
      paintBar();
      requestFlight();
    }
    (function buildSegs() {
      /* [标签时刻, 名称, 点击跳转时刻]：跳转时刻比该段引导的那句语音早 5 s，跳过去正好从头听 */
      var marks = FL
        ? [[0, "集结", 0], [S1_SAR_IMG_T0, "目标侦察", Math.max(0, S1_SAR_IMG_T0 - 5)], [S1_VID_T1, "跟踪监视", Math.max(0, S1_VID_T1 - 5)]]
        : [[0, "集结待命", 0], [total * 0.2, "编队飞行", total * 0.2], [total * 0.45, "侦察", total * 0.45]];
      segsBox.innerHTML = "";
      segLbls.innerHTML = "";
      for (var i = 0; i < marks.length; i++) {
        var from = marks[i][0];
        var to = i + 1 < marks.length ? marks[i + 1][0] : total;
        var L = (from / total) * 100, W = ((to - from) / total) * 100;
        var seg = document.createElement("b");
        seg.style.left = L + "%";
        seg.style.width = Math.max(W, 0.6) + "%";
        seg.className = "s6-seg s6-seg" + i;
        segsBox.appendChild(seg);
        if (W < 1.2) continue;
        var lb = document.createElement("span");
        lb.style.left = Math.max(0.5, Math.min(97, L + (W < 6 ? 0.6 : 0))) + "%";
        lb.textContent = marks[i][1];
        /* 标签可点：等同点进度条同一位置（跳到 marks[i][2]） */
        lb.style.pointerEvents = "auto";
        lb.style.cursor = "pointer";
        (function (jt) {
          lb.addEventListener("click", function (e) {
            e.stopPropagation();
            st.t = Math.max(0, Math.min(total, jt));
            dragging = false;
            paint();
            requestFlight(true);
          });
        })(marks[i][2] == null ? from : marks[i][2]);
        segLbls.appendChild(lb);
      }
    })();
    paint();
    goBtn.addEventListener("click", function () {
      if (st.t >= total) st.t = 0;
      st.run = !st.run;
      st.last = 0;
      goBtn.classList.toggle("playing", st.run);
      goBtn.setAttribute("aria-label", st.run ? "暂停" : "播放");
      paint();
    });
    spds.forEach(function (b) {
      b.addEventListener("click", function () {
        st.speed = parseFloat(b.getAttribute("data-s")) || 1;
        spds.forEach(function (o) { o.classList.toggle("on", o === b); });
      });
    });
    function seekFromEvent(ev) {
      var r = bar.getBoundingClientRect();
      var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      st.t = Math.max(0, Math.min(1, x / r.width)) * total;
      paint();
    }
    var dragging = false;
    bar.addEventListener("pointerdown", function (ev) { dragging = true; try { bar.setPointerCapture(ev.pointerId); } catch (e) {} seekFromEvent(ev); });
    bar.addEventListener("pointermove", function (ev) { if (dragging) seekFromEvent(ev); });
    bar.addEventListener("pointerup", function () { dragging = false; requestFlight(true); });
    bar.addEventListener("pointercancel", function () { dragging = false; });
    /* ---------- 视频就绪：提前 90 s 预热 + 到点没画面就暂停时钟 ---------- */
    var s1VWarm = {}, s1VHold = null, s1VGaveUp = false;
    /* 两段视频各自的入点：A/B 在 1158，C（光电机06 跟踪打击）在 2200 */
    var S1V_ENTRY = [{ t: S1_VID_T0, k: "A" }, { t: S1_VID_T1, k: "C" }];
    /* 预热名单：所有通道各自按自己的入点提前 90 s 拉流（A/B 同属第一段，C 是第二段） */
    var S1V_WARM = [{ t: S1_VID_T0, k: "A" }, { t: S1_VID_T0, k: "B" }, { t: S1_VID_T1, k: "C" }];
    function s1VideoWarm() {
      if (!hasMap) return;
      S1V_WARM.forEach(function (e) {
        if (s1VWarm[e.k]) return;
        if (st.t < e.t - 90) return;                    /* 入点前 90 秒才开始拉 */
        s1VWarm[e.k] = true;
        var v = s1vVid[e.k];
        if (v) { try { v.preload = "auto"; v.load(); } catch (err) {} }
      });
    }
    function s1VideoGate() {
      if (!s1Buf) return;
      if (s1VHold) {                                        /* 等待中：就绪或超时（10 s）就恢复 */
        var v0 = s1VHold.v;
        var ok0 = v0 && v0.readyState >= 2;
        var late0 = Date.now() - s1VHold.since > 10000;
        if (ok0 || late0) {
          if (late0 && !ok0) {                              /* 等不到就别把整场演示卡死 */
            s1VGaveUp = true;
            if (window.console) console.warn("[s1] 视频 10 秒未就绪，跳过等待继续播");
          }
          s1VHold = null;
          s1Buf.classList.remove("on");
          if (!st.run) {
            st.run = true; st.last = 0;
            goBtn.classList.add("playing"); goBtn.setAttribute("aria-label", "暂停");
            requestFlight(true);
          }
        }
        return;
      }
      if (!st.run || s1VGaveUp) return;
      var ent = null;
      for (var ei = 0; ei < S1V_ENTRY.length; ei++) {
        var e0 = S1V_ENTRY[ei];
        if (st.t + 1e-6 >= e0.t && st.t <= e0.t + 3) { ent = e0; break; }   /* 只在入点后 3 秒窗口里判一次 */
      }
      if (!ent) return;
      var v1 = s1vVid[ent.k] || s1vVid.A || s1vVid.B;
      if (!v1 || v1.readyState >= 2) return;
      /* 到点了还没有画面：停表等它，避免"进度条跑过去了、小窗还是黑的" */
      s1VHold = { v: v1, since: Date.now() };
      st.run = false;
      s1Buf.classList.add("on");
      goBtn.classList.remove("playing"); goBtn.setAttribute("aria-label", "播放");
      try { v1.preload = "auto"; v1.load(); } catch (e) {}
    }
    var lyrPanel = root.querySelector(".s6-lyr-panel");
    var closeupBoxes = [].slice.call(lyrPanel.querySelectorAll("input[data-k]"));
    var savedCloseupChecks;
    var videoCloseup = mv && !mv.is3d && mv.createVideoCloseup([
      "s1-grid", "s1-route", "tracks-s1", "s1-trails", "cov-", "rfan", "jfan", "sbeam"
    ], function (active) {
      if (active) {
        savedCloseupChecks = closeupBoxes.map(function (cb) { return cb.checked; });
        closeupBoxes.forEach(function (cb) {
          var k = cb.getAttribute("data-k");
          cb.checked = k === "fleetno" || k === "scan";
        });
        applyLayerToggle("fleetno", true);
        applyLayerToggle("scan", true);
      } else {
        closeupBoxes.forEach(function (cb, i) { cb.checked = savedCloseupChecks[i]; });
        applyAllToggleStates();
      }
    });
    var runway = window.BASE_S1 && window.BASE_S1.runway;
    var airfieldCloseup = {
      center: runway && runway.a && runway.b
        ? [(runway.a[0] + runway.b[0]) / 2, (runway.a[1] + runway.b[1]) / 2] : [121.09, 24.93],
      zoom: 12, pitch: 30, bearing: 0
    };
    var trackingCloseup = { center: [121.1243, 24.9254], zoom: 12, pitch: 30, bearing: 0 };
    function closeupAt(t) {
      if (t >= S1V_START.C && t < S1V_START.C + S1V_DUR.C) return trackingCloseup;
      if (t >= S1V_START.A && t < S1V_START.A + S1V_DUR.A) return airfieldCloseup;
      return null;
    }
    requestAnimationFrame(function loop(now) {
      if (st.dead) return;
      requestAnimationFrame(loop);
      if (!root.classList.contains("on")) { st.last = now; return; }
      /* 运镜 + 逐句揭示：外层播放器进本屏就暂停了，机位由这里每帧下发（3D 版保持静态机位） */
      if (mv && mv.setView && !mv.is3d) {
        var overview = s1CamAt();
        var cam1 = videoCloseup ? videoCloseup.camera(now, overview, closeupAt(st.t)) : overview;
        if (cam1) {
          mv.setView(cam1, cam1 !== overview);
          s1ApplyScale(cam1.zoom, cam1.center[1]);
        }
      }
      s1ApplyReveal();
      /* 视频预热 + 缓冲门（必须在"暂停就 return"之前，否则停在缓冲时永远恢复不了） */
      s1VideoWarm(); s1VideoGate();
      if (!st.run) { st.last = now; s1vRender(st.t); s1AiAudioSync(st.t); return; }
      if (!st.last) { st.last = now; return; }
      var dt = Math.min(0.25, (now - st.last) / 1000);
      st.last = now;
      st.t = Math.min(total, st.t + dt * st.speed);
      if (st.t >= total) { st.run = false; goBtn.classList.remove("playing"); goBtn.setAttribute("aria-label", "播放"); }
      /* 地图数据每 0.08 s 更新一次（12.5 fps，与场景二同款节流）；进度条仍每帧走 */
      st.acc += dt;
      paintBar();
      s1vRender(st.t);
      s1AiAudioSync(st.t);
      if (st.acc >= 0.08) { st.acc = 0; requestFlight(); }
    });
    root.__onSpace = function () { goBtn.click(); };
    root.__s6Refresh = function () { paint(); };
    var PLAN_KEYS = ["photo", "sar", "gmti", "ewar", "comm"];
    function setPlanLayer(g, on) { s1SetLayers(mv, [S1_PLAN_ID + "-" + g + "-l"], on && (!s1acc.rev || s1acc.rev[g] !== false)); }
    function planSub(g) { return lyrPanel.querySelector('input[data-k="tracks-' + g + '"]'); }
    /* 总开关只反映“至少一个子开关开着” */
    function syncMaster() {
      var master = lyrPanel.querySelector('input[data-k="tracks"]');
      if (!master) return;
      var any = false;
      PLAN_KEYS.forEach(function (g) { var c = planSub(g); if (c && c.checked) any = true; });
      master.checked = any;
    }
    /* 格网总开关只反映“至少一个子项开着” */
    function syncGridMaster() {
      var master = lyrPanel.querySelector('input[data-k="s1grid"]');
      if (!master) return;
      var a = lyrPanel.querySelector('input[data-k="s1grid-photo"]');
      var b = lyrPanel.querySelector('input[data-k="s1grid-sar"]');
      master.checked = !!((a && a.checked) || (b && b.checked));
    }
    function applyLayerToggle(k, on) {
      if (!hasMap) return;
      if (k === "s1routes") { s1acc.showRoutes = on; s1SetVisible(mv, s1acc, on, "routes"); }
      else if (k === "tracks") PLAN_KEYS.forEach(function (g) { setPlanLayer(g, on); });
      else if (k.indexOf("tracks-") === 0) setPlanLayer(k.slice(7), on);
      else if (k === "s1grid") { s1SetGridVisible(mv, on && (!s1acc.rev || s1acc.rev.gridPhoto), "photo"); s1SetGridVisible(mv, on && (!s1acc.rev || s1acc.rev.gridSar), "sar"); }
      else if (k === "s1grid-photo") s1SetGridVisible(mv, on && (!s1acc.rev || s1acc.rev.gridPhoto), "photo");
      else if (k === "s1grid-sar") s1SetGridVisible(mv, on && (!s1acc.rev || s1acc.rev.gridSar), "sar");
      else if (k === "trails") s1SetLayers(mv, ["s1-trails-c", "s1-trails-l"], on);
      else if (k === "fleetno") s1SetLayers(mv, ["s1-fleet-no"], on);
      else if (S1_VIS[k]) s1SetGroupVisible(mv, k, on);
    }
    /* 回看重绘后按当前勾选状态恢复各图层 */
    function applyAllToggleStates() {
      [].slice.call(lyrPanel.querySelectorAll("input[data-k]")).forEach(function (cb) {
        var k = cb.getAttribute("data-k");
        if (k !== "tracks") applyLayerToggle(k, cb.checked);
      });
      syncMaster();
      syncGridMaster();
    }
    /* 屏是缓存的：回看 SH-06 只走 onShow、不重建 → 这里按当前开关状态重画一次 */
    function redrawS1() {
      if (!hasMap) return;
      if (window.MapViewSetScenario) window.MapViewSetScenario(cfg);
      s1Draw(mv, s1acc);
      applyAllToggleStates();
      s1RevSig = "";              /* 图层重建过：逼 reveal 再套一遍 */
      s1ApplyReveal();
      renderFlight(true);
    }
    [].slice.call(root.querySelectorAll("button[data-all]")).forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-all") === "1";
        [].slice.call(lyrPanel.querySelectorAll("input[data-k]")).forEach(function (cb) {
          cb.checked = v;
          applyLayerToggle(cb.getAttribute("data-k"), v);
        });
      });
    });
    [].slice.call(lyrPanel.querySelectorAll("input[data-k]")).forEach(function (cb) {
      cb.addEventListener("change", function () {
        var k = cb.getAttribute("data-k");
        if (k === "tracks") {
          PLAN_KEYS.forEach(function (g) { var sub = planSub(g); if (sub) sub.checked = cb.checked; });
        }
        if (k === "s1grid") {
          ["s1grid-photo", "s1grid-sar"].forEach(function (g) {
            var sub = lyrPanel.querySelector('input[data-k="' + g + '"]');
            if (sub) sub.checked = cb.checked;
          });
        }
        applyLayerToggle(k, cb.checked);
        if (k.indexOf("tracks-") === 0) syncMaster();
        if (k === "s1grid-photo" || k === "s1grid-sar") syncGridMaster();
      });
    });
    /* 点整行标题展开/收起；点勾选框本身不触发展开 */
    [].slice.call(lyrPanel.querySelectorAll(".s6-lyr-head")).forEach(function (h) {
      h.addEventListener("click", function (ev) {
        if (ev.target && ev.target.tagName === "INPUT") return;
        var grp = h.parentNode;
        if (grp && grp.classList) grp.classList.toggle("on");
      });
    });
    /* 目标卡片：点头部展开/收起（同场景二） */
    [].slice.call(root.querySelectorAll(".s6-tb-head")).forEach(function (head) {
      head.addEventListener("click", function () {
        var item = head.parentNode;
        if (item && item.classList) item.classList.toggle("open");
      });
    });
    if (tbEl) {
      var lyrBtn = null;
      [].slice.call(tbEl.querySelectorAll("b")).forEach(function (b) { if (b.textContent === "图层") lyrBtn = b; });
      if (lyrBtn) lyrBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var on = lyrPanel.classList.toggle("on");
        lyrBtn.classList.toggle("on", on);
      });
    }
    /* 建屏即套一次揭示状态：开场只留通信（编组4），其余按台词出现 */
    s1ApplyReveal();
    return { shell: true, st: st, root: root, aiLog: root.querySelector(".s6-ai-log"), mapView: window.__s6ShellMap || null, cam: window.__s6ShellCam || null,
      redraw: redrawS1,
      autoplay: s1AutoStart,
      cleanup: function () {
        if (videoCloseup) videoCloseup.reset();
        if (hasMap) { s1Clear(mv, s1acc); clearFlight(); }
      } };
  }
  return {
    LAYERS: LAYERS,
    EMPTY_VIDEO_CARDS: EMPTY_VIDEO_CARDS,
    htmlRes: htmlRes,
    htmlRight: htmlRight,
    htmlVideo: htmlVideo,
    htmlControls: htmlControls,
    htmlLayers: htmlLayers,
    htmlEmptyMap: htmlEmptyMap,
    ensureLayerCss: ensureLayerCss,
    ensureEmptyCss: ensureEmptyCss,
    mountEmpty: mountEmpty
  };
})();
