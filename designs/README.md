# Action Tracker 设计文档

> 状态：**v0.3 设计 + P1 本地脚手架（未部署）** · 更新：2026-10-30（Q12 已确认；MASTER v0.3 采用 SpaceX-inspired 黑白排版方向；ADR-014 shadcn/ui + Tailwind，ADR-015 持拍手与反手类型属于运动员档案，ADR-016 UI 视觉方向）

Action Tracker 是一个网页应用：把运动视频转换为人体骨架数据，再按运动项目（网球、健身）进行动作测量，输出次数、阶段、关节角度、节奏，以及每个指标是否可信。**v1 只做测量，不做动作纠错。**

## 阅读顺序

| # | 文档 | 内容 |
|---|---|---|
| 01 | [架构总览](./01-architecture.md) | 目标、约束、系统组成、数据流、仓库结构、路线图、风险 |
| 02 | [视频与姿态管线](./02-pose-pipeline.md) | 视频导入、HEVC/HDR 兼容、时间模型、解码、推理、线程模型、跟踪、后处理、姿态文件格式、manifest、暂停/继续 |
| 03 | [分析引擎与运动包](./03-analysis-packs.md) | 特征计算、竖直参考、动作分段、Gym / Tennis 指标与状态、质量门控、拍摄规范、验证方法 |
| 04 | [数据模型与 API](./04-data-and-api.md) | D1 表结构、R2 对象布局、Worker API、上传生命周期与配额、本地存储与导出 |
| 05 | [Cloudflare 平台方案](./05-cloudflare-platform.md) | 产品选型、免费额度对照、容量估算、安全、环境 |
| 06 | [架构决策记录 (ADR)](./06-decisions.md) | 关键决策、备选方案与取舍 |
| 07 | [移动端浏览器方案](./07-mobile-web.md) | 手机浏览器可行性、API 支持基线、手机特有风险、移动端 spike |
| 08 | [UI/UX 设计](./08-ui-ux.md) | 信息架构、主流程、各页面规格、骨架与关键关节显示、状态文案、iPhone 细节、可访问性 |
| — | [设计系统 MASTER](./design-system/action-tracker/MASTER.md) | 颜色 token（含对比度）、字体、间距、骨架叠加样式、组件规格、反模式、交付检查清单 |
| — | [UI 静态原型](./mockups/ui-mockup.html) | 5 个 iPhone 竖屏页面，深/浅主题；浏览器直接打开（早期中文版） |
| — | [shadcn 备选 A · Workbench](./mockups/mock-ui-shadcn.html) | 英文；紧凑工作台，回放 + 检查器双栏（nova） |
| — | [shadcn 备选 B · Library + Session](./mockups/mock-ui-shadcn-b.html) | 英文；侧边栏 + 记录库数据表 + 会话仪表盘（lyra） |
| — | [shadcn 方案 C · Mobile focus（✅ 已选定）](./mockups/mock-ui-shadcn-c.html) | 英文；iPhone 优先，底部抽屉；单腿蹲模式为 **sample1 真实视频 + 真实 MediaPipe 骨架叠加**（需本地 HTTP 打开），网球模式为合成示意（maia） |
| — | [SpaceX-inspired UI 原型（已实现于 Records / Import）](./mockups/mock-ui-spacex.html) | 英文；黑白工程感 display、桌面横向导航、手机底部导航；仅作应用视觉方向参考 |
| — | [mockups/assets/](./mockups/assets/) | C 用的素材：`sample1-360p.mp4`（本地缩小转码）与 `sample1-pose.json`（离线 Pose Landmarker heavy 33 点结果）；源于 `videos/`，不得外传 |
| — | [mockups/tools/extract_pose.py](./mockups/tools/extract_pose.py) | 离线重新生成上述素材并写回 C 的内嵌姿态数据（安装与模型下载见文件头） |

## 一句话架构

**浏览器负责重活（解码 + MediaPipe 推理 + 分析），Cloudflare 负责轻活（托管、鉴权、元数据、姿态文件存储）；视频默认不离开用户设备。**

## 维护约定

- 设计变更先改本目录对应文档，再在 [workflow.md](../workflow.md) 记录原因。
- 新的重要决策追加到 [06-decisions.md](./06-decisions.md)，不要改写已接受的 ADR，用新 ADR 取代。
- 涉及 Cloudflare 限额、价格的内容必须注明核对日期。
