# HANDOFF.md

> 当前状态交接。每次会话结束更新；不记录长期规则。

## 1. 当前仓库状态

```text
仓库：https://github.com/soft-monk/sh03-mission-screen.git
分支：main
HEAD：c43bc39 video index change
origin/main：已同步
源码工作区：干净
未跟踪：参考/ 下的Word文档和截图（非代码）
```

最近提交：

```text
c43bc39 video index change
a4db14e feat(tts): replace narration with 47 split voice clips
802bc7e fix(sh06): preload playback assets and sequence speech
ec10e3c style(sh06): use transparent play and pause icon controls
b19af48 feat(sh06): show planned routes from entry and limit speeds
```

## 2. 最近完成内容

- 47段拆分TTS已替换旧语音，位于 `assets/audio/001.wav`～`047.wav`。
- SH-04/SH-05/SH-06 进入时预加载47段。
- SH-04气泡时间：
  - 任务分析：0.0秒；
  - 潜在目标部署区1：0.0秒；
  - 潜在目标部署区2：14.7秒；
  - 上级任务要求：26.5秒；
  - 语音序列整体从0.5秒开始。
- SH-04潜在目标部署区1气泡情报行：
  - `情报显示：敌方机动装甲目标。`
- SH-05推荐方案为5编组四列表格。
- SH-05雷达气泡合并为：
  - `雷达侦察机3架，部署到潜在目标区域1。`
- SH-05共6条气泡，语音序列从0.5秒开始。
- SH-06可正常进入；`AI_EVENTS`已恢复；播放/暂停图标预加载；47段语音可顺序播放。

## 3. 已验证

- `node --check data/scenarios.js` 通过。
- `node --check scenes/s03-situation.js` 通过。
- SH-06可进入，播放控件正常生成。
- 47段语音预加载数量为47。
- SH-04可从001.wav开始播放。
- SH-05可从009.wav开始播放。
- SH-06点击开始后可从020.wav开始播放。
- 后台验证服务已关闭，端口已释放。

## 4. 未验证/风险

- 未做18屏完整端到端播放。
- 未做最终视觉验收。
- 未验证47段语音在完整长流程中的累计错位。
- 未验证SH-06事件音频12～25在完整飞行时间轴中的全部触发。
- SH-07～SH-18仍为占位屏。
- 3D地形分支未碰。
- `data/scenarios.js` 和 `scenes/s03-situation.js` 历史上曾被误写为空文件，修改时必须做长度和回读校验。

## 5. 下一步建议

1. 先按 `TASKS/current.md` 的用户任务执行，不主动扩展。
2. 若继续语音校对，先比对47段实际时长与气泡触发时间。
3. 若继续SH-06，重点验证事件音频队列和暂停/继续。
4. 若做视觉验收，先征得用户同意再启动浏览器。
5. 完成后更新本文件，并保留未验证清单。

## 6. 阶段A：分支骨架（2026-11-06）

- 新增 `data/flows.js`：公共前缀 SH-01~03 + 每场景分支表；场景二分支直接引用 `js/timeline.js`，数值未改。
- 新增 `scenes/s06-skeleton.js`：场景一/三的 SH-06 占位外壳（不画地图、不播音频、不引用场景二数据）。
- `js/main.js`：`TL` 改为可切换；新增 `PLAYER.setFlow(id)`；HUD 改为可重建；结束卡文案按所选场景显示。
- `scenes/s03-situation.js`：选场景时调用 `setFlow`；SH-06 通过 `dispatchScenarioScreen` 分流。
- `data/scenarios.js`：场景一/三清空继承自场景二的 `s4Dialog/s4Audio/s6Dialog/s6Audio`，避免串场景二台词与语音。
- 场景一分支：SH-04/05/06 + SH-101~SH-106（占位，各 15s），总长 199s。
- 场景三分支：SH-04/05/06 + SH-201~SH-206（占位，各 15s），总长 199s。
- 场景二分支：SH-01~SH-18 / 308s 原样不动。

