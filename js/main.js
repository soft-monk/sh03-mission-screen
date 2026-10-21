/* 播放器：一个时钟 + 一个纯函数 render(t)。拖进度、跳章、重播都靠它 */
(function () {
  const TL = window.TIMELINE;
  const stage = document.getElementById("stage");
  const screensEl = document.getElementById("screens");
  const hud = document.getElementById("hud");
  const subEl = document.getElementById("subtitle");
  const subWho = subEl.querySelector(".who");
  const subTxt = subEl.querySelector(".txt");
  const trackEl = document.getElementById("track");
  const chaptersEl = document.getElementById("chapters");
  const bootcap = document.getElementById("bootcap");
  const clockEl = document.getElementById("clock");
  const scrBadge = document.getElementById("scrbadge");
  const endcard = document.getElementById("endcard");
  const btnPlay = document.querySelector('[data-act="play"]');

  let T = 0, playing = true, curIdx = -1, last = 0, speed = 1, dirty = true;
  const cache = {};

  /* ---------- 舞台等比缩放 ---------- */
  function fitStage() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = "translate(" + ((window.innerWidth - 1920 * s) / 2) + "px," + ((window.innerHeight - 1080 * s) / 2) + "px) scale(" + s + ")";
  }
  window.addEventListener("resize", fitStage);
  fitStage();

  /* ---------- 屏的构建与切换 ---------- */
  function idxAt(t) {
    for (let i = TL.screens.length - 1; i >= 0; i--) if (t >= TL.screens[i].t - 1e-6) return i;
    return 0;
  }
  function ensure(i) {
    const sc = TL.screens[i];
    if (cache[sc.id]) return cache[sc.id];
    const root = FX.el("div", "scr");
    root.dataset.id = sc.id;
    screensEl.appendChild(root);
    const mod = window.SCENES[sc.id] || window.SCENES._placeholder;
    const ctx = (mod.build ? mod.build(root, sc) : {}) || {};
    cache[sc.id] = { root, ctx, mod, sc };
    return cache[sc.id];
  }
  function show(i) {
    const prev = curIdx >= 0 ? cache[TL.screens[curIdx].id] : null;
    if (prev) prev.root.classList.remove("on");
    curIdx = i;
    if (scrBadge) scrBadge.textContent = TL.screens[i].id;
    const cur = ensure(i);
    cur.root.classList.remove("pre");
    cur.root.classList.add("on");
    if (cur.mod.onShow) { try { cur.mod.onShow(cur.ctx); } catch (e) {} }
    dirty = true;
  }
  /* ---------- 预热：SH-01/02 播放期间先把 SH-03 的 3D 地图建起来 ----------
     否则 MapLibre 要到 14 秒切场那一瞬间才 new：样式解析 + 着色器编译 +
     瓦片解码 + 地形网格全挤在一帧里，必然卡；提前做掉就只剩一次显隐切换。 */
  function prewarm() {
    const i = TL.screens.findIndex(s => s.id === "SH-03");
    if (i < 0 || i === curIdx) return;   /* 已经在播这一屏就不用预热 */
    /* 当前屏已经在用地图了（SH-04 等），就不需要再预热别的屏 —— 否则会把共享地图上的
       区域透明度按 t=0 重置成 0，画面上的图元会集体消失 */
    const cur = curIdx >= 0 ? cache[TL.screens[curIdx].id] : null;
    if (cur && cur.mod && cur.mod.usesMap) return;
    const c = ensure(i);
    c.root.classList.add("pre");
  }
  setTimeout(prewarm, 2500);

  /* ---------- HUD ---------- */
  TL.phases.forEach((p, i) => {
    const seg = FX.el("div", "seg");
    seg.dataset.i = i;
    seg.innerHTML = "<i></i>";
    seg.title = p.name + "  " + FX.mmss(p.start) + " - " + FX.mmss(p.end);
    seg.onclick = () => seek(p.start);
    trackEl.appendChild(seg);
    const b = FX.el("b", "", p.name);
    b.onclick = () => seek(p.start);
    chaptersEl.appendChild(b);
  });

  function updateHud() {
    TL.phases.forEach((p, i) => {
      const seg = trackEl.children[i];
      const f = FX.clamp((T - p.start) / p.dur, 0, 1);
      seg.firstChild.style.width = (f * 100).toFixed(2) + "%";
      const on = T >= p.start && T < p.end;
      seg.classList.toggle("cur", on);
      seg.classList.toggle("done", T >= p.end);
      const b = chaptersEl.children[i];
      b.classList.toggle("on", on);
      b.classList.toggle("done", T >= p.end);
    });
    const bootP = FX.clamp(T / 14, 0, 1);
    bootcap.querySelector("i").style.width = (bootP * 100).toFixed(1) + "%";
    bootcap.classList.toggle("on", T < 14);
    clockEl.textContent = FX.mmss(T) + " / " + FX.mmss(TL.total);
    stage.dataset.t = T.toFixed(2);
    stage.dataset.scr = TL.screens[idxAt(T)].id;
  }

  let curSub = null;
  function updateSub() {
    /* 有些屏把播报放在自己的面板里（ownSubs），就不出底部黑条 */
    const cs = curIdx >= 0 ? cache[TL.screens[curIdx].id] : null;
    const own = !!(cs && cs.mod && cs.mod.ownSubs);
    let hit = null;
    if (!own) for (const s of TL.subs) if (T >= s.t && T < s.t + s.dur) { hit = s; break; }
    if (hit !== curSub) {
      curSub = hit;
      if (hit) {
        subWho.textContent = hit.who;
        subWho.className = "who" + (hit.who === "大模型回复" ? " ai" : hit.who === "用户语音" ? " user" : "");
        subTxt.textContent = hit.text;
        subEl.classList.add("on");
        hud.classList.add("subon");
      } else {
        subEl.classList.remove("on");
        hud.classList.remove("subon");
      }
    }
  }

  /* ---------- 主循环 ---------- */
  function render() {
    const i = idxAt(T);
    if (i !== curIdx) show(i);
    const c = cache[TL.screens[i].id];
    if (c && c.mod.render) c.mod.render(T - c.sc.t, c.ctx, T, TL.screens[i]);
    updateHud();
    updateSub();
  }
  function tick(now) {
    const dt = last ? Math.min(0.12, Math.max(0, (now - last) / 1000)) : 0;
    last = now;
    if (playing) {
      const before = T;
      T += dt * speed;
      for (let i = 0; i < TL.holds.length; i++) {
        const h = TL.holds[i];
        if (before < h.t && T >= h.t) { T = h.t; setPlaying(false); break; }
      }
      if (T >= TL.total) { T = TL.total; setPlaying(false); endcard.classList.add("on"); }
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;
    try { render(); window.__frames = (window.__frames || 0) + 1; }
    catch (err) {
      if (window.__ERRS) {
        window.__ERRS.push("RENDER: " + (err && err.stack ? err.stack : err));
        if (window.__showErr) window.__showErr();
      }
    }
  }
  /* rAF 可能被浏览器挂起（失焦/省电/无头）。加一个 60ms 看门狗：仅当 rAF
     超过 250ms 没动静时才由它驱动，避免双驱动把每帧渲染两次 */
  let lastRaf = 0;
  function frame(now) { requestAnimationFrame(frame); lastRaf = performance.now(); tick(now || lastRaf); }
  requestAnimationFrame(frame);
  setInterval(function () {
    const now = performance.now();
    if (now - lastRaf > 250) tick(now);
  }, 60);

  /* ---------- 控制 ---------- */
  function seek(t) {
    T = FX.clamp(t, 0, TL.total);
    endcard.classList.remove("on");
    if (T < TL.total) setPlaying(playing);
    dirty = true;
  }
  function setPlaying(v) {
    playing = v;
    btnPlay.textContent = v ? "⏸" : "▶";
    dirty = true;
  }
  const ACT = {
    play: () => { if (T >= TL.total) { seek(0); setPlaying(true); return; } setPlaying(!playing); },
    prev: () => { const i = idxAt(T); seek(TL.screens[Math.max(0, i - 1)].t); },
    next: () => { const i = idxAt(T); seek(TL.screens[Math.min(TL.screens.length - 1, i + 1)].t); },
    replay: () => { endcard.classList.remove("on"); for (const k in cache) { cache[k].root.remove(); delete cache[k]; } curIdx = -1; seek(0); setPlaying(true); setTimeout(prewarm, 1200); },
    speed: e => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; e.currentTarget.textContent = speed + "x"; },
    full: () => { if (!document.fullscreenElement) stage.requestFullscreen && stage.requestFullscreen(); else document.exitFullscreen(); }
  };
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-act]");
    if (b) { const f = ACT[b.dataset.act]; if (f) f({ currentTarget: b }); }
  });
  window.addEventListener("keydown", e => {
    if (e.code === "Space") {
      e.preventDefault();
      /* 有些屏自己接管空格（SH-06 飞行演示），这时不动全局播放器 */
      const cs = curIdx >= 0 ? cache[TL.screens[curIdx].id] : null;
      if (cs && cs.root && typeof cs.root.__onSpace === "function") { cs.root.__onSpace(); return; }
      ACT.play(); return;
    }
    else if (e.code === "ArrowRight") { e.preventDefault(); e.shiftKey ? seek((TL.chapters.find(c => c.t > T + 0.01) || TL.chapters[TL.chapters.length - 1]).t) : ACT.next(); }
    else if (e.code === "ArrowLeft") { e.preventDefault(); if (e.shiftKey) { const prev = TL.chapters.filter(c => c.t < T - 0.5); seek(prev.length ? prev[prev.length - 1].t : 0); } else ACT.prev(); }
    else if (e.key === "r" || e.key === "R") ACT.replay();
    else if (e.key === "f" || e.key === "F") ACT.full();
    else if (e.key === "Home") seek(0);
    else if (e.key === "h" || e.key === "H") hud.classList.toggle("ctrlon");
  });

  /* 调试/自测用：?t=90 直接跳到第 90 秒；&pause=1 停在那一帧；&fps=1 显示帧率表 */
  const q = new URLSearchParams(location.search);
  if (q.has("t")) T = FX.clamp(parseFloat(q.get("t")) || 0, 0, TL.total);
  if (q.get("pause") === "1") playing = false;

  if (q.get("fps") === "1") {
    const box = FX.el("div");
    box.style.cssText = "position:fixed;right:10px;top:10px;z-index:99997;font:13px/1.4 Consolas,monospace;color:#7dd3fc;background:rgba(4,9,16,.85);padding:6px 10px;border-radius:6px;pointer-events:none";
    document.body.appendChild(box);
    let fc = 0, ft = performance.now(), fps = 0;
    (function loop() {
      requestAnimationFrame(loop);
      fc++;
      const now = performance.now();
      if (now - ft >= 500) { fps = Math.round(fc * 1000 / (now - ft)); fc = 0; ft = now; box.textContent = fps + " fps"; }
    })();
  }
  btnPlay.textContent = playing ? "⏸" : "▶";
  window.PLAYER = { seek, play: () => setPlaying(true), pause: () => setPlaying(false), get time() { return T; }, get playing() { return playing; }, set speed(v) { speed = v; } };

  window.__READY = true;
  document.getElementById("wallclock") && (document.getElementById("wallclock").textContent = ("0" + new Date().getHours()).slice(-2) + ":" + ("0" + new Date().getMinutes()).slice(-2));
})();
