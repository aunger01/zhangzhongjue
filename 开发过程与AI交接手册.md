# 掌中诀 · 开发过程与 AI 交接手册

> **这份文档是给「下一个接手的人或 AI」看的作战地图**，不是给访客看的介绍。
> 目标：读完这一份，就能在没有原作者在场的情况下，安全地继续开发、改 bug、加功能、部署上线。
>
> 面向访客/使用者的说明请看同目录 [`README.md`](./README.md)；本文件专注**过程、决策、坑与纪律**。
>
> 最后更新：2026-10-28 · 对应版本 `v2.0.1`（已合入 GitHub main 并上线）

> **v2.0.1 变更摘要（接手前必读）**：新增**六宫传统起课法**（v2.0 主功能），并统一双算法版本号为 2.0.1。
> 六宫 = 大安/留连/速喜/赤口/小吉/空亡，落宫 `(start+count−1) mod 6`；起宫依**事由歌诀**
> （婚大安/财留连/病速喜/官赤口/行小吉，空亡不起课）或**占人**（女留连/男小吉）；
> **占人用神按底本第 8 页改四季五行**（正~三月春木/四~六夏火/七~九秋金/十~十二冬水，按生月自动推定，表单零新增项）。
> 一切六宫文案/测试只引唯一权威底本 `掌中诀网站开发/六宫小六壬_PDF原文转录.md`（仓库外），**不再反复识图**。
> 涉及模块：新增旁挂目录 `features/six/`（7 个文件）+ `tests/sixCalculate.test.ts`（40 项）；
> 九宫引擎（`calculate.ts` 等）**零改动**；`PalmDiagram/PalaceCell/FingerPointer` 改为可注入宫位集（默认九宫）；
> `DivinationMode` 与 `historyStorage` 增 `'six'`；`Navbar` 增玩法切换 ⇄；`GuideModal` 增 six-play/six-rules 变体。
> **v2.0.1 追加**：`Modal` 补齐无障碍——打开即聚焦、Tab/Shift+Tab 焦点陷阱、关闭后焦点归还触发元素（jsdom 测试锁死）。

> **v1.1.0 变更摘要（接手前必读）**：新增**文字起课**——用户自己写 1～3 个汉字，按简体规范笔顺的笔画起数；
> 超过三字一律拒绝、**程序不替用户截取**（取字即取象，属用户决定）。旧的「字符数 + Unicode 码点」取数法**已退役**。
> **九宫顺序、起宫规则、落宫公式自 v1.0.0 起一字未改**，故历史记录可跨版本对读。
> 涉及模块：新增 `features/text/strokeNumbering.ts`（取数入口）、`strokeTable.ts`（笔画表，生成物）、
> `scripts/gen-stroke-table.mjs`（生成脚本），`TextForm.tsx` 与 `GuideModal.tsx` 重写文案。

---

## 0. 三十秒速览

| 项目 | 内容 |
| --- | --- |
| 是什么 | 「小六壬」掌诀互动网站，**双玩法**：① 九宫连续起宫法——输入生辰或心念文字 → 换算三个数字 → 九宫推演 → 掌图掐指动画 → 结果解读；② 六宫传统起课法——事由/占人起宫 → 六宫推演 → 歌诀与用神喜忌 |
| 在哪 | 本仓库根目录（`git clone` 后的任意路径均可，不要写死成某个本地目录名） |
| 技术栈 | React 18 + TypeScript + Vite 5 + Vitest 2 + Playwright 1.64；**纯前端，零后端、零数据库、零付费 API** |
| 依赖 | 运行时只有 `react` / `react-dom` / `lunar-javascript` 三个 |
| 怎么跑 | `npm install` → `npm run dev`（5173）；`npm run test:serial`；`npm run build`；`npm run preview`（4173） |
| 验收基线（交付门禁） | `npm run typecheck` + 单测 **10 文件 / 210 项**全绿 + `npm run build` + `npm run build:offline`(+`build:single`) |
| E2E（可选） | Playwright 17 条用例 × 桌面/移动两项目 = 34 项，保留作回归用；**不作为交付门禁**（2026-10-20 桌面端实测 17/17） |
| 🔴 强制验收案例（九宫） | 农历五月二十日、丑时，起数 **5、20、2** → **小吉 / 空亡 / 病符**（真实算法，零硬编码） |
| 🔴 强制验收案例（六宫） | PDF 三黄金课例（三月初三卯时）：婚姻例 → **速喜/小吉/留连**；女例 → **赤口/空亡/速喜**；男例 → **大安/速喜/空亡**（逐字对齐底本） |

### 三条铁律（违反任何一条即为事故）

1. **动画层不得推算宫位。** 掐指的每一帧都必须取自算法层产出的 `pathIndices`。任何"根据当前位置自己 +1"的写法都是错的。（六宫同理：帧取自六宫引擎输出）
2. **演算开始后结果对象冻结。** 暂停/继续/上一步/下一步/跳过/改速度一律不得重新计算。单测有断言锁死这一点。
3. **需求文档没写清楚的传统规则，做成配置项并加注释，不许自己杜撰。** 见第 6 节。六宫文案一律引底本转录稿，不臆造。
4. **六宫与九宫彻底旁挂。** 六宫全部住在 `features/six/`，禁止让六宫代码 import 九宫引擎、或反过来改九宫引擎迁就六宫；共享组件（掌图/宫格/指示器）只允许"可注入宫位集"这种参数化复用。

---

## 1. 需求来源与硬约束

**原始需求**：上级目录 `九宫小六壬掌中诀网站 · 详细需求文档V1.0.0.1.docx`（另有同名 `.pdf`，共 486 段）。
动手前**必须完整通读**——本文档只提炼关键约束，细节以原文档为准。

### 1.1 从文档中提取的硬约束清单（逐条都有出处）

| # | 约束 | 要点 |
| --- | --- | --- |
| 1 | **九宫，不是六宫** | 病符 / 桃花 / 天德是**正式宫位**，不是附加神煞；顺序 `大安→留连→速喜→赤口→小吉→空亡→病符→桃花→天德` |
| 2 | 算法公式 | `resultIndex = (startIndex + count − 1) % 9`；**起宫本身计作第 1 位** |
| 3 | 连续起宫 | 月起大安(0)；月落宫→日起宫；日落宫→时起宫 |
| 4 | 必须返回完整路径 | `pathIndices` 长度 **=== `inputNumber`**，首项 = 起宫，末项 = 落宫 |
| 5 | 动画不得自行推算宫位 | 见铁律 1 |
| 6 | 按钮必须真实有效 | 暂停 / 继续 / 上一步 / 下一步 / 跳过 / 重新演算，一个都不能是摆设 |
| 7 | 文字取数要公开规则 | v1.1.0 起为**笔画起课**：1～3 字，笔画按 `((n − 1) mod 9) + 1` 归约到 1～9（单字档末位时辰 1～12 不归约），规则在「规则说明」中展示 |
| 8 | 公历农历必须真实换算 | 用 `lunar-javascript`，不许硬编码偏移、不许猜 |
| 9 | 释义数据独立于 JSX | 释义文案不得写在组件里 |
| 10 | 支持 `prefers-reduced-motion` | 减少动效下仍能走完全流程 |
| 11 | 触控区域 ≥ 44px | 移动端可用性 |
| 12 | 移动端无横向滚动 | 窄屏不出现滚动条、不重叠 |
| 13 | 本地运行 | 不依赖后端 / 数据库 / 付费 AI API |

