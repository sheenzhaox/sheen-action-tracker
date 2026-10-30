# Workflow · 项目思考与进展

> 记录项目的思考过程、决策原因、实测数据和下一步。新条目追加在"日志"顶部。

## 当前状态

- **阶段**：**P1 本地原型进行中**（2026-10-30 起）。P0 设计 v0.3 + UI/UX v0.2 已定稿；Q1–Q13 全部回应；UI 方案 **C** + shadcn/ui + Tailwind（ADR-014）。
- **P1 进度**：脚手架 ✅ → iPhone 诊断 ✅ → **sample1 端到端 ✅** → iPhone 实测 4K H.264 ✅（1.64×）→ **iPhone 原始 sample1.MOV（HEVC HDR、竖屏）✅** → 性能测试设置 ✅ → **待：iPhone 上各设置对比**。
- **云资源**：1 个 Worker `action-tracker`，地址 https://action-tracker.sheenzhaox.workers.dev（2026-10-30 部署，用户授权；无 D1 / R2 / Access）。代码在公开 GitHub 仓库 [sheenzhaox/sheen-action-tracker](https://github.com/sheenzhaox/sheen-action-tracker)（`main`）
- **UI 原型**：界面只做英文；shadcn 风格**已选 [C · Mobile focus](designs/mockups/mock-ui-shadcn-c.html)**（A [Workbench](designs/mockups/mock-ui-shadcn.html) / B [Library + Session](designs/mockups/mock-ui-shadcn-b.html) 仅作参考）（见 [08 第 11.2 节](designs/08-ui-ux.md)）；**骨架画在真实身体上**（C 的单腿蹲已用 sample1 真实视频 + 离线 MediaPipe 结果），A/B 与网球模式仍为合成示意。
- **设计文档**：[designs/README.md](designs/README.md)

## 恢复项目（下次从这里开始）

1. **先读**：本节 → "当前状态" → 最新两条日志 → [AGENTS.md](AGENTS.md)（agent 规则 + **命令**）→ [designs/README.md](designs/README.md)（文档阅读顺序）。
2. **硬性约束**：
   - **不部署、不创建云资源**（`wrangler deploy`、`d1 create`、`r2 bucket create`、`secret put` 等），除非用户在当前对话明确要求；本地 `vite dev` / `wrangler dev` 可以。
   - `videos/` 只读；其中的视频和帧不得发给第三方。
   - 界面只用英文，设计文档用中文。
   - 只做测量，不给纠错建议。
3. **看 UI 原型（已选 C）**：在 `designs/mockups` 下运行 `python -m http.server 8000`，打开 `http://127.0.0.1:8000/mock-ui-shadcn-c.html`。
   - 必须用 HTTP 打开；`file://` 在 VS Code 内置浏览器里会拦截视频。
4. **重新生成 C 的真实骨架素材**：
   - 用 [extract_pose.py](designs/mockups/tools/extract_pose.py)，安装步骤和模型下载地址写在文件头。
   - 先在 Python 3.12 venv 中 `pip install mediapipe opencv-python`，再把 `pose_landmarker_heavy.task` 放到 `tools/`。
   - 已实测：结果与现有素材逐字节一致。
   - 之前用的 venv 在会话临时目录里，不保证还在。
5. **运行应用**（仓库根目录）：`corepack pnpm install` → `corepack pnpm dev`（http://localhost:5173）；检查 `corepack pnpm typecheck`、`corepack pnpm test`、`corepack pnpm build`。细节和本机注意事项（PATH 中无 pnpm、TLS 拦截）见 [AGENTS.md](AGENTS.md)"仓库结构与工具"。
6. **当前下一步（按顺序）**：
   1. ~~iPhone 上跑诊断面板~~ ✅ 2026-10-30：全部关键能力可用（见日志"iPhone 诊断结果"）；之后在 Safari 上补测一次。
   2. **sample1 端到端** ✅ 2026-10-30 已实现并部署（见日志）。**待办：用户在 iPhone 上用原始 sample1.MOV（HEVC Main10 HDR 4K）跑一次，贴回 Run report。** 重点看 HEVC 解码是否成功、HDR 画面颜色、推理每帧耗时、总耗时与视频时长之比。
   3. 正面单腿蹲测量（髋下降、膝 FPPA）作为管线验收，fixtures 用 sample1 的 PTRK + 人工标注。
   4. 网球素材到位后（3–5 段，要求见 [03 第 5.5 节](designs/03-analysis-packs.md)）实现 `tennis.groundstroke` 检测并把 C 的网球模式换成真实叠加。

## 待确认问题

| # | 问题 | 影响 | 默认假设 |
|---|---|---|---|
| Q1 | ~~`sample1.MOV` 拍的是什么动作？~~ | P1 首个分析包与验证样本 | ✅ **已确认（2026-10-29）：单腿蹲的一种**（原文"单推蹲"，按单腿蹲理解），慢、清晰；用于 P1 骨架与关键关节显示 |
| Q2 | ~~先做 Gym 还是 Tennis？~~ | P1/P2 优先级 | ✅ **已确认（2026-10-29）：先做 Tennis**；sample1 用来显示重要关节 |
| Q3 | ~~使用者是谁？大概多少人？~~ | 鉴权方案、数据隔离 | ✅ **已确认（2026-10-29）：当前是本人，之后少量教练试用；公开在 v2 或以后**（Access 只保护 `/api/*` 足够） |
| Q4 | ~~主要用哪些手机 / 浏览器？~~ | 移动端 spike 测试设备、性能目标 | ✅ **已确认（2026-10-29）：主要是 iPhone**；桌面次之，Android 尽力支持 |
| Q5 | ~~是否需要实时摄像头模式？~~ | P4 优先级 | ✅ **已确认（2026-10-29）：未来功能**，不排期 |
| Q6 | ~~将来是否需要在云端保存原视频？~~ | 存储成本、隐私设计 | ✅ **已确认（2026-10-29）：暂时只在本地** |
| Q7 | ~~是否有自定义域名？~~ | Access 配置、部署配置 | ✅ **已确认（2026-10-29）：暂时用 `workers.dev`** |
| Q8 | ~~首版是"测量与回看"，还是要给"动作纠错建议"？~~ | 分析包规则、提示的默认开关（G04） | ✅ **已确认（2026-10-29）：只做测量**（ADR-012） |
| Q9 | ~~典型片段多长？是否经常用慢动作拍网球？~~ | 断点恢复、时间映射的优先级（G01、G05） | ✅ **已确认（2026-10-29）：一般 30 s**；慢动作文件只做计数与回放 |
| Q10 | ~~近期是否需要"完全断网冷启动"和"换设备回放原视频叠加"？~~ | PWA 时间点、导出格式（G11） | ✅ **已确认（2026-10-29）：暂时不需要** |
| Q11 | ~~小团队全量云同步时 R2 容量不够怎么办？~~（30 s 分析约 3–4 MB；可选：①云端只存 raw PTRK + manifest + 报告；②手动"保存到云端"；③付费 R2） | P3 同步策略、配额默认值 | ✅ **已确认（2026-10-29）：先不管**；保留 1 GB 默认配额，P3 实施前或 v2 公开前再定 |
| Q12 | ~~首个网球包的范围与素材~~ | P1 分析包、labels 与 fixtures | ✅ **已确认（2026-10-30）**：① 先做正手 + 反手，发球放 P2；② 持拍手因人而异 → 运动员档案字段，大多数双手反手（ADR-015）；③ 近期没有网球素材，P1 先只用 sample1，素材到位后再做检测器 |
| Q13 | ~~界面语言与配色~~ | 文案管理、P1 工作量 | ✅ **已确认（2026-10-29）：只做英文界面**；偏好 shadcn 风格，布局/风格已选 **C · Mobile focus**；配色暂保持橙色主色 + 深色默认 |
| Q14 | ~~iPhone 上如何通过 HTTPS 打开开发版？~~ | P1 iPhone 诊断与性能实测 | ✅ **已确认（2026-10-30）：部署到 workers.dev**，iPhone 直接打开线上地址 |
| Q15 | 开发环境：是否在系统上启用 `pnpm`（`corepack enable pnpm`）？~~何时做第一次 git 提交？~~ | 日常命令 | 暂用 `corepack pnpm ...`；git 部分 ✅ 2026-10-30 已提交并推送到公开仓库 |

## 日志

### 2026-10-30 · iPhone 上原始 sample1.MOV 跑通

- 用户确认：iPhone 上用原始 sample1.MOV（HEVC Main10 + HLG + Dolby Vision，3840 × 2160，旋转 90°，59.97 fps，7.72 s）分析和回放都**正常**。
- 由此确认：
  - WebCodecs 能解码 iPhone 默认格式（HEVC 10-bit HDR），`isConfigSupported` 的结果属实；不需要 `<video>` 回退，也不需要提示用户改用"兼容性最佳"格式。
  - tkhd 旋转矩阵处理正确，竖屏视频显示和骨架都是正的。
  - HDR 帧绘制到 sRGB OffscreenCanvas 后，模型能正常检出姿态，骨架贴合身体。