已静态验证：16 个 JS 文件 `node --check` 通过；三条 flow 屏序时间单调、末屏 end==total、phases 合法；场景二表与 `window.TIMELINE` 为同一引用；场景二配置数组长度未变（s4Dialog 4 / s4Audio 1 / s5Dialog 6 / s6Dialog 6 / s6Audio 47）。

未验证（需运行验证，未做）：浏览器实播——场景一/三能否从 SH-03 点进去走到 SH-1xx / SH-2xx 并结束；场景二是否与改动前完全一致。

阶段A 已知残留（留给阶段B）：SH-04 的「任务区」标签与「我方集结区」标签坐标仍是场景二的硬编码位置；场景一/三的 SH-04/05/06 尚无自身业务文案与语音。

### 6.1 补充：SH 号的场景标识（同日）

- HUD 右上角屏号徽标改为：SH-01/02/03 保持原样；SH-04 及之后显示「SH-04 · 场景一」形式，`title` 显示完整场景名。
- 占位屏（SH-07~SH-18、SH-101~、SH-201~）的阶段标签改为「场景二 · 阶段 1」形式。
- 该改动会让场景二 SH-07~SH-18 占位屏多出「场景二」字样，属于本次要求内的可见变化。

### 6.2 SH-06 外壳抽取：外壳共用 + 空地图层（2026-11-06）

- 新增 `scenes/s06-shell.js`（`window.S06_SHELL`）：SH-06 外壳模板单一来源——资源概况、右栏目标工具箱 + AI 助手、视频窗框架、播放控制条、图层面板、空地图占位。
- 重写 `scenes/s06-skeleton.js`：变成「空地图层适配器」，build 直接调用 `S06_SHELL.mountEmpty()`；不挂地图容器、不画图元、不播音频、不产生 AI 事件。
- `scenes/s03-situation.js`：新增 `window.S03_CHROME = { MENU, TOOLS, STATUS }` 供外壳复用；SH-06 仍通过 `dispatchScenarioScreen` 分流（场景二走原实现）。
- `index.html`：新增 `scenes/s06-shell.js` 脚本标签（在 s06-skeleton.js 之前）。

场景一/三 进 SH-06 的表现：完整外壳（左菜单、工具条、资源概况、右栏目标框 0 + 暂无目标 + AI 助手、4 个视频窗框架、播放/暂停 + 1×/2×/4× + 进度条 + 分段标签、图层面板 10 项），地图区域为深色底 + 「地图数据待接入」。外壳进度条由本地时钟驱动，不接管全局播放器，全局时钟继续走到 SH-101 / SH-201。

已验证（静态）：17 个 JS 文件 `node --check` 通过；外壳构建器按数据产出正确结构（资源列 4、目标项 0/1、视频卡 4、倍速 3、图层 10）。

未验证（需运行验证）：浏览器实播 SH-06 场景一/三的外壳观感与交互；场景二 SH-06 是否与改动前完全一致（本次未改场景二实现）。

遗留：场景二 SH-06 仍走原内联实现，尚未切到 `S06_SHELL`；已备好构建器，下一步切换需浏览器验证。

### 6.3 修复：加载期 ReferenceError + 分段标记（同日）

- 根因：上一版在模块顶层写了 `window.S03_CHROME = { MENU, TOOLS, STATUS }`，但这三个变量声明在 `make()` 内部，脚本加载即抛 `ReferenceError: MENU is not defined`，导致其后的 SH-03~SH-06 注册全部未执行，全片退化为占位屏。
- 修复 1：删除该行，恢复 `window.SCENES["SH-03".."SH-06"]` 注册。
- 修复 2：`scenes/s06-shell.js` 自带 MENU / TOOLS / STATUS 常量，不再依赖场景模块内部变量。
- 修复 3：外壳进度条分段改为与场景二一致（`<b class="s6-seg s6-segN">` + `<span>` 标签 + 最小宽度 0.6%）。