### 1.2 交付要求（原话）

> 「请直接创建完整项目文件，不要只提供代码片段或设计稿。完成后运行测试和生产构建，修复错误，并提供完整源码、README、本地启动命令和部署说明。」

⇒ 交付物 = **可运行的完整工程**，而非代码片段。所以：凡涉及"给个例子"的请求，都应落到真实文件并跑通。

---

## 2. 开发顺序：为什么必须按这个顺序

需求方指定了四阶段顺序，**这个顺序不是偏好，而是工程上的正确解**：

```
① 九宫算法 + 单元测试
      ↓  （算法是唯一的真理来源，先把它钉死）
② 日期转换 + 文字取数（笔画表）
      ↓  （把用户输入变成算法需要的三个数字）
③ SVG 掌位图 + 真实掐指动画
      ↓  （让算法路径可视化，动画只能消费①的输出）
④ 结果解读 + 视觉特效 + 响应式
         （最后才是"好看"，且解读只解释①的结果）
```

**如果顺序颠倒会怎样**（都是真实的返工原因）：

- 先做动画再定算法 → 动画里会偷偷算宫位，最后无法验证"落点是否等于算法结果"。
- 先做解读再做算法 → 解读文案会绑死具体宫名组合，算法一改就全废。
- 先做 UI 再做类型 → `PalaceStep` 契约后补，所有组件都要改。

**实践证据**：本次先写 `calculate.ts` + `calculate.test.ts`（36 项），强制验收案例在**没有任何 UI 的情况下就已经被证明是对的**。后面 UI 出问题时，能立刻判断"是显示错了还是算错了"。

---

## 3. 架构：数据如何流动

### 3.1 单向数据流（严格分层）

```
用户输入
  │
  ├─ 生辰：BirthForm ──► lunarConverter.solarToLunar/lunarToSolar ──► {月, 日, 时辰数字}
  └─ 文字：TextForm  ──► strokeNumbering.analyzeText ──────────────► {笔画, 笔画, 笔画|时辰}
                              │
                              ▼
                    createDivinationResult()       ★ 纯函数，唯一算法入口
                              │
                              ▼
                    DivinationResult（含 3 个 PalaceStep，每个带完整 pathIndices）
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
    useDivinationMachine   buildPath      composeInterpretation
      （状态机：只管   （只管时间节奏，  （只管解释，不改宫位）
       播放到第几帧）    不改落点）
              │
              ▼
      PalmDiagram / FingerPointer / ResultPage ...
```

### 3.2 三层解耦（本项目的核心设计）

| 层 | 文件 | 只允许做什么 | 明确禁止 |
| --- | --- | --- | --- |
| **算法层** | `calculate.ts` / `palaceConstants.ts` | 产出 `pathIndices` 与 `resultIndex` | 引用任何 DOM / 视图 / 动画 |
| **节奏层** | `buildPath.ts` | 把路径摊平成帧序列；给出每帧间隔毫秒 | 修改宫位、增删路径元素 |
| **视觉层** | `palmLayout.ts` / 各组件 | 把宫位索引映射成 SVG 坐标；渲染 | 自己数指节、自己推下一个宫 |

**验证解耦的手段**（单测已覆盖）：改动 `BASE_MOVE_MS`、改动 `PALM_VIEWBOX` 坐标、调整 `speed`——结果必须**逐字节相同**。

---

## 4. 文件地图（含关键 API）

### 4.1 数据与算法

| 文件 | 关键导出 | 说明 |
| --- | --- | --- |
| `features/divination/types.ts` | `PalaceStep` / `DivinationResult` / `DivinationInput` / `StepName` / `TextNumberingDetail` / `CalendarInfo` / `STEP_LABELS` / `STEP_TITLES` | **算法契约**。改这里等于改所有层的接口，最慎重 |
| `features/divination/palaceConstants.ts` | `PALACES` / `PALACE_COUNT`(9) / `ORIGIN_INDEX`(0) / `PALACE_META` / `getPalaceMeta` / `getPalaceMetaByName` / `PALACE_INDEX_BY_ID` / `PALACE_CYCLE_TEXT` / `ALGORITHM_ID` / `ALGORITHM_VERSION` | 九宫对照表（含 finger/segment/omen/element/direction）+ 算法版本 |
| `features/divination/calculate.ts` | `calculatePalace` / `buildPathIndices` / `buildStep` / `calculateThreeSteps` / `createDivinationResult` / `getStep` / `summarizeSteps` / `STEP_ORDER` | **核心纯函数**，可脱离浏览器测试 |
| `features/divination/buildPath.ts` | `moveIntervalMs` / `landingDwellMs` / `stepIntervalsMs` / `stepDurationMs` / `playbackPlan` / `flattenFrames` / `BASE_MOVE_MS`(340) / `LANDING_DWELL_MS`(820) | 时间节奏 + 帧摊平 |
| `features/divination/palmLayout.ts` | `PALM_VIEWBOX` / `CELL_LAYOUT` / `cellFor(index)` / `FINGERS` / `SEGMENT_ORDER` / `fingerPath` / `knuckleLines` / `FINGER_BOTTOM`(306) / `FingerLayoutId` | **纯视觉坐标**，按算法索引寻址 |
| `features/divination/useDivinationMachine.ts` | `useDivinationMachine` / `machineReducer` / `INITIAL_MACHINE_STATE` / `MachinePhase` / `__machineReducer` | 状态机 + 三个驱动它的 `useEffect` |

**六宫（v2.0 旁挂，`features/six/`，与九宫引擎零交叉）**：

| 文件 | 关键导出 | 说明 |
| --- | --- | --- |
| `six/sixConstants.ts` | `SIX_PALACES` / `SIX_PALACE_META` / `getSixPalaceMeta` / `sixPalaceIndexOf` / `SIX_TOPICS` / `getSixTopic` / `SIX_TOPIC_VERSES` / `SIX_SEASONS` / `getSixSeasonByMonth` / `SIX_PERSON_ORIGIN` / `SIX_STEP_SUBJECT` / `SIX_ALGORITHM_ID` / `SIX_ALGORITHM_VERSION`(2.0.1) | 六宫对照表 + 事由/占人起宫表 + 断课歌诀 30 句 + 四季用神表 + 版本 |
| `six/sixCalculate.ts` | `sixCalculatePalace` / `createSixResult` 等 | **六宫核心纯函数**，`(start+count−1) mod 6`；归约 `((n−1) mod 12)+1`；输出含 pathIndices 同构字段 |
| `six/sixLayout.ts` | 六宫掌图坐标 | 纯视觉，与计算解耦 |
| `six/sixMeanings.ts` | `buildSixInterpretation` / `sixNumberNote` / `buildYongshenNotes` / `buildSeasonYongshen` / 六宫免责 | 断词/歌诀/取象/用神喜忌/数字释义组装；**数字奇偶判定一律取模，禁白名单**（见 A5） |
| `six/SixForm.tsx` / `SixSessionView.tsx` / `SixResultPage.tsx` + 同名 css | — | 六宫三视图；表单零冗文案（圣上钦定 UX 六条，勿回退） |

### 4.2 输入转换