- 尚未记录 sample1 在 iPhone 上的 Run report 数值（解码帧格式、色彩空间、每帧推理耗时、60 fps 下的总耗时比）。下次用 sample1 跑性能测试时一并复制。
- 02 第 3 节"HEVC / HDR 兼容策略"中，"可解码"这一行在 iPhone 上已被证实。不同 HDR 转换路径对关键点精度的影响仍未量化（P1 spike 项）。

### 2026-10-30 · 性能测试设置 + 骨架圆点按人物大小缩放

用户选择：加性能测试设置；并反馈"人物在视频中较小时，关节圆点相对骨骼太大，骨骼看不清"。

- **性能测试设置**（Analyze 卡片中的 "Benchmark settings"）：模型 Full（9 MB）/ Lite（5.5 MB，`…/pose_landmarker_lite/float16/1/`，SHA-256 `59929e1d…`，同样自托管并固定），推理尺寸（长边）1280 / 960 / 720 px。默认 Full · 1280。
  - 每次运行完成后，自动在 OPFS 中查找**同一视频（按视频 SHA-256）最近一次 Full · 1280 的结果**作为参照，计算 13 个身体关键点的图像空间差异：平均 px、占画面高度 %、P95、比较的帧数。按时间戳匹配帧（容差半帧），只比较两边都是 observed 的点。结果显示在 Run report 的 "Difference vs Full · 1280 px"，复制报告时一并带上。
  - Run report 新增 "Setting" 行：模型 · 长边 → 实际送入模型的尺寸。
  - 实现：`src/features/analyze/compare.ts`（`compareTracks` 纯函数 + `loadReferenceTrack`），4 个单测。
- **骨架尺寸缩放**（MASTER 3.3 已更新）：每帧按屏幕上的躯干长度计算 `s = clamp(躯干 CSS px ÷ 80, 0.35, 1)`，关节半径 `4s`、骨线 `3s`、虚线间距 `max(2, 4s)`；深色描边保留最小宽度。`s = 1` 时与原尺寸完全相同。3 个单测。
- 新增共用组件 `components/ui/segmented.tsx`（分段控件，44 px），播放速度也改用它。

**桌面验证**（sample1 的 360 × 640 副本）：
- Lite · 720 与 Full · 1280 相比：平均 3.6 px（0.56%），P95 9.7 px，232 帧。
- Full · 960 与 Full · 1280 相比：0.0 px。360 × 640 的视频不会被放大，两次送入模型的图像相同，同时说明 GPU 推理结果是确定的。4K 原片在 960 / 720 下才会有真实差异，需要在 iPhone 上看。
- 画面较小时（躯干约 45 px，s ≈ 0.56）圆点明显变小，骨线清楚。
- 测试 43 个全部通过；已重新部署（Version `5f627db7`），线上 lite 模型可下载，immutable 缓存生效。

**待用户在 iPhone 上做**：用同一段视频依次跑 Full · 1280（参照）→ Full · 960 → Full · 720 → Lite · 1280 → Lite · 720，每次复制 Run report 贴回。重点看每帧推理耗时和与参照的差异，据此定默认设置（目标：60 fps 网球 30 s 片段 ≤ 3×）。

### 2026-10-30 · iPhone 首次端到端实测（34 s 4K H.264）

用户在 iPhone 上（iOS 27.2，iPhone 上的 Chrome / WebKit，线上 workers.dev 版本）分析了一段**非 sample1** 的视频：

| 项目 | 结果 |
|---|---|
| 视频 | `avc1.640033`（H.264 High@5.1）3840 × 2160 横屏，rot 0°，30.00 fps，1019 帧，33.97 s；首帧 NV12，BT.709 / sRGB transfer，full range（SDR） |
| 推理 | full 模型 · **GPU** · 1019 / 1019 帧检出 |
| 模型下载 + 校验 / 初始化 | 43 ms（已缓存）/ 181 ms |
| 读取 + 解封装 / 等待解码 | 183 ms / 181 ms |
| 旋转 + 缩放 | 317 ms（约 0.3 ms/帧） |
| **推理** | 54.3 s；**每帧 P50 53.0 ms / P95 60.0 ms**（约 19 fps；P95 / P50 = 1.13，34 s 内未见明显发热降频） |
| 编码 + 哈希 / 保存 | 50 ms / 5 ms |
| **总耗时** | 55.6 s，**为视频时长的 1.64×**（目标 ≤ 3×，02 第 10 节） |
| PTRK | 449 KB / 34 s（与 02 估算的 raw 约 0.2–0.3 MB / 10 s 一致） |

**结论**：
- iPhone 上整条管线可用。4K H.264 的 WebCodecs 硬件解码几乎不花时间；**推理占总耗时的 98%**，是唯一的瓶颈。
- 30 fps 的 30 s 片段约 1.6×，达标。**60 fps 网球片段帧数翻倍**，按 53 ms/帧估算，30 s × 60 fps ≈ 1800 帧 ≈ 96 s，约 **3.2×，略超目标**。需要实测 `inferenceLongEdge`（1280 → 960 / 720）和 lite 模型对速度与精度的影响。MediaPipe 内部输入只有 256 级别，缩小送入的图像可能主要减少纹理上传和格式转换的开销。
- `HDR unknown`：H.264 文件没有 `colr` 盒。可以改为用首帧 `colorSpace.transfer` 判断（`iec61966-2-1` / `bt709` → none，`hlg` → hlg，`pq` → pq）。

**仍待验证**：用**文件 App** 选原始 sample1.MOV（HEVC Main10 + HLG + Dolby Vision、旋转 90°、59.94 fps），确认 HEVC 10-bit 解码、HDR 转 SDR 后的颜色和关键点、竖屏旋转，以及 60 fps 下的耗时。

### 2026-10-30 · sample1 端到端（P1 首个里程碑）

用户确认开始，默认模型 full，完成后部署。

**实现**（设计见 02；实现细节和坑见 [02 第 13 节](designs/02-pose-pipeline.md)）：
- `pose-core`：PTRK v1 编解码（gzip、读取校验：大小 / 帧数 / K / 时间戳严格递增 / kpState 取值 / 流式解压上限）、量化函数、`canonicalJson` + `recipeHash`、`PoseProvider` 接口与身体骨线。平台相关代码放在 `@action-tracker/pose-core/io` 入口。
- 新包 `pose-mediapipe`：封装 PoseLandmarker（VIDEO 模式、module 版 WASM、自建 OffscreenCanvas、GPU 失败时回退 CPU）。
- `apps/web` 管线 Worker：mp4box 流式解封装（按 mp4box 请求的位置读取，moov 在文件尾也能处理）→ WebCodecs 解码（解码队列与帧队列背压，10 s 卡住报错）→ 按 tkhd 矩阵旋转 + 长边缩到 1280 → 推理（时间戳严格递增）→ raw PTRK → OPFS（`analyses/<id>/raw.ptrk.gz`，最后写 `manifest.json` 作完成标记）。另有一个哈希 Worker 用 hash-wasm 流式计算视频 SHA-256。
- UI：选择视频 → 分阶段进度（可取消，分析期间申请 Wake Lock）→ 骨架叠加回放（rVFC 同步、±1 帧按钮、拖动条、0.25 / 0.5 / 1× 速度、图例）→ Run report（各阶段耗时、P50 / P95、复制报告）。诊断面板折叠在下方。
- 测试：pose-core 14 个（PTRK 往返、对齐、量化、截断 / 伪造帧数 / 非递增 / 非法 kpState / 解压上限、recipe 哈希）；web 13 个（iPhone 90° 矩阵、旋转变换角点、慢动作和 edit list 判定、HDR、时间戳单调、百分位、帧定位、Worker API）。共 36 个通过。

**验证**（桌面 Chromium，sample1 的 360 × 640 H.264 副本；iPhone 原文件待测）：
- 本地 dev、生产 preview、线上 workers.dev 三处都跑通：232/232 帧检出，GPU delegate。
- 准确性：从 OPFS 取出 PTRK，用 pose-core 解码，与离线 Python heavy 结果比较。13 个身体关键点平均相差 **2.8 px（0.44%）**，P95 6.4 px，最大 64.6 px（偶发，可能是被遮挡的抬起脚）。时间戳差 ≤ 0.5 ms，视频 SHA-256 与本地文件一致。
- 桌面性能（页面可见时）：推理每帧 P50 8 ms / P95 12 ms，总耗时 3.8 s，为视频时长的 0.49×。线上首次运行要下载模型（约 1.1 s），总耗时为 0.72×。页面不可见时浏览器会降频，每帧 P50 约 33 ms。
- 线上 `/vendor/*`：`application/wasm`，`Cache-Control: public, max-age=31536000, immutable`；PTRK 99 KB / 7.7 s。
- 390 px 宽无横向滚动，深浅主题都正常。