已验证（静态）：全部 JS `node --check` 通过；Node 实际加载 `s03-situation.js` 后 `window.SCENES` = SH-03,SH-04,SH-05,SH-06（修复前为空）；shell/skeleton 单独加载正常；外壳构建器结构断言通过。

未验证：浏览器实播观感（未启动服务）。

### 6.4 SH-03 不建图 + 场景一/三 SH-04/05/06 只留外壳（同日）

- SH-03：DOM 不再输出 `.s3-map`，改输出 `.s3-map-static`（`assets/img/basemap.jpg` 静态底图 + 暗角）；`build()` 里 `var map = mapHost ? MapViewShared(mapHost) : NULL_MAP;`，因此 SH-03 不会创建 MapLibre 实例、不加载瓦片。
- 新增 `NULL_MAP`（Proxy 空实现，`is3d:false`，`label()` 返回可调用的空句柄），保证 SH-03 里所有 `map.*` 调用安全。
- `js/main.js` 未改：`prewarm()` 仍会提前 build SH-03，但已不会建图（只预热 DOM）。
- 点场景卡：`scene-2` 时趁 620ms 过渡在 `#mapwarm`（屏幕外 1920x1080 容器）里先 `MapViewShared` 建图，SH-04 首帧即有图；`scene-1/3` 不建任何地图。
- SH-04 / SH-05 也改为 `dispatchScenarioScreen(make(...), S06_SKELETON)`：场景一走空外壳，场景二走原实现。

已验证（静态）：全部 JS `node --check` 通过；Node 加载 `s03-situation.js` 后 `SCENES` = SH-03,SH-04,SH-05,SH-06；关键点 grep 确认。

未验证：浏览器实播（SH-03 静态底图观感、点场景二后 620ms 预建图是否足够、场景一/三外壳）。

### 6.5 纠正：SH-04/05 恢复与场景二同一套界面（同日）

- 撤回 6.4 里把 SH-04/05 改成空外壳的做法：恢复 `window.SCENES["SH-04"] = make("mission")`、`["SH-05"] = make("plan")`。
- 新增 `NEED_MAP`：只有所选场景是 `scene-2` 时才 `MapViewShared(host)` 建图；场景一/三 走 `NULL_MAP`（不建实例、不加载瓦片）。
- 非 SH-03 屏新增 `<div class="s3-map-empty"><b>地图数据待接入</b></div>`，`NEED_MAP` 为真时自动隐藏；场景一/三 的地图区显示深色底 + 提示。
- `ctx.needMap` 传到 `onShow`，`MapViewShared(e.host)` 只在 `needMap` 为真时调用（否则场景一/三 会被 onShow 重新建图）。
- SH-03 仍不建图、静态底图；点场景二仍在 `#mapwarm` 预建图；SH-06 场景一/三 仍走 `S06_SHELL` 空外壳。

已验证（静态）：全部 JS `node --check` 通过；加载 `s03-situation.js` 后 `SCENES` = SH-03..SH-06；CSS 无重复声明。

已知差异：SH-06 场景一/三 的外壳由 `S06_SHELL.mountEmpty` 生成，结构与场景二 SH-06 对齐但不等同（视频窗口 4 个、无目标卡）。如需逐像素一致，下一步把真实 SH-06 的 DOM 抽出来复用。

未验证：浏览器实播。

### 6.6 修复：SH-06 空壳缺左菜单/上工具栏（同日）

- 原因：`.s3-mi` / `.s3-toolbar` / `.s3-side` / `.s3-st` / `.s3-scale` / `.s3-coord` / `.s3-mic` 在 css-s03 里默认 `opacity:0`，由场景二 `render()` 的淡入动画打开；空壳没有那段动画，所以一直是透明的。
- 修复：`S06_SHELL.mountEmpty` 在填充完菜单/工具栏/状态栏之后，把这些元素统一设为 `opacity:1`（顺序必须在状态栏填充之后，否则 `.s3-st` 还不存在）。
- 视频窗补齐为 6 个（A/B 可见，C/D `s6-video-extra`、E/F `s6-video-third` 默认隐藏），与场景二 SH-06 的 DOM 完全一致。