| 文件 | 关键导出 | 说明 |
| --- | --- | --- |
| `features/birth/calendarRange.ts` | `SUPPORTED_SOLAR_MIN/MAX` / `SUPPORTED_LUNAR_YEAR_MIN/MAX` / `daysInSolarMonth` / `isValidSolarDate` / `isWithinSupportedSolarRange` / `solarYearOptions` / `lunarYearOptions` | **故意不依赖历法库**，让首页无需加载 301KB 的大包 |
| `features/birth/lunarConverter.ts` | `solarToLunar` / `lunarToSolar` / `getLeapMonth` / `hasLeapMonth` / `leapMonthOptions` / `lunarMonthDayCount` / `isValidLunarDate` / `lunarMonthText` / `lunarDayText` / `formatLunarDisplay` / `LunarConversionError` / `DEFAULT_SOLAR` / `DEFAULT_LUNAR` | 真实换算；错误码 `OUT_OF_RANGE` / `INVALID_SOLAR_DATE` / `INVALID_LUNAR_DATE` / `NO_SUCH_LEAP_MONTH` / `LIBRARY_ERROR` |
| `features/birth/timeMapping.ts` | `SHICHEN`(12) / `shichenByNumber` / `shichenNumberFromHour` / `shichenNumberFromDate` / `describeShichen` / `shichenOptionLabel` | 时辰数字 1-12 |
| `features/text/strokeNumbering.ts` | `analyzeText` / `STROKE_CHAR_COUNT`(3) / `normalizeStroke` / `STROKE_SOURCE_LABELS` / `formatNumbers` / `currentShichenNumber` / `StrokeNumberingDetail` | **当前文字起数入口**：1～3 字 → 笔画 → 三数；超过 3 字返回 `ok:false` 且**不截断**；笔画按 `((n−1) mod 9)+1` 归约；单字档末位为时辰 1～12（不归约） |
| `features/text/strokeTable.ts` | `getStroke` / `STROKE_TABLE_SIZE`(6732) / `STROKE_TABLE_RANGE` | 内置笔画表（生成物，**勿手改**）：GB2312 一二级 6768 字命中 6732 字，笔画 1～30；未收录字直接拒绝 |
| `features/text/textNumbering.ts` | `extractHanCharacters` / `isHanCodePoint` / `normalizeNFC` / `countHanCharacters` / `validateTextInput` / `TEXT_HARD_MAX`(200) / `textToNumbers`（**已退役**） | 汉字提取与字数校验工具仍被复用；`textToNumbers` 的码点取数法自 v1.1.0 起不再被表单调用 |

### 4.3 解读、分享、存储、音效

| 文件 | 关键导出 | 说明 |
| --- | --- | --- |
| `features/interpretation/palaceMeanings.ts` | `getPalaceMeaning` / `INTERPRETATION_DISCLAIMER` / `PRIVACY_NOTICE` | 九宫文案：`summary/asMonth/asDay/asHour/keywords/career/relationship/wealth/health/advice/cautions` |
| `features/interpretation/composeResult.ts` | `composeInterpretation` / `PRIMARY_RULES` / `MODIFIER_RULES` | **主规则 + 修正句**叠加式组合解读 |
| `features/history/historyStorage.ts` | 历史读写 API / `HISTORY_LIMIT`(30) / `HISTORY_KEY` | localStorage；文字模式**只存字数不存原文** |
| `features/share/shareCard.ts` | `renderShareCard` / `downloadBlob` / `copyText` | Canvas **两趟布局**（先离屏量高，再按实高建画布）→ 内容多长画多长，**不截断**；`copyText` 带 `execCommand` 降级 |
| `features/audio/soundEngine.ts` | `soundEngine`（单例）/ tones `click` / `land` / `complete` | WebAudio 实时合成，**零音频文件**；默认开启，但 AudioContext 在首次用户手势后才创建 |
| `hooks/usePrefersReducedMotion.ts` | — | 系统媒体查询 + 用户手动开关**双通道** |

### 4.4 视图

| 文件 | 职责 |
| --- | --- |
| `App.tsx` | 视图编排 `View = 'home' \| 'birth' \| 'text' \| 'session' \| 'result'`（**无预览页**：提交即入演算）；懒加载 `BirthForm`；`FINAL_RESULT` 时记历史 + 播完成音；`buildInputSummary()`（文字模式**不暴露原文**） |
| `components/PalmDiagram.tsx` | SVG 掌位图主视觉，`variant: 'hero' \| 'session'` |
| `components/PalaceCell.tsx` | 单个指节宫位；`data-testid` / `data-palace` / `data-state`；起/落文字标记 |
| `components/FingerPointer.tsx` | 掐指指示器，`translate` 到 `cellFor(index)` |
| `components/SessionView.tsx` | 演算界面：掌图 + 控制浮层（移动端悬浮掌心、桌面端落右栏，同一份 DOM 靠 CSS 切换） |
| `components/ResultCard.tsx` / `ResultPage.tsx` / `HomeView.tsx` | 结果卡片 / 结果页（含固定底部操作条） / 首页 |
| `components/Navbar.tsx` / `GuideModal.tsx` / `HistoryDrawer.tsx` / `Modal.tsx` / `Motes.tsx` / `SoundToggle.tsx` | 导航（音效 + 「更多」下拉菜单） / 玩法与规则说明 / 历史抽屉 / 弹层 / 粒子 / 音效开关 |

### 4.5 配置与测试

| 文件 | 说明 |
| --- | --- |
| `README.md` | 面向**使用者**：快速开始、算法说明、部署、FAQ |
| `开发过程与AI交接手册.md` | 面向**接手者**：就是本文档 |
| `vite.config.ts` | `base: './'`；`test.environment: 'jsdom'`；`setupFiles`；`include` 收集 `*.test.ts(x)`、`exclude` 排除 `*.spec.ts` |
| `vite.offline.config.ts` | 离线单文件构建（IIFE + 内联 + 剥离模块标记 + 补 `defer`） |
| `playwright.config.ts` | 两项目：`chromium-desktop`(1280×900) / `chromium-mobile`(Pixel 5)；`channel: 'chromium'`；`webServer` 绑 `127.0.0.1:4173` |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | 后者含 `"types": ["node"]`，已纳入 `vite.offline.config.ts` |
| `src/types/lunar-javascript.d.ts` | **手写的第三方类型声明**（该库不带 `.d.ts`），改动历法调用前先看这里 |
| `src/tests/setup.ts` | `globalThis.IS_REACT_ACT_ENVIRONMENT = true` |

---

## 5. 核心算法与不变量（改动前必读）

### 5.1 九宫对照表（**唯一真理**，改动会连锁）

| 序号 | 宫位 | 手指 | 指节 | 索引 | 吉凶基调 |
| --- | --- | --- | --- | --- | --- |
| 1 | 大安 | 食指 | 中节 | 0 | 吉 |
| 2 | 留连 | 食指 | 远节 | 1 | 滞 |
| 3 | 速喜 | 中指 | 远节 | 2 | 吉 |
| 4 | 赤口 | 无名指 | 中节 | 3 | 滞 |
| 5 | 小吉 | 中指 | 近节 | 4 | 吉 |
| 6 | 空亡 | 中指 | 中节 | 5 | 滞 |
| 7 | 病符 | 无名指 | 远节 | 6 | 滞 |
| 8 | 桃花 | 食指 | 近节 | 7 | 中 |
| 9 | 天德 | 无名指 | 近节 | 8 | 吉 |

> 指节朝向约定：**远节最靠指尖，近节最靠手掌**。`SEGMENT_ORDER = ['distal','middle','proximal']`。

### 5.2 必须恒成立的不变量（已有测试守护）

