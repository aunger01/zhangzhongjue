# 掌中诀 · 小六壬掌诀互动网站（九宫 + 六宫双玩法）

道门秘术「小六壬」的沉浸式互动掌诀网站，含**两套可切换的玩法**：

- **九宫 · 连续起宫法**（v1.0 起的原有玩法）：用户输入生辰日期与时辰，或写下心念文字，
  网站把输入换算为三个数字，按**九宫连续起宫规则**逐节推演，并在**真实掌位图**上把每一步计数演出来，
  最后给出结果总览、单宫释义与组合解读。
- **六宫 · 传统起课法**（v2.0 新增，依《小六壬精华》整理）：六宫 = 大安/留连/速喜/赤口/小吉/空亡，
  按**事由歌诀**（婚姻/求财/疾病/官司/出行）或**占人**（男/女）起宫，配断课歌诀、月日时取象与用神喜忌。

**纯前端**：所有计算、历法换算、动画与解读都在浏览器本地完成，不依赖后端、数据库、账号登录或付费 AI 服务。

**当前版本 v2.0.1**（2026-10-28）：九宫线在 v1.1.0 的文字起课之上保持算法不变；新增**六宫传统起课法**并旁挂独立引擎；
两套算法版本号统一为 **2.0.1**（见 `features/divination/palaceConstants.ts` 的 `ALGORITHM_VERSION` 与
`features/six/sixConstants.ts` 的 `SIX_ALGORITHM_VERSION`，与 `package.json` 同步）。

**许可**：源码公开，可自由阅读、学习与非商业使用，但**不得商用**；© 2026 Aunger Page，保留所有权利。详见 [`LICENSE`](./LICENSE)。

> 🧭 **要接着开发或改这个项目？** 请先读 [`开发过程与AI交接手册.md`](./开发过程与AI交接手册.md)：
> 里面记录了架构分层、必须成立的不变量、13 条硬约束、**29 个已踩过的坑（现象→根因→解法）**、
> 测试基线数字、以及"加新功能该按什么流程走"。本文档面向使用者，那份面向接手者。

---

## 1. 快速开始

环境要求：Node.js ≥ 18（开发使用 Node 22 验证），npm ≥ 9。

```bash
# 安装依赖
npm install

# 本地开发（默认 http://localhost:5173）
npm run dev

# 单元测试（算法 / 历法 / 文字起课 / 状态机 / 解读 / 本地存储）
npm test

# 单元测试（受限沙箱环境专用：关闭文件级并行，见第 11 节 FAQ）
npm run test:serial

# 生产构建（先做类型检查，再打包到 dist/）
npm run build

# 离线构建（产出 dist-offline/ 外链版，可直接双击打开，见第 8 节）
npm run build:offline

# 再打一步：把外链版内联成「真·单文件 HTML」（dist-offline/掌中诀-单文件版.html）
npm run build:single

# 本地预览生产构建产物（默认 http://localhost:4173）
npm run preview
```

端到端测试（Playwright，**可选**，不属于交付门禁）：

```bash
# 首次需要下载浏览器内核
npm run test:e2e:install

# 运行端到端测试（会自动启动生产构建预览服务）
npm run test:e2e
```

> 端到端用例保留在 `src/tests/flow.spec.ts`，用来回归关键流程；它依赖浏览器内核与预览服务，
> 每次改动都跑一遍成本较高。日常交付以「typecheck + 单元测试 + 两次构建」为准。

其他脚本：

| 命令 | 说明 |
| --- | --- |
| `npm run typecheck` | 只做 TypeScript 类型检查 |
| `npm run test:watch` | 单元测试监听模式 |

---

## 2. 🔴 强制验收案例（必须真实计算得出）

| 输入 | 值 |
| --- | --- |
| 农历月份 | 5 |
| 农历日期 | 20 |
| 时辰 | 丑时 → 2 |

| 步骤 | 演算 | 落宫 |
| --- | --- | --- |
| 第一步（月） | 大安起数 5 次 | **小吉** |
| 第二步（日） | 小吉起数 20 次 | **空亡** |
| 第三步（时） | 空亡起数 2 次 | **病符** |
| 最终结果 | — | **小吉、空亡、病符** |

公式验算：

```
月份：(0 + 5  − 1) mod 9 = 4 → 小吉
日期：(4 + 20 − 1) mod 9 = 5 → 空亡
时辰：(5 + 2  − 1) mod 9 = 6 → 病符
```

该案例已写入单元测试与端到端测试（`src/tests/calculate.test.ts`、`src/tests/flow.spec.ts`）。
页面中没有任何针对该输入的硬编码，结果全部由算法真实计算。农历 2026 年五月二十日对应公历 2026-07-04，
可在生辰起卦中用公历模式交叉验证。

