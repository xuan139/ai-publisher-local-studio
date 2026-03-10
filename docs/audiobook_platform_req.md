# Audiobook Platform REQ

## 1. 文档目的

本文档用于收敛当前目录内已有的产品、架构、Web 设计与 Schema/API 草案，形成一份可执行的 `REQ` 基线文档，作为第一期 audiobook 平台立项、设计、开发与验收的统一输入。

本文档聚焦 `Phase 1: Audiobook Production Platform`，同时要求底层模型兼容未来扩展到：

- `comic`
- `video`
- `SBS content`

## 2. 文档范围

本文档覆盖：

- Phase 1 audiobook 平台的业务目标
- 用户角色与核心流程
- 功能需求
- 非功能需求
- 数据与架构约束
- 第三方集成要求
- 验收基线

本文档不覆盖：

- Public Publishing 站完整发布能力
- 多角色戏剧化演绎
- DAW 级音频编辑
- 漫画、视频、SBS 的具体生产流程

## 3. 背景与目标

### 3.1 背景

当前目标不是做一个一次性 audiobook 工具，而是先落地一套可持续演进的 AI 出版生产平台。第一阶段以 audiobook 为切入点，解决长文本内容到可交付音频章节的稳定生产问题。

### 3.2 产品目标

平台需要支持运营、制作与审核人员在浏览器内完成以下闭环：

1. 导入文本内容
2. 自动拆章拆段
3. 编辑可朗读文本
4. 配置默认 narrator voice 与参数
5. 发起批量 TTS 生成
6. 自动执行 ASR/QC 检查
7. 人工逐段试听、标记问题、局部重生
8. 装配章节并导出交付物

### 3.3 成功标准

- 能稳定生产长篇 audiobook 章节
- 任意问题段可以局部返工而不影响其他段
- 文本、音频、参数、审核结果全链路可追踪
- Phase 1 交付后不需要推翻底层模型即可扩展到其他内容形态

## 4. 产品原则

### 4.1 Segment 是 Phase 1 的最小生产单元

Phase 1 的最小生产、审核、回滚与重生单位为 `Segment`。

### 4.2 所有编辑必须非破坏性

任何文本、音频、trim、重生成都不能直接覆盖历史结果，必须形成新版本或保留版本记录。

### 4.3 自动检查优先于人工检查

平台必须先完成自动质检，再将问题段优先暴露给人工审核，以降低听审成本。

### 4.4 audiobook 命名可保留，底层模型必须统一

界面与接口层可保留 `book/chapter/segment` 的直观命名，但数据库与核心领域模型应优先兼容统一抽象：

- `Work`
- `Edition`
- `Chapter`
- `Unit`
- `Asset`
- `AssetVersion`
- `Job`
- `Release`

## 5. 角色与用户

### 5.1 角色

- `Admin`：项目管理、权限管理、voice 模板管理、查看成本、导出结果
- `Operator`：文本编辑、批量生成、局部重生、章节装配
- `Reviewer`：试听、问题标记、通过/退回审核

### 5.2 核心用户

- 内容运营
- 配音生产操作员
- 质检人员
- 项目管理员

## 6. 核心业务流程

### 6.1 标准流程

1. 新建项目或作品版本
2. 导入 `txt/md/docx`
3. 自动拆章拆段
4. 操作员整理 `tts_text`
5. 配置 narrator voice、provider、speed、style
6. 批量生成选中章节或选中 Segment
7. 自动执行 ASR 与技术质检
8. 审核员逐段试听并处理问题
9. 对问题段执行改文、换 voice、调参数或 trim
10. 将审核通过的段装配为章节
11. 导出章节音频、整书压缩包与报告

### 6.2 问题段处理流程

1. 系统或人工发现问题
2. 打开目标 Segment
3. 对比 `source_text`、`tts_text`、ASR 文本与 diff
4. 选择以下动作之一：

- 修改 `tts_text` 后重生
- 保持文本，仅更换 voice
- 保持文本，仅调整 speed/style
- 保持音频，仅调整 trim
- 标记为人工通过

## 7. 功能需求

### 7.1 项目与作品管理

- `REQ-001` 系统必须支持创建 audiobook 项目，并记录标题、作者、语言、状态、默认 provider、默认 voice。
- `REQ-002` 系统必须支持查看项目列表，并展示章节数、待审核段数、失败任务数、更新时间等摘要信息。
- `REQ-003` 系统必须支持项目归档，但归档不删除历史生产数据。
- `REQ-004` 系统应支持复制项目模板，用于复用 voice、参数与流程配置。

### 7.2 文本导入与拆章拆段

