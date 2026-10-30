# Action Tracker 设计系统 · MASTER

> 状态：v0.3 草案 · 更新：2026-10-30（采用 SpaceX-inspired 黑白排版方向；橙色主操作、测量状态色及移动端规则保持不变）
> 来源：[ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) v2.15.0 生成后，按本项目约束**核对并修订**（对比度均已计算）。
> 生成命令：`search.py "fitness gym app dark mode" --design-system -p "Action Tracker" --variance 3 --motion 2 --density 6`（产品类型匹配为 Fitness/Gym App）。

**读取规则（Master + Overrides）**：实现某个页面时，先看 `pages/<page>.md`；存在则其规则覆盖本文件，否则只用本文件。页面级说明见 [08-ui-ux.md](../../08-ui-ux.md)。

---

## 1. 设计方向

| 项 | 取值 | 说明 |
|---|---|---|
| 风格 | **SpaceX-inspired Minimalism + 深色模式** | 借鉴纯黑画布、工程感 display 字体、全大写导航和细分隔线；保留工具型信息层级、测量语义和移动端单手操作 |
| 调节旋钮 | Variance 3 · Motion 2 · Density 6 | 简洁居中、动效克制、信息密度中等偏高 |
| 产品性质 | 测量工具，不是营销页、不是游戏 | **不采用**生成结果中的 Feature-Rich Showcase 落地页结构；生成结果把"没有游戏化"列为健身 App 反模式（即建议加入徽章、积分等），本项目**不做游戏化、不打分**（ADR-012 只做测量） |
| 主平台 | iPhone Safari 竖屏（ADR-010），兼顾横屏回放与桌面 | 移动优先，375 px 起 |

## 2. 主题

- **深色为默认**：回看视频时减少眩光、突出骨架；OLED 省电。
- **浅色主题**：球场户外强光下可读性更好。默认跟随系统（`prefers-color-scheme`），设置里可手动切换。
- 视频区域（stage）在两个主题下都是纯黑底，骨架颜色不随主题变化。

## 3. 颜色 Token

对比度按 WCAG 2.x 计算（正文 ≥ 4.5:1；控件边界与有意义图形 ≥ 3:1）。

### 3.1 基础（shadcn 变量名；2026-10-30 采用 SpaceX-inspired 深色画布）

变量名与 shadcn/ui 一致（Tailwind 中写 `bg-background`、`text-muted-foreground` 等），本项目新增的变量在下表标 ★。深色为 `.dark`（默认），浅色为 `:root`。深色画布用纯黑背景、近黑表面与灰色 hairline；hairline 只分层，不用于交互控件边界。

| 变量 | 深色 | 浅色 | 用途 / 实测对比度（对 background / card / muted） |
|---|---|---|---|
| `--background` | `#000000` | `#F4F4F5` | 页面底色 |
| `--card` / `--popover` | `#0A0A0A` / `#0A0A0A` | `#FFFFFF` / `#FFFFFF` | 卡片、面板、抽屉；弹出层 |
| `--muted` | `#141416` | `#ECECEF` | 次级面、分段控件底 |
| `--accent` | `#202024` | `#E6E6EA` | 悬停 / 选中行底色（不作文字色） |
| `--foreground` | `#FAFAFA` | `#18181B` | 正文：深约 20.1 / 19.0 / 17.6；浅 16.1 / 17.7 / 15.0 |
| `--muted-foreground` | `#B4B4BD` | `#595963` | 次要文字，也用于 `unavailable`：深 10.2 / 9.6 / 8.9；浅 6.3 / 6.9 / 5.9 |
| `--primary` | `#F97316` | `#EA580C` | 主按钮底色、选中态、进度 |
| `--primary-foreground` | `#18181B` | `#18181B` | 主按钮文字：深 6.3；浅 5.0。**禁止白字**（深 2.8、浅 3.6，不达标） |
| ★ `--primary-text` | `#FDBA74` | `#9A3412` | 橙色文字 / 链接：深 12.5 / 11.7 / 10.9；浅 6.7 / 7.3 / 6.2（`#F97316` 本身不作文字） |
| `--border` | `#3A3A3F` | `#DADADE` | **仅装饰性分隔线**（深色对黑约 1.9:1，不能作控件边界） |
| `--input` | `#6F6F7A` | `#777782` | 输入框、开关、次按钮边界：深 4.2 / 4.0 / 3.7；浅 4.0 / 4.4 / 3.8 |
| `--ring` | `#FDBA74` | `#9A3412` | 焦点环（2 px + 2 px offset）：同 `--primary-text` |
| `--destructive` | `#F87171` | `#B91C1C` | 删除：深 7.6 / 7.2 / 6.7；浅 5.9 / 6.5 / 5.5 |
| ★ `--warning` | `#FCD177` | `#854D0E` | 拍摄 / 质量警告：深 14.5 / 13.7 / 12.7；浅 6.2 / 6.9 / 5.8 |
| ★ `--stage` | `#0B0B0D` | `#0B0B0D` | 视频舞台底色（两种主题相同） |

