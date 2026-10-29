# AGENTS.md

AI 编码代理（Copilot、Claude、Codex 等）在本仓库工作时必须遵守的规则。

## 项目概述

**Action Tracker**：网页版运动动作分析工具。浏览器把运动视频转换成人体骨架（MediaPipe Pose Landmarker），再由可插拔的运动分析包（网球、健身）输出次数、阶段、关节角度、节奏，以及每个指标的状态。**v1 只做测量，不做动作纠错**（ADR-012）。Cloudflare（Workers Free）只负责托管、鉴权和轻量数据同步。

- **当前阶段：P1 原型**（2026-10-30 起）。本地脚手架已建立并通过 typecheck / test / build；尚无云资源，未部署。
- 设计文档入口：[designs/README.md](designs/README.md)
- 项目思考与进展日志：[workflow.md](workflow.md)

## 必须遵守

### 部署与云资源

- **不得部署，也不得创建或修改任何 Cloudflare 资源**（`wrangler deploy`、`wrangler d1 create`、`wrangler r2 bucket create`、`wrangler secret put`、dashboard / API 变更等），除非用户在当前对话中明确要求。
- 本地开发命令（`wrangler dev`、`vite dev`、本地 D1 migration）可以使用。
- 设计必须适配 **Workers Free**：Worker CPU 10 ms / 请求，不做推理、视频处理或重计算。引用限额或价格前，先查询 Cloudflare 官方文档并在文档中注明核对日期。

### 视频与隐私

- `videos/` 只读：不得修改、转码覆盖、移动、删除或提交其中的文件。
- 不得把视频或从视频中提取的帧发送给任何第三方服务。
- 应用默认不上传视频；任何上传视频的功能都必须是可选的、需用户明确同意的，并先更新设计文档。

### 文档同步

每次有实质变更时：

1. **设计变更** → 更新 `designs/` 中对应文档（顶部"更新"日期也要改）。
2. **重要决策** → 在 [designs/06-decisions.md](designs/06-decisions.md) 新增 ADR，不改写已 Accepted 的 ADR。
3. **任何进展、发现、取舍、实测数据、待确认问题** → 在 [workflow.md](workflow.md) 的日志顶部追加带日期的条目，并更新"当前状态"与"待确认问题"。
4. 本文件只放代理工作规则；架构细节写在 `designs/`。

### 语言

- 文档：中文为主，技术名词保留英文。
- **应用界面文案：只用英文**（Q13）；所有文案通过 `messageKey` 管理，不在组件中硬编码，以便以后加语言。
- 代码、标识符、提交信息、代码注释：英文。

## 架构不变量（修改前需先更新设计并获用户确认）

- 姿态推理在浏览器 Web Worker 中运行，通过 `PoseProvider` 接口隔离具体模型；解码、推理、后处理、分析、编码都不在主线程。
- 分析包（`AnalysisPack`）的 `analyze()` 是确定性纯函数：不访问 DOM、网络、时间或随机数；事件 ID 也确定性生成。
- 分析包只使用标准骨架名称（canonical skeleton），不直接使用模型关键点索引。
- 关节角度必须在**像素坐标**上计算（归一化坐标先乘以显示宽高）；指标必须标注测量空间（image / world / time）。
- 姿态数据以 PTRK 格式保存（见 [designs/02-pose-pipeline.md](designs/02-pose-pipeline.md)），格式变更需升级版本号并保持读取兼容；读取时按大小、帧数、数值范围校验，不信任外部文件。
- 每次分析保存 manifest 与 `recipeHash`（输入、模型、参数、档案快照）；"可重算"只在 ADR-004 的三层范围内承诺。
- 区分播放时间与真实时间（`timeMap`）；慢动作或时间不可信时，依赖真实时间的指标必须为 `unavailable`。
- 每个指标必须带 `status`（valid / unavailable / experimental）和原因；可用性按**原始观测**判定，**插补和重采样不得提高可用性**；关键极值依赖插补点时指标不可用。
- `visibility` / `presence` 只用于门控，不得当作测量精度展示。
- 后处理在完整轨迹上一次完成；在人物切换、推理分段边界、时间不可信处断开，不跨段插补或滤波。
- 不从骨架自动估计相机横滚；依赖竖直方向的指标需要用户提供的竖直参考，否则为 `unavailable`。
- **v1 只做测量**：不生成纠错 / 训练建议，不提供默认纠错阈值，不使用受伤风险表述；v1 的 Finding 只有 `measurement` 类说明。
- 大对象放 R2，D1 只存元数据、事件和指标；Worker 流式转存，不缓冲大请求体。
- 滤波和求导前先把轨迹在连续段内重采样到均匀采样率；滤波截止频率必须远低于 Nyquist 频率。
- 没有球/拍检测时，网球事件的关键时刻只能称为"挥拍速度峰值"，不得称为"击球时刻"。
- 运动员与目标人物属于 Analysis，不属于 Recording（一个视频可能包含多人、多个动作）。
- 匿名用户必须能在本地完整使用；Cloudflare Access 只保护 `/api/*`（`/api/health` 除外）。用户以 JWT `iss + sub` 标识，Worker 必须自行校验 JWT。
- 云同步：状态迁移用条件更新，与配额计数在同一 `batch()`；上传按预计大小预留配额；R2 key 含一次性 `uploadId`；完整性由 R2 `put({ sha256 })` 校验，不信任客户端自报元数据；每个被引用的行都检查归属。
- 删除：一个事务内标记 `deleting`、写墓碑、扣配额、删 D1 行，R2 对象随后按墓碑删除，幂等可重试；`complete` 后的分析不可覆盖。
- 云端报告不含图片；关键帧截图只在本地生成。