```
① calculatePalace(s, n) === (s + n - 1) % 9
② buildPathIndices(s, n).length === n
③ pathIndices[0] === startIndex
④ pathIndices[n-1] === resultIndex
⑤ monthStep.startIndex === 0（大安）
⑥ dayStep.startIndex === monthStep.resultIndex
⑦ hourStep.startIndex === dayStep.resultIndex
⑧ 相同 (month, day, hour) 永远得到相同结果
⑨ 宫位序列循环：天德(8) 之后回到 大安(0)
⑩ 任何操作序列（暂停/继续/上一步/下一步/跳过/改速）都不替换 state.result 对象
```

**六宫不变量**（`sixCalculate.test.ts` 守护）：

```
① sixCalculatePalace(s, n) === (s + n - 1) % 6
② 事由起宫：婚大安(0)/财留连(1)/病速喜(2)/官赤口(3)/行小吉(4)；空亡不起课
③ 占人起宫：女留连(1)、男小吉(4)
④ 自报三数归约 ((n−1) mod 12)+1：落宫不变（12 是 6 的倍数，1~99 全量验证），奇偶不变
⑤ 数字释义奇偶判定 = value % 2 === 1（取模，禁白名单——见 A5）
⑥ 用神：事由按宫位、通用按日宫、占人按四季五行（getSixSeasonByMonth，1~12 越界抛错）
⑦ PDF 三黄金课例逐字吻合（三月初三卯时：婚例速喜/小吉/留连、女例赤口/空亡/速喜、男例大安/速喜/空亡）
```

### 5.3 状态机

```
IDLE ──LOAD──► PREVIEW ──BEGIN──► READY ──START──► ANIMATING ⇄ PAUSED
                                                     │
                                          TICK 到末位 └──► STEP_COMPLETE
                                                              │ autoContinue
                                                              ├─ NEXT_STEP ──► ANIMATING（下一步）
                                                              └─ 末步 FINISH ──► FINAL_RESULT
SKIP_ALL ─────────────────────────────────────────────────────► FINAL_RESULT
RESTART ──► READY（仍用同一个冻结的结果）
```

**关键实现细节（`TICK`）**：到达路径末位即为落宫——**当帧就切 `STEP_COMPLETE` 并 `landingSeq++`**，不要再等一次 TICK。否则会出现"多走一帧才落宫"的 bug（见第 7 节 A1）。

**快照字段**：`cursor` 是**该步路径内的位置**（0 起，0 即起宫 = 第 1 位），`stepIndex` 是步骤（0/1/2），两者别混。

---

## 6. 需求文档未定义处的处理原则

需求文档写得很细，但**传统规则本身**仍有若干处有多种流派说法（例如真太阳时、早晚子时、节气换月）。处理原则：

> **不杜撰。做成配置项 + 写清注释 + 在 README 第 7 节列表登记。**

已配置化的 14 项：

| # | 配置 | 位置 |
| --- | --- | --- |
| 1 | 九宫名称/序号/索引/指节 | `divination/palaceConstants.ts` |
| 2 | 算法标识与版本 | `palaceConstants.ts` `ALGORITHM_ID / ALGORITHM_VERSION` |
| 3 | 掌位图坐标 | `divination/palmLayout.ts` |
| 4 | 动画节奏 | `divination/buildPath.ts` |
| 5 | 时辰数字映射 | `birth/timeMapping.ts` |
| 6 | 历法支持范围 | `birth/calendarRange.ts` |
| 7 | 文字起课字数上限与笔画口径 | `text/strokeNumbering.ts` `STROKE_CHAR_COUNT`(3) / `text/strokeTable.ts`（换口径须重跑 `scripts/gen-stroke-table.mjs`） |
| 8 | 九宫释义文案 | `interpretation/palaceMeanings.ts` |
| 9 | 组合解读规则 | `interpretation/composeResult.ts` |
| 10 | 音效参数 | `audio/soundEngine.ts` |
| 11 | 历史记录上限与键名 | `history/historyStorage.ts` |
| 12 | 六宫元数据/断词/起宫表/算法版本 | `six/sixConstants.ts`（`SIX_ALGORITHM_VERSION` 与九宫同为 2.0.1） |
| 13 | 六宫断课歌诀 30 句 | `six/sixConstants.ts` `SIX_TOPIC_VERSES`——**改动必须有底本依据**，测试逐句锁死 |
| 14 | 六宫四季用神表 | `six/sixConstants.ts` `SIX_SEASONS` / `getSixSeasonByMonth`（正~三月春木/四~六夏火/七~九秋金/十~十二冬水） |

**明确未实现、也明确没有杜撰**的扩展：真太阳时与出生地时区校正、早晚子时细分、节气精确换月、更多流派的释义校订。这些都应当作**独立可选扩展**排期，不要悄悄塞进主流程。

---

## 7. 踩坑全记录

> 每一条都是**实际发生过并已修复**的。格式统一为：现象 → 根因 → 解法 → 怎么验证。

### A 类｜会算错的坑（最优先防范）

#### A1. 状态机"多走一帧才落宫"

- **现象**：单测《动画推进过程中经过的宫位与算法路径逐项一致》失败——到达路径末位后，需要再 TICK 一次才进入 `STEP_COMPLETE`，导致多出一帧。
- **根因**：`TICK` 里把 `cursor < last` 与 `cursor === last` 分成两段，第二段才置 `STEP_COMPLETE`，等于末位被"访问"了两次。
- **解法**：`TICK` 内 **入末位即落宫**——`nextCursor >= last` 时同帧返回 `phase: 'STEP_COMPLETE'` 且 `landingSeq + 1`。
- **验证**：单测断言逐帧序列与 `pathIndices` 完全一致；E2E 断言"逐步动画的落点"与"跳过动画的结果"相同。

#### A2. `summarizeSteps` 返回的是索引不是宫名

- **现象**：总览文本显示 `4、5、6` 而不是 `小吉、空亡、病符`。
- **根因**：写成了 `String(s.resultIndex)`。
- **解法**：`result.steps.map((s) => PALACES[s.resultIndex]).join('、')`。
- **教训**：**索引与宫名混用**是本项目最容易犯的错。命名上一律用 `xxxIndex` 表示数字、`xxxName` 表示中文，见到没有后缀的变量先确认。

#### A3. 组合解读被一条前置规则整个覆盖

- **现象**：单测期望"时宫天德"的解读里出现「贵人」，实际没有。
- **根因**：早期实现是「**取第一条命中的规则**」，而「日宫空亡」的规则排在「时位天德」之前，把后者挤掉了。
- **解法**：改为 **主规则 + 修正句叠加**：
  ```ts
  function buildCombination(params) {
    const primary  = PRIMARY_RULES.find(r => r.test(params));   // 收束格局
    const modifier = MODIFIER_RULES.find(r => r.test(params));  // 跨步修正
    return [primary?.text ?? fallback, modifier?.text ?? ''].filter(Boolean).join('');
  }
  ```
- **收益**：信息更完整（既有"收在天德"又有"日宫空亡"），且消除"加一条规则就把旧文案挤掉"的隐蔽耦合。
- **教训**：规则表**从上往下取第一条**这种设计，加规则时有静默副作用。要加规则前先想清楚"它会不会遮住别人"。

#### A4. 测试期望本身写错（历法展示文本）

- **现象**：`lunarConverter.test.ts` 期望 `'农历正月初一'`，实际 `'农历正月初一日'`。
- **根因**：本项目展示格式统一为「…日」（与验收案例「五月二十日」一致），是**测试写错了**而非代码错。
- **解法**：改期望，并在测试里注明格式约定。
- **教训**：测试挂了先判断"是代码错还是期望错"，不要条件反射改代码。