### 3.2 指标状态（`Metric.status`，见 03 第 2 节）

**颜色不能单独表达状态**：每个状态都有图标 + 文字标签。

| 状态 | 变量（深 / 浅） | 对比度（对 card） | 图标（Phosphor） | 标签 | 数值显示 |
|---|---|---|---|---|---|
| `valid` | ★ `--valid` `#86D9A8` / `#166534` | 11.8 / 7.1 | `CheckCircle` | Valid | 正常显示数值与单位 |
| `experimental` | ★ `--experimental` `#D3B9F4` / `#6B21A8` | 11.3 / 8.7 | `Flask` | Experimental | 显示数值，旁边标 "Experimental"，**不进入趋势图** |
| `unavailable` | `--muted-foreground` | 9.6 / 6.9 | `Prohibit` | Unavailable | **不显示数值**，显示"—"和原因（`reasonCode` → `messageKey`），可点开查看详情 |

绿色只用于 `valid`，不用作主按钮（生成结果中 Accent/CTA = 绿色，已改）。

### 3.3 骨架叠加（视频之上）

| Token | 值 | 用途 |
|---|---|---|
| `--skel-bone` | `#FFFFFF`（约 92% 不透明） | **所有骨线**（用户确认：白骨线 + 彩色关节点，画在真实身体上，见 08 第 6.4 节） |
| `--skel-left` | `#22D3EE`（青） | 身体左侧关节点 |
| `--skel-right` | `#F97316`（橙） | 身体右侧关节点 |
| `--skel-center` | `#F8FAFC` | 头部、躯干中线 |
| `--skel-key` | `#FDE047`（黄） | 当前选中的关键关节与角度弧线 |
| `--skel-halo` | `rgba(0,0,0,0.75)` | 所有线条和点下方的描边（线宽 +2 px） |

球场背景（绿、蓝、红土）上，青/橙裸色对比度只有 1.7–3.8，**必须加深色描边**（描边后与黑边对比 7.5–11.6）。左右侧除颜色外还用**位置与标签**区分（选中关节标注"右膝"等），不只靠色相。

**`kpState` 显示规则**（见 02 第 7 节）：

| kpState | 点 | 相连线段 |
|---|---|---|
| `observed` | 实心圆 r = 4 | 实线 3 px |
| `interpolated` | 空心圆（白描边）r = 4 | 虚线 4/4 |
| `missing` / `rejected` | 不画 | 不画（诊断模式下 `rejected` 画 × ） |

**按人物大小缩放**（2026-10-30 用户反馈：人物较小时圆点相对骨骼太大，骨线看不清）：上表的尺寸是人物正常大小时的值。每帧按屏幕上的躯干长度（肩到髋，取可见两侧的平均；看不到肩和髋时取可见关节纵向范围 × 0.3）计算缩放系数 `s = clamp(躯干 CSS px ÷ 80, 0.35, 1)`，然后：

- 关节半径 `4s`、骨线宽 `3s`、虚线间距 `max(2, 4s)`。
- 深色描边不随人物一起缩小：骨线描边比骨线宽 `2·max(0.5, s)` px，圆点描边 `max(1, 1.5s)` px，保证在任何背景上都可辨。
- 关键关节同样乘 `s`（r = `7s`）；角度弧线和数值标签不缩放，保证可读。
- 实现：`apps/web/src/features/analyze/skeleton-draw.ts`（`skeletonScale`、`overlaySizes`）。

关键关节：r = 7 实心 `--skel-key` + 2 px 白环 + 深色描边；角度弧线半径 22 px，数值标签在关节外侧，带半透明黑底（`rgba(0,0,0,0.6)`，白字 ≥ 4.5:1）。

### 3.4 图表（uPlot）