已验证（静态）：`node --check` 全部通过；外壳产出 6 个视频卡（4 个默认隐藏）、右栏工具箱 + AI、图层 10 项。

未验证：浏览器实播。

### 6.7 运行验证（无头 Chrome，2026-11-06）

方式：本地静态服务 8899 + Chrome headless 9333（CDP 驱动，无可见窗口），截 6 张：SH-03、场景一 SH-04/05/06、场景二 SH-04/06。结束已杀进程，8899/9333 均已释放，临时脚本已删。截图在项目外 `D:/tmp/shots`。

结果：
- SH-03：静态底图，无 canvas，未创建地图实例。
- 场景一 SH-04/05：完整界面（菜单/工具栏/任务信息/AI/编组表/按钮）+ 地图区深色占位，无 canvas。
- 场景一 SH-06：完整外壳（菜单/工具栏/资源概况/目标工具箱/AI/2 个可见视频窗/控制条/图层面板/状态栏）+ 居中「地图数据待接入」，无 canvas。
- 场景二 SH-04/SH-06：地图、区域、航路、AI 消息与改动前一致，无回归。
- `window.__ERRS` 全程为空。

已知待办（未改，需用户确认）：
1. 场景一/三 SH-05 的「地图数据待接入」被居中推荐方案面板遮住，看不见。
2. 场景一/三 SH-06 进度条沿用飞行仿真总时长 150:00，非业务时长。
3. SH-03 静态底图整体偏暗（brightness .72 + 暗角）。
4. 场景一/三 SH-04 任务信息仍是占位数据（场景一待设计区域等）。

### 6.8 场景一地图接入（2026-11-06）

瓦片：
- 场景二：按实际用图范围（任务区/目标区/禁飞区/集结区/4 条航路，四周 20~30km 余量）修剪，4969 张 90MB → 3776 张 65MB。
- 场景一：新增 500 张（z11 180km / z12 100km / z13 60×60km），约 4.6MB，中心 121.0731, 24.8983。

代码：
- `data/scenarios.js`：场景一 camera 改为 center [121.073,24.978] / zoom 11（锁定 ≥11，兜底图不覆盖该纬度），area.mission = 以 121.0241,24.8365 为中心 40×40km，area.reserve = 121.30,25.121 4×4km，targets/noFly 置空，新增 coordText 与 mapBounds。
- `js/mapview.js`：新增 `window.MapViewSetBounds(bb)`，并在建图前缓存 pendingBounds（地图实例未就绪时先记下，boot 后套用）。
- `scenes/s03-situation.js`：NEED_MAP 增加 scene-1；任务区/集结区标签与坐标显示支持场景配置（`area.missionLabel` / `area.reserveLabel` / `cfg.coordText`，缺省回退原值，场景二不变）。

验证（无头 Chrome，端口已释放）：
- 场景一 SH-04/05：地图中心 121.073/24.978、zoom 11，瓦片 136 张全部命中、0 个 404、无 JS 错误。
- 场景二：zoom 9.13、center 114.1/39.88、边界仍为默认，0 个 404，未受影响。

已知问题（未改）：
1. 场景一 SH-06 仍是空外壳（无地图），camera 配置对它不生效。
2. pitch 38 下 40×40km 任务区南边超出屏幕；集结区投影在 (1682,390)，被右侧任务信息面板遮挡。
3. 场景一 SH-04 任务信息里「任务区域：场景一待设计区域」仍是占位文案。

### 6.9 场景一 SH-06 接入地图 + 视频窗按需显示（2026-11-06）