## UI 规则（实现页面前先读 [MASTER](designs/design-system/action-tracker/MASTER.md) 与 [08-ui-ux.md](designs/08-ui-ux.md)）

- 颜色、字体、间距只用 MASTER 中的 token；新增颜色必须先计算对比度并写入 MASTER。
- 指标状态一律**图标 + 文字**，不只靠颜色；`unavailable` 显示"—"和原因，不显示数值；`experimental` 标 "Experimental" 且不进入趋势图。
- 主按钮橙底**深色文字**（白字不达标）；绿色只用于 `valid`。
- 骨架线条和点下方必须有深色描边；插补点用空心点 + 虚线，不得画成与观测点相同。
- 不做游戏化、评分、等级或建议性文案；遵守 08 第 7.3 节用词表。
- 所有手势（左滑、拖动、双击）都有按钮替代；触控目标 ≥ 44 px；尊重 `prefers-reduced-motion`。
- 不在运行时请求外部字体、图标或脚本。

## 仓库结构与工具（P1 脚手架，2026-10-30）

参见 [designs/01-architecture.md](designs/01-architecture.md) 第 9、10 节。

- pnpm 12 workspaces（`packageManager` 固定版本，用 corepack）+ TypeScript 7 strict（`tsconfig.base.json`；如工具链不兼容可退回 6.x）。
- `apps/web`：Vite 8 + React 19 SPA 与 Worker（Hono），`@cloudflare/vite-plugin`；Tailwind v4 + shadcn/ui（组件源码在 `src/components/ui/`，图标改用 Phosphor）。
  - `src/messages.ts`：所有界面文案（英文）；组件只用 `t(messageKey)`。
  - `src/index.css`：MASTER token（`:root` 浅色、`.dark` 深色）与 `@theme inline` 映射；改颜色先改 MASTER。
  - `worker/index.ts`：`/api/health` 公开，其余 `/api/*` 在实现 Access JWT 校验前一律 401（fail closed）。
  - `worker/worker-configuration.d.ts` 由 `pnpm --filter @action-tracker/web cf-typegen` 生成；改 `wrangler.jsonc` 后要重新生成。
- 已有包：`packages/pose-core`、`analysis-core`、`analysis-tennis`、`shared`。`pose-mediapipe` 在接入推理时创建；`analysis-gym` 推迟到 P2。
- 包直接导出 TS 源码（`exports: ./src/index.ts`），由 Vite / Vitest 直接消费，不单独构建。
- 测试：Vitest 5；分析包使用 `fixtures/` 中的 PTRK + 标注做回归测试；Worker 测试用 `@cloudflare/vitest-plugin`（原 `vitest-pool-workers` 已改名），在 workerd 中运行，通过 `import { exports } from "cloudflare:workers"` 调用。

命令（仓库根目录）：

```powershell
corepack pnpm install          # 首次安装；pnpm 12 默认阻止依赖构建脚本，已在 pnpm-workspace.yaml 的 allowBuilds 中放行 esbuild、workerd
corepack pnpm typecheck        # 所有包 tsc
corepack pnpm test             # 所有包 vitest run（含 Worker 测试）
corepack pnpm build            # apps/web 生产构建（不部署）
corepack pnpm dev              # 本地开发 http://localhost:5173（SPA + Worker 同一端口）
```