- 系列用**线型 + 直接标注**区分（实线 / 虚线 / 点线），不只靠颜色；最多 4 条。
- 插补段：该段线条降为 **40% 不透明度**，并在 X 轴上方画一条"补点"细带（虚线已用于区分系列，不再表示插补）；`unavailable` 窗口画斜线阴影带，并在图下列出原因。
- 事件标记：挥拍速度峰值用三角形 + 文字"速度峰值"（**不写"击球"**）；深蹲最低点用倒三角 + "最低点"。
- 播放头为 2 px 竖线，与视频时间同步；点击/拖动图表可跳转，同时提供 ±1 帧按钮作为非拖动替代。
- 可访问性兜底：图表下方提供"数据表"切换（事件 × 指标）。

## 4. 字体

| 用途 | 字体 | 说明 |
|---|---|---|
| 正文、控件 | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif` | 方案 C：iPhone 上即 SF Pro，零下载 |
| 标题、大号数值 | `"Arial Narrow", "Aptos Narrow", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif`，600/700 | 工程感窄体优先；仅使用系统字体，不下载 D-DIN |
| 数字 | `font-variant-numeric: tabular-nums` | 播放中不断变化的角度、时间不跳动 |

- 正文、控件继续使用系统字体；display 使用系统已有的 Arial Narrow / Aptos Narrow 回退链，取代 SF Pro Display 以获得更工程化的标题轮廓。不得下载 D-DIN 或其他外部字体。界面只做英文（Q13）。
- 字号用 `rem`；输入框 ≥ 16 px（避免 iOS Safari 聚焦时自动放大）。
- 字号阶梯：12（仅辅助标注）/ 14 / 16（正文）/ 20 / 24 / 32（大号数值）。

## 5. 间距、圆角、尺寸

| Token | 值 | 用途 |
|---|---|---|
| `--space-xs` | 4 px | 紧凑间隙 |
| `--space-sm` | 8 px | 图标间距、相邻可点击元素最小间距 |
| `--space-md` | 16 px | 标准内边距、手机左右边距 |
| `--space-lg` | 24 px | 区块间距 |
| `--space-xl` | 32 px | 大间距 |
| `--space-2xl` | 48 px | 页面级分隔 |
| `--radius-sm` / `--radius` / `--radius-lg` | 8 / 14 / 20 px | 标签 / 按钮、输入与卡片 / 视频舞台与底部抽屉（shadcn maia 风格，方案 C） |
| 胶囊 | 999 px | 分段控件、播放条、图标按钮 |
| `--touch-min` | 44 px | iOS 触控目标下限（图标小于 44 px 时扩大点击区域） |

- 固定在顶部/底部的栏使用 `env(safe-area-inset-*)`；滚动内容加相应内边距，不被底部标签栏和操作栏遮挡。
- 深色主题用**表面层级**（background → card → muted）表达层次，不依赖阴影；浅色主题卡片可用 `0 1px 2px rgba(15,23,42,.06)`。

## 6. 动效

- **只用 CSS 过渡**，不引入 GSAP（生成结果建议的 ScrollTrigger 滚动显现不适合工具型界面）。
- 时长：按压反馈 100 ms；状态切换 150–200 ms；底部面板进出 250 ms（退出快于进入）。
- `prefers-reduced-motion: reduce` 时关闭所有非必要动画，直接显示最终状态。
- 每个视图最多 1–2 处动画；加载骨架屏一组只用一个 shimmer。
- 悬停/按压只改变颜色、透明度，**不改变布局尺寸**（不用 `translateY` / `scale` 移动元素）。

## 7. 图标

- 实现使用 **Phosphor**（`@phosphor-icons/react`，regular，20/24 px），Heroicons 仅作备选；同一界面只用一种风格。shadcn 组件自带的 lucide 图标在加入组件时替换为 Phosphor（`components.json` 的 `iconLibrary` 不支持 Phosphor 时手工替换）。
- 不用 emoji 作为图标。
- 图标旁有文字时 `aria-hidden="true"`；纯图标按钮必须有 `aria-label`，切换按钮暴露 `aria-pressed`。

## 8. 组件规格

```css
/* 主按钮：每屏最多一个 */
.btn-primary { background: var(--primary); color: var(--primary-foreground);
  min-height: 44px; padding: 0 20px; border-radius: var(--radius); font-weight: 600;
  transition: background-color 150ms, opacity 150ms; }
.btn-primary:active { opacity: .85; }
.btn-primary:disabled { opacity: .45; }           /* 同时设置 disabled 属性 */

/* 次按钮 */
.btn-secondary { background: transparent; color: var(--foreground);
  border: 1px solid var(--input); min-height: 44px; border-radius: var(--radius); }

