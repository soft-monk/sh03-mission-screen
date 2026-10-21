/* 小工具：所有屏共用。render(t) 是纯函数，同一 t 永远得到同一画面，所以能拖进度条/重播 */
window.FX = (function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const at = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, p) => a + (b - a) * p;
  const pad2 = n => (n < 10 ? "0" : "") + n;
  const mmss = s => pad2(Math.floor(s / 60)) + ":" + pad2(Math.floor(s % 60));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const css = (n, o) => { for (const k in o) n.style[k] = o[k]; return n; };
  /* 淡入上浮：progress 0->1 */
  const rise = (n, p, dy) => {
    n.style.opacity = p;
    n.style.transform = "translateY(" + (1 - p) * (dy == null ? 18 : dy) + "px)";
  };
  const fmt = (v, d) => Number(v).toFixed(d == null ? 0 : d);
  return { clamp, at, easeOut, easeInOut, lerp, pad2, mmss, el, css, rise, fmt };
})();
