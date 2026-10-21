/* SH-01 启动加载：按设计稿复刻（顶栏由全局 HUD 提供） */
window.SCENES = window.SCENES || {};
window.SCENES["SH-01"] = (function () {
  const MODS = [
    { icon: "layers", name: "地图引擎", s: 0.5, e: 1.35 },
    { icon: "wifi", name: "通信链路", s: 1.1, e: 1.95 },
    { icon: "chip", name: "AI 引擎", s: 1.7, e: 2.95 },
    { icon: "nodes", name: "集群管理", s: 2.5, e: 3.85 },
    { icon: "db", name: "数据服务", s: 3.3, e: 4.85 }
  ];
  const STATUS = [
    { icon: "wifi", c: "#22c55e", k: "网络连接", v: "在线" },
    { icon: "link", c: "#22c55e", k: "数据链路", v: "稳定" },
    { icon: "pin", c: "#22c55e", k: "GPS定位", v: "正常" },
    { icon: "shield", c: "#22c55e", k: "系统安全", v: "安全" }
  ];
  const logoBig = '<img src="assets/img/logo.png" width="186" style="display:block" alt="">';

  function build(root) {
    root.innerHTML =
      '<div class="b1-bg"></div>' +
      '<div class="b1-scrim"></div>' +
      '<div class="b1-center">' +
        '<div class="b1-logo">' + logoBig + '</div>' +
        '<div class="b1-title">智能任务管理系统</div>' +
        '<div class="b1-sub">系统启动中，请稍候...</div>' +
        '<div class="b1-prog"><div class="b1-track"><i></i></div><span class="b1-pct">0%</span></div>' +
      '</div>' +
      '<div class="b1-card">' +
        '<div class="b1-card-h">模块加载进度</div>' +
        '<div class="b1-mods">' + MODS.map(m => '<div class="b1-mod">' + ic(m.icon, 52, "mi", 1.45) + '<span class="nm">' + m.name + '</span><span class="bar"><i></i></span><span class="pv">0%</span></div>').join("") + '</div>' +
      '</div>' +
      '<div class="b1-status">' +
        '<div class="b1-sh">系统状态</div>' +
        STATUS.map(s => '<div class="b1-st"><span class="si" style="color:' + s.c + '">' + ic(s.icon, 40, "", 1.65) + '</span><div><b>' + s.k + '</b><span class="sv">' + s.v + '</span></div></div>').join("") +
      '</div>' +
      '<div class="b1-hint">' + ic("info", 22, "hi", 1.6) + '<span>系统启动中，正在初始化核心模块...</span></div>';

    if (!document.getElementById("css-s01")) {
      const st = document.createElement("style"); st.id = "css-s01";
      st.textContent = `
      .b1-bg{position:absolute;inset:0;background:#02060c url("assets/img/earth.jpg") center top / cover no-repeat;
        filter:saturate(.95) brightness(.82) contrast(1.04)}
      .b1-scrim{position:absolute;inset:0;pointer-events:none;background:
        radial-gradient(78px 78px at 35.2% 39.7%,rgba(2,7,14,.99) 0%,rgba(2,7,14,.92) 46%,rgba(2,7,14,0) 100%),
        radial-gradient(1100px 640px at 50% 34%,rgba(2,7,14,.74) 0%,rgba(2,7,14,.24) 58%,rgba(2,7,14,0) 100%),
        linear-gradient(180deg,rgba(2,7,14,.55) 0%,rgba(2,7,14,0) 20%,rgba(2,7,14,0) 60%,rgba(2,7,14,.62) 100%)}
      .b1-center{position:absolute;left:0;right:0;top:166px;display:flex;flex-direction:column;align-items:center}
      .b1-logo{display:grid;place-items:center;filter:drop-shadow(0 0 34px rgba(56,189,248,.7)) drop-shadow(0 0 90px rgba(14,165,233,.45))}
      .b1-title{margin-top:26px;font-size:45px;letter-spacing:8px;text-indent:8px;color:#fff;font-weight:700;text-shadow:0 0 30px rgba(125,211,252,.45)}
      .b1-sub{margin-top:16px;font-size:19px;letter-spacing:3px;color:#7f9ec0}
      .b1-prog{margin-top:46px;width:640px;display:flex;align-items:center;gap:16px}
      .b1-track{flex:1;height:13px;border-radius:7px;background:rgba(120,160,200,.14);border:1px solid rgba(56,189,248,.3);overflow:hidden;box-shadow:0 0 18px rgba(56,189,248,.18) inset}
      .b1-track > i{display:block;height:100%;width:0;border-radius:6px;
        background:repeating-linear-gradient(115deg,#38bdf8 0 7px,rgba(56,189,248,.45) 7px 14px);background-size:20px 20px;
        box-shadow:0 0 16px rgba(56,189,248,.85);animation:flow 1.1s linear infinite}
      @keyframes flow{to{background-position:20px 0}}
      .b1-pct{width:60px;font-family:var(--num);font-size:20px;color:#cfe6ff;letter-spacing:1px}
      .b1-card{position:absolute;left:344px;top:640px;width:1140px;height:232px;border-radius:10px;padding:20px 34px;
        background:linear-gradient(180deg,rgba(8,18,32,.92),rgba(6,14,26,.94));border:1px solid rgba(56,189,248,.2)}
      .b1-card-h{font-size:16px;letter-spacing:2px;color:#7dd3fc}
      .b1-mods{display:flex;justify-content:space-between;padding-top:30px}
      .b1-mod{width:190px;display:flex;flex-direction:column;align-items:center;gap:12px}
      .b1-mod .mi{color:#38bdf8;filter:drop-shadow(0 0 10px rgba(56,189,248,.6))}
      .b1-mod .nm{font-size:16px;color:#cfe0f2;letter-spacing:1px}
      .b1-mod .bar{width:168px;height:3px;border-radius:2px;background:rgba(148,163,184,.18);overflow:hidden}
      .b1-mod .bar > i{display:block;height:100%;width:0;border-radius:2px;background:linear-gradient(90deg,#0ea5e9,#7dd3fc);box-shadow:0 0 10px rgba(56,189,248,.7)}
      .b1-mod .pv{font-family:var(--num);font-size:13px;color:#7f9ec0}
      .b1-mod.done .pv{color:#22c55e}
      .b1-mod.done .bar > i{background:linear-gradient(90deg,#0ea5e9,#a5f3fc)}
      .b1-status{position:absolute;left:1520px;top:112px;width:314px;height:760px;border-radius:10px;padding:18px 0 0;display:flex;flex-direction:column;
        background:linear-gradient(180deg,rgba(8,18,32,.94),rgba(6,14,26,.92));border:1px solid rgba(56,189,248,.2)}
      .b1-sh{flex:none;font-size:17px;letter-spacing:2px;color:#eaf6ff;padding:0 22px 16px;border-bottom:1px solid rgba(56,189,248,.12)}
      .b1-st{flex:1;display:flex;align-items:center;gap:18px;padding:0 24px;opacity:0;border-bottom:1px solid rgba(56,189,248,.07)}
      .b1-st:last-child{border-bottom:0}
      .b1-st .si{flex:none;display:grid;place-items:center}
      .b1-st div{display:flex;flex-direction:column;gap:5px}
      .b1-st b{font-size:17px;font-weight:400;color:#dbeafe}
      .b1-st .sv{font-size:15px;color:#22c55e}
      .b1-hint{position:absolute;left:344px;right:436px;top:884px;height:32px;display:flex;align-items:center;gap:12px;padding:0 20px;
        border-radius:8px;background:rgba(6,12,22,.84);border:1px solid rgba(56,189,248,.14);font-size:13px;color:#8fb0cf;letter-spacing:1px}
      .b1-hint .hi{color:#60a5fa;flex:none}
      `;
      document.head.appendChild(st);
    }
    return {
      logo: root.querySelector(".b1-logo"),
      title: root.querySelector(".b1-title"),
      sub: root.querySelector(".b1-sub"),
      track: root.querySelector(".b1-track > i"),
      pct: root.querySelector(".b1-pct"),
      mods: [...root.querySelectorAll(".b1-mod")],
      sts: [...root.querySelectorAll(".b1-st")],
      hint: root.querySelector(".b1-hint span")
    };
  }

  function render(t, e) {
    const pin = FX.easeOut(FX.at(t, 0.05, 0.75));
    e.logo.style.opacity = pin;
    e.logo.style.transform = "scale(" + FX.lerp(0.92, 1, pin) + ")";
    e.title.style.opacity = FX.at(t, 0.25, 0.85);
    e.sub.style.opacity = FX.at(t, 0.45, 1.05);
    e.track.parentNode.style.opacity = FX.at(t, 0.7, 1.3);

    let sum = 0;
    e.mods.forEach((m, i) => {
      const cfg = MODS[i];
      const p = FX.easeInOut(FX.at(t, cfg.s, cfg.e));
      sum += p;
      m.querySelector(".bar > i").style.width = (p * 100).toFixed(1) + "%";
      m.querySelector(".pv").textContent = Math.round(p * 100) + "%";
      m.classList.toggle("done", p >= 0.999);
      m.style.opacity = FX.at(t, cfg.s - 0.15, cfg.s + 0.15);
    });
    const main = FX.easeInOut(FX.at(t, 0.5, 4.9));
    e.track.style.width = (main * 100).toFixed(1) + "%";
    e.pct.textContent = Math.round(main * 100) + "%";

    e.sts.forEach((n, i) => {
      const q = FX.easeOut(FX.at(t, 0.3 + i * 0.28, 0.85 + i * 0.28));
      n.style.opacity = q;
      n.style.transform = "translateX(" + (1 - q) * 14 + "px)";
    });
    e.hint.textContent = t > 5.0 ? "系统就绪，正在进入任务确认..." : "系统启动中，正在初始化核心模块...";
    const glow = t > 4.9 ? (0.4 + 0.6 * Math.abs(Math.sin((t - 4.9) * 3))) : 0.25;
    e.title.style.textShadow = "0 0 " + (18 + glow * 34) + "px rgba(125,211,252," + (0.3 + glow * 0.5) + ")";
  }

  return { build, render };
})();
