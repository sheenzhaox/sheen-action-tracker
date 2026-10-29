# 05 · Cloudflare 平台方案

> 状态：v0.3 草案 · 限额核对日期：2026-10-29 · 更新：2026-10-29（GPT 评审修订：30 s 片段容量、1 GB 配额、R2 sha256、并发） · **当前阶段不创建任何云资源、不部署**

## 1. 产品选型

| 需求 | 产品 | 阶段 | 角色 |
|---|---|---|---|
| 托管 SPA + API | **Workers + Static Assets** | P3 | 单个 Worker 同时提供前端静态文件和 `/api/*` |
| 姿态文件、报告、大模型 | **R2** | P3 | 对象存储，无出口流量费 |
| 元数据、事件、指标查询 | **D1** | P3 | SQLite 语义，支持趋势查询 |
| 登录与访问控制 | **Cloudflare Access**（Zero Trust） | P3 | v1 无需自建账号系统；Worker 校验 Access JWT |
| 本地开发 | **Wrangler + `@cloudflare/vite-plugin`** | P1 起 | 本地模拟 Worker、D1、R2 |
| 文字版教练总结 | Workers AI（文本模型） | P5（可选，且需 Q8 解除"只做测量"） | 输入**指标 JSON**（不是视频）生成自然语言描述；需核对免费额度 |
| 公开注册防滥用 | Turnstile | 公开发布时 | v1 用 Access，不需要 |
| 产品使用统计 | Web Analytics / Workers Analytics Engine | 后续 | 不采集视频与姿态数据 |

### 当前不使用及原因

| 产品 | 原因 |
|---|---|
| Workers AI（用于姿态） | 模型目录中没有人体姿态估计模型（2026-10-29 核对） |
| Stream | 付费产品；v1 不存储视频 |
| Containers | 需要付费计划；v1 不做服务端推理 |
| Queues / Workflows | v1 没有服务端异步任务（推理在客户端）；P5 服务端推理时再引入 |
| Durable Objects | 没有需要协调的共享实时状态；实时多人教练场景再评估 |
| KV | 配置随代码发布即可；没有高读低写的全局数据需求 |

## 2. 免费额度对照

| 资源 | 免费额度 | 本设计的使用方式 | 余量判断 |
|---|---|---|---|
| Workers 请求 | 100,000 / 天 | 一次分析同步约 7–10 个请求（建分析、4 个 blob、complete 等）；静态资源请求不计费（以官方说明为准） | 充足 |
| Workers CPU | 10 ms / 请求 | 只做鉴权、校验、路由、流式转存；sha256 校验由 R2 完成 | 需在实现时监控 |
| 请求体 | 100 MB | 单个 blob ≤ 10 MB；30 s 分析合计约 3–4 MB | 充足 |
| 静态资源 | 单文件 25 MiB，每版本 20,000 个文件 | lite 5.5 MB、full 9.0 MB 可作静态资源 | heavy 29.2 MB 需放 R2 |
| 子请求 | 50 / 请求 | D1 `batch()` 计为一次查询 | 充足 |
| R2 存储 | 10 GB-月（整个账号共享） | 30 s 分析约 3–4 MB；每用户配额 1 GB | **首个可能触顶的资源**，见第 3 节 |
| R2 Class A | 100 万次 / 月 | 每次分析 4 次 PUT | 充足 |
| R2 Class B | 1,000 万次 / 月 | 回放、模型读取、complete 时的 head | 充足 |
| D1 | 每库 500 MB，账户 5 GB，最多 10 个库 | 每次分析约 2–20 KB | 数万次分析 |
| Queues | 10,000 次操作 / 天，保留 24 h | 未使用 | — |