- `REQ-005` 系统必须支持导入 `txt`、`md`、`docx` 文件。
- `REQ-006` 系统必须在导入后自动完成章节识别与初步拆分。
- `REQ-007` 系统必须支持按规则将章节拆分为 Segment。
- `REQ-008` 系统必须支持手工拆段、合段、调整顺序与段边界。
- `REQ-009` 系统必须同时保留 `source_text` 与 `tts_text`。
- `REQ-010` 系统应提供朗读稿清洗建议，包括标点优化、断句优化和不可朗读内容剔除建议。

### 7.3 声音与发音配置

- `REQ-011` 系统必须支持配置默认 narrator voice profile。
- `REQ-012` 系统必须支持设置 provider、voice id、model、speed、style、instructions。
- `REQ-013` 系统必须支持章节级和段级覆盖默认 voice 配置。
- `REQ-014` 系统应支持试听 voice 样本。
- `REQ-015` 系统应支持发音规则管理，至少支持 `target_text`、`replacement_text`、`phonetic_hint`、启用状态。

### 7.4 生成任务

- `REQ-016` 系统必须支持单段生成与整章批量生成。
- `REQ-017` 所有生成、ASR、QC、render、export 任务必须异步执行。
- `REQ-018` 系统必须记录每次生成的 provider、model、voice profile、输入文本摘要、request id、任务状态与错误信息。
- `REQ-019` 系统必须支持失败任务重试与未完成任务取消。
- `REQ-020` 系统必须允许对单个失败段局部重跑，而不阻塞其他段继续生产。

### 7.5 音频版本管理

- `REQ-021` 每个 Segment 必须支持多个音频版本。
- `REQ-022` 系统必须标识当前主版本，同时保留全部历史版本。
- `REQ-023` 系统必须支持版本对比与 A/B 试听。
- `REQ-024` 系统必须记录版本来源，至少包括 `generated`、`edited`、`uploaded`。
- `REQ-025` 系统必须支持非破坏性 trim，并保留 trim 参数。

### 7.6 自动质检与人工审核

- `REQ-026` 系统必须支持对生成音频执行 ASR 回听。
- `REQ-027` 系统必须支持 `tts_text` 与 ASR 文本 diff，并标记疑似漏读、多读、数字错读。
- `REQ-028` 系统必须执行基础音频技术质检，至少包括削波、静音过长、响度异常、时长异常。
- `REQ-029` 系统必须支持自动问题与人工问题统一归档为 `review issue`。
- `REQ-030` 审核页必须支持播放、暂停、循环、定位、倍速、问题标记、通过、退回、重生。
- `REQ-031` 审核员应可在单页内完成试听、标注、重生与跳转下一段。

### 7.7 章节装配与导出

- `REQ-032` 系统必须支持将已通过 Segment 拼接为章节音频。
- `REQ-033` 系统必须支持设置段间 gap，并可插入章节标题音频。
- `REQ-034` 系统必须保存章节 render 历史版本。
- `REQ-035` 系统必须支持导出每章 `mp3`。
- `REQ-036` 系统必须支持导出整书 `zip`。
- `REQ-037` 系统应支持导出 manifest 与审核报告。

### 7.8 日志、审计与追踪

- `REQ-038` 系统必须记录关键操作日志，包括创建、更新、生成、审核、导出。
- `REQ-039` 任意音频结果必须可追踪到文本版本、参数版本、请求记录与审核结果。
- `REQ-040` 系统必须记录任务发起人、审核人、处理时间与结果状态。

## 8. 非功能需求

### 8.1 性能

- `NFR-001` 列表页在 `1,000` 个 Segment 规模下应可流畅筛选与切换。
- `NFR-002` 单段波形应在 `2 秒` 内可见。
- `NFR-003` 任务状态刷新延迟应不超过 `5 秒`。

### 8.2 可靠性

- `NFR-004` 任意单段生成失败不得阻塞其他段生成。
- `NFR-005` 所有长任务必须可重试。
- `NFR-006` 导出结果必须基于明确的章节 render 或已审核段集合生成。

### 8.3 可审计性

- `NFR-007` 平台必须保留生成参数和 provider request id。
- `NFR-008` 平台必须保留审核记录与审核人。
- `NFR-009` 平台必须保留历史版本与关键操作日志。

### 8.4 易用性

- `NFR-010` 审核页必须支持快捷键操作，至少包括 `Space`、`A`、`R`、`G`、`N`、`P`。
- `NFR-011` 问题段应在列表中优先可见，不要求用户先展开详情才能发现问题。
- `NFR-012` 桌面端是主生产终端，移动端只要求支持查看与轻审核。

## 9. 数据与架构约束

### 9.1 数据模型要求

- `ARC-001` Phase 1 可以在产品语义上使用 `book/chapter/segment`，但数据库主模型应优先兼容 `work/edition/unit/asset`。
- `ARC-002` `Unit` 不得在模型层写死为 `segment`，应通过 `unit_type` 扩展。
- `ARC-003` 所有实际文件必须统一归档到 `Asset` / `AssetVersion` 体系。
- `ARC-004` 生成任务幂等键应至少包含：`unit_id + text_hash + voice_profile_id + provider + model`。