**发现与修正**：
- tasks-vision 按 UA 判断 OffscreenCanvas，iPhone 上的 Chrome 会被误判，在 Worker 中访问 `document` 崩溃 → 改为总是自己传入 OffscreenCanvas。
- Vite dev 会改写相对路径的动态 import（加 `?import`），导致无法加载 `public/` 下的 WASM 加载器 → 改用绝对 URL。
- 模型 `…/float16/latest/` 与 `…/float16/1/` 字节不同（两者都是 2023-04-28 上传），固定使用 `/1/` 并锁定 SHA-256。
- React StrictMode 下，`useMemo` 生成的 blob URL 会被 effect 清理提前回收 → 改为在同一个 effect 里创建和回收。
- 连续点"下一帧"时，上一次定位的回调会把帧号拉回 → 改用"待定位目标帧"计数。
- 运行报告中很长的 colorSpace JSON 撑出横向滚动 → 网格列改为 `minmax(0,1fr)`，允许任意位置断行。
- MediaPipe 控制台警告 "NORM_RECT without IMAGE_DIMENSIONS"：与离线结果对比没有可见偏差，暂时忽略。

**部署**：用户已授权。`wrangler deploy` 上传 Worker 与 14 个静态文件（含 13.8 MB WASM、9 MB 模型，均小于 25 MiB 上限），Version `72d3e5e4`。

**下一步**：用户在 iPhone 上用原始 sample1.MOV 跑一次，复制 Run report 贴回来。据此确认 HEVC HDR 解码和色调映射、iPhone 推理耗时，以及是否需要把 `inferenceLongEdge` 调低或换 lite 模型。之后做后处理（门控、插补、滤波 → processed PTRK）和正面单腿蹲测量（髋下降、FPPA）。

### 2026-10-30 · iPhone 诊断结果（首次真机）

用户在 iPhone 上打开 workers.dev 地址，运行诊断后复制报告：

| 项目 | 结果 |
|---|---|
| 系统 / 浏览器 | iOS 27.2，**Chrome for iOS**（CriOS 156，WebKit 内核） |
| `/api/health` | ✅ 200 |
| Secure context | ✅ |
| Cross-origin isolated | ✗（未设 COOP/COEP；设计不依赖 `SharedArrayBuffer`，见 02 第 148 行，无影响） |
| WebCodecs `VideoDecoder` | ✅ |
| 解码 HEVC Main10 4K `hvc1.2.4.L153.B0` | ✅ `isConfigSupported` 通过 |
| 解码 H.264 1080p | ✅ |
| 编码 H.264 1080p（导出） | ✅ |
| WebGPU adapter / WebGL 2 | ✅ / ✅ |
| OffscreenCanvas / OPFS | ✅ / ✅ |
| 存储配额 | 38.4 GiB（已用 0） |
| Screen Wake Lock | ✅ |
| `requestVideoFrameCallback` | ✅ |
| CPU 核数 / 内存 | 4（WebKit 上报值，可能被限制）/ 未知（WebKit 不提供 `deviceMemory`） |

**结论与取舍**：
- **解码走主路线**：mp4box.js 解封装 + WebCodecs 在 Web Worker 中解码 HEVC Main10。`<video>` + rVFC 保留为回退（也可用）。
  - 注意：`isConfigSupported` 只说明这个配置能用，还要用 sample1 真实文件（HLG HDR + Dolby Vision、旋转 90°）实测：能否解码、颜色是否正常（10 bit HDR 转成 8 bit 给模型时的色调映射）、帧率。
- **推理**：MediaPipe tasks-vision 的 GPU delegate 走 WebGL 2（可用），CPU（WASM）作回退。WebGPU 虽然可用，但 tasks-vision 目前不用它，先不依赖。
- **存储**：OPFS 可用，配额充足（38 GiB），PTRK 和中间文件放 OPFS。
- **长任务**：Wake Lock 可用，分析时保持亮屏。
- 跨源隔离：暂不配置 COOP/COEP。只有以后需要多线程 WASM 时才加，并要先确认不影响自托管模型和资源的加载。
- 这次用的是 iPhone 上的 Chrome。iOS 上所有浏览器都是 WebKit 内核，能力应该一致；验收以 Safari 为准，之后在 Safari 上补测一次。

**下一步**：sample1 端到端。把 sample1.MOV 放在 iPhone 本地（相册或文件），在 App 中选取 → Worker 解码 → MediaPipe 推理 → canvas 叠加 → PTRK + manifest 写入 OPFS，并显示各阶段耗时。

### 2026-10-30 · 首次部署到 workers.dev（Q14）

- 用户选择用 workers.dev 给 iPhone 提供 HTTPS，并明确授权部署。
- Wrangler 账号：`sheenzhaox@gmail.com`（Account ID `1f19e6fe…`，只有这一个账号）。部署前确认没有同名 Worker，dry run 显示没有任何绑定。
- `wrangler deploy` 上传 Worker（55.6 KiB，gzip 15.1 KiB，启动 2 ms）和 3 个静态文件 → https://action-tracker.sheenzhaox.workers.dev（Version `a8a30cbb`）。
- 线上验证：
  - `/api/health` 返回 200，`/api/analyses` 返回 401，SPA 深链接返回 200。
  - 桌面浏览器诊断面板无控制台错误；Secure context 显示 Supported。
- 现状与安全：
  - 页面公开访问（匿名用户可在本地使用）。
  - 除 health 外的 `/api/*` 一律返回 401（fail closed），所以暂时不需要 Access。实现带数据的 API 前，必须先配 Access 应用（workers.dev 主机名 + `/api` 路径）并实现 JWT 校验。
  - 没有 D1、R2、secret。
- 本机网络有 TLS 拦截：wrangler 用 `NODE_USE_SYSTEM_CA=1` 读取 Windows 证书库，没有关闭 TLS 校验。
- 下一步：用户在 iPhone Safari 上打开地址 → "Copy report" → 把结果贴回来，据此决定解码路线（WebCodecs HEVC 还是 `<video>` 回退）和推理用 GPU 还是 CPU。

### 2026-10-30 · 创建 GitHub 仓库并首次推送

- 用户确认：账号 **sheenzhaox**，仓库名 `sheen-action-tracker`，**公开**；包含 `gpt-idea.md` 和 `sample1-pose.json`（只是从 sample1 提取的骨架坐标，无画面）；不包含 `.vscode/`（已加入 `.gitignore`）。
- 本机没有 `gh` CLI。用 Git Credential Manager 中已保存的 sheenzhaox 凭据调用 GitHub API 创建仓库，令牌未打印也未写入任何文件。
- 提交身份只设在本仓库：`Xin Zhao <2567985+sheenzhaox@users.noreply.github.com>`（GitHub noreply 地址，不暴露真实邮箱）。
- 推送前检查：没有视频、帧、模型文件；未发现密钥或个人路径。mockup C 引用的 `assets/sample1-360p.mp4` 不在仓库中，所以克隆后要先用 `extract_pose.py` 重新生成，C 的视频才能播放。
- 首次提交 `625ded8`（67 个文件）已推送到 `main`。
- 尚未添加 LICENSE：公开仓库没有许可证时，默认保留所有权利。

### 2026-10-30 · 恢复项目：Q12、设计收尾（token + ADR-014/015）、P1 脚手架

**用户确认**（恢复项目时）：
- Q12：先做正手 + 反手，发球 P2；持拍手按人设置，多数双手反手；近期没有网球视频，P1 先用 sample1。
- 正式采用 shadcn/ui + Tailwind。
- 顺序：先完成设计收尾，再在本地开始 P1 脚手架。

**设计收尾**：
- [MASTER](designs/design-system/action-tracker/MASTER.md) v0.2：颜色改用 shadcn 变量名，取值来自方案 C 的 zinc 色板，深浅两套逐一计算对比度（全部达标）；新增 `--primary-text`、`--warning`、`--stage`、`--valid`、`--experimental`；字体改为系统字体（取代 Barlow）；圆角 8 / 14 / 20 px；图标 Phosphor。
- [06](designs/06-decisions.md) 新增 **ADR-014**（方案 C + shadcn/ui + Tailwind v4 + 系统字体 + Phosphor）和 **ADR-015**（`dominantHand`、`backhandType` 属于运动员档案并快照进 manifest；`unknown` 时用速度更快的手腕推断并在报告中注明）。
- 04 athletes 表加 `dominant_hand` / `backhand_type`；03 第 2 节 `AnalysisContext.athlete` 与第 5.2 节同步；01 第 9、10 节、08 字体同步。

