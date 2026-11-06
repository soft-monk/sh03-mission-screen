/* SH-06 外壳模板：三场景共用。
   只负责「框」：资源概况、右栏目标工具箱 + AI 助手、视频窗框架、播放控制条、图层面板、空地图占位。
   场景专属内容（地图绘制 / 飞行仿真 / 目标数据 / 视频源 / AI 事件）由各自适配层注入。 */
window.S06_SHELL = (function () {
  var LAYERS = [
    { k: "tracks", label: "规划航迹" },
    { k: "trails", label: "无人机航迹" },
    { sec: "扫描矩形 / 覆盖层" },
    { k: "cov-photo", label: "光电扫描覆盖小格" },
    { k: "cov-gmti", label: "GMTI 覆盖小格" },
    { k: "cov-sar", label: "SAR 覆盖小格" },
    { k: "cov-ewar", label: "电子干扰覆盖小格" },
    { sec: "扇形 / 扇区层" },
    { k: "scan", label: "光电扫描扇形" },
    { k: "rfan", label: "雷达 GMTI 扇区" },
    { k: "jfan", label: "电子干扰扇区" },
    { k: "sbeam", label: "SAR 扫描条带" }
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
    return "<div class=\"s6-tb s6-target-item open\" data-target=\"" + t.no + "\" style=\"display:none\">" +
      "<div class=\"s6-tb-head\">" +
        "<span class=\"s6-tb-no\">" + t.no + "</span>" +
        "<span class=\"s6-tb-name\">" + t.name + "</span>" +
        "<i class=\"s6-tb-sus\">" + (t.sus || "") + "</i>" +
        "<i class=\"s6-tb-arrow\"></i>" +
      "</div>" +
      "<div class=\"s6-tb-body\">" + rows + "<div class=\"s6-tb-tags\">" + tags + "</div></div>" +
    "</div>";
  }
  function htmlRight(targets) {
    return "<section class=\"s6-right\">" +
      "<div class=\"s6-toolbox\">" +
        "<div class=\"s6-toolbox-h\"><span>目标</span><b class=\"s6-target-count\">0</b></div>" +
        ((targets && targets.length) ? targets.map(htmlTargetItem).join("") : "<div class=\"s6-tb-empty\">暂无目标</div>") +
      "</div>" +
      "<section class=\"s6-ai\">" +
        "<div class=\"s6-ai-h\">" + ic("mic", 16, "", 1.6) + "<span>AI决策助手</span></div>" +
        "<div class=\"s6-chat s6-chat-scroll\"><div class=\"s6-ai-log\"></div></div>" +
      "</section>" +
    "</section>";
  }
  function htmlVideo(cards, sources) {
    var src = (sources || []).map(function (s) {
      return "<video class=\"s6-video-" + s[0] + "\" src=\"assets/video/" + s[1] + "\" muted playsinline preload=\"auto\"></video>";
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
        return "<label class=\"s6-lyr\"><input type=\"checkbox\" checked data-k=\"" + o.k + "\"><span>" + o.label + "</span></label>";
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
      ".s6-lyr-sec:first-of-type{border-top:0;margin-top:2px}"
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
      ".s6-tb-empty{padding:14px 4px;font-size:13px;color:#4c6480;letter-spacing:1px}"
    ].join("\n");
    document.head.appendChild(st);
  }
  /* 空地图层装配：完整外壳 + 无地图、无目标、无视频源、无 AI 事件 */
  function mountEmpty(root, sc, cfg) {
    ensureLayerCss();
    ensureEmptyCss();
    var uavs = (cfg && cfg.uavs) || [];
    var hasMap = !!(cfg && cfg.mapBounds);   /* 场景一有自己的一套瓦片与边界 */
    var mapHost = null;
    var total = (window.FLIGHT06 && window.FLIGHT06.TOTAL) || 9000;
    var CH = { MENU: MENU, TOOLS: TOOLS, STATUS: STATUS };
    root.innerHTML =
      (hasMap ? "<div class=\"s3-map\"></div>" : htmlEmptyMap("地图数据待接入")) +
      "<aside class=\"s3-menu\"></aside>" +
      "<div class=\"s3-toprow\"><div class=\"s3-toolbar\"></div>" + htmlRes(uavs) + "</div>" +
      "<section class=\"s3-side\"></section>" +
      "<div class=\"s3-scale\"><b></b><span>2 km</span></div>" +
      "<div class=\"s3-coord\">" + ((cfg && cfg.coordText) || "--") + "</div>" +
      htmlRight([]) +
      htmlVideo(EMPTY_VIDEO_CARDS, []) +
      "<button class=\"s3-mic\">" + ic("mic", 26, "", 1.7) + "</button>" +
      "<footer class=\"s3-status\"></footer>" +
      htmlControls(fmt(total)) +
      htmlLayers(LAYERS);
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
    if (hasMap && window.MapViewShared) {
      if (window.MapViewSetBounds) window.MapViewSetBounds(cfg.mapBounds);
      mapHost = root.querySelector(".s3-map");
      var mv = window.MapViewShared(mapHost);
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
      window.__s6ShellMap = mv; window.__s6ShellCam = cam;
    }

    var ctl = root.querySelector(".s6-ctl");
    var bar = ctl.querySelector(".s6-bar"), fill = bar.querySelector(".s6-fill"), knob = bar.querySelector(".s6-knob");
    var segsBox = bar.querySelector(".s6-segs"), segLbls = ctl.querySelector(".s6-seglbls");
    var goBtn = ctl.querySelector(".s6-go"), tmLbl = ctl.querySelector(".s6-tm b"), totLbl = ctl.querySelector(".s6-tot");
    var spds = [].slice.call(ctl.querySelectorAll(".s6-spds b"));
    var st = { t: 0, speed: 1, run: false, last: 0, dead: false };
    totLbl.textContent = fmt(total);
    function paint() {
      var r = st.t / total;
      fill.style.width = (r * 100).toFixed(2) + "%";
      knob.style.left = (r * 100).toFixed(2) + "%";
      tmLbl.textContent = fmt(st.t);
    }
    (function buildSegs() {
      var marks = [[0, "集结待命"], [total * 0.2, "编队飞行"], [total * 0.45, "侦察"]];
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
        if (W < 3) continue;
        var lb = document.createElement("span");
        lb.style.left = L + "%";
        lb.textContent = marks[i][1];
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
    bar.addEventListener("pointerup", function () { dragging = false; });
    bar.addEventListener("pointercancel", function () { dragging = false; });
    (function loop(now) {
      if (st.dead) return;
      requestAnimationFrame(loop);
      if (!st.run || !root.classList.contains("on")) { st.last = now; return; }
      if (!st.last) { st.last = now; return; }
      var dt = Math.min(0.25, (now - st.last) / 1000);
      st.last = now;
      st.t = Math.min(total, st.t + dt * st.speed);
      if (st.t >= total) { st.run = false; goBtn.classList.remove("playing"); goBtn.setAttribute("aria-label", "播放"); }
      paint();
    })(performance.now());
    root.__onSpace = function () { goBtn.click(); };
    root.__s6Refresh = function () { paint(); };
    var lyrPanel = root.querySelector(".s6-lyr-panel");
    [].slice.call(root.querySelectorAll("button[data-all]")).forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-all") === "1";
        [].slice.call(lyrPanel.querySelectorAll("input[data-k]")).forEach(function (cb) { cb.checked = v; });
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
    return { shell: true, st: st, root: root, aiLog: root.querySelector(".s6-ai-log"), mapView: window.__s6ShellMap || null, cam: window.__s6ShellCam || null };
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