### 9.2 系统架构要求

- `ARC-005` 第一阶段必须采用模块化单体，不做微服务拆分。
- `ARC-006` 平台至少应包含 `studio-web`、`api`、`worker` 三个核心运行单元。
- `ARC-007` AI provider 调用必须通过统一 `AI Gateway` 封装，不允许业务代码直接散落调用第三方。
- `ARC-008` `MCP` 或 `Agent Runtime` 只能作为工具编排与建议生成层，不能直接持久化核心业务状态。

### 9.3 基础设施要求

- `ARC-009` 前端推荐 `Next.js + TypeScript`。
- `ARC-010` 后端推荐 `FastAPI + PostgreSQL + Redis`。
- `ARC-011` 媒体处理必须依赖 `FFmpeg`。
- `ARC-012` 文件存储必须使用 `S3-compatible storage`。

## 10. 第三方集成要求

### 10.1 TTS Provider

- `INT-001` Phase 1 至少支持一个主 TTS provider，优先考虑 `ElevenLabs`。
- `INT-002` 若使用 ElevenLabs 生成长文本 audiobook，系统应保留 `request id` 并为上下文连续性预留 stitching 能力。
- `INT-003` provider 适配层必须具备参数标准化、错误归一、成本统计与 fallback 扩展能力。

### 10.2 ASR 与 QC

- `INT-004` 平台必须支持 ASR 回听能力，用于文本一致性检查。
- `INT-005` QC 结果必须可结构化存储，便于前端展示 diff、分数与 flags。

## 11. 界面与交互要求

### 11.1 信息架构

Studio 一级导航建议包含：

- `Projects`
- `Pipeline`
- `Review`
- `Voices`
- `Exports`
- `Settings`

书内二级导航建议包含：

- `Overview`
- `Text Prep`
- `Voice Setup`
- `Generate`
- `Review`
- `Assemble`
- `Export`

### 11.2 页面要求

- `UI-001` 项目列表页必须支持搜索、筛选、批量操作与高密度表格。
- `UI-002` 文本准备页必须支持 `source_text` 与 `tts_text` 双栏对照编辑。
- `UI-003` 生成工作台必须提供任务表格、日志区、批量生成与失败重试入口。
- `UI-004` 校对页必须采用三栏结构，优先优化段切换、试听、diff 与问题处理效率。
- `UI-005` 每个核心页面都必须具备空状态、加载状态、无结果状态和错误状态。

## 12. Phase 1 边界

### 12.1 本期必须交付

- 文本导入
- 自动拆章拆段
- narrator 单声线配置
- 批量 TTS 生成
- 段级试听与局部重生
- ASR diff 与基础 QC
- 问题标记与审核状态流转
- 章节拼接
- 章节 `mp3` 与整书 `zip` 导出

### 12.2 本期不做

- 多角色戏剧化演绎
- 全功能 pronunciation dictionary 高级规则引擎
- 复杂混音与配乐
- DAW 级时间线编辑
- 完整 public publishing 平台
- 多人审批流
- `m4b` 完整出版封装

## 13. 验收标准

### 13.1 业务验收

- 能从原始文档导入并完成章节与 Segment 生成
- 能对任意 Segment 编辑 `tts_text` 并触发重新生成
- 能在审核页完成试听、问题标记、通过/退回
- 能对已通过段装配出完整章节音频
- 能导出章节 `mp3` 与整书 `zip`

### 13.2 系统验收

- 任一音频版本都可回查到对应文本、参数与请求记录
- 失败任务支持局部重试
- 问题段在 UI 中可快速定位
- 旧版本音频可在短时间内找到并对比
- 核心状态机与操作日志完整可查

## 14. 后续演进要求

- `EXT-001` Phase 2 增加 `comic edition` 时，不应重做核心数据库框架。
- `EXT-002` Phase 3 增加 `video edition` 时，应复用已有工作流、审核、版本与发布机制。
- `EXT-003` Phase 4 增加 `SBS edition` 时，应仅新增相应 `edition type`、`unit type`、`asset type` 与处理规则。

## 15. 参考文档

- [audiobook_platform_prd.md](/Users/lijiaxi/Documents/AI publisher/docs/audiobook_platform_prd.md)
- [publishing_platform_architecture.md](/Users/lijiaxi/Documents/AI publisher/docs/publishing_platform_architecture.md)
- [audiobook_platform_schema_api.md](/Users/lijiaxi/Documents/AI publisher/docs/audiobook_platform_schema_api.md)
- [audiobook_phase1_schema_api.md](/Users/lijiaxi/Documents/AI publisher/docs/audiobook_phase1_schema_api.md)
- [audiobook_platform_web_overview.md](/Users/lijiaxi/Documents/AI publisher/docs/audiobook_platform_web_overview.md)
