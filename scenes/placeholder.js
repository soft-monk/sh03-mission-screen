/* 占位屏：18 屏里还没设计的都走这里。想替换某屏 → 新建 scenes/sXX-xxx.js，在 index.html 里加一行 script */
window.SCENES = window.SCENES || {};
window.SCENES._placeholder = {
  build(root, sc) {
    root.innerHTML =
      '<div class="bg-grid"></div>' +
      '<div class="ph">' +
        '<div class="ph-l"><span class="ph-id">' + sc.id + '</span><span class="ph-phase">阶段 ' + (sc.ch || 1) + '</span></div>' +
        '<h1>' + sc.title + '</h1>' +
        '<div class="ph-line"></div>' +
        '<ul>' + (sc.points || []).map(p => "<li><i></i>" + p + "</li>").join("") + '</ul>' +
        '<div class="ph-note">本屏界面待设计 · 时间轴已排定 ' + FX.mmss(sc.t) + ' - ' + FX.mmss(sc.t + sc.dur) + '</div>' +
      '</div>' +
      '<div class="ph-wire"><b></b><b></b><b></b><b></b></div>' +
      '<div class="ph-tag">待设计</div>';
    if (!document.getElementById("css-ph")) {
      const st = document.createElement("style");
      st.id = "css-ph";
      st.textContent = `
      .ph{position:absolute;left:120px;top:190px;width:820px}
      .ph-l{display:flex;align-items:center;gap:14px;margin-bottom:18px}
      .ph-id{font-family:var(--num);font-size:13px;letter-spacing:2px;color:#38bdf8;border:1px solid rgba(56,189,248,.4);padding:3px 10px;border-radius:4px;background:rgba(56,189,248,.08)}
      .ph-phase{font-size:12px;color:#4c6480;letter-spacing:2px}
      .ph h1{font-size:52px;letter-spacing:4px;color:#e8f5ff;font-weight:700}
      .ph-line{width:96px;height:3px;background:linear-gradient(90deg,#38bdf8,transparent);margin:22px 0 30px;border-radius:2px}
      .ph ul{list-style:none;display:flex;flex-direction:column;gap:18px}
      .ph li{display:flex;align-items:flex-start;gap:12px;font-size:19px;color:#a9c2dd;line-height:1.5}
      .ph li i{flex:none;width:7px;height:7px;margin-top:9px;border-radius:2px;background:#38bdf8;box-shadow:0 0 10px rgba(56,189,248,.8)}
      .ph-note{margin-top:38px;font-size:13px;color:#3f5a76;letter-spacing:1px}
      .ph-wire{position:absolute;right:90px;top:200px;width:760px;height:520px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:16px;opacity:.5}
      .ph-wire b{border:1px dashed rgba(56,189,248,.28);border-radius:10px;background:linear-gradient(135deg,rgba(56,189,248,.05),transparent)}
      .ph-tag{position:absolute;right:96px;top:150px;font-size:12px;letter-spacing:3px;color:#f59e0b;border:1px solid rgba(245,158,11,.4);padding:4px 12px;border-radius:4px;background:rgba(245,158,11,.08)}`;
      document.head.appendChild(st);
    }
    const els = { ul: [...root.querySelectorAll("li")], wire: [...root.querySelectorAll(".ph-wire b")], note: root.querySelector(".ph-note") };
    return els;
  },
  render(t, e) {
    e.ul.forEach((li, i) => FX.rise(li, FX.easeOut(FX.at(t, 0.4 + i * 0.45, 1.0 + i * 0.45)), 22));
    e.wire.forEach((b, i) => { b.style.opacity = FX.easeOut(FX.at(t, 1.2 + i * 0.25, 2.0 + i * 0.25)); });
    e.note.style.opacity = FX.at(t, 2.6, 3.4) * 0.9;
  }
};