#### A5. 白名单判奇偶，>10 的数全误判（六宫数字释义）🔴

- **现象**：圣上实测自报三数 18/15/27，释义全部判「双数为阴」。
- **根因**：`sixNumberNote` 用奇数白名单 `[1,3,5,7,9].includes(value)` 判单数——底本「单阳双阴」只定义在 1~10，
  开发时照抄成白名单，>10 的奇数（15、27）不在表内被误判双。
- **解法**：改 `value % 2 === 1`；归约 `((n−1) mod 12)+1` 的模为偶数，raw 与归约值奇偶恒一致，数学自洽。
- **验证**：补测试 15/27/21 判阳、18/12 判阴、1~10 边界全过。
- **教训**：**白名单判奇偶（或判任何数值属性）是反模式，凡数值判定一律用取模/谓词，除非集合真的有限。**

### B 类｜会跑不起来的坑（浏览器与构建）

#### B1. Playwright 报 `chrome-headless-shell.exe` 不存在

- **现象**：E2E 启动即失败，提示找不到 headless shell。
- **根因**：本机只下载了完整版 `chromium-1248`，没下 `chromium_headless_shell`；而 Playwright 默认可能去用后者。
- **解法**：`playwright.config.ts` 的 `use` 中加 **`channel: 'chromium'`**，强制使用完整版内核。
- **验证**：`npx playwright test` 能正常跑完 34 项。

#### B2. `webServer` 等 120 秒后超时

- **现象**：Playwright 报 webServer 超时，但手动开浏览器访问 `localhost:4173` 是好的。
- **根因**：`vite preview` 默认绑 **localhost → 解析成 IPv6 `::1`**；Playwright 探测的是 **`127.0.0.1`（IPv4）**，两边对不上。
- **解法**：命令显式指定 host，且探测 URL 用同一个字面量 IP：
  ```ts
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  }
  ```

#### B3. `file://` 双击打不开（ES 模块被 CORS 拦）

- **现象**：双击 `dist/index.html` → 白屏，控制台报
  `Access to script at 'file:///...' from origin 'null' has been blocked by CORS policy`。
- **根因**：常规 `dist/` 是 **ES 模块**产物（`type="module"`）。浏览器在 `file://` 下把 `origin` 视为 `null`，模块脚本一律被拒。
  **这是所有现代构建工具产物的通病，不是本项目缺陷。**
- **解法**：`npm run build:offline`（见 B4）。
- **验证**：`npm run preview` 下必须正常；`dist-offline/` 在 `file://` 下必须正常。

#### B4. 离线包做出来仍然打不开（经典脚本缺 `defer`）

- **现象**：把 `type="module"` 剥掉后，`file://` 下报 **「缺少 #root 容器，无法挂载应用」**。
- **根因**：剥掉 `type="module"` 后脚本变成**经典脚本**，默认**同步执行**，会早于 `<body>` 解析 → `#root` 还不存在。
  （模块脚本天然是 `defer` 行为，所以之前在 `type="module"` 下不成问题。）
- **解法**：`vite.offline.config.ts` 的 `closeBundle` 里同时补 `defer`：
  ```ts
  .replace(/\s+type="module"/g, '')
  .replace(/\s+crossorigin/g, '')
  .replace(/<script (?![^>]*\bdefer\b)/g, '<script defer ')
  ```
- **验证**：`file://` 下完整跑通强制验收案例，控制台零错误。
- **教训**：这个报错是**项目自己的守卫**抛出的（`main.tsx` 里判 `#root` 是否存在），能一眼定位到"脚本执行时机"问题——**好的错误信息能救命**。

#### B5. jsdom 报 `act(...)` 未配置警告

- **现象**：应用级测试（`app.flow.test.tsx`）刷一堆 `Warning: The current testing environment is not configured to support act(...)`。
- **解法**：新增 `src/tests/setup.ts` 设 `globalThis.IS_REACT_ACT_ENVIRONMENT = true`，在 `vite.config.ts` 里 `setupFiles` 引用；测试内 `import { act } from 'react'`（**不要**再用 `react-dom/test-utils`）。

### C 类｜环境/工具链（★最危险：会被误判成"测试通过"）

#### C1. vitest 随机丢测试文件，退出码却是 0 🔴

- **现象**：`npm test` **每次跑出来的文件数都不一样**（163 → 105 → 98），但**已跑的都绿、exit code 仍未 0**。
- **根因**：本机沙箱的文件系统代理垫片（`node-brokered-fs-shim.cjs`）改写了 `os.tmpdir()`。Vitest 会把转译后的模块写入 `join(tmpdir(), 'vitest-xxx')/<hash>`，这个写入被 **EPERM** 拒绝 → 承载该文件的 **worker 线程静默退出** → 那个文件根本没被收集。
- **为什么危险**：**看起来像"测试全过"**。如果 CI 只看 exit code，会放过这个假阳性。
- **解法**：关闭文件级并行 → 不再写那个临时目录：
  ```bash
  npm run test:serial        # = vitest run --no-file-parallelism
  ```
- **验证**：`npm run test:serial` 恒定 **10 文件 / 209 项 / 0 error / exit 0**。
- **纪律**：**每次报告"测试全绿"前，先核对文件数与用例数**。正常基线就是 **10 / 210**（v2.0.1 起；v2.0 初版 10 / 209，v1.1.0 时为 9 / 163），数字偏小 = 中招。

#### C2. Windows 上 `TMPDIR` 无效

- **现象**：按老经验 `TMPDIR="$PWD/.tmp" npm test` 完全没效果，错误路径仍是 `AppData\Local\Temp`。
- **根因**：`TMPDIR` 是 Unix 约定；Node 在 Windows 上读的是 **`TEMP` / `TMP`**。
- **解法**：Windows 用 `TEMP="$PWD/.tmp" TMP="$PWD/.tmp" npm test`；或直接用 `test:serial`。

#### C3. 本机 Bash 沙箱缺常用命令

- **现象**：`dirname` / `grep` / `tail` 等在某些调用里不可用，管道写法直接失败。
- **解法**：改用 **Python 脚本**（`C:/Users/v-bingzhupei/.workbuddy/binaries/python/versions/3.13.12/python.exe`）或直接读写文件替代。本项目里凡是"扫描/统计"类操作，优先脚本化落盘再读。

### D 类｜第三方库特性（`lunar-javascript`）

#### D1. 该库不带 `.d.ts`

- **解法**：手写 `src/types/lunar-javascript.d.ts`。**调用任何新 API 前先在这里补声明**，否则 TS 直接报错。

#### D2. `Solar.fromYmd` 不校验日期

- **现象**：`Solar.fromYmd(2025, 2, 30)` **静默通过**，不抛错。
- **解法**：自己实现 `isValidSolarDate()`（含闰年 2 月 29 日判断），在调库之前先校验。
- **教训**：**不要假设第三方库会帮你校验**。边界一定自己兜。

#### D3. 闰月用「负月份」表示

- `Lunar.fromYmd(year, ±month, day)`：**负数表示闰月**（`signedLunarMonth()` 封装了这个约定）。
- 反向读的时候：`instance.getMonth() < 0` 即闰月，`Math.abs()` 才是月份数。

#### D4. 可以用「抛错」来判定大小月

- `Lunar.fromYmd` 对不存在的日期会抛 `only 29 days in lunar year X month Y`。
- **巧妙用法**：`lunarMonthDayCount()` 先试第 30 日，**失败即 29 日**——不去硬编码任何年份表。