> 实施和部署前必须重新核对 [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)、[R2 pricing](https://developers.cloudflare.com/r2/pricing/)、[D1 limits](https://developers.cloudflare.com/d1/platform/limits/)。

## 3. 容量估算（30 s 片段，Q9）

单次分析的云端体积：原始 PTRK 1.2–1.8 MB + 处理后 PTRK 1.2–1.8 MB + 报告与 manifest 约 0.3 MB ≈ **3–4 MB**（见 02 第 9 节）。

| 场景 | 每月分析 | R2 每月新增 | 10 GB 免费额度可用多久 | 1 GB 个人配额可用多久 |
|---|---|---|---|---|
| 个人：每周 5 段 | ~22 | ~80 MB | 约 10 年 | 约 1 年 |
| 小团队：5 名运动员各每周 20 段（教练一个账号） | ~430 | ~1.5 GB | **约 6 个月** | **不到 1 个月** |

| 其他项目（小团队） | 每月 | 免费额度占用 |
|---|---|---|
| D1 新增 | ~430 × 10 KB ≈ 4 MB | 很低 |
| Worker 请求 | ~430 × 10 + 浏览 ≈ 1 万 | 远低于每日上限 |

结论：

- 个人使用时瓶颈在**用户设备性能**；小团队全量同步时 **R2 存储是第一个瓶颈**（不是请求数或 CPU）。
- Q11 用户决定**暂不处理**（v1 使用者为本人 + 少量教练）；保留 1 GB 默认配额，P3 实施前或 v2 公开前再从以下办法中选择：①云端只存原始 PTRK + manifest + 报告，处理后 PTRK 由客户端按 manifest 重算（约减半，≈ 1.5–2 MB / 次）；②同步改为用户选择"保存到云端"，而不是全部自动同步；③付费 R2 超出 10 GB 后按量计费，费用很低（实施前核对价格）。
- 1 GB 是每用户的默认值，D1 中可按用户调整；所有用户合计仍受账号 10 GB 限制。
- 如果未来上传视频，R2 存储会成为首要成本（样例约 6.6 MB / 秒），需要先在浏览器降采样转码。

## 4. Worker 配置草案（未创建）

```jsonc
// apps/web/wrangler.jsonc —— 草案，P3 再创建
{
  "name": "action-tracker",
  "main": "./worker/index.ts",
  "compatibility_date": "<实施当天日期>",
  "assets": {
    "directory": "./dist/client",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*", "/models/*"]
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "action-tracker", "database_id": "<创建后填写>" }
  ],
  "r2_buckets": [
    { "binding": "DATA", "bucket_name": "action-tracker-data" }
  ],
  "vars": {
    "ACCESS_TEAM_DOMAIN": "<team>.cloudflareaccess.com"
  },
  // 释放超时上传的预留、清理 failed 分析、按墓碑补删 R2 对象、清理孤儿上传
  "triggers": { "crons": ["17 3 * * *"] },
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1,
    "traces": { "enabled": true, "head_sampling_rate": 0.1 }
  }
}
```

- Access 应用的 AUD 标签作为 Worker secret（`ACCESS_AUD`），不写入代码。
- **域名**：v1 使用 workers.dev（`workers_dev` 默认为 true，不配置 `routes`）。Access 用"workers.dev 主机名 + `/api`"的 self-hosted 应用，不开启 Worker 级 Access（见 [04-data-and-api.md](./04-data-and-api.md) 5.1）。
- Cron 处理器同样受 Free 计划 CPU 限制：每次只处理少量记录（例如 50 条），剩余的留到下次。
- 实施时以已安装 Wrangler 版本的 `config-schema.json` 为准核对字段（尤其是 `observability.traces`）。

## 5. 安全设计

| 主题 | 措施 |
|---|---|
| 身份 | Cloudflare Access **只保护 `/api/*`**（`/api/health` 除外），SPA 与模型公开，匿名用户可在本地完整使用；登录通过顶层导航到 `/api/auth/login`。Worker 校验 `Cf-Access-Jwt-Assertion`：RS256 签名（JWKS 缓存，未知 `kid` 时刷新）、`iss`、`aud`、`exp`，**不只信任请求头存在**。用户以 `iss + sub` 标识，邮箱为可变属性。详见 [04-data-and-api.md](./04-data-and-api.md) 5.1 |
| 授权 | 所有查询带 `owner_id = 当前用户` 条件，且**每个被引用的行**（录像、运动员、分析）都检查归属；R2 key 由服务端按用户前缀和一次性 `uploadId` 生成 |
| 输入校验 | zod 校验；限制请求体大小、事件与指标数量、字符串长度 |
| 完整性 | blob 的 SHA-256（压缩后字节）通过 R2 `put(..., { sha256 })` 由存储层校验，不信任客户端自报的元数据；`complete` 后对象不可覆盖 |
| 并发 | 状态迁移用条件更新（`WHERE status = '<期望状态>'`），与配额计数在同一 `batch()` 事务中，重放与并发只生效一次（见 04 第 5.2 节） |
| 配额 | 每用户默认 1 GB R2 配额；创建分析时按预计大小**预留**，complete 时按实际大小结算；超时上传由 Cron 释放 |
| 数据最小化 | 默认不上传视频；云端报告不含图片（关键帧截图只在本地）；姿态数据不含人脸图像，但仍视为个人数据 |
| 删除 | 删除录像 / 分析 / 账号：一个事务内标记 `deleting`、写入墓碑、扣减配额、删除 D1 行；R2 对象随后删除，失败由 Cron 按墓碑重试（见 04 第 5.2 节） |
| 未成年人 | 青少年网球场景常见：上传视频（P5）前需要监护人同意流程 |
| 机密 | 只用 Worker secrets；不提交 `.dev.vars` |
| 依赖 | 锁定 MediaPipe 与模型版本；模型自托管，避免运行时第三方脚本 |
| 浏览器 | CSP 只允许自身来源（含 `wasm-unsafe-eval` 以运行 MediaPipe WASM） |

## 6. 环境与发布流程

| 环境 | 用途 | 资源 |
|---|---|---|
| local | 日常开发 | `wrangler dev` / Vite 插件的本地 D1、R2 模拟 |
| preview | 验证 PR / 分支 | 独立 D1 库与 R2 bucket（避免污染生产数据） |
| production | 正式使用 | 生产 D1 / R2 |

规则：

1. **当前阶段（P0–P2）不创建云资源、不部署。**
2. 进入 P3 后，创建资源和每次部署都需要用户明确批准。
3. D1 schema 只通过 migrations 变更；先在 local 和 preview 执行。
4. 回滚 Worker 版本不会回滚 D1 / R2 数据，migration 需保持向后兼容。

## 7. 付费升级路径（参考）

| 触发条件 | 方案 |
|---|---|
| 需要服务端推理（低端设备、批量处理、更大模型） | Containers（付费）或外部 GPU 服务；配合 Queues / Workflows 编排 |
| 需要视频存储与转码 | R2 + 浏览器端转码；或 Stream（付费） |
| Worker 需要更多 CPU | Workers Paid（CPU 可配置到更高上限） |
