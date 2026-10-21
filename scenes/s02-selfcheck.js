/* SH-02 系统状态自检：按设计稿复刻 */
window.SCENES = window.SCENES || {};
window.SCENES["SH-02"] = (function () {
  const ROWS = [
    { icon: "dish", k: "通信链路检测", s: "卫星链路 / 数传链路 / 组网链路" },
    { icon: "pin", k: "定位系统检测", s: "GPS / 北斗定位服务" },
    { icon: "nodes", k: "集群节点检测", s: "集群节点状态 / 设备在线率" },
    { icon: "server", k: "后方指控检测", s: "指控平台连接 / 数据交互服务" },
    { icon: "shield", k: "系统安全检测", s: "系统完整性 / 安全防护机制" }
  ];
  const CARDS = [
    { icon: "wifi", c: "#22c55e", k: "网络连接", v: "在线" },
    { icon: "link", c: "#22c55e", k: "数据链路", v: "稳定" },
    { icon: "pin", c: "#22c55e", k: "GPS定位", v: "正常" },
    { icon: "shield", c: "#22c55e", k: "系统安全", v: "安全" }
  ];
  function build(root) {
    root.innerHTML =
      '<div class="b2-bg"></div>' +
      '<div class="b2-left panel">' +
        '<div class="b2-lt">系统状态自检</div><div class="b2-ll"></div>' +
        '<div class="b2-ls">请确认系统状态，确保各模块正常运行</div>' +
        '<div class="b2-radar">' +
          '<svg class="rg" viewBox="0 0 320 320" fill="none" stroke="rgba(56,189,248,.28)">' +
            '<circle cx="160" cy="160" r="150"/><circle cx="160" cy="160" r="112"/><circle cx="160" cy="160" r="74"/><circle cx="160" cy="160" r="38"/>' +
            '<path d="M160 6v34M160 280v34M6 160h34M280 160h34"/>' +
            '<path class="sweep" d="M160 160 L160 10 A150 150 0 0 1 260 60 Z" fill="rgba(56,189,248,.16)" stroke="none"/>' +
          '</svg>' +
          '<div class="b2-logo"><img src="assets/img/logo.png" width="118" style="display:block" alt=""></div>' +
          '<div class="b2-hline"></div>' +
        '</div>' +
        '<button class="b2-scan">一键自检</button>' +
        '<div class="b2-tip">' + ic("info", 18, "", 1.6) + '<span>提示：自检过程预计耗时 15~30 秒</span></div>' +
      '</div>' +
      '<div class="b2-mid panel">' +
        '<div class="b2-h">自检结果</div>' +
        '<div class="b2-rows">' + ROWS.map(r => '<div class="b2-row">' + ic(r.icon, 38, "ri", 1.6) +
          '<div class="tt"><b>' + r.k + '</b><span>' + r.s + '</span></div>' +
          '<span class="ok">正常</span><span class="ck">' + ic("check", 18, "", 2.6) + '</span></div>').join("") + '</div>' +
        '<div class="b2-btns"><button class="b2-again">' + ic("refresh", 22, "", 1.8) + '重新检测</button>' +
          '<button class="b2-go"><span class="lb">进入任务</span><em>&raquo;</em><span class="sp"></span></button></div>' +
      '</div>' +
      '<div class="b2-right panel">' +
        '<div class="b2-h">系统状态概览</div>' +
        CARDS.map(c => '<div class="b2-st"><span class="ci" style="color:' + c.c + '">' + ic(c.icon, 34, "", 1.7) + '</span><div><b>' + c.k + '</b><span class="sv">' + c.v + '</span></div></div>').join("") +
      '</div>' +
      '<div class="b2-mic">' + ic("mic", 46, "", 1.7) + '</div>' +
      '<div class="b2-toast">正在进入…</div>' +
      '<div class="b2-ripple"></div>' +
      '<div class="b2-cursor"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 2.5 19 13l-6.2 1.1L16 21l-3 1.2-3.2-6.9L5 19.5Z" fill="#fff" stroke="#0b1220" stroke-width="1.4" stroke-linejoin="round"/></svg></div>';

    if (!document.getElementById("css-s02")) {
      const st = document.createElement("style"); st.id = "css-s02";
      st.textContent = `
      .b2-bg{position:absolute;inset:0;background:#02060c url("assets/img/earth.jpg") center 46% / cover no-repeat;filter:saturate(1.02)}
      .b2-left{position:absolute;left:60px;top:100px;width:470px;height:800px;background:rgba(8,18,32,.5);backdrop-filter:blur(18px) saturate(1.15)}
      .b2-lt{margin-top:38px;text-align:center;font-size:27px;letter-spacing:3px;color:#eaf6ff;font-weight:700}
      .b2-ll{width:58px;height:3px;margin:14px auto 0;border-radius:2px;background:linear-gradient(90deg,transparent,#38bdf8,transparent)}
      .b2-ls{margin-top:18px;text-align:center;font-size:14px;color:#7f9ec0;letter-spacing:1px}
      .b2-radar{position:relative;width:320px;height:320px;margin:38px auto 0}
      .b2-radar .rg{position:absolute;inset:0;width:320px;height:320px}
      .b2-radar .sweep{transform-origin:160px 160px}
      .b2-logo{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;filter:drop-shadow(0 0 22px rgba(56,189,248,.75))}
      .b2-hline{position:absolute;left:-46px;right:-46px;top:160px;height:2px;
        background:linear-gradient(90deg,transparent,rgba(96,165,250,.15) 20%,rgba(147,197,253,.95) 50%,rgba(96,165,250,.15) 80%,transparent);
        box-shadow:0 0 18px rgba(96,165,250,.9)}
      .b2-scan{display:block;width:320px;height:56px;margin:34px auto 0;border-radius:8px;cursor:default;
        border:1px solid rgba(96,165,250,.55);color:#fff;font-size:20px;letter-spacing:6px;text-indent:6px;font-family:var(--font);
        background:linear-gradient(180deg,#2563eb,#1e3a8a);box-shadow:0 8px 26px rgba(37,99,235,.45)}
      .b2-tip{position:absolute;left:24px;right:24px;bottom:26px;display:flex;align-items:center;gap:10px;font-size:13px;color:#8ea8c4;text-shadow:0 1px 3px rgba(0,0,0,.8)}
      .b2-mid{position:absolute;left:555px;top:100px;width:880px;height:790px;background:rgba(8,18,32,.5);backdrop-filter:blur(18px) saturate(1.15)}
      .b2-h{padding:22px 26px 16px;font-size:19px;letter-spacing:2px;color:#7dd3fc}
      .b2-rows{display:flex;flex-direction:column;gap:12px;padding:0 24px}
      .b2-row{display:flex;align-items:center;gap:20px;height:92px;padding:0 22px;border-radius:8px;
        background:rgba(8,20,36,.62);border:1px solid rgba(56,189,248,.18);opacity:0}
      .b2-row .ri{color:#60a5fa;flex:none}
      .b2-row .tt{flex:1;display:flex;flex-direction:column;gap:7px}
      .b2-row .tt b{font-size:18px;font-weight:500;color:#e8f2ff;letter-spacing:.5px;text-shadow:0 1px 3px rgba(0,0,0,.75)}
      .b2-row .tt span{font-size:13px;color:#93aac6;letter-spacing:.5px;text-shadow:0 1px 2px rgba(0,0,0,.7)}
      .b2-row .ok{font-size:18px;color:#22c55e;opacity:0}
      .b2-row .ck{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:#fff;
        background:#22c55e;opacity:0;transform:scale(.6);box-shadow:0 0 16px rgba(34,197,94,.6)}
      .b2-row.ok-on{border-color:rgba(34,197,94,.4);background:rgba(10,34,26,.6)}
      .b2-btns{position:absolute;left:24px;right:24px;bottom:24px;display:flex;gap:18px}
      .b2-again{flex:1;height:62px;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:12px;
        border:1px solid rgba(56,189,248,.45);background:rgba(56,189,248,.07);color:#bcd9f5;font-size:19px;font-family:var(--font);cursor:default}
      .b2-go{flex:1.45;height:62px;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:14px;
        border:1px solid rgba(74,222,128,.6);background:linear-gradient(180deg,#22c55e,#15803d);color:#fff;font-size:21px;letter-spacing:2px;font-family:var(--font);cursor:default;
        box-shadow:0 8px 26px rgba(34,197,94,.35)}
      .b2-go em{font-style:normal;font-size:24px;letter-spacing:0}
      .b2-right{position:absolute;left:1460px;top:100px;width:400px;height:556px;background:rgba(8,18,32,.5);backdrop-filter:blur(18px) saturate(1.15)}
      .b2-st{display:flex;align-items:center;gap:18px;height:96px;margin:0 20px 14px;padding:0 20px;border-radius:8px;
        background:rgba(10,26,46,.62);border:1px solid rgba(56,189,248,.3);opacity:0}
      .b2-st .ci{flex:none;display:grid;place-items:center;filter:drop-shadow(0 0 8px rgba(96,165,250,.45))}
      .b2-st div{display:flex;flex-direction:column;gap:8px}
      .b2-st b{font-size:16px;font-weight:400;color:#dbeafe;text-shadow:0 1px 3px rgba(0,0,0,.75)}
      .b2-st .sv{font-size:14px;color:#22c55e}
      .b2-go .lb{letter-spacing:2px}
      .b2-go .sp{display:none;width:17px;height:17px;border-radius:50%;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;animation:b2spin .7s linear infinite}
      .b2-go.busy{filter:brightness(.72) saturate(.75);box-shadow:0 8px 26px rgba(34,197,94,.2)}
      .b2-go.busy .sp{display:block}
      .b2-go.busy em{opacity:0}
      @keyframes b2spin{to{transform:rotate(360deg)}}
      .b2-cursor{position:absolute;left:0;top:0;pointer-events:none;opacity:0;z-index:60;filter:drop-shadow(0 3px 5px rgba(0,0,0,.65))}
      .b2-ripple{position:absolute;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;border:2px solid rgba(255,255,255,.85);pointer-events:none;opacity:0;z-index:59}
      .b2-toast{position:absolute;left:50%;top:726px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;height:46px;padding:0 24px;border-radius:8px;
        background:rgba(9,36,24,.94);border:1px solid rgba(34,197,94,.6);color:#d1fae5;font-size:15px;letter-spacing:.5px;opacity:0;z-index:55;box-shadow:0 12px 34px rgba(0,0,0,.55)}
      .b2-toast b{color:#4ade80;font-size:16px}
      .b2-mic{position:absolute;right:96px;bottom:150px;width:112px;height:112px;border-radius:50%;display:grid;place-items:center;color:#93c5fd;
        background:radial-gradient(circle at 50% 35%,#1e40af,#0b1e3a 70%);border:2px solid rgba(96,165,250,.5);
        box-shadow:0 0 44px rgba(37,99,235,.55),0 0 0 10px rgba(37,99,235,.08)}
      `;
      document.head.appendChild(st);
    }
    return {
      left: root.querySelector(".b2-left"), mid: root.querySelector(".b2-mid"), right: root.querySelector(".b2-right"),
      rows: [...root.querySelectorAll(".b2-row")], sts: [...root.querySelectorAll(".b2-st")],
      scan: root.querySelector(".b2-scan"), go: root.querySelector(".b2-go"),
      goLb: root.querySelector(".b2-go .lb"),
      cursor: root.querySelector(".b2-cursor"), ripple: root.querySelector(".b2-ripple"),
      toast: root.querySelector(".b2-toast"),
      sweep: root.querySelector(".sweep"), mic: root.querySelector(".b2-mic")
    };
  }

  function render(t, e) {
    const pin = FX.easeOut(FX.at(t, 0.05, 0.7));
    e.left.style.opacity = pin; e.left.style.transform = "translateX(" + (1 - pin) * -22 + "px)";
    e.mid.style.opacity = FX.at(t, 0.2, 0.85);
    e.right.style.opacity = FX.at(t, 0.4, 1.0);

    e.rows.forEach((r, i) => {
      const s = 1.15 + i * 0.52;
      const p = FX.easeOut(FX.at(t, s, s + 0.45));
      r.style.opacity = p;
      r.style.transform = "translateX(" + (1 - p) * -18 + "px)";
      const ok = FX.at(t, s + 0.42, s + 0.62);
      r.querySelector(".ok").style.opacity = ok;
      const ck = r.querySelector(".ck");
      ck.style.opacity = ok;
      ck.style.transform = "scale(" + FX.lerp(0.6, 1, FX.easeOut(ok)) + ")";
      r.classList.toggle("ok-on", ok > 0.5);
    });

    e.sts.forEach((n, i) => {
      const s = 4.15 + i * 0.3;
      const p = FX.easeOut(FX.at(t, s, s + 0.45));
      n.style.opacity = p;
      n.style.transform = "translateX(" + (1 - p) * 18 + "px)";
    });

    e.sweep.style.transform = "rotate(" + (t * 46) + "deg)";

    const press = FX.at(t, 3.2, 3.5) * (1 - FX.at(t, 3.6, 3.9));
    e.scan.style.transform = "scale(" + (1 - press * 0.03) + ")";
    e.scan.style.boxShadow = "0 8px 26px rgba(37,99,235," + (0.45 + press * 0.4) + ")";

    /* ---- 演出：鼠标飞入 -> 点击 -> 载入 -> toast -> 白光 ---- */
    if (!e.gpt) {
      var stg = document.getElementById("stage");
      var srect = stg.getBoundingClientRect();
      var scl = srect.width / 1920 || 1;
      var gr2 = e.go.getBoundingClientRect();
      if (gr2.width > 0) e.gpt = { x: (gr2.left - srect.left) / scl + gr2.width / scl / 2, y: (gr2.top - srect.top) / scl + gr2.height / scl / 2 };
    }
    const GX = e.gpt ? e.gpt.x : 1170, GY = e.gpt ? e.gpt.y : 835;
    const cp = FX.easeOut(FX.at(t, 5.35, 5.62));
    const ck = FX.easeInOut(FX.at(t, 5.45, 6.0));
    const cx = FX.lerp(GX + 340, GX + 10, ck);
    const cy = FX.lerp(GY + 250, GY + 12, ck);
    const cfade = cp * (1 - FX.at(t, 7.0, 7.3));
    e.cursor.style.opacity = cfade;
    e.cursor.style.transform = "translate(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px)";

    const rk = FX.at(t, 6.0, 6.55);
    e.ripple.style.left = (GX + 10) + "px";
    e.ripple.style.top = (GY + 12) + "px";
    e.ripple.style.opacity = rk > 0 && rk < 1 ? (1 - rk) * 0.9 : 0;
    e.ripple.style.transform = "scale(" + (0.15 + rk * 1.15) + ")";

    const gpress = Math.sin(FX.at(t, 6.0, 6.22) * Math.PI);
    let gs = 1, ga = 0.35;
    if (t < 6.0) {
      const gp = FX.at(t, 4.6, 5.4);
      gs = 1 + 0.018 * gp * Math.abs(Math.sin(t * 3.4));
      ga = 0.35 + gp * 0.3;
    } else {
      gs = FX.lerp(1, 0.955, gpress);
      ga = 0.35 - gpress * 0.15;
    }
    const busy = t >= 6.12;
    if (busy !== e.go.classList.contains("busy")) {
      e.go.classList.toggle("busy", busy);
      e.goLb.textContent = busy ? "正在进入…" : "进入任务";
    }
    e.go.style.transform = "scale(" + gs + ")";
    e.go.style.boxShadow = "0 8px 26px rgba(34,197,94," + ga + ")";

    const tk = FX.easeOut(FX.at(t, 6.25, 6.62));
    e.toast.style.opacity = tk;
    e.toast.style.marginTop = (1 - tk) * 16 + "px";

    e.mic.style.opacity = FX.at(t, 1.0, 1.8);
    e.mic.style.transform = "scale(" + FX.lerp(0.9, 1, FX.easeOut(FX.at(t, 1.0, 1.8))) * (1 + 0.03 * Math.sin(t * 2.6)) + ")";
  }

  return { build, render };
})();