**P1 脚手架**（只在本地；未部署、未建云资源）：
- 根目录：pnpm 12 workspace、`tsconfig.base.json`（strict、`noUncheckedIndexedAccess`）、`.gitignore`（忽略 `videos/`、`*.task`、mockup mp4）；已 `git init`，未提交。
- `packages/pose-core`：33 个标准关节名、像素坐标关节角（归一化坐标先乘显示宽高；测试证明 360 × 640 上同一组点归一化算 135°、像素算 150.6°）、轨迹类型。
- `packages/analysis-core`：Pack 接口与类型（指标为 valid / experimental / unavailable 的联合类型，Finding 只有 measurement）、确定性事件 ID、`gateByTime`（时间不可信时，时间相关指标一律 unavailable）。
- `packages/analysis-tennis`：`tennis.groundstroke` 桩（返回空事件）、`resolveHittingSide`（档案优先，未知时按手腕峰值速度推断并标记 inferred）。
- `packages/shared`：zod `HealthResponse`、`ApiError`。
- `apps/web`：Vite 8 + React 19 + Tailwind 4 + `@cloudflare/vite-plugin`；Worker（Hono）`/api/health` 公开、其余 `/api/*` 401；SPA 首页是**诊断面板**（WebCodecs、HEVC Main10 / H.264 解码、H.264 编码、WebGPU、WebGL2、OffscreenCanvas、OPFS、存储配额、Wake Lock、rVFC、CPU / 内存、UA、`/api/health`），状态用图标 + 文字，不用绿色（绿色只给 `valid`）；可"Copy report"贴回日志。
- 版本（2026-10-29/30 npm）：pnpm 12.16.1、TypeScript 7.0.2、Vitest 5.0.5、Vite 8.3.5、React 19.3.1、Hono 4.13.14、Tailwind 4.3.3、wrangler 4.156.0、`@cloudflare/vitest-plugin` 1.4.11、zod 4.6.7、Phosphor 2.1.10。

**验证**：
- `typecheck` 5 个项目通过（TypeScript 7 无需回退）。
- `test` 18 个通过：pose-core 7、analysis-core 5、analysis-tennis 4、Worker 2（在 workerd 中跑）。
- `build` 通过：客户端 JS 334 KB（gzip 103 KB）、CSS 15 KB；Worker 57 KB。
- `dev`：`/api/health` 200、`/api/analyses` 401、SPA 深链接回退 index.html。
- 浏览器 390 × 844：深色与浅色主题都正常，无控制台错误，无横向滚动；按钮高 44 px，橙底深色字。桌面 Chromium 中 HEVC Main10 显示不支持（预期，iPhone Safari 才是验收平台）。

**发现与取舍**：
- `@cloudflare/vitest-pool-workers` 已改名为 **`@cloudflare/vitest-plugin`**（用 `cloudflareTest()` Vite 插件；`SELF` 已弃用，改用 `cloudflare:workers` 的 `exports.default.fetch()`）。01、AGENTS 已更新。
- pnpm 12 默认阻止依赖的构建脚本：在 `pnpm-workspace.yaml` 的 `allowBuilds` 中只放行 esbuild、workerd。pnpm 还自动写入 `minimumReleaseAgeExclude`（wrangler、miniflare、vitest-plugin 的版本太新）。
- 本机网络有 TLS 拦截：shadcn CLI 拉 registry 失败（自签名证书）。**没有关闭 TLS 校验**，Button 按上游 new-york-v4 源码手工加入并按 MASTER 调整（44 px、深色字、次按钮用 `--input` 边框）。以后加组件同样处理，或在用户配置公司根证书（`NODE_EXTRA_CA_CERTS`）后再用 CLI。
- 本机 PATH 没有 `pnpm`，只有 corepack；根脚本内部调用 `pnpm`，需先 `corepack enable pnpm`（本次只在会话临时目录建 shim，未改系统）。
- Tailwind `@theme inline` 中圆角不能写成 `--radius-sm: var(--radius-sm)`（自引用），改为直接写值。

**待确认**：
- 是否把 `pnpm` 装到系统（`corepack enable pnpm` 需写 Node 安装目录，可能要管理员权限）。
- iPhone HTTPS 测试方式（自签证书 vs 临时隧道）。
- 何时做第一次 git 提交。

### 2026-10-29 · 骨架改为叠加在真实身体上（C 用 sample1 真实数据）

用户希望骨架像参考图那样**直接画在真实人体上**，而不是合成的人形/球场。

- **素材**：用 OpenCV 在本机读取 `videos/sample1.MOV`（只读，未改动），按旋转元数据转为竖屏，缩小转码为 [assets/sample1-360p.mp4](designs/mockups/assets/sample1-360p.mp4)（360 × 640，H.264，30 fps，约 5.4 MB）。
- **推理**：在会话临时 venv 中安装 `mediapipe`，下载官方 `pose_landmarker_heavy.task`，**离线**逐帧推理（VIDEO 模式）。232 帧全部检出，结果存为 [assets/sample1-pose.json](designs/mockups/assets/sample1-pose.json)。视频和帧均未发送给任何第三方。
- **C 的单腿蹲模式**：
  - 视频解码后画进 canvas，再用同一坐标叠加骨架。样式为白骨线 + 左青右橙关节点 + 选中黄色，visibility < 0.5 的关节画空心点和虚线。
  - 按人物外接框跟随取景，并在支撑膝画 FPPA 角度弧。
  - 播放用 `requestVideoFrameCallback` 同步，`timeupdate` 兜底；0.5 倍速。
- **实测发现**：
  - ① sample1 是**正面**拍摄（之前原型写成"侧面"，已改正），支撑腿为**左腿**。
  - ② 正面拍摄时支撑膝在下蹲中朝镜头移动，2D 腿长从约 150 px 缩到约 80 px。因此"膝屈曲"会严重偏小，界面标为 **Unavailable · Needs side view**。
  - ③ 正面视角改用：**髋下降**（% 腿长，有效）、**膝 FPPA**（额状面投影角，内／外偏，有效）、**骨盆倾斜**（实验：抬腿时髋点会漂移）。
  - ④ 自动找到 3 次下蹲最低点：1.3 s / 4.1 s / 6.7 s，髋下降 64 / 54 / 59 %，FPPA 内偏 23° / 37° / 8°。只是测量，不做评价。
  - ⑤ 抬起腿的踝、足跟常被遮挡，4.27–4.44 s 支撑侧可见度不足，FPPA 显示为 "—"。
- **文档**：
  - 08 第 6.1 节：正面单腿蹲的指标。
  - 08 新增第 6.4 节：真实身体叠加规范。
  - 08 第 11.2 节：C 改为真实数据，并说明打开方式。
  - MASTER 第 3.3 节：新增 `--skel-bone` 白骨线。
  - designs/README 加入 assets 目录。
- **验证**：390 × 844 与 1280 × 800 下无横向溢出、无脚本错误；播放、拖动、模式切换、标签页均正常。注意：VS Code 内置浏览器以 `file://` 打开会拦截视频，需在 `designs/mockups` 下运行 `python -m http.server`。
- A / B 与网球模式仍为合成画面（暂无网球视频）。未部署，未创建云资源。

**决定**：用户选定 **C · Mobile focus** 作为后续 UI 方案（A / B 保留作参考，不再维护）。

**补充（恢复检查）**：
- 把会话临时目录中的提取脚本整理进项目，存为 [designs/mockups/tools/extract_pose.py](designs/mockups/tools/extract_pose.py)，改用相对路径。
- 实测重新生成的 mp4、json 和内嵌数据与现有文件逐字节一致。
- 在顶部新增"恢复项目"一节。

**下一步**：
- 以 C 为基准统一 MASTER 与 shadcn token，并在 01 / ADR 中决定是否正式采用 shadcn/ui + Tailwind。
- Q12 的网球测试视频到位后，网球模式也换成真实叠加。
- ~~录制指引需写明：单腿蹲要测膝屈曲须**侧面**拍摄~~ → 已写入 [03 第 4.3 节](designs/03-analysis-packs.md)。

### 2026-10-29 · shadcn 备选扩展为 A / B / C，界面改为英文

用户偏好 shadcn 方案，要求再生成两版供选择，并确认应用只需英文界面（Q13）。