#### D5. 库的支持边界不完全可靠

- 实测 1899 年也能算，但不能确定正确性。
- **解法**：保守限制为公历 **1900-01-31 ～ 2100-12-31**、农历年 **1900–2100**，越界**明确报错**而不是返回猜测值。

### E 类｜UI 细节

#### E1. 起数预览页时辰重复拼接（该页已于 v1.0 移除）

- **现象**：预览显示「农历五月二十日，丑时，**丑时**；起数 5、20、2」——时辰出现两次。
- **根因**：`inputSummary` 本身已含时辰，`PreviewView` 又拼了一次。
- **解法**：改用 `{inputSummary}；起数 {numbers.join('、')}`。
- **后续**：v1.0 定稿时整页删除（提交表单直接进演算），坑随页面消失；**但同类风险仍在**——
  任何"摘要 + 明细"拼接处都要先确认摘要里已经包含哪些字段。
- **发现途径**：**jsdom 应用级测试**（`app.flow.test.tsx`）在浏览器内核尚未就绪时就抓到了——所以应用级测试值得写。

#### E4. 组件样式被 `.container` 简写整块清零（★最隐蔽）

- **现象**：`.app__form-view`、`.result`、`.session` 明明写了 `padding-top`，页面上面板却紧贴顶栏，
  间距像"设了不生效"；`.result` 底部给固定操作条预留的 120px 避让也一起失效。
- **根因**：`globals.css` 的 `.container { padding: 0 clamp(...) }` 是**简写**，把上下 padding 显式写成 0；
  而 `globals.css` 的加载顺序晚于组件 CSS，同元素上单类的上下内边距被整体覆盖。
- **解法**：选择器升权重 `.container.app__form-view` / `.container.result` / `.container.session`（0,2,0 > 0,1,0），
  不再依赖打包顺序。
- **教训**：**用简写 `padding: 0 X` 定义在通用容器类上，等于给所有复用它的模块埋雷**。
  要么只写 `padding-left/right`，要么让引用方提权。

#### E5. 移动端一屏被撑破时，别急着缩小手掌

- **现象**：加了顶部留白后移动端出现滚动条。
- **根因**：掌图按宽度撑满，手机竖屏下"标题 + 掌图 + 页脚"超过一屏。
- **解法（首页）**：`.home__palm` 做几何基准层 + `max-height + overflow:hidden` 开「裁切窗」，
  掌图**不缩放**、只裁掉掌底，裁切口用 18px mask 渐隐。
- **解法（演算页）**：舞台宽度按视口反算 `min(100%, calc((100dvh − 320px) * 0.65625))`（420/640 = 0.65625 为掌图宽高比），
  桌面端另加 `max-width: min(430px, calc((100dvh − 230px) * 0.65625))`。
- **教训**：一屏预算是"高度方程"，任何新增间距都要同步调常数，且**必须逐机型实测**（390×844 / 393×852 / 360×780 / 1440×900 / 1280×800）。

#### E6. Canvas 分享图固定高度 → 内容被截断

- **现象**：分享长图只有一半，解读文字在第七行被切掉。
- **根因**：画布高度写死（1040），绘制时 `slice(0, 7)` 限行"防溢出"。
- **解法**：**两趟布局**——先在 8×8 离屏画布上只 `measureText` 累加实高，再按实高建画布正式绘制；
  量算与绘制共用同一套字体/行高常量，保证一致。
- **附带**：标题「掌中诀」的字号由副标题实测宽度**反解**（含字距 0.42em），两趟用同一公式，实现精确等宽居中。

#### E7. 内联单文件的 `<script defer>` 会被浏览器忽略

- 详见 B4；补充一条：若把脚本内联进 `<head>`，`defer` 无外部脚本可延迟，脚本立即同步执行，
  此时 `#root` 尚未解析 → 挂载失败（白屏）。`scripts/build-single-file.mjs` 已强制把脚本插到 `</body>` 前。

#### E8. jsdom 不实现 Tab 原生走焦，焦点测试必须走键盘事件路径

- **现象**：给 `Modal` 补焦点陷阱时，断言「对话框上按 Tab 后焦点进入第一个可聚焦元素」失败——`activeElement` 纹丝不动。
- **根因**：jsdom **不实现浏览器原生的 Tab 键盘导航**；我们的事件处理里「焦点已在弹层内且不在首/尾」时走 `default`（交给浏览器原生顺序），在 jsdom 里就是什么都不发生。
- **解法**：焦点测试只断言**确定性路径**——先用 `focus()` 把焦点放到目标元素，再用 `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))` 验证循环行为；原生走焦留给 Playwright E2E。
- **教训**：**依赖浏览器默认行为的交互，jsdom 测不了结果、只能测「我们自己的处理分支」**。

#### E2. E2E 断言早于懒加载渲染

- **现象**：E2E《超出支持范围的公历年份》失败，选项数为 0。
- **根因**：`allTextContents()` 在 `lazy()` 模块渲染之前就执行了。
- **解法**：先 `await expect(page.getByTestId('solar-year')).toBeVisible()`，再断言 `options.length === 201`。

#### E3. `palmLayout` 的 `pinky` 类型不匹配

- **现象**：`TS2322: "pinky" is not assignable to type 'FingerId'`。
- **根因**：布局里有一只**装饰用小指**，但它不是任何宫位所在的指头，不属于算法层的 `FingerId`。
- **解法**：新增 `export type FingerLayoutId = FingerId | 'pinky'`，视觉层用后者，算法层仍用前者——**再次体现分层**。

---

## 7.5 流程与协作坑（G 类）

#### G1. 推送特性分支 ≠ 上线 🔴

- **现象**：把 `feat/six-palace` 推上 GitHub 后汇报完成，圣上质询「怎么没上线」——站点部署跟随 `main`，分支推得再多线上也不动。
- **根因**：把「推送成功」当成了终点，没做「合入 main + 确认 CF 重建」这最后一口气。
- **解法/纪律**：**圣上说「推送」= 要上线 = 必须进 main**。合并动作一次做完：`git push origin feat/xxx:main`（快进）→ `git ls-remote` 核对头指针 → 等 CF 重建 1~3 分钟。
- **教训**：验收标准是「线上可见」，不是「git push 退出码 0」。

#### G2. fine-grained PAT 权限不能只看 API 探测

- **现象**：`GET /repos/{o}/{r}` 返回 200（元数据可读），但真推送 403。
- **根因**：fine-grained PAT 的 **Metadata 权限自动附带**，`GET /repos` 200 只证明 Metadata 可读；代码读写要单独勾 **Contents: Read and write**。
- **正确探法**：① GET 具体分支（无 Contents 读 → 404）；② 真推一次（无写 → 403）。协作者 permission 端点 403 不作数（它本身要求高权限）。
- **附带**：推命令用 `git -c credential.helper='!f(){...$GH_TOKEN...}; f' push`（令牌经环境变量注入）；本机 GCM 先弹「User cancelled dialog」属噪音，随后令牌自动供上，无实害。

#### G3. 提交身份与 CRLF 纪律

- 提交身份为本机自动生成（Bingzhu Pei <v-bingzhupei@cogobuy.com>），与更早的 Aunger 署名并存，属已知现状；
- 改任何仓库文件**必须保持 CRLF**，改完用 Python 核对 `CRLF/LF` 计数（历史上 `git add -A` 曾误卷本地须知文件，靠 `.gitignore` 收口）。

---

