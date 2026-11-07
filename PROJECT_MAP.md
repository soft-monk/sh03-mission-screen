# PROJECT_MAP.md

> 本文件说明 FastHTML 的目录、关键文件和不可破坏的技术约束。
> 只描述稳定结构，不记录临时任务状态。

## 1. 项目形态

- 纯静态 HTML + CSS + 原生 JS。
- 无 npm、无打包、无构建流程。
- 固定 1920x1080 舞台，整体 CSS 等比缩放。
- MapLibre 地图全片共享一个实例。
- 全局时间轴驱动播片，`render(t)` 是画面状态的唯一真相。
- 修改后最低验证：`node --check`。

## 2. 关键目录

```text
FastHTML/
  index.html              唯一入口
  serve.mjs               本地静态服务器
  data/
    scenario.js           场景基础数据
    scenarios.js          场景分支、气泡、语音、编组配置
  scenes/
    s01-boot.js           SH-01 启动
    s02-selfcheck.js      SH-02 自检
    s03-situation.js      SH-03/04/05/06 共用实现
    placeholder.js        SH-07～SH-18 占位
  js/
    main.js               主循环、切屏、播放控制、重播重置
    timeline.js           屏幕时间点、章节、字幕、等待点、总时长
    mapview.js            MapLibre 共享地图与图层
    flight06.js           SH-06 飞行仿真、航路、目标
  assets/
    audio/                001.wav～047.wav
    img/                  图标、底图、无人机图
    map/                  离线瓦片
```

## 3. 场景入口规则

- SH-03/04/05/06 共用 `scenes/s03-situation.js` 的 `make(variant)`。
- 变体：
  - `SH-03 = select`
  - `SH-04 = mission`
  - `SH-05 = plan`
  - `SH-06 = frame`
- 场景必须由用户在 SH-03 点击场景卡进入。
- 不设置主场景，不自动选择场景，不在 SH-03 未选择时显示业务图元。
- 当前完整实现是场景二「区域封控」；场景一、场景三为占位。

## 4. 时间轴约束

- 时间轴定义在 `js/timeline.js`。
- 修改某屏起点或时长时，必须同步检查：
  - 后续所有屏 `t`；
  - `chapters`；
  - `subs`；
  - `holds`；
  - `total`；
  - `index.html` 静态时长文字；
  - 按钮 `PLAYER.seek(...)` 目标。
- 不允许只改一屏时间而让后续界面错位。
- 重播时由 `js/main.js` 统一重置场景状态、AI历史和音频。

## 5. 地图约束

- 全片共享一个 MapLibre 实例，切屏只移动 canvas。
- 只有重播才允许 `MapViewReset()` 重建。
- 新屏不要自己 `new maplibregl.Map`。
- 图层 id 约定：
  - `setGeom(lid, ...)` 创建 source `lid` + layer `lid-l`；
  - `polygon(id, ...)` 创建 `id-f` / `id-l`；
  - 覆盖层使用 `cov-*` 前缀。
- 覆盖层数据可能是格对象 `{mx,my,ring}`，不是裸坐标环；绘制前必须取 `ring`。
- 修改图元显示时先核对数据结构，再怀疑渲染。

## 6. AI与语音约束

- SH-04/05/06 统一右侧 AI 决策助手。
- 消息只追加到底部，不清空、不重排历史。
- SH-06 进入时 AI 滚动条必须在底部。
- 47段TTS位于 `assets/audio/001.wav`～`047.wav`。
- 进入 SH-04/05/06 时预加载全部47段。
- 多段语音对应同一条气泡时，气泡只显示一次，音频严格顺序播放。
- 气泡应比对应语音提前0.5秒出现。
- 语音时间必须用 `ffprobe` 实测，不能按字数猜。
- SH-06：
  - 6～11按实际音频时长顺序播放；
  - 12～25按原飞行事件时间触发；
  - 不能把20条全部串成连续音频；
  - 不能删除 `AI_EVENTS`，否则 SH-06 构建报 `ReferenceError`；
  - 同一时间多条音频进入队列，顺序播放，不叠音。

## 7. 当前界面特殊约束

- SH-04/SH-05 的底部动作按钮：
  - right: 32px、bottom: 158px、width: 344px、height: 56px。
- SH-05 推荐方案为四列表格，宽度560px，居中；推荐理由和预期效果已删除。
- SH-06 倍速只保留1×/2×/4×，默认1×。
- SH-06 播放/暂停是同一位置单图标按钮，两个图标预加载，背景透明。
- SH-06 进入立即显示规划航路；点击开始后在 `FL.T_TRACKS` 前继续显示规划航路，之后切动态航迹。
- SH-03 选择前不得出现任务区、禁飞区、目标区、标签等业务图元。