- `scenes/s06-shell.js`：`mountEmpty` 按场景判断——有 `cfg.mapBounds`（场景一）就输出 `.s3-map` 并挂共享地图，套用该场景 camera 与边界；没有（场景三）仍是「地图数据待接入」占位。
- 挂载时机在 build（此时容器还没 `.on`、尺寸为 0），因此在 `s06-skeleton.onShow` 里再 `repaint()` 一次并重套相机，否则画布只有一小块。
- 场景一 SH-06 上重画任务区（橙框）+ 集结区（绿虚框）与两个标签——离开 SH-05 时图元已被 `clearAreaGraphics` 清掉。
- 视频窗与场景二一致：不再强制 `.on`，`.s6-video-smallbar` / `.s6-video-large` 默认 `display:none`，有视频数据时才显示。
- `scenes/s06-skeleton.js`：onShow 增加地图校准（repaint + 重设相机）。

验证（无头 Chrome，端口已释放）：场景一 SH-06 地图中心 121.073/24.978、zoom 11、瓦片 0 个 404、无 JS 错误、视频窗 display:none；场景三 SH-06 无地图、视频窗隐藏。

未验证：场景二 SH-06（未改动，走原实现）。

### 6.10 SH-06（场景一/三）进入即暂停全局定时器（2026-11-06）

- `scenes/s06-skeleton.js` 的 `onShow` 首行加 `window.PLAYER.pause()`，与场景二 SH-06 行为一致：进入后停在 SH-06，不再自动跳到 SH-101 / SH-201。
- 同时删掉 onShow 里一句已失效的旧注释（原文说“不接管全局播放器”）。

验证（无头 Chrome，端口已释放）：场景一/场景三/场景二 进 SH-06 后 seek(96)，等 4 秒，时间稳定在 96.02、屏号仍是 SH-06、playing=false、无 JS 错误。

### 6.11 场景二地图删减试验（A+B+C，2026-11-06）

- 不是删除，而是移动到项目内 `tmp/map_trim_backup/`（按原路径结构），共 2909 张 / 56.9 MB，可整份拷回 `assets/map/` 还原。
- 移出内容：`online/8`（121 张，源码 minzoom=11 从不请求）、`dem`（408 张，仅 3D 版加载）、`online/13` 里场景二那 2380 张（相机最高 zoom 11.25，播片不用 z13）。
- 结果：`assets/map/online` 65 MB → 21 MB；`assets/map` 85 MB → 21 MB。
- `.gitignore` 新增 `/tmp/`（1 行），避免备份文件污染 git status。

验证（无头 Chrome，端口已释放）：场景二 SH-04/05/06 与场景一 SH-04 均正常，瓦片请求 230 张全部命中、0 个 404、无 JS 错误；场景二 SH-06 画面与删减前一致。

副作用（预期内）：3D 地形版不可用（dem 已移出）；场景二手动放大到 zoom 12.5 以上会糊。

当前待定：试验效果确认后，决定是保留这次移动、还是把 tmp 里的内容拷回。

### 6.12 C 方案：去掉兜底整图 + 按场景收紧拖拽范围（2026-11-06）

- `js/mapview.js`：平面版 style 删掉 `base`（basemap.jpg 兜底整图）源与图层，只剩 `bg` 底色 + `sat` 瓦片；3D 版保持只留 `sat`。拖出瓦片范围现在是深色底，边界一眼可见。
- `data/scenarios.js`：场景二 `mapBounds = [[113.20,39.20],[116.40,40.60]]`（约 274×155 km）；场景三 `mapBounds = null`（否则会继承场景二的值，导致 SH-06 误判成有地图）。场景一沿用原 `[[120.60,24.40],[121.60,25.40]]`。

验证（无头 Chrome，端口已释放）：
- 场景二 layers = `bg,sat,...`（base 已移除），zoom 10，bounds 生效为 [113.2,39.2,116.4,40.6]，拖到角落外为深色底，无 JS 错误。
- 场景一 zoom 11、bounds [120.6,24.4,121.6,25.4] 不变。