- 根脚本内部调用 `pnpm`；若 PATH 中没有 `pnpm`，先 `corepack enable pnpm`（或用 `--install-directory` 放到临时目录并加入 PATH）。
- 本机网络有 TLS 拦截（自签名证书）：shadcn CLI 拉取 registry 失败，`vite dev` 打印 `Request.cf` 警告（无害）。**不要关闭 TLS 校验**；shadcn 组件手工按上游源码加入并注明来源。
- `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude` 由 pnpm 自动写入（这些包发布时间短于供应链最小发布期限），升级版本后可移除。

## 测试与验证要求

- 分析包的改动必须附带或更新 fixtures 测试（计数、关键时刻误差、指标数值与状态）；包含反例（慢放、插值、关键峰值漏帧、近乎重叠的脚踝等）。
- `fixtures/` 只存姿态文件、manifest 和标注，不存视频。
- 涉及管线性能的改动，在 iPhone 上用 `videos/sample1.MOV` 和 30 s 1080p60 片段记录各阶段耗时到 `workflow.md`。

## 已知事实（避免重复调查）

- `videos/sample1.MOV`：iPhone 16 Pro，HEVC Main10，HLG HDR + Dolby Vision，3840×2160 @ 59.97 fps，旋转 90°（竖屏显示），7.72 s，51 MB。内容为单腿蹲类动作，慢而清晰（Q1）；用于 P1 骨架与关键关节显示，不作为网球验证素材。
  - **正面拍摄**，支撑腿为左腿，膝屈曲无法从此视角测量。
  - 离线 MediaPipe heavy 232/232 帧检出。
  - 派生素材在 `designs/mockups/assets/`，由 `designs/mockups/tools/extract_pose.py` 重新生成。
- UI 方案已选 **shadcn C · Mobile focus**（`designs/mockups/mock-ui-shadcn-c.html`，2026-10-29）。
  - 骨架叠加在真实身体上：白骨线，左青右橙关节点（见 MASTER 3.3、08 第 6.4 节）。
  - 原型需用本地 HTTP 打开。
- 产品优先级（2026-10-29 用户确认）：**Tennis 优先**，首个分析包 `tennis.groundstroke`（Q2）；使用者为本人 + 少量教练试用，公开发布在 v2 或以后（Q3）；实时摄像头模式为未来功能（Q5）；原视频只在本地（Q6）；Q11 云容量暂不处理。
- Q12（2026-10-30）：网球先做正手 + 反手，发球放 P2；持拍手因人而异，是运动员档案字段 `dominantHand`，大多数人双手反手（`backhandType` 默认 `two_handed`），见 ADR-015。近期没有网球素材，P1 只用 sample1。
- UI 实现：shadcn/ui + Tailwind v4 + 系统字体 + Phosphor（ADR-014）；token 以 MASTER v0.2 为准。
- MediaPipe `@mediapipe/tasks-vision` npm 最新版 1.2.0（Apache-2.0）；模型大小 lite 5.5 MB / full 9.0 MB / heavy 29.2 MB。
- Workers 静态资源单文件上限 25 MiB；Workers AI 无姿态模型（均于 2026-10-29 核对）。
- 手机浏览器是一等目标平台（ADR-010）：**iPhone Safari 为主平台和验收平台**（iOS 17+，推荐 18.4+ 以获得完整 Wake Lock）；iPhone 上所有浏览器都是 WebKit 内核；桌面次之；Android Chrome 尽力支持；Firefox Android 无 WebCodecs。手机测试需要 HTTPS 安全上下文；开发机是 Windows，调试 iPhone 主要靠应用内诊断面板。
- 部署域名：v1 使用 workers.dev，不用自定义域名；Access 用 workers.dev 主机名 + `/api` 路径的 self-hosted 应用，禁止开启 Worker 级 Access。
- 典型视频片段约 30 s（Q9）；每用户云端配额默认 1 GB（30 s 分析约 3–4 MB，约 250–350 次）。
- R2 Workers API 的 `put()` 支持 `sha256` 等校验选项（由存储层校验）；`onlyIf` 条件写入无法确认"仅当不存在时创建"，设计不依赖它（2026-10-29 核对）。
- tasks-vision 1.2.0 的 `Landmark` 有 `visibility` 和可选 `presence`。
- UI/UX 技能 ui-ux-pro-max v2.15.0 已全局安装在 `%USERPROFILE%\.agents\skills\ui-ux-pro-max\`；运行脚本用 conda 环境 ai313 的 Python（`%LOCALAPPDATA%\miniforge3\envs\ai313\python.exe`，需设 `PYTHONIOENCODING=utf-8`）。系统 PATH 中的 `python` 只是 Microsoft Store 占位程序。技能输出必须核对后才能写入（见 ADR-013）。
- 已 `git init`（2026-10-30），尚无提交。提交前确认 `videos/`、`designs/mockups/assets/*.mp4` 被忽略。