- A（原 [mock-ui-shadcn.html](designs/mockups/mock-ui-shadcn.html)）全部译为英文，`lang="en"`，去掉中文字体回退，标注 "Option A · Workbench"。
- 新增 B [mock-ui-shadcn-b.html](designs/mockups/mock-ui-shadcn-b.html)：shadcn `lyra` 风格（方正、等宽数字）；侧边栏（手机为抽屉）+ 记录库数据表（搜索、Tennis/Gym 筛选、状态筛选，含处理中、仅骨架、需复核等状态）→ 会话页（KPI、回放、当前挥拍指标、关节信号曲线、数据质量、挥拍表）。
- 新增 C [mock-ui-shadcn-c.html](designs/mockups/mock-ui-shadcn-c.html)：shadcn `maia` 风格（大圆角、胶囊控件）；iPhone 优先，全宽画面 + 底部抽屉（peek / half / full，可拖动、Esc 收起），宽屏变右侧栏；默认 "Skeleton only" 用 sample1 单腿蹲示意膝／髋角度弧和髋部遮挡片段，另可切到网球模式。
- 文档：08 第 5.7 / 7.1–7.3 / 11.2 节改为英文文案与三方案对比；MASTER 去掉中文字体回退；AGENTS 增加"界面文案只用英文、走 `messageKey`"。
- 验证：三版在 1440 px 浅色与 390 × 844 深色下均无横向溢出、无脚本错误；修正了 B 的骨架比例、曲线底边距、KPI 换行，C 的模式切换后挥拍编号不一致和小屏指标备注截断。
- 未改 `videos/`，未部署，未创建云资源。

**下一步**：用户从 A / B / C 选定（或组合）后，统一 MASTER 与 shadcn token（slate vs zinc），再决定是否在 01 / ADR 正式采用 shadcn/ui + Tailwind；Q12 仍待答。

### 2026-10-29 · 新增 shadcn 风格网球 UI 备选

用户要求使用新安装的 `shadcn` skill，在 mockups 中新增独立 HTML。新增 [mock-ui-shadcn.html](designs/mockups/mock-ui-shadcn.html)，保留原 [ui-mockup.html](designs/mockups/ui-mockup.html) 与现有 MASTER 不变；[08 第 11.1 节](designs/08-ui-ux.md) 记录适配边界。

- 单文件原生 HTML/CSS/JavaScript，借鉴 shadcn token、variant 与可访问交互，不是已安装的 React 组件；无应用脚手架、无新增项目依赖、无部署。
- 围绕网球、普通 60 fps、约 30 s：提供回放、示例逐帧、事件／关节选择、曲线与数据表、测量报告、主题／图层切换及 JSON 导出。缺测不显示数值，不含评分或纠错建议。
- 场地、人物、骨架和数值均为合成示例；Phosphor 图标内嵌。没有访问或改动 videos；本地视频选择仅作预览，不接入 MediaPipe，不上传，也不把固定 1/60 s seek 冒充未知帧率文件的精确逐帧。
- 官方 CLI 查询曾遇到企业证书链错误；通过 Node 24 的系统 CA 信任查询成功，没有关闭 TLS 验证。UI 查询使用已有 Miniforge Python，未安装新环境。
- 浏览器基础检查：示例单步从 10.800 s 到 10.817 s；第 05 次缺测事件数值为“—”；初始加载无脚本错误；390 px 视口无横向溢出。未作 iPhone、解码性能或真实测量精度实测。
- 追加验证：375 / 390 / 768 / 1024 / 1440 px × 深浅主题 × 回放／报告，共 20 个组合均无页面横向溢出；Canvas 像素非空，运行时无外部资源请求。验证示例曲线与事件值一致、JSON 的 demo 标记与缺测 null、本地坏文件立即清空示例值及禁用未知时长播放、图层同步、数据表、标签页方向键处理逻辑和原生弹窗焦点。
- 验证局限：集成浏览器将该页标记为后台；连续播放用确定性时间步检查，方向键处理用 DOM 键盘事件检查，不能代替真实前台键盘操作和 iPhone 验收。

当前产品决策与待确认问题不变；该备选仅供用户比较视觉与交互。

### 2026-10-29 · UI/UX 设计（ui-ux-pro-max 技能）

用户要求按 [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) 技能做设计。用户选择：用 conda 环境 **ai313** 的 Python（系统里只有 Store 占位 `python`）、**全局安装**技能、交付**设计系统 + UI/UX 文档 + HTML 原型**。

**过程**
- `npx -y ui-ux-pro-max-cli@2.15.0 init --ai universal --global` 安装到 `%USERPROFILE%\.agents\skills\ui-ux-pro-max\`（项目目录外）。
- 第一次查询"sports motion analysis video tool"匹配到体育球队粉丝网站（红金配色、营销落地页），**偏题**；按技能规则换更窄的查询"fitness gym app dark mode"（Variance 3 / Motion 2 / Density 6），匹配 Fitness/Gym App：Minimalism & Swiss + 深色、橙 `#F97316` + 绿 `#22C55E`、Barlow Condensed / Barlow。
- 补充领域查询：图表（折线图；系列用线型 + 直接标注，提供数据表替代）、UX（进度、不只靠颜色、拖动要有替代、减少动效）、Web（安全区、44 pt 触控目标）、图标（Phosphor）。
- `--persist` 生成的 MASTER.md 自相矛盾（绿色按钮白字、卡片色 = 背景色、浅色输入框边框、白色弹窗），按技能"未核对不写入"的规则删除，改为人工核对版。

**核对与修订（全部计算了 WCAG 对比度）**
- 主按钮：绿底白字只有 **2.28:1**，橙底白字 2.80:1，都不达标 → 橙底**深色文字** `#0F172A`（6.37:1）；绿色只表示 `valid`，避免语义冲突。
- `#F97316` 作文字在深色卡片上只有 4.27:1 → 橙色文字改用 `#FB923C`（深）/ `#C2410C`（浅）。
- 卡片色与背景相同 → 卡片 `#313742`；原边框色与卡片对比 1.16:1 → 拆成装饰分隔线和控件边界 `#8A94A6`（3.9:1）。
- 骨架颜色在绿 / 蓝 / 红土球场背景上只有 1.7–3.8:1 → 所有线和点下加 `rgba(0,0,0,.75)` 描边。
- 不采用：营销落地页结构、GSAP 滚动动效、游戏化建议（与 ADR-012 冲突）、运行时 Google Fonts（隐私、离线）。
- 曲线中虚线已用来区分系列，所以补点段改为 40% 不透明度 + X 轴上方"补点"带；骨架上补点仍是空心点 + 虚线。
- "仅骨架"同时被用作分析类型和"原视频已清除"标记，后者改为"无原视频"。

**交付**
- [设计系统 MASTER](designs/design-system/action-tracker/MASTER.md)：颜色 token（深 / 浅，含对比度）、指标状态、骨架叠加（`kpState` 画法）、图表、字体、间距、组件、反模式、检查清单、与生成结果的差异。
- [08-ui-ux.md](designs/08-ui-ux.md)：信息架构（记录 / 导入 / 设置）、主流程、各页面规格（回放页竖屏 / 横屏布局）、关节组预设、`reasonCode` 中文文案、用词表、iPhone 细节、可访问性。
- [UI 原型](designs/mockups/ui-mockup.html)：5 个 iPhone 竖屏页面（记录、检查与设置、处理中、回放分析、报告），深 / 浅主题切换，无外部请求。回放页 sample1 的角度（髋屈曲 39°、膝屈曲 55°、踝角 89°）由示意坐标计算。已在桌面浏览器渲染检查两套主题，修正了图例遮挡标签、角度弧线位置等问题。
- [ADR-013](designs/06-decisions.md)、[01](designs/01-architecture.md) 技术选型增加 UI 样式 / 图标 / 字体行（是否用 Tailwind 留到 P1 脚手架时决定）、[AGENTS.md](AGENTS.md) 增加 UI 规则与技能 / Python 位置、[designs/README.md](designs/README.md) 索引。

**思考**
- 技能的数据集偏向营销型网站和消费类 App，对"测量工具"只能给出风格和通用 UX 规则；具体到骨架叠加、指标状态、插补显示，需要按本项目的质量契约（ADR-011、ADR-012）自己定。
- 最影响体验的是回放页：视频 + 骨架 + 角度曲线 + 当前值要在 iPhone 竖屏一屏内看到，所以视频最多占约 50% 高度，并提供"专注模式"。

**下一步**：用户确认 Q13（语言、配色）；P1 实现时在 iPhone Safari 真机上检查原型中的对比度、字号和触控目标。未部署、未创建云资源。

### 2026-10-29 · 确认 Q1–Q3、Q5、Q6、Q11：Tennis 优先

用户回答：Q1 sample1 是"单推蹲的一种"（按**单腿蹲**理解，如不对请纠正）；Q2 先做 Tennis，sample1 足够清晰、慢，用来显示重要关节；Q3 当前使用者是本人，之后少量教练试用，公开在 v2 或以后；Q5 实时模式是未来功能；Q6 原视频暂时只在本地；Q11 先不管。