注意：SH-03（CAM03，zoom 10.15 宽视角）边缘现在也会露深色底，属预期效果。

### 6.13 B 方案：补齐场景二 z11/z12 并把放大上限压到 12（2026-11-06）

- 补瓦片：z11 新增 60 张（共 361）、z12 新增 302 张（共 1066），覆盖场景二 mapBounds（113.2~116.4E / 39.2~40.6N）+5km 余量；`online` 21MB → 27MB。
- `js/mapview.js`：地图 `maxZoom` 16 → **12**；瓦片源 `maxzoom` 13 → **12**（关键：只改地图 maxZoom 不够，zoom=12 时 MapLibre 仍会请求 z13，缺瓦片就整屏黑）。
- 场景二 z13 那 2380 张仍在 `tmp/map_trim_backup`，不再使用。

验证（无头 Chrome，端口已释放）：zoom 10 / 12（中心）/ 12（西北角）/ 12（东南角）四张截图均满屏有图、无黑块；瓦片请求 180 张全部命中、0 个 404、无 JS 错误。

副作用：场景一也受 `maxzoom: 12` 影响，放大上限同为 12（它原本那 210 张 z13 不再被请求）。

### 6.14 C 方案：补 z9/z10 低层级瓦片，缩小不再黑（2026-11-06）

- 新增 `online/9`（110 张 / 1.9 MB）与 `online/10`（378 张 / 6.3 MB），覆盖 111.6~118.6E / 37.6~42.2N（约 598×509 km）。
- `js/mapview.js`：瓦片源 `minzoom` 11 → **9**（maxzoom 仍 12，地图 minZoom 9 / maxZoom 12）。
- `data/scenarios.js`：场景二 `mapBounds` 由 [[113.20,39.20],[116.40,40.60]] 扩到 [[111.60,37.60],[118.60,42.20]]，否则缩小到 9 会被 bounds 卡住。
- `assets/map/online` 27 MB → 37 MB。

验证（无头 Chrome，端口已释放）：zoom 9（中心）、zoom 9（东北角 117.5/41.5）、zoom 10、zoom 11 四张截图满屏有图；瓦片请求 280 张全部命中、0 个 404、无 JS 错误。

已知局限：z11/z12 只覆盖数据区（越界仍会黑），所以在 zoom≥11 时把地图平移到数据区以外仍可能露底；如需彻底消除，要再补 z11/z12 到同一范围（约 +5 MB / +22 MB）。

### 6.15 撤销 6.14（C 方案 z9/z10）（2026-11-06）

- `online/9`（110 张）、`online/10`（378 张）移回 `tmp/map_trim_backup/online/9|10`；`assets/map/online` 37 MB → 27 MB。
- `js/mapview.js`：瓦片源 `minzoom` 9 → 11（`maxzoom` 仍 12；地图 `minZoom` 9 / `maxZoom` 12 未变）。
- `data/scenarios.js`：场景二 `mapBounds` 回到 [[113.20,39.20],[116.40,40.60]]。

保留：B 方案补的 z11 361 张 / z12 1066 张、maxZoom 12、去掉兜底整图、场景二相机 zoom 10。

验证（无头 Chrome，端口已释放）：场景二 SH-04 zoom 10、bounds [113.2,39.2,116.4,40.6]、瓦片 116 张全命中、0 个 404、无 JS 错误。

已知：缩放回 9 仍会露底（这是撤销前的状态），需要时再补 z9/z10 即可。

### 6.16 场景二锁定最小缩放（2026-11-06）

- `js/mapview.js`：新增 `window.MapViewSetZoomRange(min, max)`（建图前调用会缓存，boot 后套用）。
- `data/scenarios.js`：场景二 `minZoom: 10`。
- `scenes/s03-situation.js`：build 与 onShow 两处按场景套用缩放范围（`SCFG.minZoom`，上限固定 12）；ctx 带上 `minZoom`。

