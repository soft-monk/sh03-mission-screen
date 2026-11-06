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
    /* 本适配层没有地图、没有音频、没有 AI 事件，因此不接管全局播放器 */
  },
  onHide: function (e) {
    if (e && e.st) e.st.dead = true;
  },
  usesMap: false,
  ownSubs: false
};
