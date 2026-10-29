/* 地图层：MapLibre GL JS 4.7.1 + 本地 Esri 卫星瓦片（+ 可选本地 DEM 地形）
   对外：el / setView / polygon / setArea / label / repaint / mode / map() / ready()

   两种模式，由启动脚本通过 URL 参数选择：
     ?mode=flat （默认，启动演示-平面.bat）→ 只建卫星栅格层，不建 DEM 源、不请求任何 DEM 瓦片
     ?mode=3d   （启动演示-3D地形.bat）    → 额外加载 raster-dem，地形拉伸 3 倍
   平面模式依然可以斜着看：pitch 只是相机倾斜，与地形无关。 */
window.MapView = function (host) {
  var q = new URLSearchParams(location.search);
  var MODE = q.get("mode") === "3d" ? "3d" : "flat";
  var IS3D = MODE === "3d";


  var root = FX.el("div", "mapview");
  root.style.cssText = "position:absolute;inset:0;overflow:hidden;background:#0a1420";
  root.setAttribute("data-mode", MODE);
  host.appendChild(root);

  var map = null, ready = false, pend = [], registry = {}, lastView = "", lastCam = null, tileErrs = [];
  var onResize = null, ro = null;      /* 本实例自己挂的全局监听，销毁时要摘掉 */
  var labelCache = {};   /* 标签按文字去重：后面几屏再调 label() 不会叠出重影 */
  var iconCache = {};
  var FILE_MODE = location.protocol === "file:";

  function buildStyle() {
    var style = {
      version: 8,
      sources: {
        /* 兜底整图：z8 瓦片 5x5 拼成的 1280x1280 卫星图，覆盖 112.5~119.53E / 36.6~42.03N
           （约 1250x1080km）。缩得很远或细节瓦片没到的时候，至少还有它垫着，不会只剩黑底。 */
        base: {
          type: "image",
          url: "assets/img/basemap.jpg",
          coordinates: [[109.6875, 44.0876], [122.3438, 44.0876], [122.3438, 34.3071], [109.6875, 34.3071]]
        },
        sat: {
          type: "raster",
          tiles: ["assets/map/online/{z}/{x}/{y}.jpg"],
          tileSize: 256, minzoom: 11, maxzoom: 13, attribution: "Esri World Imagery (本地缓存)"
        }
      },
      /* 注意：image 源（兜底整图）和 terrain 一起用会让 3D 整屏画不出来（实测），
         所以 3D 模式只留卫星瓦片；兜底图只在平面版挂。 */
      layers: []
    };

    /* 3D 不挂 image 兜底源（见上），平面版才铺 bg + base + sat */
    style.layers = [{ id: "sat", type: "raster", source: "sat" }];
    if (IS3D) {
      delete style.sources.base;
    } else {
      style.layers = [
        { id: "bg", type: "background", paint: { "background-color": "#0a1420" } },
        { id: "base", type: "raster", source: "base" },
        { id: "sat", type: "raster", source: "sat" }
      ];
    }
    /* 只有 3D 模式才挂 DEM：平面模式的 style 里根本没有这个源，一张地形瓦片都不会请求 */
    if (IS3D) {
      style.sources.dem = {
        type: "raster-dem",
        tiles: ["assets/map/dem/{z}/{x}/{y}.png"],
        /* z12 网格太密，高俯角下地形重建/绘制开销翻倍，降到 z11 肉眼差别很小 */
        encoding: "terrarium", tileSize: 256, minzoom: 10, maxzoom: 11
      };
      style.terrain = { source: "dem", exaggeration: 3.0 };
    }
    return style;
  }

  /* 初始机位 = 各模式 SH-03 第 0 秒，预热期间就把这一屏的瓦片下载好 */
  var CAM0 = IS3D
    ? { center: [116.218, 39.920], zoom: 10.95, pitch: 62, bearing: -30 }
    : { center: [115.670, 39.790], zoom: 10.40, pitch: 48, bearing: -20 };

  /* ---------- 画布像素比：让 WebGL 画布 = 屏幕实际设备像素 ----------
     舞台是 1920x1080 再用 CSS scale(s) 缩放显示，(s * dpr) 才是真正的设备像素比。
     MapLibre 默认用 devicePixelRatio，在缩放舞台里等于按 1920x1080*dpr 渲染，
     比实际显示大 (1/s^2) 倍——这正是"2D 也卡"的主因。
     这里按实际显示尺寸下采样，并用 ?px= 封顶（默认 1 = 不超过 1920x1080 逻辑像素）。 */
  var PX_CAP = parseFloat(q.get("px") || "1");
  if (!(PX_CAP > 0.3 && PX_CAP <= 3)) PX_CAP = 1;
  var lastPR = -1;

  function applyPixelRatio() {
    /* 3D 不能调 setPixelRatio：实测地形渲染缓存的帧缓冲尺寸会被打乱，整屏画不出来。
       3D 只是对照用的第二版，保持 MapLibre 默认（devicePixelRatio）；平面版照常降采样。 */
    if (!map || IS3D) return;
    var w = root.clientWidth || 1;
    var shown = root.getBoundingClientRect().width || w;   /* 含舞台就 scale 后的真实宽度 */
    var s = shown / w;
    var dpr = window.devicePixelRatio || 1;
    var k = Math.round(Math.max(0.5, Math.min(PX_CAP, s * dpr)) * 20) / 20;
    if (k === lastPR) return;
    lastPR = k;
    try { map.setPixelRatio(k); } catch (e) {}
    root.setAttribute("data-pr", k);
  }

  function boot() {
    if (map || FILE_MODE) return;
    if (root.clientWidth < 50 || root.clientHeight < 50) { setTimeout(boot, 40); return; }
    /* ★ 缩放范围与拖拽边界只在平面版生效：
       实测 3D（terrain）模式下把 minZoom 设成 9 会让 WebGL 整屏画不出来（模板/代理瓦片选层被改动），
       3D 版保留 MapLibre 默认（0~22、无边界），反正它只是对照用的第二版。 */
    var opts = {
      container: root,
      style: buildStyle(),
      center: CAM0.center, zoom: CAM0.zoom, pitch: CAM0.pitch, bearing: CAM0.bearing,
      maxPitch: 75, renderWorldCopies: false, refreshExpiredTiles: false,
      attributionControl: false, fadeDuration: 0,
      antialias: false
    };
    if (!IS3D) {
      /* 缩放范围：z9 = 视野约 450km（正好在兜底整图里）；z16 = 比 z13 细节放大 8 倍，再大就糊 */
      opts.minZoom = 9;
      opts.maxZoom = 16;
      /* 拖拽边界 = 兜底整图内缩，拖到头就停住，不会漂到空白里 */
      opts.maxBounds = [[112.3, 35.5], [119.8, 42.9]];
    }
    map = new maplibregl.Map(opts);
    applyPixelRatio();
    var prRaf = 0;
    onResize = function () {
      if (prRaf) return;
      prRaf = requestAnimationFrame(function () { prRaf = 0; applyPixelRatio(); });
    };
    window.addEventListener("resize", onResize);
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { try { if (map) map.resize(); } catch (e) {} });
      ro.observe(root);
    }
    function report(msg) {
      console.error("[MapView]", msg);
      if (window.__ERRS) { window.__ERRS.push("MAPVIEW: " + msg); if (window.__showErr) window.__showErr(); }
    }
    function flush() {
      ready = true;
      try { map.resize(); } catch (e) {}
      var qq = pend; pend = [];
      root.setAttribute("data-flush", qq.length);
      qq.forEach(function (f) { try { f(); } catch (e) { report(e && e.stack ? e.stack : e); } });
      try { root.setAttribute("data-layers", map.getStyle().layers.length); } catch (e) {}
    }
    map.on("load", function () { applyPixelRatio(); });
    map.on("style.load", flush);
    map.on("load", flush);
    map.on("error", function (e) {
      var msg = e && e.error ? (e.error.message || String(e.error)) : JSON.stringify(e);
      /* 个别瓦片缺失 / 解码失败属于取景边缘的常见情况，只打日志，不弹红条 */
      if (e && e.sourceId) {
        if (tileErrs.length < 8) tileErrs.push(msg.slice(0, 110) + " <- " + String((e.error && e.error.url) || e.sourceId));
        root.setAttribute("data-tileerr", tileErrs.length);
        root.setAttribute("data-tileurl", tileErrs.join(" || "));
        console.warn("[MapView] tile", e.sourceId, msg);
        return;
      }
      report(msg);
    });
  }
  boot();

  function when(fn) { if (ready) { try { fn(); } catch (e) { console.error("[MapView]", e); } } else pend.push(fn); }

  /* 通用：一个 geojson 源 + 一个图层，存在就只换数据 */
  function setGeom(lid, type, feats, paint) {
    var data = { type: "FeatureCollection", features: feats };
    var src = map.getSource(lid);
    if (src) {
      src.setData(data);
      if (!map.getLayer(lid + "-l") && type) addGeomLayer(lid, type, paint);
      return;
    }
    map.addSource(lid, { type: "geojson", data: data });
    addGeomLayer(lid, type, paint);
  }
  function addGeomLayer(lid, type, paint) {
    map.addLayer({
      id: lid + "-l", type: type, source: lid,
      layout: type === "line" ? { "line-join": "round", "line-cap": "round" } : {},
      paint: paint
    });
  }

  return {
    el: root,
    /* 销毁：摘掉本实例挂的全局监听 + 销毁 MapLibre 实例，等价于关掉软件 */
    dispose: function () {
      try { if (onResize) window.removeEventListener("resize", onResize); } catch (e) {}
      onResize = null;
      try { if (ro) { ro.disconnect(); ro = null; } } catch (e) {}
      try { if (map) map.remove(); } catch (e) {}
      map = null; ready = false; pend = []; labelCache = {}; iconCache = {}; registry = {};
    },
    mode: MODE,
    is3d: IS3D,
    map: function () { return map; },
    ready: function (fn) { when(fn); },
    /* 地图在 visibility:hidden 里预热过，切到前台时强制校准一次 */
    repaint: function () {
      if (!map) return;
      try { map.resize(); map.triggerRepaint(); } catch (e) {}
    },
    refreshMarkers: function () {
      Object.keys(labelCache).forEach(function (k) { if (labelCache[k].refresh) labelCache[k].refresh(); });
      Object.keys(iconCache).forEach(function (k) { if (iconCache[k].refresh) iconCache[k].refresh(); });
    },
    setView: function (c) {
      lastCam = c;
      var key = c.center[0].toFixed(5) + "," + c.center[1].toFixed(5) + "," + c.zoom.toFixed(4) + "," + (c.pitch || 0).toFixed(2) + "," + (c.bearing || 0).toFixed(2);
      root.setAttribute("data-cam", c.zoom.toFixed(2) + "/" + c.center[0].toFixed(3) + "," + c.center[1].toFixed(3) + "/p" + (c.pitch||0));
      if (key === lastView) return;
      lastView = key;
      when(function () { map.jumpTo(c); });
    },
    /* 复位：把相机拉回"当前时间点"应有的机位。
       render(t) 每帧都会下发同一组参数，这里只要清掉去重缓存再下发一次即可。 */
    /* 用户拖动/缩放结束后，把真实机位写回 data-cam 并上报本地服务 */
    onMoveEnd: function (root) {
      when(function () {
        if (map.__camHooked) return;
        map.__camHooked = true;
        map.on("moveend", function () {
          var c = map.getCenter(), z = map.getZoom(), p = map.getPitch();
          var txt = z.toFixed(2) + "/" + c.lng.toFixed(3) + "," + c.lat.toFixed(3) + "/p" + Math.round(p);
          try { root.setAttribute("data-cam", txt); } catch (e) {}
          try { fetch("/__cam", { method: "POST", body: txt }); } catch (e) {}
        });
      });
    },
    resetView: function () {
      if (!map || !lastCam) return;
      lastView = "";
      try { map.jumpTo(lastCam); } catch (e) {}
    },
    polygon: function (id, coords, st) {
      registry[id] = { fillOpacity: st.fillOpacity == null ? 0.1 : st.fillOpacity, lineOpacity: 1 };
      when(function () {
        var ring = coords.slice();
        ring.push(ring[0]);
        if (!map.getSource(id)) {
          map.addSource(id, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } } });
        }
        if (!map.getLayer(id + "-f")) {
          map.addLayer({ id: id + "-f", type: "fill", source: id, paint: { "fill-color": st.fill, "fill-opacity": registry[id].fillOpacity } });
        }
        if (!map.getLayer(id + "-l")) {
          var lp = { "line-color": st.line, "line-width": st.width, "line-opacity": 1 };
          if (st.dash) lp["line-dasharray"] = st.dash;
          map.addLayer({ id: id + "-l", type: "line", source: id, layout: { "line-join": "round" }, paint: lp });
        }
      });
    },
    /* 注册一个图标（无人机 png 用） */
    image: function (name, url) {
      when(function () {
        if (map.hasImage(name)) return;
        /* MapLibre 4.x 的 loadImage 只收一个参数、返回 Promise（没有回调形式） */
        var p = map.loadImage(url);
        if (p && typeof p.then === "function") {
          p.then(function (res) {
            var img = res && res.data ? res.data : res;
            if (img && !map.hasImage(name)) { map.addImage(name, img); map.triggerRepaint(); }
          })["catch"](function (e) { console.warn("[MapView] image", url, e); });
        }
      });
    },
    /* 机群：一次 setData 更新一堆点。features: [{ type, lon, lat }] */
    fleet: function (id, features) {
      var data = {
        type: "FeatureCollection",
        features: (features || []).map(function (f) {
          return { type: "Feature", properties: { t: f.type, r: f.r || 0, c: f.color || "#38bdf8" }, geometry: { type: "Point", coordinates: [f.lon, f.lat] } };
        })
      };
      when(function () {
        var src = map.getSource(id);
        if (src) { src.setData(data); return; }
        map.addSource(id, { type: "geojson", data: data });
        /* 定位点：始终可见的实心小圆，压在图标下面 */
        map.addLayer({
          id: id + "-dot", type: "circle", source: id,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3.2, 13, 5],
            "circle-color": ["get", "c"],
            "circle-opacity": 0.95,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#0b1220",
            "circle-stroke-opacity": 0.9
          }
        });
        map.addLayer({
          id: id + "-l", type: "symbol", source: id,
          layout: {
            "icon-image": ["concat", "uav-", ["get", "t"]],
            "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.09, 11, 0.14, 13, 0.20],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-rotation-alignment": "map",
            /* 机头朝向飞行方向（feature.r，度，0=北 顺时针） */
            "icon-rotate": ["get", "r"]
          }
        });
      });
    },
    /* 尾迹：一堆虚线。lines: [{ color, pts:[[lon,lat],...] }] */
    trails: function (id, lines) {
      var data = {
        type: "FeatureCollection",
        features: (lines || []).map(function (L) {
          return { type: "Feature", properties: { c: L.color }, geometry: { type: "LineString", coordinates: L.pts } };
        })
      };
      when(function () {
        var src = map.getSource(id);
        if (src) { src.setData(data); return; }
        map.addSource(id, { type: "geojson", data: data });
        /* 深色描边层：让虚线和底图拉开对比 */
        map.addLayer({
          id: id + "-c", type: "line", source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#0b1220",
            "line-width": 6,
            "line-opacity": 0.45,
            "line-dasharray": [2, 2]
          }
        });
        map.addLayer({
          id: id + "-l", type: "line", source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ["get", "c"],
            "line-width": 3.5,
            "line-opacity": 0.95,
            "line-dasharray": [2, 2]
          }
        });
      });
    },
    /* 规划航迹（淡虚线，铺在尾迹下面）：lines: [{ color, pts }] */
    tracks: function (id, lines) {
      var data = {
        type: "FeatureCollection",
        features: (lines || []).map(function (L) {
          return { type: "Feature", properties: { c: L.color }, geometry: { type: "LineString", coordinates: L.pts } };
        })
      };
      when(function () {
        var src = map.getSource(id);
        if (src) { src.setData(data); return; }
        map.addSource(id, { type: "geojson", data: data });
        map.addLayer({
          id: id + "-l", type: "line", source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ["get", "c"],
            "line-width": 2.5,
            "line-opacity": 0.8,
            "line-dasharray": [1.8, 2.6]
          }
        });
      });
    },
    /* 扫描投影：梯形填充 / 4 条连线 / 边框 / 扫掠线
       items: [{ quad:[[lon,lat]x5], rays:[[p,q],...], sweep:[[p,q]], color, k }] */
    scan: function (id, items) {
      items = items || [];
      var fill = [], outl = [], rays = [], swee = [], boxes = [], boxout = [], links = [];
      items.forEach(function (s) {
        var k = s.k == null ? 1 : s.k, c = s.color || "#38bdf8";
        fill.push({ type: "Feature", properties: { c: c, k: k }, geometry: { type: "Polygon", coordinates: [s.quad] } });
        outl.push({ type: "Feature", properties: { c: c, k: k }, geometry: { type: "LineString", coordinates: s.quad } });
        (s.rays || []).forEach(function (r) {
          rays.push({ type: "Feature", properties: { c: c, k: k }, geometry: { type: "LineString", coordinates: r } });
        });
        if (s.sweep) swee.push({ type: "Feature", properties: { c: c, k: k }, geometry: { type: "LineString", coordinates: s.sweep } });
        if (s.box) { boxes.push({ type: "Feature", properties: { c: c, k: k }, geometry: { type: "Polygon", coordinates: [s.box] } }); boxout.push({ type: "Feature", properties: { c: c, k: k }, geometry: { type: "LineString", coordinates: s.box } }); }
        (s.links || []).forEach(function (l) { links.push({ type: "Feature", properties: { c: c, k: k }, geometry: { type: "LineString", coordinates: l } }); });
      });
      when(function () {
        setGeom(id + "-f", "fill", fill, { "fill-color": ["get", "c"], "fill-opacity": ["*", 0.12, ["get", "k"]] });
        setGeom(id + "-r", "line", rays, { "line-color": ["get", "c"], "line-width": 1, "line-opacity": ["*", 0.45, ["get", "k"]], "line-dasharray": [2, 2] });
        setGeom(id + "-o", "line", outl, { "line-color": ["get", "c"], "line-width": 1.5, "line-opacity": ["*", 0.85, ["get", "k"]] });
        setGeom(id + "-s", "line", swee, { "line-color": "#eaf6ff", "line-width": 2, "line-opacity": ["*", 0.9, ["get", "k"]] });
        setGeom(id + "-bf", "fill", boxes, { "fill-color": ["get", "c"], "fill-opacity": ["*", 0.08, ["get", "k"]] });
        setGeom(id + "-bo", "line", boxout, { "line-color": ["get", "c"], "line-width": 2, "line-opacity": ["*", 0.95, ["get", "k"]] });
        setGeom(id + "-bl", "line", links, { "line-color": ["get", "c"], "line-width": 1.4, "line-opacity": ["*", 0.85, ["get", "k"]] });
      });
    },
    /* 雷达覆盖扇区：淡填充 + 实线边框，items: [{ quad, color, k }] */
    fan: function (id, items) {
      items = items || [];
      var feats = items.map(function (s) {
        return { type: "Feature", properties: { c: s.color || "#facc15", k: s.k == null ? 1 : s.k }, geometry: { type: "Polygon", coordinates: [s.quad] } };
      });
      when(function () {
        setGeom(id + "-f", "fill", feats, { "fill-color": ["get", "c"], "fill-opacity": ["*", 0.08, ["get", "k"]] });
        setGeom(id + "-o", "line", feats, { "line-color": ["get", "c"], "line-width": 1.5, "line-opacity": ["*", 0.9, ["get", "k"]] });
      });
    },
    /* SAR 扫描条带：细带(2.5px) + 两条到机的连线
       items: [{ band:[[lon,lat],[lon,lat]], rays:[[p,q],...], color, k }] */
    beam: function (id, items) {
      items = items || [];
      var band = [], rays = [];
      items.forEach(function (s) {
        var c = s.color || "#facc15", k = s.k == null ? 1 : s.k;
        band.push({ type: "Feature", properties: { c: c, k: k }, geometry: { type: "LineString", coordinates: s.band } });
        (s.rays || []).forEach(function (r) {
          rays.push({ type: "Feature", properties: { c: c, k: k }, geometry: { type: "LineString", coordinates: r } });
        });
      });
      when(function () {
        setGeom(id + "-b", "line", band, { "line-color": ["get", "c"], "line-width": 2.5, "line-opacity": ["*", 0.95, ["get", "k"]] });
        setGeom(id + "-r", "line", rays, { "line-color": ["get", "c"], "line-width": 1, "line-opacity": ["*", 0.45, ["get", "k"]], "line-dasharray": [2, 2] });
      });
    },
    /* 覆盖块：一堆矩形，单色半透明填充 */
    cover: function (id, rings, color) {
      var col = color || "#38bdf8";
      var polys = [], lines = [];
      (rings || []).forEach(function (r) {
        var ring = (r && r.ring) ? r.ring : r;      /* 支持 {mx,my,ring} 单元格对象，也支持裸坐标环 */
        if (!ring || !ring.length) return;
        polys.push([ring]);
        lines.push(ring);
      });
      /* 合成单个要素：几千个格子也只占 1 个 feature，MapLibre 重新切瓦片几乎不花时间 */
      var feats = polys.length ? [{ type: "Feature", properties: { c: col }, geometry: { type: "MultiPolygon", coordinates: polys } }] : [];
      var edges = lines.length ? [{ type: "Feature", properties: { c: col }, geometry: { type: "MultiLineString", coordinates: lines } }] : [];
      when(function () {
        setGeom(id + "-f", "fill", feats, { "fill-color": ["get", "c"], "fill-opacity": 0.28 });
        setGeom(id + "-l", "line", edges, { "line-color": ["get", "c"], "line-width": 0.7, "line-opacity": 0.5 });
        /* 图层序：挪到航迹/编队之下，别糊住它们 */
        var below = ["fleet-dot", "fleet-l", "trails-c", "tracks-l", "scan-f-l", "rfan-f-l", "sbeam-b-l"].filter(function (x) { return map.getLayer(x); })[0];
        if (below) { try { map.moveLayer(id + "-f-l", below); map.moveLayer(id + "-l-l", below); } catch (e) {} }
      });
    },
    /* 动态圆形目标：圆心移动、半径按米计算 */
    movingCircle: function (id, lngLat, radius, color) {
      var c = color || "#ef4444";
      var ring = [], n = 48;
      var mlon = 111320 * Math.cos(lngLat[1] * Math.PI / 180), mlat = 111030;
      for (var i = 0; i <= n; i++) {
        var a = (i / n) * Math.PI * 2;
        ring.push([lngLat[0] + (radius * Math.cos(a)) / mlon, lngLat[1] + (radius * Math.sin(a)) / mlat]);
      }
      var poly = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
      var line = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: ring } };
      when(function () {
        setGeom(id + "-f", "fill", [poly], { "fill-color": c, "fill-opacity": 0.28 });
        setGeom(id + "-l", "line", [line], { "line-color": c, "line-width": 2, "line-opacity": 0.95 });
      });
    },
    /* 按图层 id 前缀批量显隐：prefixes 形如 ["tracks","scan"] */
    setVis: function (prefixes, visible) {
      when(function () {
        var v = visible ? "visible" : "none";
        var ls = (map.getStyle() && map.getStyle().layers) || [];
        for (var i = 0; i < ls.length; i++) {
          for (var j = 0; j < prefixes.length; j++) {
            if (ls[i].id.indexOf(prefixes[j]) === 0) {
              try { map.setLayoutProperty(ls[i].id, "visibility", v); } catch (e) {}
              break;
            }
          }
        }
      });
    },
    /* 画一条折线（航路用）：坐标为 [[lon,lat], ...] */
    path: function (id, coords, st) {
      when(function () {
        if (!map.getSource(id)) {
          map.addSource(id, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } } });
        }
        if (!map.getLayer(id + "-l")) {
          map.addLayer({
            id: id + "-l", type: "line", source: id,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": st.color, "line-width": st.width || 3, "line-opacity": st.opacity == null ? 1 : st.opacity }
          });
        }
      });
    },
    setArea: function (id, v) {
      var r = registry[id];
      if (!r) return;
      var qq = Math.round(v * 50) / 50;          /* 只有淡入阶段会变，到 1 就不再动 */
      if (r.last === qq) return;
      r.last = qq;
      when(function () {
        if (map.getLayer(id + "-f")) map.setPaintProperty(id + "-f", "fill-opacity", r.fillOpacity * qq);
        if (map.getLayer(id + "-l")) map.setPaintProperty(id + "-l", "line-opacity", qq);

      });
    },
    label: function (text, lngLat, color, size, key) {
      var cacheKey = key || text;
      if (labelCache[cacheKey]) return labelCache[cacheKey];
      var el = document.createElement("div");
      el.textContent = text;
      el.style.cssText = "color:" + color + ";font:600 " + size + "px/1.1 var(--font);letter-spacing:1px;" +
        "text-shadow:0 1px 3px rgba(0,0,0,.95),0 0 8px rgba(0,0,0,.8);white-space:nowrap;opacity:0;pointer-events:none";
      var marker = null, wantVisible = false;
      function apply() {
        if (marker) marker.setOpacity(wantVisible ? 1 : 0);
        else el.style.opacity = wantVisible ? "1" : "0";
        if (marker) { try { map.triggerRepaint(); } catch (e) {} }
      }
      when(function () {
        marker = new maplibregl.Marker({ element: el, anchor: "top-left" }).setLngLat(lngLat).addTo(map);
        apply();
        try { map.triggerRepaint(); } catch (e) {}
      });
      labelCache[cacheKey] = {
        set: function (v) { wantVisible = !!v; apply(); },
        setText: function (v) { el.textContent = v; },
        setColor: function (v) { el.style.color = v; },
        setLngLat: function (v) { lngLat = v; if (marker) marker.setLngLat(v); apply(); },
        refresh: function () { if (marker) marker.setLngLat(lngLat); apply(); }
      };
      return labelCache[cacheKey];
    },
    targetIcon: function (key, lngLat, yellowSrc, redSrc, size) {
      var cacheKey = key || ("target-icon-" + yellowSrc);
      if (iconCache[cacheKey]) return iconCache[cacheKey];
      var el = document.createElement("img");
      el.src = yellowSrc;
      el.draggable = false;
      el.alt = "";
      el.style.cssText = "width:" + (size || 36) + "px;height:" + (size || 36) + "px;display:block;opacity:0;" +
        "pointer-events:none;filter:drop-shadow(0 0 5px rgba(0,0,0,.8));";
      var marker = null, wantVisible = false, wantColor = "yellow";
      var yellowReady = false, redReady = false;
      function setOpacity(v) {
        if (marker) marker.setOpacity(v);
        else el.style.opacity = v ? "1" : "0";
      }
      function apply() {
        var src = wantColor === "red" ? redSrc : yellowSrc;
        var ready = wantColor === "red" ? redReady : yellowReady;
        if (!wantVisible) { setOpacity(0); return; }
        if (!ready) {
          if (wantColor === "red" && yellowReady) {
            if (el.getAttribute("src") !== yellowSrc) el.setAttribute("src", yellowSrc);
            setOpacity(1);
          } else {
            setOpacity(0);
          }
          return;
        }
        if (el.getAttribute("src") !== src) el.setAttribute("src", src);
        setOpacity(1);
        try { if (marker) map.triggerRepaint(); } catch (e) {}
      }
      function preload(src, red) {
        var im = new Image();
        im.onload = function () { if (red) redReady = true; else yellowReady = true; apply(); };
        im.onerror = function () { apply(); };
        im.src = src;
      }
      el.onload = function () {
        if (el.getAttribute("src") === redSrc) redReady = true;
        if (el.getAttribute("src") === yellowSrc) yellowReady = true;
        apply();
      };
      preload(yellowSrc, false);
      preload(redSrc, true);
      when(function () {
        marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(lngLat).addTo(map);
        apply();
        try { map.triggerRepaint(); } catch (e) {}
      });
      iconCache[cacheKey] = {
        set: function (visible, color) { wantVisible = !!visible; wantColor = color === "red" ? "red" : "yellow"; apply(); },
        setLngLat: function (v) { lngLat = v; if (marker) marker.setLngLat(v); apply(); },
        refresh: function () { if (marker) marker.setLngLat(lngLat); apply(); }
      };
      return iconCache[cacheKey];
    }
  };
};