验证（无头 Chrome，端口已释放）：场景二初始 zoom 10，强行 `jumpTo({zoom:8})` 后实际仍为 **10**，画面满屏无黑；瓦片 237 张全命中、0 个 404、无 JS 错误。

备注：场景一未设 minZoom，靠 mapBounds 卡在约 10.4；如需同样显式锁死，给它加 `minZoom: 10.5` 即可。

### 6.17 场景二禁飞区图层合并（2026-11-06）

- `js/mapview.js` 新增 `polygons(id, rings, st)`：把一个多边形数组合成 1 个 GeoJSON FeatureCollection source + `-f` / `-l` 两个图层，并注册进 `registry`，`setArea()` 照常可用。
- `scenes/s03-situation.js`：9 个禁飞区从「9 个 polygon（18 层）」改为「1 次 polygons（2 层）」，标签仍是 9 个 DOM marker。

验证（无头 Chrome，端口已释放）：场景二 SH-04 图层 28 → **12**（bg/sat/mission×2/target×4/nf×2/reserve×2），`area-nf-f`+`area-nf-l` 内含 9 个 feature，截图显示 9 个禁飞区正常；场景二 SH-06 正常（42 层，含航路/覆盖层等）；场景一 SH-04 仍 6 层、无 area-nf 图层（它的 noFly 为空）；全部无 JS 错误。

备注：之前实测 28 层与 6 层重绘耗时同为 ~6.9ms，合并主要是降低弱 GPU 上的风险，不保证解决体感卡顿。

### 6.18 A 方案：z12 收到最小外接矩形 + 收紧拖动范围（2026-11-06）

- 场景二要素最小外接矩形（任务区 + 9 个禁飞区 + 集结区）：lon 113.6296~115.9809、lat 39.5144~40.2510，即 **200.9 × 81.4 km**。
- z12 从 897 张收到外接矩形+5km（377 张），再加上一格安全环共 465 张；移出 689 张、补回 88 张，`online` 27 MB → **16 MB**。
- `data/scenarios.js`：场景二 `mapBounds` 收到 [[113.5711,39.4692],[116.0394,40.2962]]（外接矩形 + 5 km）。
- z11 保持 361 张不动（zoom 10 的视口 225×127 km 比外接矩形大，砍了会露底）。

验证（无头 Chrome，端口已释放）：SH-04 zoom 10 正常；zoom 12 在西北角 / 东南角 / 中心三处均有图；瓦片 166 张全命中、**0 个 404**、图层 12、无 JS 错误。

代价：拖动范围限制在数据外接矩形 + 5 km 内，拖不到数据以外（这是本次要求）。

### 6.19 撤销 6.18（A 方案 z12 裁剪 + 收紧 bounds）（2026-11-06）

- z12 从备份恢复 432 张，回到 897 张（x3335~3373 / y1541~1563）；`online` 约 18 MB → 26 MB。
- `data/scenarios.js`：场景二 `mapBounds` 恢复为 [[113.20,39.20],[116.40,40.60]]。

保留：z11 361 张、z13 场景一 210 张、禁飞区图层合并、minZoom 10 / maxZoom 12、去掉兜底整图。

验证（无头 Chrome，端口已释放）：场景二 SH-04 zoom 10、bounds [113.2,39.2,116.4,40.6]、图层 12、瓦片 138 张全命中、0 个 404、无 JS 错误；zoom 12 东南角正常。

### 6.20 帧率表全局常显（2026-11-06）

- `js/main.js`：帧率表从「仅 `?fps=1` 时显示」改为**默认全局常显**（`?fps=0` 可关闭），位置改为左上角 `left:12px; top:12px`。
- 逻辑本身未变（每 500ms 统计一次 rAF 帧数）。

验证（无头 Chrome，端口已释放）：SH-01 显示 `146 fps`、场景二 SH-04 显示 `144 fps`，盒子位置 `left:12px top:12px`；加 `&fps=0` 时确实不显示。