**思考**
- 首个分析包从 `gym.squat` 换成 `tennis.groundstroke`。网球挥拍快（手腕峰值速度高、关键窗口短），对帧率、时间映射和"观测充分性"的要求比深蹲高，所以 v0.3 的质量契约（`timeTrusted`、`maxGapMs` 40 ms、速度峰值不等于击球时刻）正好用得上，不需要改架构。
- sample1 的角色变为**管线与关节显示的参考素材**：慢且清晰，适合检查骨架叠加、旋转、HDR 处理、时间轴和髋/膝/踝角度曲线是否正确，但它不是网球，**不能用于验证网球包**。网球包的验证需要用户另拍素材（Q12）。
- 单腿蹲作为 `gym.single-leg-squat` 列入 P2，与 `gym.squat` 一起做；P1 只用 sample1 显示关节和角度，不输出评价指标。
- 使用者规模小（本人 + 少量教练），Access 方案（ADR-007）足够；Q11 的容量问题在这个规模下不紧急。

**文档变更**：[01](designs/01-architecture.md)（sample1 内容、非目标、路线图 P1/P2/P4、风险）、[02](designs/02-pose-pipeline.md)（`getUserMedia` 为未来功能）、[03](designs/03-analysis-packs.md)（`tennis.groundstroke` → P1，`gym.squat` → P2，新增 `gym.single-leg-squat`，P1 网球 labels 与反例）、[05](designs/05-cloudflare-platform.md)（Q11 暂不处理）、[06](designs/06-decisions.md)（ADR-002 记 Q6，ADR-007 记 Q3）、[07](designs/07-mobile-web.md)（测试素材、实时模式）、[AGENTS.md](AGENTS.md)、[designs/README.md](designs/README.md)。仍未部署、未创建云资源。

**下一步（P1 本地原型，取代 v0.3 日志中的列表）**
1. 用户回答 Q12（网球包范围、持拍手、反手类型），并按 03 第 5 节拍 3–5 段网球测试视频。
2. 初始化 git（`.gitignore` 排除 `videos/`、`node_modules/`、`.dev.vars`、`.wrangler/`）；搭建 pnpm monorepo 与 `apps/web`。
3. 先做**应用内诊断面板**（能力探测、各阶段耗时、内存估计、导出 JSON；默认不含帧和姿态）。
4. **首个里程碑：iPhone 最小闭环 + 关键关节显示**——选择 `sample1.MOV` → 解码（旋转、HDR、时间映射）→ 推理 → 骨架叠加回放，突出显示髋/膝/踝（及肩、肘、腕）并显示角度曲线 → 写 PTRK + manifest → 读回校验。同时完成 M1–M5、M7、M8。
5. 完整轨迹后处理与 `kpState`；同页暂停/继续（M6a），记录页面刷新行为（M6b）。
6. `tennis.groundstroke` v0（只测量，带指标状态）：挥拍事件、正/反手分类、阶段；手写网球 labels（含空挥、走动、他人入镜等反例）+ 第一批 fixtures。
7. 导出 zip 并实测导入，结果逐字节一致。

### 2026-10-29 · 设计 v0.3（采纳 GPT 评审）

用户确认：GPT 评审的整体处理方式接受；Q8 只做测量；Q9 视频一般 30 s；Q10 冷启动离线和跨设备回放暂不需要。据此把 designs 全部升级到 v0.3（仍未部署、未创建任何云资源）。

**主要变更**

| 文档 | 变更 |
|---|---|
| [02-pose-pipeline.md](designs/02-pose-pipeline.md) | 推荐拍摄参数；**时间模型**（`tPlay` / `tReal` / 处理采样率，`timeMap.trusted`，慢动作检测）；用"观测充分性"取代 `minFps`；默认全部帧；`presence` 可选；GPU→CPU 回退的推理分段边界；**线程模型**（单个管线 Worker + 哈希 Worker）；完整轨迹后处理、缺口识别、`kpState`；PTRK 增加 `kpState` / `presence` 并加读取校验；iPhone 上 30 s 片段性能预算；新增 manifest 与 `recipeHash`、三层重算边界；同页暂停/继续语义 |
| [03-analysis-packs.md](designs/03-analysis-packs.md) | **v1 只做测量**：去掉默认纠错阈值，Finding 只有 `measurement` 类说明；`Metric` 增加 `status` / `reasonCode` / `space`；**删除脚踝连线横滚校正**，改为用户确认的竖直参考，"髋低于膝"可输出"无法判断"；事件 ID 确定性生成；脚跟抬起为 experimental；Tennis 拍摄改用普通 60 fps，慢动作只计数；质量门控决定指标状态；验证前移到 P1（手写 labels、反例、三层测试、样本量口径） |
| [04-data-and-api.md](designs/04-data-and-api.md) | 配额改为 **1 GB** 并修正算术；`reserved_bytes` 预留；`analyses` 增加 `recipe_hash` / `compare_key` / `time_trusted` / `upload_id`；事件以 `(analysis_id, event_key)` 为键；`metrics` 增加状态；`r2_tombstones`；条件状态迁移 + 同一 batch 计配额；不可变 key；R2 `put({ sha256 })` 取代自报哈希；归属检查；趋势按拍摄时间并只比较同 `compare_key`；导出含 raw / processed / manifest / labels / report 并以真实导入验收；云端不含图片 |
| [05-cloudflare-platform.md](designs/05-cloudflare-platform.md) | 按 30 s 片段重算容量（见下"新发现"）；安全表增加完整性、并发、预留、墓碑 |
| [06-decisions.md](designs/06-decisions.md) | ADR-002 补充离线边界、跨设备、云端不存图片；ADR-004 收窄为三层重算；新增 **ADR-011 时间模型与指标质量契约**、**ADR-012 v1 只做测量** |
| [01-architecture.md](designs/01-architecture.md) | 目标与非目标（只做测量；不做冷启动离线和跨设备回放）；原则"测量诚实"；组件图按线程重画；质量目标改为 iPhone 30 s 片段并增加"测量诚实""确定性"；风险增加慢动作与误读；P1 首个里程碑 |
| [07-mobile-web.md](designs/07-mobile-web.md) | 同页恢复（M6a 必过）与页面刷新（M6b 只记录）；慢动作只用于计数；默认全部帧；30 s 片段 |
| [AGENTS.md](AGENTS.md) | 新增不变量：指标状态、插补不提高可用性、时间映射、竖直参考、只做测量、manifest、条件迁移与预留、R2 sha256、云端不存图片 |

**新发现：30 s 片段下 R2 会先触顶**

v0.2 的容量估算按 15 s 片段算，结论是"瓶颈在设备不在云"。按 30 s 重算后，一次分析约 3–4 MB（raw + processed PTRK + 报告），个人使用（每周 5 段）约 1 年用满 1 GB，没有问题；但"教练一个账号、5 名学员每人每周 20 段"约 1.5 GB / 月，**1 GB 配额不到 1 个月用完，账号 10 GB 免费额度约 6 个月用完**。这不影响 P1（纯本地），列为 Q11，在 P3 前结合 Q3 决定。

**下一步（v0.3 当时的列表，已被上方"确认 Q1–Q3…"日志的列表取代）**
1. 回答仍未确认的 Q1–Q3（sample1.MOV 的内容、先 Gym 还是 Tennis、使用者规模）。
2. 初始化 git（`.gitignore` 排除 `videos/`、`node_modules/`、`.dev.vars`、`.wrangler/`）；搭建 pnpm monorepo 与 `apps/web`。
3. 先做**应用内诊断面板**（能力探测、各阶段耗时、内存估计、导出 JSON；默认不含帧和姿态）。
4. **首个里程碑：iPhone 最小闭环**——选择 `sample1.MOV` → 解码（旋转、HDR、时间映射）→ 推理 → 骨架叠加回放 → 写 PTRK + manifest → 读回校验。同时完成 M1–M5、M7、M8。
5. 完整轨迹后处理与 `kpState`；同页暂停/继续（M6a），记录页面刷新行为（M6b）。
6. `gym.squat` v0（只测量，带指标状态）+ 手写 labels（含反例）+ 第一批 fixtures；先测静止站立时脚跟噪声。
7. 导出 zip 并实测导入，结果逐字节一致。

### 2026-10-29 · GPT 设计评审的处理意见（✅ 已确认，已落实到 v0.3）

GPT 对 v0.2 的评审见 [gpt-idea.md](gpt-idea.md)（G01–G11）。总体判断我同意：**架构不需要推倒重来，问题集中在"时间与质量的数据契约""结果可追溯""失败恢复"和"云同步并发"上**。其中有 3 处是我在 v0.2 修订里自己引入或遗漏的错误（G03、G10、配额算术），应直接改正。