/* ---------------------------------------------------------------------------
   共享地图：整片只创建一个 MapLibre 实例（SH-01/02 预热时就建好）。
   后面每一屏要地图时，只是把这块 canvas 搬进自己的容器 —— 不重建、不重新下载瓦片，
   相机位姿、已加载的瓦片、已画好的图元与标签全部原样延续。
   --------------------------------------------------------------------------- */
(function () {
  var SHARED = null;
  window.MapViewShared = function (host) {
    if (!SHARED) { SHARED = window.MapView(host); return SHARED; }
    if (host && SHARED.el.parentNode !== host) {
      /* 当前画布如果待在"正在显示"的那一屏里，就不挪走（预热屏是隐藏的，抢不走） */
      var cur = SHARED.el.parentNode;
      var curScr = cur && cur.closest ? cur.closest(".scr") : null;
      /* 只有"旧屏真的还在文档里且正在显示"才保护；脱离文档的屏（重播时已销毁）不算 */
      var curVisible = !!(curScr && curScr.classList.contains("on") && document.body.contains(curScr));
      if (!curVisible) {
        host.appendChild(SHARED.el);   /* 同一个 canvas 元素，WebGL 上下文不会丢 */
        SHARED.repaint();              /* 新容器尺寸可能刚变，校准一次 */
        SHARED.refreshMarkers();
        requestAnimationFrame(function () { SHARED.refreshMarkers(); });
      }
    }
    return SHARED;
  };
  window.MapViewInstance = function () { return SHARED; };
  /* 彻底复位：销毁实例并移除容器，下次要地图时重新 new —— 与"重新打开软件"等价 */
  window.MapViewReset = function () {
    if (!SHARED) return;
    try { if (SHARED.dispose) SHARED.dispose(); } catch (e) {}
    try { if (SHARED.el && SHARED.el.parentNode) SHARED.el.parentNode.removeChild(SHARED.el); } catch (e) {}
    SHARED = null;
  };
})();