### 6.21 删除帧率表（2026-11-06）

- `js/main.js`：删除整段 FPS 统计代码（DOM 方块 + 独立 rAF 循环 + `?fps=` 参数），默认不再有任何 fps 计算；文件 12894 → 12250 字符。
- 背景：实测发现「WebGL software only（SwiftShader）」是场景二卡的根因，开启硬件加速后 100+ fps；帧率表本身的常驻 rAF 回调属于额外开销，按要求移除。

验证（无头 Chrome，端口已释放）：页面内 fps 节点 0 个、`__READY` 为 true、`SCENES` 注册正常、场景二 SH-04 正常、无 JS 错误。

备注：以后要看帧率用 DevTools Performance 面板；`?t=` / `&pause=1` 调试参数保留。

### 6.22 新增 4 份时间轴文档（2026-11-06）

新建 `docs/` 目录，, 四份文档（只读代码整理，未改任何源码）：

- `docs/timeline-common.md`：公共 SH-01~SH-03（0~26 s），含两屏内部节拍、两条字幕、SH-03 点卡后的 6 步动作。
- `docs/timeline-scene1.md`：场景一 SH-04/05/06 + SH-101~106（总长 199 s）。
- `docs/timeline-scene2.md`：场景二 SH-04/05/06 + SH-07（总长 308 s），含 SH-06 独立飞行时钟（0~9000 s）与 026~047 事件表。
- `docs/timeline-scene3.md`：场景三 SH-04/05/06 + SH-201~206（总长 199 s）。

每份结构：屏表（起止/时长/章节）→ 进入时动作（建图/相机/图元）→ 屏内时间点事件表 → 显示文字 → 语音 → 交互点 → 已知缺口。

说明：文档中的屏内节拍取自源码常数（如自动鼠标 36/39/39.3/39.75、气泡 t 值、SH-06 事件秒数），未做浏览器逐帧核对。

### 6.23 底部字幕功能整体删除（2026-11-06）

背景：字幕从 2026-11-03 起只是被 `#subtitle{display:none !important}` 隐藏，数据和渲染逻辑仍在。本次按要求**连代码一起删掉**。

删除内容：
- `js/timeline.js`：`subs` 数组（19 条台词）、`subs.forEach` 计算 `dur` 的整段、返回值里的 `subs` 字段。
- `js/main.js`：`subEl/subWho/subTxt` 三个 DOM 引用、`updateSub()` 整个函数、`curSub` 变量（含 setFlow / replay 两处重置）、`render()` 里的 `updateSub()` 调用、`hud.subon` 类切换。
- `index.html`：`<div id="subtitle">…</div>`。
- `css/stage.css`：`#subtitle` 的 7 条规则 + `#hud.subon .hud-bottom` 那条（后者本来只是「有字幕时把底部背景设成 none」）。
- `scenes/s03-situation.js`、`scenes/s06-skeleton.js`：`ownSubs` 标记（main.js 已不读，属死字段）。
- `data/flows.js`：分支对象里的 `subs: []` 字段。

静态验证：全部 JS `node --check` 通过；`TIMELINE` 仍是 total 308 / 18 屏 / 1 等待点 / 无 subs；场景一、三 仍 199 s / 12 屏 / 5 段；场景二表与 `window.TIMELINE` 仍是同一对象；全仓（排除文档与 tmp）搜索 `subtitle|ownSubs|subon|subs` **0 命中**。

未做运行验证：本轮 Chrome headless 启动失败（端口 9333 无监听），没能跑浏览器实测；改动是纯删除，且删除前字幕本来就被 CSS 隐藏，画面预期无变化。

文档同步：`docs/timeline-common.md` 的「公共字幕」整节改为「已验证移除」说明；场景一/三 的「本分支为空」改为「功能已移除」；场景二 SH-04/05/06 三处字幕表删除。