**事实核对**（2026-10-29）
- `@mediapipe/tasks-vision` 1.2.0 类型定义：`Landmark` 有 `visibility: number` 和**可选的** `presence?: number`（"模型不输出时不设置"）→ GPT 关于 presence 的说法成立，但需在 spike 中确认 pose 模型实际是否输出。
- R2 Workers API：`put()` 支持 `sha256` 选项，由存储层校验收到的字节；支持 `onlyIf` 条件写入，条件不满足返回 `null`。文档未明确"仅当对象不存在时创建"（`If-None-Match: *`）是否可用 → 设计上不依赖它。

**逐条意见**

| # | 我的立场 | 我的想法 / 调整 | 建议时机 |
|---|---|---|---|
| G01 时间定义 | **同意**，正确性缺口 | 区分三种时间：①文件播放时间（CTS）②真实运动时间 ③处理采样率。`minFps` 改为按**事件窗口内原始有效观测**判定（最大缺口、有效间隔），重采样变密不能提高资格。v1 简化：探测到慢动作（帧率 ≥ 100 或 edit list 变速）时，**只做计数和可视化，禁用速度/节奏类指标**；完整的时间映射以后再做。Gym 隔帧降采样先与全帧对比，通过后才作默认。 | 改 02、03、07，P1 前 |
| G02 逐点质量 | **同意** | PTRK 尚未定版，可以直接加一段 `kpState Uint8[F×K]`（observed / interpolated / missing / rejected），600 帧仅约 20 KB。插补不得跨越长缺口、人物切换。`Metric` 增加 `status: valid / unavailable / experimental` 和原因。关键极值依赖插补时不出结论性提示。presence 在提供者层保留（有则存）。 | 改 02、03，P1 前 |
| G03 横滚校正 | **同意，撤回我在 v0.2 加的方案** | 侧面拍摄时两脚踝几乎重叠，用它们估计横滚角是病态的，这是我的错误。改为：①拍摄指引要求三脚架水平（可显示水平仪提示）；②"髋低于膝"只在差值超过不确定性边界时给出"是/否"，否则输出"无法判断"；③可选手工标定竖直参考。三点关节角不受平面内旋转影响，继续计算。 | 改 03，P1 前 |
| G04 描述与纠错分开 | **同意**（产品立场，需你确认 Q8） | 首版默认只输出**描述性测量**；规则引擎保留，但示例阈值默认关闭，只在用户设定目标或有明确依据时启用并标注依据。脚跟抬起先测噪声水平，不做受伤风险表述。 | 改 03，首个 Gym 包前 |
| G05 断点恢复 | **同意问题，建议缩小 P1 范围** | iPhone 上片段多为 ≤ 30 s，完整"页面被回收后续跑"成本高。P1：**同页面暂停/恢复必须可靠**（从上一关键帧重新解码，带重叠预热）；页面重载后**重新分析**，只验证不会留下损坏数据。分块 raw 持久化 + 跨重载续跑放到需要长视频时再做。后处理一律在完整轨迹上统一执行一次，不拼接分块滤波结果。M6 拆成 M6a（必须通过）和 M6b（只记录行为）。 | 改 02、07，P1 spike |
| G06 分析配方 | **同意** | 每次分析保存 `manifest`：pack 配置快照、运动员档案快照、模型内容哈希（构建时计算并写入模型清单，不在运行时算）、推理参数、坐标变换、时间映射、目标选择、后处理参数、输入 PTRK 哈希，并据此生成 `recipe_hash`。ADR-004 的"可重算"要收窄成三层：换规则 → 用 processed；改滤波 → 用 raw；换模型 / 找回其他人 / 提高帧率 → **必须重新提供视频**。`analyze()` 内的事件 ID 改为确定性生成（例如 `序号`），ULID 只在持久化层生成。暂不新增 Pose Artifact 实体。 | 改 02、03、04、06（ADR-004），PTRK 定版前 |
| G07 线程边界 | **同意** | 一个"管线 Worker"顺序执行解码 → 推理 → 跟踪 → 后处理 → 分析，按批让出事件循环以响应取消；主线程只负责文件选择、渲染和控制。路径 B（`<video>` 回退）在主线程取帧后以 transferable 传入 Worker。诊断面板分阶段计时。 | 改 01、02，P1 实现时 |
| G08 标注提前 | **同意** | P1 就手写少量 `labels.json`（不先做标注 UI），覆盖完整/部分 rep、截断、静止、走位、遮挡、多人等负例。验证分三层：合成骨架 → PTRK fixture → 设备上对照原视频。95% 计数目标补充样本量和误检/漏检口径。fixture 只提交你确认可提交的骨架数据。 | 改 01、03，P1 |
| G09 云同步并发 | **同意，但属于 P3，不阻塞 P1** | 具体方案：①状态迁移用条件更新（`... WHERE status='uploading'`），配额累加放在同一 `batch()` 事务里并以状态为条件，重复 complete 只记一次；②创建分析时按声明大小**预留配额**；③blob key 带一次性上传 ID（不可变对象 + complete 时写入的 manifest），不依赖"不存在才创建"；④删除保留墓碑行，Cron 在一段时间后再次按前缀清扫 R2，处理在途上传留下的孤儿；⑤归属校验覆盖所有被引用的 recording / athlete / event。 | 改 04、05，P3 前 |
| G10 哈希校验 | **同意，这是我设计中的真实错误** | 改为把客户端提供的 SHA-256 传给 R2 `put({ sha256 })`，由存储层校验实际字节，仍保持流式。摘要针对**上传的压缩字节**。浏览器导入 PTRK 时限制 header 大小、帧数、解压后体积，校验长度、时间戳单调和非有限数值。 | 改 04，P3 前（导入校验在 P1） |
| G11 产品边界 | **同意** | 明确：P1 只承诺"页面加载后断网可分析"，冷启动离线留给 P4 PWA；换设备时显示"骨架/报告已就绪、原视频缺失"，可重选文件恢复叠加；导出包含 raw、processed、manifest、标签和报告，并以真实导入为验收；关键帧截图只在本地，云端报告不含任何图像；诊断导出默认不含帧、姿态、姓名、身份信息。 | 改 01、04、06（ADR-002），P1 / P3 |
| 配额算术 | **同意，我算错了** | 200 MB ÷ 0.4–0.6 MB ≈ **330–500 次** 10 s 分析，不是 3,000+。可选方案：①云端只存 raw + report，processed 按 manifest 在客户端重新生成（体积约减半，但需保证跨浏览器结果一致到容差内）；②把默认配额提高到 1 GB（小团队 ≤ 10 人仍在 10 GB 免费额度内）。我倾向 ②，简单直接。 | 改 04、05，P3 前 |
| 趋势可比性 | **同意** | 趋势按**拍摄时间**排序；只比较视角、包版本、`recipe_hash` 中关键参数一致的结果，重算历史不产生新的"训练记录"。 | 改 04，P3 前 |

**需要你决定的**
- 上表的整体处理方式是否接受（尤其 G04"首版不默认纠错"、G05"P1 缩小恢复范围"、配额选 ②）。
- 新增问题 Q8–Q10（见上方"待确认问题"），以及仍未回答的 Q1–Q3。

**确认后的工作**（不涉及部署）
1. designs 升级到 v0.3：按上表修改 01、02、03、04、05、06、07，ADR-002 / ADR-004 修订，必要时新增 ADR（时间模型、质量契约）。
2. `AGENTS.md` 增加不变量：指标必须带状态；插补不得提高资格；未验证规则不生成纠错提示；云端报告不含图像。
3. P1 第一个里程碑采用 GPT 建议的**最小端到端闭环**：iPhone 选一段短视频 → 骨架与时间轴正确 → 输出可信指标或明确的拒绝原因 → 导出并重新导入。

### 2026-10-29 · 确认 iPhone 为主平台、使用 workers.dev

**用户确认**：主要用 iPhone（Q4）；域名暂时用 workers.dev（Q7）。

**iPhone 为主平台带来的变化**
- 验收标准以 iPhone Safari 为准（iOS 17+，推荐 18.4+）；Android 从"必测"降为"尽力支持"。
- iPhone 上所有浏览器都是 WebKit 内核，兼容性看 iOS 版本，不看浏览器品牌；新增 spike 项 M8（iPhone 上的 Chrome 和微信内置浏览器）。
- 样例视频的 HEVC/HDR 问题在 iPhone 上基本不存在（Safari 原生解码），P1 第一风险从"能否解码"变为"**内存、发热和后台挂起**"。
- 新增 iPhone 拍摄建议：1080p60、关闭 HDR 视频，格式保持"高效"即可（07 第 4.1 节）。
- 开发机是 Windows，没有 Mac 就用不了 Safari Web Inspector → P1 要先做**应用内诊断面板**（能力探测、逐帧耗时、错误日志、导出 JSON）。
- 本地 HTTPS 用 mkcert，并在 iPhone 上安装、信任本地 CA。

