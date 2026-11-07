/* SH-06 空地图层适配（场景一 / 场景三）。
   外壳由 window.S06_SHELL 渲染（三场景共用）；本适配层只做一件事：
   不挂地图容器、不画任何图元、不播音频、不产生 AI 事件。
   后续接入场景一/三的地图、目标、视频时，在这里补 adapter 即可。 */
window.S06_SKELETON = {
  build: function (root, sc) {
    var cfg = (window.getSelectedScenario && window.getSelectedScenario()) || null;
    if (!window.S06_SHELL) return {};
    return window.S06_SHELL.mountEmpty(root, sc, cfg);
  },
  render: function (t, e) {
    /* 外壳进度由 S06_SHELL 自己的本地时钟驱动，这里不需要按播片时间做任何事 */
  },
  onShow: function (e) {
    /* 和场景二 SH-06 一致：进入即暂停全局定时器，停在 SH-06 不自动跳到下一屏 */
    if (window.PLAYER && window.PLAYER.pause) window.PLAYER.pause();
    /* 进场时容器才有真实尺寸：校准画布并重新套用相机 */
    if (e && e.mapView) {
      try { if (e.mapView.repaint) e.mapView.repaint(); } catch (err) {}
      try { if (e.cam && e.mapView.setView) e.mapView.setView({ center: e.cam.center, zoom: e.cam.zoom, pitch: e.cam.pitch, bearing: e.cam.bearing }); } catch (err) {}
      requestAnimationFrame(function () { try { if (e.mapView.repaint) e.mapView.repaint(); } catch (err) {} });
    }
  },
  onHide: function (e) {
    if (e && e.st) e.st.dead = true;
  },
  usesMap: false
};