## 8. 测试体系与验收基线

### 8.1 单元测试（Vitest，10 文件 / 210 项）

| 文件 | 项数 | 覆盖 |
| --- | --- | --- |
| `calculate.test.ts` | 36 | 九宫算法 + 🔴 强制验收案例专项 |
| `sixCalculate.test.ts` | 40 | **六宫算法**：模 6 公式、事由/占人起宫、归约不变落宫、奇偶取模判定、四季用神、PDF 三黄金课例、歌诀 30 句 |
| `lunarConverter.test.ts` | 24 | 双向换算、闰月、大小月、跨年、非法/越界 |
| `textNumbering.test.ts` | 24 | 汉字提取、标点空格、代理对、字数校验 |
| `strokeNumbering.test.ts` | 22 | **文字起课**：1～3 字分档、超三字拒绝不截断、笔画查表、生僻字拒绝、归约边界、单字档时辰 |
| `machine.test.ts` | 19 | 状态机全部动作与边界；**结果对象全程不被替换** |
| `interpretation.test.ts` | 16 | 释义字段完整、组合规则、建议 2–4 条、免责常驻 |
| `historyStorage.test.ts` | 10 | 本地存储读写、上限、文字模式不存原文 |
| `timeMapping.test.ts` | 7 | 十二时辰映射与反向判定 |
| `app.flow.test.tsx` | 12 | jsdom 应用级完整流程（**无浏览器内核也能跑**；v2.0 起含六宫端到端流 + 弹层焦点管理） |
| **合计** | **210** | — |

### 8.2 端到端（Playwright，2 项目 × 17 = 34 项，**可选**）

- 桌面 `chromium-desktop` 1280×900 + 移动 `chromium-mobile` Pixel 5。
- 关键项：强制验收案例（跳过路径 / 逐步动画路径 / 五种按钮 / 复制与再次占测）、文字起课（1～3 字、超三字拒绝、单字补时辰）、标点不影响起数、闰月可选性、超范围年份、减少动效、窄屏无横向滚动、结果可复现、历史入口。
- **定位**：保留作回归资产，但**不属于交付门禁**——它要拉起浏览器内核 + 预览服务，每次改动都跑成本过高。
  日常交付以 8.4 的前四条命令为准。UI 改版后若 E2E 断言过期，允许暂缓修正，但**必须在本文档记一笔**。

### 8.3 构建产物基线（2026-10-20 实测，以 vite 输出为准）

| 构建 | 产物 | 大小 |
| --- | --- | --- |
| `npm run build` | `index.html` | 0.77 KB (gzip 0.65) |
| | `index-*.css` | 38.25 KB (gzip 8.39) |
| | `index-*.js`（首屏） | **225.66 KB (gzip 96.12)** |
| | `BirthForm-*.js`（懒加载历法包） | 301.28 KB (gzip 104.53) |
| `npm run build:offline` | `app.js` | 525.66 KB (gzip 200.39) |
| | `app.css` | 39.38 KB (gzip 8.56) |
| `npm run build:single` | `掌中诀-单文件版.html` | 596.7 KB（全内联，单文件可分发） |

> v1.1.0 首屏 JS 比 v1.0.0 记录值增大（+9.98 KB，gzip +18.34 KB），主要来自**内置笔画表**
> （`strokeTable.ts` 源文件 22 KB，多为离散数字与汉字串、gzip 压缩率低），另有规则文案与表单改动带来的少量增量。
> 若日后要压体积，可考虑把笔画表改为按需加载。

### 8.4 每次交付前必须跑的命令

```bash
npm run typecheck      # 必须零错误
npm run test:serial    # 必须 10 文件 / 210 项 / 0 error
npm run build          # 必须成功
```

> 碰过懒加载 / 构建配置 / 样式外的产物逻辑，**再补**：
> `npm run build:offline` + `npm run build:single`（单文件版必须重建，否则发出去的是旧版）。
> E2E（`npm run test:e2e`）可选，不列入门禁。

---

## 9. 环境特异性陷阱清单

换一台机器、换一个沙箱、换一个 CI，都可能重新踩到：

| 陷阱 | 触发条件 | 对策 |
| --- | --- | --- |
| vitest EPERM 丢文件 | 沙箱拦截 `os.tmpdir()` 写入 | `npm run test:serial` |
| `TMPDIR` 无效 | Windows | 用 `TEMP` / `TMP` |
| E2E webServer 超时 | IPv4/IPv6 不一致 | 显式 `--host 127.0.0.1` |
| E2E 内核缺失 | 只装了 headless shell | `channel: 'chromium'` 或 `npm run test:e2e:install` |
| `file://` 白屏 | 用 ES 模块产物 | 用 `preview` 或 `build:offline` |
| 缺 `dirname`/`grep`/`tail` | 受限 Bash | 改用 Python 脚本 |
| 中文路径问题 | 路径含 `·` / 空格 / 中文 | 依赖用 Glob 定位，不手写通配 |

---

## 10. 常见改动任务：改哪里

| 我想…… | 改这些文件 | 别忘同步 |
| --- | --- | --- |
| 改宫位释义文案 | `interpretation/palaceMeanings.ts` | 单测里对字段完整性的断言 |
| 增删组合解读规则 | `interpretation/composeResult.ts` 的 `PRIMARY_RULES` / `MODIFIER_RULES` | **注意"自上而下取第一条"的遮蔽效应**（见 A3）；`interpretation.test.ts` |
| 改掐指动画快慢 | `buildPath.ts` 的 `BASE_MOVE_MS` / `LANDING_DWELL_MS` / 减速系数 | 断言"改节奏不影响结果"的解耦测试必须仍绿 |
| 改掌位图外观 | `palmLayout.ts` 坐标 + `PalmDiagram.css` | 解耦测试；E2E 的"九个指节"断言 |
| 换时辰口径（如早晚子时） | `birth/timeMapping.ts` | `timeMapping.test.ts`；README 配置表；**且这属于传统规则的流派差异，需先向上确认** |
| 调整历法支持范围 | `birth/calendarRange.ts` | 越界报错的单测；E2E 的年份选项断言（201 项） |
| 改文字起课口径 | `text/strokeNumbering.ts` 的 `STROKE_CHAR_COUNT` / `strokeTable.ts`（重新生成） | 规则在页面「规则说明」同步；改后必须重跑 210 项单测 |
| 改六宫断词/歌诀/取象文案 | `six/sixConstants.ts`（断词、`SIX_TOPIC_VERSES`）与 `six/sixMeanings.ts` | **改动必须有底本（PDF 转录稿）依据**；`sixCalculate.test.ts` 逐句锁死，须同步 |
| 改六宫用神取法 | `six/sixConstants.ts` 的 `SIX_SEASONS`/`getSixSeasonByMonth`、`six/sixMeanings.ts` 用神段 | `sixCalculate.test.ts` 四季映射与喜忌断语；传统规则变更先向上确认 |
| 加一种新的起卦方式 | 新建 `features/<name>/`（六宫即此范式），产出三个数字后调各自引擎 | **不要绕过现有算法层**；新增视图分支到 `App.tsx` 的 `View`，历史记录加新 mode |
| 改隐私策略 | `historyStorage.ts` / `shareCard.ts` / 结果页声明 | README 第 9 节；`PRIVACY_NOTICE` |

### 加新功能的推荐流程

```
① 先写/改单测（尤其算法层）→ ② 跑单测看它红
③ 改算法层 → ④ 单测转绿
⑤ 再接状态机 → ⑥ 再接视图
⑦ npm run test:e2e 加一条对应流程
⑧ 四条基线命令全跑 → ⑨ 更新 README 与本文档
```