**workers.dev 与 Access**（已查 Cloudflare 官方文档）
- self-hosted Access 应用的域名可以是 workers.dev 主机名或路径 → 用 `action-tracker.<子域>.workers.dev/api` 只保护 API，**不需要自定义域名**。
- 关键陷阱：Worker 设置里的"保护此 Worker"会锁住该 Worker 的全部 URL，包括 SPA，不能使用。
- 部署时仍需实测路径保护和 `/api/health` 放行是否生效。

### 2026-10-29 · 设计评审修订（v0.2）

对 v0.1 做了一次独立设计评审，共 14 条意见。关键事实先查证再修改（例如核对 `@mediapipe/tasks-vision` 1.2.0 的类型定义：`detectForVideo()` 是同步调用，`canvas` 选项接受 `OffscreenCanvas`）。

**姿态管线（02）**
- 视频哈希改为 WASM 增量 SHA-256（`crypto.subtle.digest` 不支持流式，大视频会占满内存）。
- 明确 HDR→SDR 色调映射会影响推理，统一转换路径并在 spike 中对比。
- 解码路径 A 使用 CTS + edit list，处理 B 帧重排；路径 B（`requestVideoFrameCallback`）回调频率 ≤ min(视频帧率, 屏幕刷新率)，低于分析包 `minFps` 时不出结论性指标。
- `PoseProvider.detect` 改为同步；Worker 中 GPU 推理需传入 `OffscreenCanvas`，失败时重建为 CPU 实例。
- 滤波前先**重采样到均匀采样率**；Butterworth 截止频率必须远低于 Nyquist（30 fps 不能用 15 Hz）。
- PTRK：raw 定义为"已选目标、未滤波"；image 补上 z（4 个分量）；little-endian；`-32768` 为缺失值；定义 flags 位；体积更正为 **0.4–0.6 MB / 10 s**（raw + processed）。

**分析包（03）**
- 网球"击球时刻"改称**挥拍速度峰值**：没有球/拍检测时无法知道真实触球时刻；`contact_offset` 标记为未验证，不产生提示。
- 深蹲：站立基线改为自动检测稳定站立段；脚跟抬起用同一帧内脚跟–脚尖几何计算（不受整体平移影响）；"髋低于膝"标为代理指标并校正相机横滚。

**数据与 API（04、05）**
- `athlete_id` 和目标描述从 recordings 移到 **analyses**：一个视频可能包含多个人、多个动作。
- 新增 `event_phases`、`annotations` 表，`findings.message_key`；标注按"分析 + 运动员 + 运动包"保存。
- 生命周期 `uploading → complete → deleting`：完成前 HEAD 校验 blob；`complete` 后不可覆盖；删除顺序 标记 → R2 → D1，幂等可重试；Cron 清理超时上传。
- 用户以 Access JWT 的 `iss + sub` 标识，Worker 校验 RS256、`iss`/`aud`/`exp`，缓存 JWKS 并处理 `kid` 轮换；新增账号删除、每用户 200 MB 配额。
- 本地 OPFS 调用 `storage.persist()` / `storage.estimate()`，支持导出备份。
- wrangler 草案增加 `observability.traces`（已核对官方文档字段）。

**鉴权思路的修正（ADR-007 修订）**
- 原方案"Access 保护整个应用"与"匿名用户也能本地使用"相矛盾。改为**只保护 `/api/*`**，登录用顶层导航到 `/api/auth/login`（fetch 遇到 Access 跳转会因 CORS 失败）。
- 新的待验证项：workers.dev 子域能否按路径配置 Access，不行则需要自定义域名（Q7）。

### 2026-10-29 · 手机浏览器可行性确认

**问题**：项目能否在手机浏览器上实现？

**结论**：可以，手机设为一等目标平台（[ADR-010](designs/06-decisions.md)，详见 [designs/07-mobile-web.md](designs/07-mobile-web.md)）。

**依据**（MDN browser-compat-data 与 MediaPipe 官方文档，2026-10-29 查询）
- WebCodecs `VideoDecoder`：iOS Safari 16.4+、Android Chrome 94+；Firefox Android 不支持 → 用 `<video>` 回退路径。
- Web Worker 中 MediaPipe GPU 推理需要 OffscreenCanvas `webgl2`：iOS **17+**。
- OPFS：iOS 15.2+、Android Chrome 109+。Wake Lock：iOS **18.4+** 完整支持。
- MediaPipe 官方只说明支持 "Chrome or Safari"，没有移动端性能承诺 → 必须实测。

**思考**
- iPhone 是拍摄设备，Safari 原生支持 HEVC/HDR，在手机上分析 iPhone 视频反而比 Windows Chrome 更顺。
- 真正的风险不是"API 有没有"，而是**内存上限、切后台被挂起、发热降频、从相册选择时被转码、慢动作视频时间戳**。这些会直接影响网球高帧率分析的正确性，必须在 P1 验证。
- 不做原生 App；只有移动端 spike 不达标时再评估。

**新增 P1 任务**：移动端 spike M1–M7（见 07 第 6 节）；开发服务器配置本地 HTTPS，以便手机测试。

### 2026-10-29 · 架构设计 v0.1

**做了什么**
- 解析样例视频文件头（未修改视频）。
- 核对 Cloudflare Workers / R2 / D1 / Queues 免费额度与 Workers AI 模型目录。
- 核对 MediaPipe tasks-vision 版本与模型大小。
- 完成设计文档 01–06、`AGENTS.md`。

**关键发现**
1. 样例视频是 iPhone 16 Pro 默认格式：**HEVC Main10 + HLG HDR + Dolby Vision，4K60，竖屏**。这在 Chrome / Edge / Firefox 上能否解码取决于系统和 GPU → 兼容性是 P1 的第一风险，必须先做 spike。
2. Workers Free 只有 **10 ms CPU / 请求** → 推理和分析不可能放在 Worker，整体必须 client-heavy。
3. Workers AI 没有姿态模型；Containers 要付费 → 免费方案下浏览器端推理是唯一选择，与"网页应用"方向一致。
4. MediaPipe heavy 模型 29.2 MB 超过静态资源 25 MiB 上限 → heavy 放 R2。
5. 7.7 秒视频就有 51 MB → 视频上传云端在成本和隐私上都不划算，坚持本地优先。

**关键思考与取舍**
- **把"姿态轨迹"而不是"视频"当作核心数据**：体积小两个数量级（10 秒约 0.4–0.6 MB，含 raw + processed；v0.2 更正），可同步、可重算、隐私风险更低。
- **网球与健身差异很大**：健身是周期动作（状态机计数即可），网球是快速离散动作（需要高帧率、击球检测、多人筛选，而且缺少球拍/球信息）。因此采用"通用管线 + 可插拔分析包"，而不是两个独立应用。
- **诚实对待单目 2D 精度**：每个包定义拍摄规范、置信度门控，实验性指标（动力链、肩髋分离）不生成提示。
- **先 Gym 后 Tennis**：深蹲信号清晰、易于人工验证，适合先打通管线；网球在 P2 用相同管线扩展。
- **Cloudflare Access 作为 v1 鉴权**：避免一开始就自建账号系统。

**下一步（P1 本地原型）**（已被 2026-10-29 v0.3 日志中的"下一步"取代）
1. 回答待确认问题 Q1–Q3（Q4、Q7 已确认）。
2. 初始化 git（`.gitignore` 排除 `videos/`、`node_modules/`、`.dev.vars`、`.wrangler/`）。
3. 搭建 pnpm monorepo 与 `apps/web`（Vite + React + TypeScript）。
4. **Spike A：解码兼容** — 在目标浏览器上对 `sample1.MOV` 测试 WebCodecs / `<video>` 解码、旋转处理、逐帧耗时。
5. **Spike B：推理性能** — lite / full / heavy × GPU / CPU 每帧耗时，记录到本文件。
6. **Spike C：iPhone** — iPhone Safari 验收项 M1–M8（[designs/07-mobile-web.md](designs/07-mobile-web.md)），先做应用内诊断面板；Android 可选。
7. 骨架叠加回放 + 关节角度曲线 + PTRK 导出。
8. `gym.squat` v0 与第一个 fixture。

### 2026-10-29 · 工具调研与方向确定

- 调研 GitHub 开源姿态工具：**Sports2D**（直接分析运动视频、关节角度，BSD-3）、**MediaPipe**（跨平台、浏览器可运行，Apache-2.0）、**MMPose**（模型丰富、可训练，Apache-2.0）。
- 确定产品形态为**网页应用** → 选择 MediaPipe 作为浏览器端推理引擎；Sports2D / MMPose(RTMPose) 作为后续精度对比基准或服务端扩展选项。
- 账号条件：Cloudflare Free tier，可使用基础 Workers。