---

## 3. 技术栈

| 技术 | 职责 |
| --- | --- |
| React 18 + TypeScript | 组件、页面状态与类型约束 |
| Vite 5 | 本地开发、构建与静态资源打包 |
| 原生 CSS（设计变量 + 组件样式） | 响应式样式，无 UI 框架依赖 |
| SVG | 手掌、指节宫位、掐指指示器 |
| CSS 动画 | 淡入、流光、落宫光圈、卡片依次出现 |
| [lunar-javascript](https://github.com/6tail/lunar-javascript)（MIT） | 公历 / 农历真实换算 |
| 内置笔画表（`strokeTable.ts`） | 汉字笔画查询，随主包分发，**不请求任何在线字典** |
| Vitest | 算法、历法、文字起课单元测试 |
| Playwright | 关键用户流程端到端测试 |

> 构建产物已做按需拆分（2026-10-20 实测）：首页与心念起卦只加载主包 **225.66 KB（gzip ≈ 96.12 KB）**，
> 历法库（约 301 KB / gzip ≈ 104.53 KB）在进入「生辰起卦」时才加载。
> 主包内含内置笔画表 `strokeTable.ts`（源文件 22 KB），用于文字起课，不额外发起请求。

---

## 4. 算法说明

### 4.1 九宫定义（正式宫位，不是附加神煞）

| 序号 | 宫位 | 手指 | 指节 | 算法索引 |
| --- | --- | --- | --- | --- |
| 1 | 大安 | 食指 | 中节指骨 | 0 |
| 2 | 留连 | 食指 | 远节指骨 | 1 |
| 3 | 速喜 | 中指 | 远节指骨 | 2 |
| 4 | 赤口 | 无名指 | 中节指骨 | 3 |
| 5 | 小吉 | 中指 | 近节指骨 | 4 |
| 6 | 空亡 | 中指 | 中节指骨 | 5 |
| 7 | 病符 | 无名指 | 远节指骨 | 6 |
| 8 | 桃花 | 食指 | 近节指骨 | 7 |
| 9 | 天德 | 无名指 | 近节指骨 | 8 |

从指尖朝手掌方向理解：**远节**最靠近指尖，**中节**居中，**近节**最靠近手掌。
本项目九宫模块采用九宫顺序（`大安 留连 速喜 赤口 小吉 空亡 病符 桃花 天德`）；
另有独立的六宫模块使用传统六宫（见 4.7），两套引擎互不干扰。

### 4.2 连续起宫规则

1. 月份永远从**大安**（索引 0）起数，**起宫本身计作第 1 位**。
2. 月份的落宫成为**日期**步骤的起宫；日期的落宫成为**时辰**步骤的起宫。
3. 每一步均从当前起宫计作 1，按九宫顺序循环指定次数。

```
resultIndex = (startIndex + count − 1) mod 9
```

### 4.3 完整路径数据

算法层返回每一步的完整路径，而不只是最终索引：

```ts
interface PalaceStep {
  step: 'month' | 'day' | 'hour';
  inputNumber: number;      // 该步输入数字
  startIndex: number;       // 起宫索引
  pathIndices: number[];    // 长度 === inputNumber，首项为起宫，末项为落宫
  resultIndex: number;      // 落宫索引
}
```

**动画不允许自行推算宫位**：手指移动的每一帧都取自 `pathIndices`，
暂停、继续、上一步、下一步、跳过动画、改变速度都只影响"观看方式"，不可能改变结果。
演算开始后本次结果对象即被冻结（单元测试断言任何操作序列都不会替换结果对象）。

### 4.4 十二时辰映射

| 时辰 | 数字 | 时辰 | 数字 | 时辰 | 数字 |
| --- | --- | --- | --- | --- | --- |
| 子 23:00–00:59 | 1 | 辰 07:00–08:59 | 5 | 申 15:00–16:59 | 9 |
| 丑 01:00–02:59 | 2 | 巳 09:00–10:59 | 6 | 酉 17:00–18:59 | 10 |
| 寅 03:00–04:59 | 3 | 午 11:00–12:59 | 7 | 戌 19:00–20:59 | 11 |
| 卯 05:00–06:59 | 4 | 未 13:00–14:59 | 8 | 亥 21:00–22:59 | 12 |

时辰由用户直接选择，不要求用户自己计算。真太阳时、出生地时区、早晚子时等更复杂的规则未在本版实现，
也不会悄悄改变用户选择的时辰（见第 7 节配置项）。

### 4.5 文字心念取数法（本站自定义扩展玩法）

> ⚠️ 这不是传统九宫小六壬古法，是本站的自定义扩展玩法，规则完全公开（首页「规则说明」中同步展示）。
> 相同文字必然得到相同数字；**笔画口径固定为简体规范笔顺**（既所思即所得），不提供繁体/康熙口径切换。

1. 对输入执行 Unicode **NFC** 规范化，再提取有效汉字序列（空格、换行、标点、数字、字母、表情符号均不计入；
   按 Unicode 码点遍历，不会拆错代理对）。
2. **字数上限 3**：有效汉字超过 3 个即拒绝提交，明确提示用户自行删减——**程序不替用户截取**
   （取哪几个字本身就是取象的一步，属用户决定）。
3. 按字数分档取三数（见下表）。

| 有效字数 | 起数（月、日、时） | 补充 |
| --- | --- | --- |
| 3 字 | 第 1、2、3 字的笔画数 | — |
| 2 字 | `1`、第 1 字笔画、第 2 字笔画 | 程序补 `1` 作月数 |
| 1 字 | `1`、该字笔画、**时辰数字** | 时辰由用户选择（预填当前时辰，可改） |

4. 笔画取自内置笔画表 `strokeTable.ts`（GB2312 一二级字库 6768 字中命中 6732 字，笔画 1～30；
   由 `scripts/gen-stroke-table.mjs` 生成）。**字表未收录的字直接拒绝**并提示，不猜测、不按编码估算。
5. 笔画数大于 9 时按 `((n − 1) mod 9) + 1` 归约到 1～9；**单字档末位的时辰数字取 1～12（子时为 1），不归约、原样入数**
   （起宫公式自带取模，落宫结果不受影响）。
6. 所得三数**完全复用**同一个九宫连续起宫算法。

> 说明：早期版本（v1.0.0）曾用「字符数 + Unicode 码点求和」取数，自文字起课上线后**已退役**，
> `textNumbering.ts` 中的 `textToNumbers()` 不再被表单调用；其汉字提取与字数校验工具函数仍被复用。

### 4.6 历法换算

- 使用 `lunar-javascript`（MIT，无第三方依赖）做真实换算，不使用硬编码偏移，也不猜测结果。
- 可靠支持范围：公历 **1900-01-31 ～ 2100-12-31**，农历年 **1900–2100 年**；超出范围会明确报错。
- 农历输入支持闰月标识，**仅当所选年份确实存在该闰月时**才能勾选；大小月、跨年、非法日期均有测试覆盖。
- 换算结果只由用户输入决定，绝不使用系统当前日期代替（「按此刻时间填入」是用户主动点击的快捷操作）。

### 4.7 六宫传统起课法（v2.0 新增，独立引擎）

> 依《小六壬精华》（9 页扫描件）逐字转录整理，转录底本存于仓库外
> `掌中诀网站开发/六宫小六壬_PDF原文转录.md`。六宫玩法与九宫**完全旁挂**（`src/features/six/`），
> 九宫引擎零改动；导航栏 ⇄ 按钮切换，历史记录按宫制分栏。

**六宫定义**（算法索引 0~5）：大安 / 留连 / 速喜 / 赤口 / 小吉 / 空亡。

**落宫公式**：

```
resultIndex = (startIndex + count − 1) mod 6
```

**起宫不固定**，按起课方式定：

| 起课方式 | 起宫 |
| --- | --- |
| 占婚姻 | 大安 |
| 求财经商 | 留连 |
| 占疾病 | 速喜 |
| 官司 | 赤口 |
| 出行 | 小吉 |
| 问占之人（女） | 留连 |
| 问占之人（男） | 小吉 |

（空亡不起课，故不在起宫表中。）起宫本身计作第 1 位，与九宫一致。

**取数**：农历月日时（表单按当前时刻预填，可改）或自报三数；大于 12 的数按
`((n − 1) mod 12) + 1` 归约——12 是 6 的倍数，归约**不改变落宫**（1~99 全量验证）。

**推演输出**：

- 逐步断词（六宫各一句，依底本）；
- 断课歌诀：婚/财/病/官/行五类 × 六宫共 30 句；
- 月日时取象与吉凶基调判语；
- **用神喜忌**：占婚姻以大安、求财以留连、疾病以速喜、官司以赤口、出行以小吉为用神；
  通用问事以日宫为用神；**占人以四季为用神**——被占之人生于春季用木、夏季用火、秋季用金、冬季用水
  （按农历月份所在季节自动推定，正~三月春、四~六月夏、七~九月秋、十~十二月冬），
  用神与月/日/时三宫逐宫论生克（冲克吉神吉事不吉、冲克凶神凶中有吉、生吉神更吉、生凶神更凶），逢空亡另提示。

---

## 5. 项目结构

```
palm-oracle/
├── index.html
├── vite.config.ts            # Vite + Vitest 配置（base: './' 便于任意子路径部署）
├── vite.offline.config.ts    # 离线构建配置（历法包内联 + 经典脚本，供 file:// 双击）
├── playwright.config.ts      # 端到端测试配置（桌面 + 移动端两个项目）
├── scripts/
│   ├── build-single-file.mjs # 把 dist-offline/ 内联成单个 .html
│   └── gen-stroke-table.mjs  # 生成汉字笔画表（构建期离线工具，不参与运行时）
├── tsconfig*.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx               # 视图编排与演算会话（含九宫/六宫模式切换）
    ├── components/
    │   ├── Navbar.tsx        # 顶部导航（音效 + 玩法切换 ⇄ + 「更多」菜单：玩法/规则/历史）
    │   ├── PalmDiagram.tsx   # SVG 掌位图主视觉
    │   ├── PalaceCell.tsx    # 单个指节宫位单元格
    │   ├── FingerPointer.tsx # 掐指指示器
    │   ├── ResultCard.tsx    # 单宫结果卡片
    │   ├── ResultPage.tsx    # 结果页（总览 / 逐宫解读 / 底部操作条）
    │   ├── SessionView.tsx   # 掐指演算界面（掌图 + 控制浮层）
    │   ├── HomeView.tsx      # 首页（掌图 + 今日宜忌）
    │   ├── GuideModal.tsx    # 玩法说明 / 规则说明
    │   ├── HistoryDrawer.tsx # 本地历史记录
    │   ├── Modal.tsx         # 轻量弹层
    │   ├── Motes.tsx         # 背景粒子
    │   └── SoundToggle.tsx   # 音效开关
    ├── features/
    │   ├── birth/
    │   │   ├── BirthForm.tsx      # 生辰表单（按需加载）
    │   │   ├── calendarRange.ts   # 支持范围与公历日期校验（纯运算）
    │   │   ├── lunarConverter.ts  # 公历 ⇄ 农历换算
    │   │   └── timeMapping.ts     # 十二时辰映射
    │   ├── text/
    │   │   ├── TextForm.tsx        # 文字心念表单（1～3 字，超限拒绝；单字补时辰）
    │   │   ├── strokeNumbering.ts  # 文字起课：汉字 → 笔画 → 三数（当前取数入口）
    │   │   ├── strokeTable.ts      # 内置笔画表（GB2312 常用字，生成物，勿手改）
    │   │   └── textNumbering.ts    # 汉字提取 / 字数校验工具（码点取数法已退役）
    │   ├── divination/
    │   │   ├── types.ts               # 类型契约
    │   │   ├── palaceConstants.ts     # 九宫常量与算法版本
    │   │   ├── calculate.ts           # 核心算法（纯函数）
    │   │   ├── buildPath.ts           # 路径摊平与动画节奏
    │   │   ├── palmLayout.ts          # 掌位图视觉坐标（与算法解耦）
    │   │   └── useDivinationMachine.ts# 演算状态机
    │   ├── six/                       # 🔶 六宫传统起课法（v2.0 旁挂，九宫引擎零改动）
    │   │   ├── sixConstants.ts        # 六宫元数据 / 断词 / 断课歌诀 / 四季用神表 / 版本
    │   │   ├── sixCalculate.ts        # 六宫核心算法（纯函数，模 6）
    │   │   ├── sixLayout.ts           # 六宫掌位图视觉坐标
    │   │   ├── sixMeanings.ts         # 断课歌诀 / 取象 / 用神喜忌 / 免责生成
    │   │   ├── SixForm.tsx            # 六宫起课表单（懒加载）
    │   │   ├── SixSessionView.tsx     # 六宫演算界面
    │   │   └── SixResultPage.tsx      # 六宫结果页
    │   ├── interpretation/
    │   │   ├── palaceMeanings.ts      # 九宫释义配置
    │   │   └── composeResult.ts       # 组合解读生成
    │   ├── history/historyStorage.ts  # 本地历史记录
    │   ├── share/shareCard.ts         # 复制文本 / Canvas 分享长图
    │   └── audio/soundEngine.ts       # WebAudio 合成音效
    ├── hooks/usePrefersReducedMotion.ts
    ├── styles/
    │   ├── globals.css       # 设计变量与基础样式
    │   └── animations.css    # 动效清单
    └── tests/
        ├── calculate.test.ts        # 算法 + 强制验收案例
        ├── lunarConverter.test.ts   # 历法与范围
        ├── strokeNumbering.test.ts  # 文字起课（笔画 → 三数）
        ├── textNumbering.test.ts    # 汉字提取与字数校验
        ├── timeMapping.test.ts      # 时辰映射
        ├── machine.test.ts          # 状态机
        ├── interpretation.test.ts   # 解读生成
        ├── historyStorage.test.ts   # 本地存储
        ├── app.flow.test.tsx        # 应用级流程（jsdom，含九宫与六宫端到端流）
        ├── sixCalculate.test.ts     # 六宫算法 + 起宫 + 四季用神 + PDF 三黄金课例
        └── flow.spec.ts             # 端到端流程（Playwright，可选）
```

---

## 6. 测试与验收

单元测试覆盖（`npm test`，共 **10 个测试文件 / 210 项**）：

- **算法**：`5、20、2 → 小吉、空亡、病符`；月份永远从大安起；起宫计作第 1 位；日期/时辰起宫等于上一步落宫；
  天德之后回到大安；`pathIndices` 长度等于计数、首项为起宫、末项为落宫；相同输入结果一致。
- **解耦**：动画节奏、掌位图坐标改动都不会改变计算结果；摊平后的动画帧与算法路径逐项一致。
- **历法**：已知参照日期双向换算、1901–2099 抽样往返一致、闰月存在性、大小月、跨年、非法日期、超范围报错。
- **文字取数**：空白不可提交；标点、空格、数字、字母、表情不计入；代理对不拆分；
  超过三字拒绝且不截断；单字档补时辰、两字档补 `1`；笔画查表命中与生僻字拒绝；笔画归约到 1～9 的边界；相同文字数字恒定。
- **状态机**：暂停/继续/上一步/下一步/跳过/重新演算/回看的行为与边界，结果对象全程不被替换。
- **解读**：九宫释义字段完整、组合规则命中、建议 2～4 条、免责声明常驻。
- **弹层无障碍**：打开即聚焦对话框；Tab / Shift+Tab 焦点循环不出弹层；Esc / 遮罩 / 关闭钮关闭后焦点归还触发元素。
- **六宫算法**（`sixCalculate.test.ts`，40 项）：`(start+count−1) mod 6` 公式与循环；
  事由起宫（婚大安/财留连/病速喜/官赤口/行小吉）与占人起宫（女留连/男小吉）；
  自报三数归约 `((n−1) mod 12)+1` 不改变落宫（1~99 全量验证）与奇偶；
  数字释义单阳双阴按取模判定（15/27/21 判阳、18/12 判阴）；
  四季用神映射边界（1~12 月，越界抛错）；PDF 三黄金课例（婚姻例/女例/男例）逐字吻合；
  断课歌诀 30 句文案锁死；历史记录与版本字段。

端到端测试覆盖（`npm run test:e2e`，17 条用例 × 桌面/移动两个项目 = 34 项；**可选，非交付门禁**。
2026-10-20 实测桌面端 `--project chromium-desktop` **17/17 全绿**）：

- 首页九宫齐备、玩法与规则说明可打开（含公式与文字起课规则公开）。
- 生辰起卦完整流程：农历五月二十日 + 丑时 → 演算 → 结果页三张卡片为小吉/空亡/病符。
- 逐步动画流程：每一步的落宫与计数序号与算法一致，且与跳过动画的结果完全相同。
- 全部按钮真实有效：暂停、继续、上一步、下一步、跳过动画、重新演算、复制、再次占测。
- 文字起课流程：1～3 字起数、超三字拒绝且不截断、单字档补时辰；标点不影响起数；闰月勾选逻辑、公历农历切换提示。
- 结果页三张宫卡的「查看完整计数路径」可展开/收起，路径位数等于该步起数。
- 减少动效模式（`prefers-reduced-motion: reduce`）下仍可完成完整流程。
- 移动端无横向滚动、掌位图与控件可见可点。
- 结果可复现（同输入两次占测结果一致）。

---

## 7. 配置项（文档未明确的传统规则都做成配置，不擅自杜撰）

| 配置 | 位置 | 说明 |
| --- | --- | --- |
| 九宫名称 / 序号 / 索引 / 指节 | `features/divination/palaceConstants.ts` | 修改会改变算法索引对应关系，需同步更新测试 |
| 算法标识与版本 | `palaceConstants.ts` 的 `ALGORITHM_ID / VERSION` | 写入结果对象与历史记录 |
| 掌位图坐标 | `features/divination/palmLayout.ts` | 纯视觉，改它不会改变任何计算结果 |
| 动画节奏 | `features/divination/buildPath.ts` | 单次移动 `BASE_MOVE_MS`、落宫停留 `LANDING_DWELL_MS`、减速系数、减少动效节奏 |
| 时辰数字映射 | `features/birth/timeMapping.ts` | 十二时辰对照表；如采用其他流派口径，改这里并同步测试 |
| 历法支持范围 | `features/birth/calendarRange.ts` | `SUPPORTED_SOLAR_MIN/MAX`、`SUPPORTED_LUNAR_YEAR_MIN/MAX` |
| 文字起课字数上限 | `features/text/strokeNumbering.ts` 的 `STROKE_CHAR_COUNT` | 默认 3；超过即拒绝提交，程序不替用户截取（`textNumbering.ts` 的 `TEXT_HARD_MAX`=200 仅作输入框防呆长度） |
| 文字取数归约 | `features/text/strokeNumbering.ts` 的 `normalizeStroke` | 笔画按 `((n−1) mod 9)+1` 归约到 1～9；单字档的时辰数字不归约 |
| 汉字笔画表 | `features/text/strokeTable.ts`（由 `scripts/gen-stroke-table.mjs` 生成） | 简体规范笔顺口径；换口径（如繁体/康熙）须重新生成并同步全部测试 |
| 旧码点取数范围 | `features/text/textNumbering.ts` 的 `TEXT_NUMBER_RANGE` | **已退役**：`textToNumbers()` 不再被表单调用，仅保留汉字提取与校验工具 |
| 九宫释义文案 | `features/interpretation/palaceMeanings.ts` | `summary / asMonth / asDay / asHour / career / relationship / wealth / health / advice / cautions` |
| 组合解读规则 | `features/interpretation/composeResult.ts` | `PRIMARY_RULES`（时宫主规则）与 `MODIFIER_RULES`（跨步修正句），可增删 |
| 音效 | `features/audio/soundEngine.ts` | WebAudio 实时合成，无音频文件；默认开启，但首次用户操作后才创建音频上下文；频率与时长可调 |
| 历史记录 | `features/history/historyStorage.ts` | 保留条数上限 `HISTORY_LIMIT`，存储键 `HISTORY_KEY`；按九宫/六宫分栏 |
| 六宫元数据与版本 | `features/six/sixConstants.ts` | 六宫名称/方位/五行/断词、`SIX_ALGORITHM_VERSION`；改动会连锁测试 |
| 六宫断课歌诀 | `features/six/sixConstants.ts` 的 `SIX_TOPIC_VERSES` | 婚/财/病/官/行 × 六宫 30 句，测试逐句锁死，改动须有底本依据 |
| 六宫用神取法 | `features/six/sixConstants.ts` 的 `SIX_SEASONS` / `getSixSeasonByMonth` | 占人四季用神：正~三月春木/四~六夏火/七~九秋金/十~十二冬水；事由用神按宫位、通用按日宫 |

**明确未实现、也没有杜撰的扩展**：真太阳时与出生地时区校正、早晚子时细分、节气精确换月、
更多流派的宫位释义校订。这些都建议以「可选扩展」的方式单独排期，而不是混入第一版。

---

## 8. 部署

构建产物是纯静态文件（`dist/`），`base` 已设为 `'./'`，可部署到任意静态托管或子路径。

```bash
npm run build      # 产出 dist/
npm run preview    # 本地验证构建产物
```

### Cloudflare Workers（仓库根 `wrangler.jsonc`，走 Git 集成自动部署）

仓库根部已带 wrangler 配置，Cloudflare 侧连 Git 后每次推 `main` 自动重建：

- Worker 名：`dao`；静态资源目录：`./dist`；路由回退：`not_found_handling: single-page-application`
- 构建命令：`npm run build`；部署命令：`npx wrangler deploy`
- `observability.enabled: false`：纯静态站不需要 Workers Logs；此项目由配置托管，仪表板开关会显示为只读
- 产物地址：`dao.<你的子域>.workers.dev`

> 也可用 Cloudflare Pages：构建命令 `npm run build`、输出目录 `dist`、Node ≥ 18。两条线可并行，互不影响：
> Pages 走 `docs/` 发布目录，Workers 走 `dist/`（`dist/` 不入库）。

### GitHub Pages（本项目现行方案）

- 线上地址：`https://10000101.xyz/zhangzhongjue/`
- 单文件版（可直接下载后双击）：`https://10000101.xyz/zhangzhongjue/standalone.html`

仓库只收源码（`dist/` 不入库），所以 **Pages 不能指向仓库根目录**：根目录的 `index.html` 是 Vite 源码入口，引用的是未编译的 `/src/main.tsx`，直接发布出去浏览器拿到 TSX 源码会一片白屏。因此仓库额外维护一个 `docs/` 发布目录：

```bash
npm run build                                   # 1. 产出 dist/
rm -rf docs && cp -r dist docs && touch docs/.nojekyll   # 2. 同步到 docs/（.nojekyll 防 Jekyll 处理）
npm run build:single                            # 3. 重建单文件版
cp "dist-offline/掌中诀-单文件版.html" docs/standalone.html
```

Pages 设置路径：仓库 **Settings → Pages → Build and deployment**，Source 选 *Deploy from a branch*，Branch 选 `main`、目录选 **`/docs`** → Save。

> `base: './'` 用的是相对路径，所以项目页挂在任意子路径（`/zhangzhongjue/`）都能正常加载资源。
> 若以后改成 Actions 构建发布，只需把工作流产物指向 `dist/`，并在此处同步更新说明。

### Vercel / Netlify / 普通静态服务器

- Framework 预设：Vite（或 Static）
- 构建命令：`npm run build`；输出目录：`dist`
- 服务器只需托管静态文件，无需任何后端运行时；也不需要配置 API Key 或环境变量。

### 零外部依赖 / 离线运行

**运行时零外部请求**（已实测）：完整走一遍首页 → 生辰起卦 → 演算 → 结果，浏览器共发出 **6 个请求，全部指向本站自身**（`index.html` / 主 JS / 主 CSS / `favicon.svg` / 懒加载的历法包 JS+CSS），**没有任何指向第三方 CDN、字体或接口的请求**。字体只用系统字体栈，无 `@font-face`、无 `@import`；音效由 WebAudio 实时合成（0 音频文件）。因此页面加载完成后断网也能完成占测。

### 离线单文件构建（可直接双击打开）

常规 `dist/` 是 ES 模块产物，**用 `file://` 直接双击打开会被浏览器以 `origin=null` 拦截**（`Access to script ... blocked by CORS policy`）——这是所有现代构建工具产物的通病，并非本项目缺陷，用 `npm run preview` 或任意静态服务器打开即正常。

若需要**一个能双击、能离线、能单独发给别人的版本**，用离线构建：

```bash
npm run build:offline   # 产出 dist-offline/ 外链版（4 个文件，约 568 KB）
npm run build:single    # 再内联成 dist-offline/掌中诀-单文件版.html（约 568 KB，单文件）
```

该配置做了三件事：把历法包内联（放弃代码分包，`inlineDynamicImports` + IIFE）、把入口脚本从 `type="module"` 降级为带 `defer` 的**经典脚本**、去掉 `crossorigin` 属性。实测结果：`file://` 下完整跑通「农历五月二十日、丑时，起数 5、20、2 → 小吉 / 空亡 / 病符」，控制台零错误。

`build:single` 把 `dist-offline/` 的 CSS、JS、favicon 全部内联进一个 `.html`，单个文件即可分发。
它会把内联脚本强制放到 `</body>` 之前——内联 `<script>` 的 `defer` 会被浏览器忽略，
若留在 `<head>` 就会在 `#root` 解析前执行，导致挂载失败（这个坑踩过，脚本里已注释）。

> ⚠️ 另一个已经踩过的坑：`String.replace(pattern, replacement)` 的**替换串不是纯文本**，
> 里面的 `$&`、`` $` ``、`$'`、`$$` 会被当成特殊指令；而压缩后的 JS 里 `$&` 这类序列极多，
> 用字符串替换会把 500 KB 代码直接搅碎成语法错误（症状是白屏 + 控制台 `Unexpected token '<'`）。
> 脚本现在一律用**函数式替换** `() => replacement`，并在写出前比对「内联段 === app.js 原文」、
> 再用 Node 的 `vm.Script` 编译校验一遍，防止同类污染再次静默产出坏文件。

> 代价：首屏需一次性加载全部代码（约 528 KB / gzip 174 KB），**日常部署仍请用 `npm run build`**；发送外链版时记得整个 `dist-offline/` 文件夹一起拷（`index.html` 需要同目录的 `app.js` 与 `app.css`），或直接发单文件版。

---

## 9. 隐私与合规

- 出生日期与心念文字**只参与当前页面内存中的计算**：不上传、不保存原文、不要求注册。
- 不使用第三方分析 SDK 或广告追踪脚本；不请求任何外部 API（含 AI 服务）。
- 历史记录为可选模块，仅保存在当前浏览器的 `localStorage`，页面内明确告知并提供**单条删除与一键清空**；
  文字模式的历史记录只存有效字数，不存原文。
- 浏览器本地数据并非绝对不可被其他软件访问，界面与 README 中均如实说明。
- 结果基于象征体系与本地规则模板生成，**不具备科学预测能力**，不构成医疗、投资、法律或其他专业建议；
  健康、财务、法律等重要事项请以专业人士意见为准（该声明在首页、规则说明与结果页均展示）。

---

## 10. 可访问性与性能

- 支持系统偏好「减少动态效果」（`prefers-reduced-motion: reduce`）：保留状态文字反馈，去除循环与位移动画，仍可完成全部流程。
- 按钮触控区域不小于 44×44 CSS 像素；表单与按钮均可键盘操作。
- 关键状态同时使用**文字 + 视觉**表达（例如起宫标注「起」、落宫标注「落」，不依赖颜色区分）。
- 背景粒子上限 16 个，动画使用 `transform` / `opacity`；窄屏不出现横向滚动条或标签重叠。
- 音效默认开启，但音频上下文只在**首次用户操作后**创建（浏览器自动播放策略要求）；用户可随时点音符按钮关闭；播放失败时静默降级，不影响主流程。

---

## 11. 常见问题

**Q：页面提示「超出农历换算的可靠支持范围」？**
A：历法数据表可靠覆盖 1900-01-31 至 2100-12-31，超出范围的日期会明确报错而不是返回猜测值。

**Q：在受限的沙箱环境里 `npm test` 报 `EPERM ... AppData\Local\Temp`，而且「测试文件数」每次都不一样？**
A：这是**测试运行器**往系统临时目录写模块缓存时被环境拦截，**与项目代码无关**。Vitest 会把转译后的模块写入 `os.tmpdir()`，一旦这个写入被拒，承载该文件的 worker 线程会静默退出——表现为**每次运行随机少收集 1~2 个测试文件**（例如 210 → 105），但已运行的用例全绿、退出码仍为 0，极易被误判为「测试通过」。

按影响面从小到大，三种解法任选：

```bash
# 1）最稳：关闭文件级并行，不再写该临时目录（本项目已验证：10 个文件 / 210 项全绿 / 0 error）
npm run test:serial

# 2）把临时目录指到项目内（macOS / Linux 有效）
TMPDIR="$PWD/.tmp" npm test

# 3）Windows 请用 TEMP / TMP（Windows 上 TMPDIR 不生效）
TEMP="$PWD/.tmp" TMP="$PWD/.tmp" npm test
```

> 判据：正常情况下应固定为 **10 个测试文件 / 210 项**。若数字偏小，即为上述问题，切 `test:serial` 即可。

**Q：我想改宫位释义文案或增删组合规则？**
A：只改 `src/features/interpretation/` 下的两个文件即可，界面会自动跟随；算法与动画不受影响。

**Q：为什么没有音频文件？**
A：音效由 WebAudio 实时合成（`soundEngine.ts`），体积为 0、无版权问题、无需网络请求，也避免自动播放策略问题。

---

## 12. 许可证

**源码公开，但不得商用。** 本项目版权归 **Aunger Page** 所有（© 2026，保留所有权利）。

| 你可以 | 你不可以 |
| --- | --- |
| 免费阅读、编译、运行本项目 | 把本项目或其衍生版本用于任何商业目的 |
| 用于个人学习、研究、教学与非商业演示 | 作为收费产品/付费服务的组成部分 |
| 修改并分发（含 fork） | 用于广告变现、引流获利、付费解锁、打赏分成 |
| 部署为不收费、无商业行为的个人站点 | 承接商业项目交付，或出售/出租源码 |
| — | 移除或伪造作者署名与来源 |

- 分发任何副本或修改版本时，必须**完整保留 `LICENSE` 与版权声明**，并注明原始作者与仓库地址；
  衍生版本必须以同等（或更严格）的非商业条款分发。
- **商业授权**（含企业内部使用）需事先取得作者书面许可。联系方式以 `LICENSE` 末尾为准：
  **GitHub [@aunger01](https://github.com/aunger01)** 或邮箱 **vip@L1N2.com**。
- 完整条款以仓库根目录的 [`LICENSE`](./LICENSE) 为准；其中文正文具有约束力，英文摘要仅供参考。

### 第三方组件

| 组件 | 许可证 | 说明 |
| --- | --- | --- |
| [lunar-javascript](https://github.com/6tail/lunar-javascript) | MIT | 公历 ⇄ 农历换算。遵循其自身许可，不受本项目非商业条款约束；分发构建产物时请保留其许可声明 |
| React / React DOM | MIT | UI 运行时 |
| Vite、Vitest、Playwright、TypeScript | MIT / Apache-2.0 | 仅开发期依赖，不进入构建产物 |

### 免责

占测结果基于象征体系与本地规则模板生成，**不具备科学预测能力**，不构成医疗、投资、法律、心理或其他任何专业建议。