**红线**：任何让 `App.tsx` / 组件直接 import `calculate.ts` 之外的"宫位推算"逻辑的改动，都要在第 3 节的三层解耦框架里重新审视。

---

## 11. 明确未做 / 明确不做 / 存疑

### 明确未做（有意留白，非遗漏）
- 真太阳时、出生地时区校正、早晚子时细分、节气精确换月。

### 明确不做
- **不接任何后端 / 数据库 / 账号系统 / 付费 AI API。** 这是需求方的硬要求，也是本项目"零外链"特性的根基。
- 不引入 UI 框架、不引入图表库、不引入任何运行时 CDN（会破坏离线自足性）。
- 不对健康 / 财务 / 法律给出确定性结论。

### 存疑 / 需向上确认后再动
- 时辰口径若改为其他流派，属于**传统规则变更**，须先确认归属（参考第 6 节原则）。
- 组合解读规则表若继续增补，需重新审视 `PRIMARY_RULES` 的排序是否仍合理。

---

## 12. 交接自检清单

接手后第一次动手前，建议照此过一遍：

- [ ] 读了 `README.md`（面向使用者）与本文档（面向开发者）
- [ ] 通读了上级目录的需求文档 `.docx`（486 段），尤其第 1.1 节的 13 条硬约束
- [ ] `npm install` 成功；`npm run dev` 能打开首页
- [ ] `npm run test:serial` → **确认是 10 文件 / 210 项**（若数字偏小，见 C1）
- [ ] `npm run build` → 产物大小与第 8.3 节基线一致
- [ ] 手动走一遍强制验收案例：农历五月二十日 + 丑时 → **小吉 / 空亡 / 病符**
- [ ] 确认已理解铁律 1（动画不推算宫位）与铁律 2（结果冻结）
- [ ] 确认已理解三层解耦（算法层 / 节奏层 / 视觉层）的边界
- [ ] 知道改传统规则前要先确认，而不是自己拍板（第 6 节）
- [ ] （可选）`npm run test:e2e` → 34 passed；不必作为动手前的硬门槛

---

## 13. 仓库与分发形态

| 项 | 约定 |
| --- | --- |
| 仓库 | GitHub `aunger01/zhangzhongjue`（Public） |
| 入库内容 | **只入源码**：`src/`、配置文件、`scripts/`、两份文档、`LICENSE` |
| 不入库 | `dist/`、`dist-offline/`、`node_modules/`、测试产物、本地临时文件（见 `.gitignore`） |
| 产物 | 由 `npm run build` / `build:offline` / `build:single` 现场生成，用完即弃 |
| 许可 | 源码公开、**不得商用**，见 `LICENSE`；分发须保留署名与协议，衍生物同协议 |
| 页脚链接 | `App.tsx` 页脚 GitHub 图标指向本仓库，仓库改名/迁移时**必须同步这一行** |

---

## 附：本次开发的完整时间线（供追溯决策）

| 阶段 | 产出 | 关键决策 |
| --- | --- | --- |
| ① 工程骨架 | Vite + React + TS + Vitest + Playwright 配置 | `base: './'` 换取"任意子路径可部署"；`typecheck` 独立成脚本 |
| ② 算法层 | `palaceConstants` / `types` / `calculate` / `buildPath` / `palmLayout` + 36 项单测 | **先钉死算法与不变量**；动画/视觉坐标独立成文件，从第一天就解耦 |
| ③ 输入层 | `calendarRange`（不依赖库）/ `lunarConverter` / `timeMapping` / `textNumbering` + 55 项单测 | 纯日期运算与历法库**拆开**，让首页不必加载 301KB；历法与本地用字表**逐项对照测试**防漂移 |
| ④ 表现层 | 掌位图 / PalaceCell / FingerPointer / 状态机 / 各视图 + 19 项状态机单测 | 状态机只用 `pathIndices`，不产生任何宫位；`landingSeq` 触发一次性落宫特效 |
| ⑤ 解读与体验 | `palaceMeanings` / `composeResult` / 分享卡片 / 音效 / 动效 / 响应式 | 组合解读改为「主规则 + 修正句」；音效用 WebAudio 合成（0 文件）；`prefers-reduced-motion` 双通道 |
| ⑥ 验证与交付 | 141 单测 + 34 E2E 全绿；`dist/` 构建；README | 修掉一批真实缺陷（见第 7 节）；按需分包把首屏从 514KB 降到 214KB |
| ⑦ 自足性审计 | 实测 6 个请求零外链；新增 `build:offline` | 发现 `file://` 陷阱 → 用 IIFE + 剥离模块标记 + `defer` 做出可双击版本 |
| ⑧ 体验定稿 | 删冗余展示（九宫列表 / 路径剧透 / 步骤卡 / 起数预览页）、移动端全流程一屏、导航收纳、透明操作条、版权页脚 | 页面从 6 个视图收敛到 5 个；**预览页整页删除，提交即入演算**；所有"一屏"靠高度方程而非缩小掌图 |
| ⑨ 入库 | `LICENSE`（非商业）、`.gitignore`、`scripts/build-single-file.mjs`；死代码与死样式清理 | 仓库只收源码；单文件打包从一次性临时脚本升级为正式 npm script |
| ⑩ v1.1.0 文字起课（2026-10-20） | `strokeNumbering.ts` / `strokeTable.ts` / `gen-stroke-table.mjs` + 22 项新单测；表单与规则页文案重写；掌图视觉定稿；版本号 1.0.0 → 1.1.0 | **取字由程序截取改为用户自定 1～3 字**（取字即取象），超限拒绝不截断；笔画口径取**简体规范笔顺**（既所思即所得）；九宫算法一字未改，历史记录可跨版本对读 |
| ⑩ 掌图重绘（第一阶段） | `palmLayout.ts` 全量重写：`HAND_PATH`（3844 字符贝塞尔剪影，矢量化自圣上参考图）+ 实测手指几何 + 牌位卡宫格；`PalmDiagram` 拆三独立分组；掌体压暗 + 底部渐隐 mask；**删掌纹 / 指尖金饰 / 腕部太极印** | 手形放弃参数化曲线与开源图标（Phosphor `hand` 为并指举手形，不符），改**直接矢量化参考图**；掌纹涉相学定论，宁留白不臆造；九宫坐标与算法零接触 |
| ⑪ v2.0.1 六宫传统起课法（2026-10-28） | 旁挂 `features/six/`（7 文件）+ `sixCalculate.test.ts` 40 项；`PalmDiagram/PalaceCell/FingerPointer` 改可注入宫位集；`DivinationMode`/历史分栏/导航切换 ⇄/GuideModal 六宫变体；双算法版本统一 2.0.1；奇偶白名单 bug 修复（A5） | **六宫与九宫彻底旁挂，九宫引擎零改动**；文案/测试只引 PDF 转录底本（识别一遍存档，不再反复识图）；占人用神依底本改四季五行（表单零新增项，季节从生月自动推定）；UX 六条钦定（零冗文案/必选置空/起课前不显起宫/免责一处/图标贴字/无返回钮）；合入 main 上线（05d71dd） |

**一句话总结这次开发的核心经验**：
> **算法先行、契约先定、三层解耦、测试核对数字、传统规则不杜撰。**
> 以及一条最容易被忽视的：**"测试通过"必须核对用例数，而不只是看退出码。**