/* 图标按钮：视觉 24px，点击区 44px */
.btn-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 999px; }

/* 焦点 */
:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }

/* 卡片 */
.card { background: var(--card); border-radius: var(--radius-lg); padding: var(--space-md); }

/* 状态标签：颜色 + 图标 + 文字 */
.badge { display: inline-flex; gap: 4px; align-items: center; padding: 2px 8px;
  border-radius: var(--radius-sm); font-size: .8125rem; border: 1px solid currentColor; }

/* 输入 */
.input { min-height: 44px; font-size: 16px; padding: 0 12px; background: var(--card);
  color: var(--foreground); border: 1px solid var(--input); border-radius: var(--radius); }

/* 底部面板（替代居中弹窗） */
.sheet { background: var(--card); border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom)); }
.scrim { background: rgba(0,0,0,.6); }            /* 按实际背景复核前景可读性 */
```

- 分段控件（Segmented control）用于 2–4 个互斥选项（分析类型、持拍手、播放速度）。
- 底部标签栏最多 3 项：**记录 / 导入 / 设置**（诊断入口在设置里）。
- 移动端优先用底部面板，不用居中弹窗。

## 9. 项目专属反模式

- ❌ 把 `keyMs` 叫作"击球时刻"——只能叫"速度峰值"。
- ❌ 只用颜色表达指标状态或左右侧。
- ❌ 把插补点画成与观测点一样（必须虚线/空心）。
- ❌ `unavailable` 指标显示数值、0 或估算值。
- ❌ 评分、等级、"好/差"、排行榜、勋章等评价或游戏化元素（v1 只做测量，ADR-012）。
- ❌ 纠错建议文案（"膝盖再弯一点"）——v1 只给测量说明。
- ❌ 主按钮白字；`#F97316` 作为深色卡片上的文字。
- ❌ 运行时加载 Google Fonts 或任何第三方资源；上传视频帧。
- ❌ emoji 图标；改变布局的悬停/按压动画；仅支持拖动的交互（时间轴必须有按钮替代）。

## 10. 交付前检查清单

- [ ] 深色、浅色两套主题分别检查正文 ≥ 4.5:1、控件边界与有意义图标 ≥ 3:1
- [ ] 指标状态与左右侧不只靠颜色
- [ ] 触控目标 ≥ 44 px，相邻间距 ≥ 8 px
- [ ] 安全区：顶部栏、底部标签栏、底部操作栏不被刘海/主屏指示条遮挡；滚动内容不被固定栏遮挡
- [ ] 375 px 竖屏、横屏回放、768 px、1024 px 布局正常，无横向滚动
- [ ] `prefers-reduced-motion` 生效；文字放大到 200% 不截断关键信息
- [ ] 焦点可见且不被固定栏遮挡；读屏顺序与视觉顺序一致
- [ ] 时间轴拖动有按钮替代（±1 帧、上/下一个事件）
- [ ] 骨架在亮/暗、绿/蓝/红土背景上可辨（有深色描边）
- [ ] 文案使用"速度峰值"而非"击球"；无评价性词语

## 11. 与生成结果的差异

| 生成结果 | 修订 | 原因 |
|---|---|---|
| 主按钮绿色 `#22C55E` + 白字 | 主按钮橙色 + 深色文字 | 白字对比度 2.3:1 不达标；绿色保留给 `valid` 状态，避免语义冲突 |
| 卡片底色 `#1F2937`（与背景相同） | 卡片 `#313742` | 原值无层级 |
| 边框 `#374151` 用于输入 | 拆分为装饰分隔线与控件边界（v0.2 起即 shadcn `--input`） | 原值与卡片对比 1.16，控件边界需 ≥ 3:1 |
| 输入框浅色边框、白色弹窗 | 统一使用主题 token；弹窗改为底部面板 | 原规格与深色主题不一致 |
| 只有深色调色板 | 增加浅色主题 | 户外球场强光 |
| Feature-Rich Showcase 落地页结构 | 不采用 | 本项目无营销落地页 |
| 反模式 "No gamification" | 反向：**禁止**游戏化与评价 | ADR-012 只做测量 |
| GSAP Scroll Reveal | 只用 CSS 过渡 | 工具界面不需要；减少依赖 |
| Google Fonts `@import` | 自托管 | 隐私与离线 |
| hover `translateY(-1px)` | 只改颜色/透明度 | 避免布局抖动；手机无悬停 |
| Heroicons / Lucide | Phosphor（技能当前默认），Heroicons 备选 | 与技能 v2.15 规则一致 |
