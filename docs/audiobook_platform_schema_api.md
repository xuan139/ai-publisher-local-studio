# Audiobook Platform Schema And API Design

## 1. 设计目标

本文档定义 audiobook 浏览器平台的核心数据模型、状态流转和 API 设计。重点保证：

- 文本和音频版本可追踪
- Segment 级别可重生和回滚
- 生成任务异步化
- 审核和导出可审计

## 1.1 Local Studio 当前实现补充

当前仓库中的本地版 `AI Publisher Local Studio` 已经在原始 audiobook 设计稿基础上落地了几项实际能力。为了避免“设计稿”和“当前代码状态”混淆，先补充如下：

- 项目支持 `project_type`
  - `audiobook`
  - `comic`
  - `motion_comic`
  - `video`
- `character_profiles` 已支持
  - `role_type`
  - `story_character_name`
  - 用于区分 `旁白 / 主角 / 配角 / 背景 / 自订`
- `segments` 已支持
  - `character_profile_id`
  - `voice_profile_id`
  - 分别对应“绑定角色声线”和“临时覆写声线”
- 文本准备页已支持
  - 按章人物自动识别
  - 批量自动创建角色并绑定段落
  - 多选连续段落后合并为一个段落
- 漫画 Phase 1 已补齐数据对象
  - `comic_scripts`
  - `comic_pages`
  - `comic_panels`

当前代码对应接口补充：

- `GET /api/chapters/{chapter_id}/character-detection`
- `POST /api/chapters/{chapter_id}/auto-bind-characters`
- `POST /api/segments/merge`
- `POST /api/projects/{project_id}/import-paste`
- `POST /api/projects/{project_id}/chapters`

当前项目导入行为补充：

- 支持文件上传导入
- 支持本机路径导入
- 支持直接粘贴整本内容后自动拆章
- 支持手动新增自定义章节
- 导入完成后会保存完整整书 `source_book.txt`
- project payload 会补充：
  - `cover_url`
  - `source_book_url`
  - `source_book_name`

当前经营管理实现补充：

- projects 已支持：
  - `business_base_currency`
  - `cover_path`
- 已落地经营实体：
  - `rights_records`
  - `cost_items`
  - `distribution_channels`
  - `sales_records`
  - `royalty_statements`
  - `exchange_rates`
  - `advertiser_deals`
  - `business_reports`
- 已落地经营接口：
  - `GET /api/projects/{project_id}/business`
  - `POST /api/projects/{project_id}/business-base-currency`
  - `POST/PATCH/DELETE /api/projects/{project_id}/rights-records/*`
  - `POST/PATCH/DELETE /api/projects/{project_id}/cost-items/*`
  - `POST/PATCH/DELETE /api/projects/{project_id}/distribution-channels/*`
  - `POST/PATCH/DELETE /api/projects/{project_id}/sales-records/*`
  - `POST/PATCH/DELETE /api/projects/{project_id}/royalty-statements/*`
  - `POST/PATCH/DELETE /api/projects/{project_id}/exchange-rates/*`
  - `POST/PATCH/DELETE /api/projects/{project_id}/advertiser-deals/*`
  - `POST /api/projects/{project_id}/business-reports/export`

说明：

- 本文档后续章节仍保留平台级设计视角
- 若以当前本地实现为准，应优先参考 `api/app/db.py`、`api/app/schemas.py`、`api/app/main.py`

## 2. 数据模型总览

核心实体：

- `users`
- `books`
- `chapters`
- `segments`
- `voice_profiles`
- `characters`
- `pronunciation_rules`
- `generation_jobs`
- `audio_takes`
- `review_issues`
- `chapter_renders`
- `export_tasks`
- `activity_logs`

## 3. 表设计

## 3.1 users

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 用户 id |
| email | varchar unique | 登录邮箱 |
| name | varchar | 用户名 |
| role | varchar | admin/text_editor/reviewer/delivery_manager/settings_manager |
| status | varchar | active/disabled |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

当前本地版默认会种入 5 个角色账号：

- `admin@example.com / admin123`
- `editor@example.com / editor123`
- `reviewer@example.com / review123`
- `delivery@example.com / delivery123`
- `settings@example.com / settings123`

其中 `admin@example.com / admin123` 保持不变。

## 3.2 books

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 书 id |
| title | varchar | 书名 |
| author | varchar | 作者 |
| language | varchar | 语言 |
| description | text | 书介简介 |
| source_type | varchar | txt/md/docx/imported |
| status | varchar | draft/active/archived |
| default_voice_profile_id | uuid fk | 默认 voice |
| default_provider | varchar | elevenlabs/openai |
| cover_url | text | 封面地址 |
| business_base_currency | text | 经营基准币 |
| metadata | jsonb | 扩展元数据 |
| created_by | uuid fk | 创建人 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

## 3.3 chapters

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 章节 id |
| book_id | uuid fk | 所属书 |
| title | varchar | 章节标题 |
| order_index | int | 章节顺序 |
| source_text | text | 原始章节文本 |
| tts_text | text | 章节级整理后文本 |
| status | varchar | draft/ready/reviewing/approved/exported |
| notes | text | 备注 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

## 3.4 segments

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 段 id |
| book_id | uuid fk | 所属书 |
| chapter_id | uuid fk | 所属章节 |
| order_index | int | 段顺序 |
| source_text | text | 原文 |
| tts_text | text | 朗读稿 |
| speaker_type | varchar | narrator/character/system |
| character_id | uuid fk nullable | 角色 id |
| voice_profile_id | uuid fk nullable | 使用的 voice 配置 |
| provider | varchar | elevenlabs/openai |
| model | varchar | 模型名 |
| status | varchar | draft/ready/queued/generating/review_required/approved/rejected/exported |
| text_hash | varchar | 防重复生成校验 |
| latest_audio_take_id | uuid fk nullable | 最新 take |
| last_request_id | varchar nullable | 外部 provider request id |
| estimated_duration_ms | int nullable | 预计时长 |
| actual_duration_ms | int nullable | 实际时长 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

建议索引：

- `(chapter_id, order_index)`
- `(status)`
- `(voice_profile_id)`
- `(text_hash)`

Local Studio 当前实现补充：

- 当前实现使用 `character_profile_id` 与 `voice_profile_id` 两级绑定
- 已支持 `POST /api/segments/merge` 合并多选连续段落
- 合并后会清理旧音频、旧生成任务与旧审校记录，并重排 `order_index`

## 3.5 voice_profiles

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | voice 配置 id |
| provider | varchar | elevenlabs/openai |
| voice_id | varchar | provider 内 voice id |
| model | varchar | 模型 |
| name | varchar | 内部显示名 |
| speed | numeric(4,2) | 语速 |
| style_preset | varchar | 风格预设 |
| instructions | text | 附加指令 |
| sample_audio_url | text | 试听文件 |
| is_default | boolean | 是否默认 |
| created_by | uuid fk | 创建人 |
| created_at | timestamptz | 创建时间 |

## 3.6 characters

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 角色 id |
| book_id | uuid fk | 所属书 |
| name | varchar | 角色名 |
| alias | varchar | 别名 |
| gender_hint | varchar | 性别提示 |
| voice_profile_id | uuid fk nullable | 角色默认 voice |
| pronunciation | varchar | 名字发音 |
| notes | text | 备注 |
| created_at | timestamptz | 创建时间 |

Local Studio 当前实现补充：

- 当前本地版用表名 `character_profiles`
- 已支持 `role_type` 与 `story_character_name`
- 已支持头像与最多 9 张角色参考图
- 已支持从章节文本中自动识别人物名并自动创建角色

## 3.7 pronunciation_rules

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 规则 id |
| book_id | uuid fk nullable | 书级规则 |
| scope | varchar | global/book/chapter |
| target_text | varchar | 原始文本 |
| replacement_text | varchar | 替换朗读文本 |
| phonetic_hint | varchar | 发音提示 |
| active | boolean | 是否启用 |
| created_at | timestamptz | 创建时间 |

## 3.8 generation_jobs

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 任务 id |
| job_type | varchar | generate_segment/render_chapter/export_book |
| provider | varchar | elevenlabs/openai |
| status | varchar | pending/running/succeeded/failed/cancelled |
| book_id | uuid fk | 所属书 |
| chapter_id | uuid fk nullable | 所属章节 |
| segment_id | uuid fk nullable | 所属段 |
| input_payload | jsonb | 任务输入 |
| output_payload | jsonb | 任务输出 |
| error_message | text | 错误信息 |
| retry_count | int | 重试次数 |
| started_at | timestamptz | 开始时间 |
| finished_at | timestamptz | 完成时间 |
| created_by | uuid fk | 发起人 |
| created_at | timestamptz | 创建时间 |

## 3.9 audio_takes

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | take id |
| segment_id | uuid fk | 所属段 |
| version_no | int | 版本号 |
| source_kind | varchar | generated/edited/uploaded |
| audio_url | text | 音频文件地址 |
| waveform_url | text | 波形缓存地址 |
| duration_ms | int | 时长 |
| loudness_lufs | numeric(5,2) | 响度 |
| peak_db | numeric(5,2) | 峰值 |
| silence_head_ms | int | 开头静音 |
| silence_tail_ms | int | 结尾静音 |
| asr_text | text | ASR 回听文本 |
| qc_score | numeric(5,2) | 质检分数 |
| request_id | varchar nullable | provider request id |
| created_by | uuid fk | 创建人 |
| created_at | timestamptz | 创建时间 |

唯一约束建议：

- `(segment_id, version_no)`

## 3.10 review_issues

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 问题 id |
| segment_id | uuid fk | 所属段 |
| audio_take_id | uuid fk | 问题对应 take |
| issue_type | varchar | pronunciation/pacing/missing_words/extra_words/noise/silence/style |
| severity | varchar | low/medium/high |
| source | varchar | auto/manual |
| description | text | 描述 |
| status | varchar | open/resolved/ignored |
| created_by | uuid fk nullable | 创建人 |
| created_at | timestamptz | 创建时间 |
| resolved_at | timestamptz nullable | 解决时间 |

## 3.11 chapter_renders

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 章节渲染 id |
| chapter_id | uuid fk | 所属章节 |
| audio_url | text | 章节音频 |
| manifest_url | text | 组成清单 |
| duration_ms | int | 章节时长 |
| render_version | int | 渲染版本 |
| status | varchar | pending/running/succeeded/failed |
| created_by | uuid fk | 发起人 |
| created_at | timestamptz | 创建时间 |

## 3.12 export_tasks

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 导出任务 id |
| book_id | uuid fk | 所属书 |
| export_type | varchar | chapter_mp3/book_zip/m4b/report |
| status | varchar | pending/running/succeeded/failed |
| output_url | text | 导出地址 |
| metadata | jsonb | 导出元数据 |
| created_by | uuid fk | 发起人 |
| created_at | timestamptz | 创建时间 |

## 3.13 activity_logs

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 日志 id |
| actor_id | uuid fk | 操作人 |
| entity_type | varchar | book/chapter/segment/job/take |
| entity_id | uuid | 实体 id |
| action | varchar | create/update/delete/generate/approve/export |
| detail | jsonb | 详情 |
| created_at | timestamptz | 创建时间 |

## 4. 关系说明

- 一个 `book` 有多个 `chapters`
- 一个 `chapter` 有多个 `segments`
- 一个 `segment` 有多个 `audio_takes`
- 一个 `segment` 可绑定一个 `voice_profile`
- 一个 `book` 可有多个 `characters`
- 一个 `character` 可绑定一个默认 `voice_profile`
- 一个 `segment` 可对应多个 `review_issues`
- 一个 `chapter` 可生成多个 `chapter_renders`

## 5. 状态流转

## 5.1 Segment

`draft -> ready -> queued -> generating -> review_required -> approved -> exported`

退回路径：

- `review_required -> rejected`
- `rejected -> ready`

## 5.2 Generation Job

`pending -> running -> succeeded`

失败路径：

`pending/running -> failed`

取消路径：

`pending/running -> cancelled`

## 6. API 设计

以下设计默认 REST 风格，认证采用 `Bearer Token`。

Base URL 示例：

`/api/v1`

## 6.1 项目与章节

### POST `/books`

创建书项目。

请求体：

```json
{
  "title": "示例小说",
  "author": "作者名",
  "language": "zh-CN",
  "defaultProvider": "elevenlabs"
}
```

### GET `/books`

分页查询书项目。

### GET `/books/:bookId`

获取书详情和聚合统计。

### PATCH `/books/:bookId`

更新书信息。

### POST `/books/:bookId/import`

导入文本文件并触发拆章。

Local Studio 当前实现补充：

- 文件上传接口：`POST /api/projects/{project_id}/import`
- 本机路径接口：`POST /api/projects/{project_id}/import-local`
- 整本粘贴接口：`POST /api/projects/{project_id}/import-paste`
- 自动识别的章节标题格式包括：
  - `# 章節標題`
  - `西游记第一章`
  - `第二章节`
  - `第一回`
- 导入后会同步写出完整整书 `source_book.txt`

### GET `/books/:bookId/chapters`

获取章节列表。

### POST `/books/:bookId/chapters`

新增章节。

Local Studio 当前实现补充：

- 当前接口为 `POST /api/projects/{project_id}/chapters`
- 请求体支持：

```json
{
  "title": "西游记第一章 石猴出世",
  "body": "这一章的完整正文"
}
```

- 服务端会自动：
  - 创建 chapter
  - 切分 segments
  - 重建整书 `source_book.txt`

### PATCH `/chapters/:chapterId`

更新章节信息。

## 6.2 Segment

### GET `/chapters/:chapterId/segments`

获取某章节全部 Segment。

查询参数建议：

- `status`
- `speakerType`
- `hasIssues`
- `q`

### POST `/chapters/:chapterId/segments/split`

根据规则或位置拆分章节为 Segment。

### PATCH `/segments/:segmentId`

更新 Segment 文本和配置。

请求体示例：

```json
{
  "ttsText": "修订后的朗读稿",
  "voiceProfileId": "uuid",
  "status": "ready"
}
```

### POST `/segments/merge`

将当前多选的连续段落合并为一个段落。

本地版补充行为：

- 仅允许同一章节内的连续段落
- 若仍有 `pending / running` 任务，则禁止合并
- 合并后会清理原音频、任务与审校记录
- 新段落状态会回到 `ready`

### POST `/segments/:segmentId/merge-next`

与下一段合并。

### POST `/segments/:segmentId/split`

按字符偏移或句边界拆分当前段。

## 6.3 Voice 与发音词典

### GET `/voice-profiles`

获取 voice 配置列表。

### POST `/voice-profiles`

新增 voice 配置。

### PATCH `/voice-profiles/:id`

更新 voice 配置。

### GET `/books/:bookId/pronunciation-rules`

获取发音规则。

### POST `/books/:bookId/pronunciation-rules`

新增发音规则。

## 6.4 生成任务

### POST `/segments/:segmentId/generate`

为单个 Segment 发起生成。

请求体示例：

```json
{
  "provider": "elevenlabs",
  "voiceProfileId": "uuid",
  "force": true
}
```

### POST `/chapters/:chapterId/generate`

为整章可用 Segment 批量生成。

### GET `/chapters/:chapterId/character-detection`

分析章节文本中的人物线索，返回：

- 识别到的人物名
- 推测角色类型
- 覆盖到的 segment ids
- 是否已匹配现有角色

### POST `/chapters/:chapterId/auto-bind-characters`

按识别结果批量执行：

- 复用现有角色
- 自动创建缺失角色
- 将段落绑定到角色
- 可选把未识别段落补绑到旁白角色

### GET `/jobs`

查询任务列表。

### GET `/jobs/:jobId`

查询单个任务详情。

### POST `/jobs/:jobId/retry`

重试失败任务。

### POST `/jobs/:jobId/cancel`

取消任务。

## 6.5 音频版本

### GET `/segments/:segmentId/audio-takes`

查询当前 Segment 的全部音频版本。

### GET `/audio-takes/:takeId`

查询单个音频版本元数据。

### POST `/audio-takes/:takeId/approve`

将该版本设为通过。

### POST `/audio-takes/:takeId/reject`

退回该版本。

### POST `/audio-takes/:takeId/trim`

记录非破坏性裁剪参数。

请求体示例：

```json
{
  "trimHeadMs": 120,
  "trimTailMs": 240
}
```

## 6.6 质检与问题

### POST `/segments/:segmentId/qc`

触发单段自动质检。

### GET `/segments/:segmentId/issues`

获取问题列表。

### POST `/segments/:segmentId/issues`

人工创建问题。

### PATCH `/issues/:issueId`

更新问题状态。

## 6.7 装配与导出

### POST `/chapters/:chapterId/render`

渲染章节音频。

### GET `/chapters/:chapterId/renders`

查询章节渲染历史。

### POST `/books/:bookId/export`

导出整书或章节集合。

请求体示例：

```json
{
  "exportType": "book_zip"
}
```

Local Studio 当前实现补充：

- 当前接口为 `POST /api/projects/{project_id}/export`
- 当项目存在完整整书文本时，导出的 ZIP 会额外包含 `source_book.txt`

### GET `/exports/:exportTaskId`

查询导出任务。

## 6.8 經營管理

### GET `/books/:bookId/business`

获取经营管理聚合信息。

Local Studio 当前实现补充：

- 当前接口为 `GET /api/projects/{project_id}/business`
- 返回内容包括：
  - `summary`
  - `rights_records`
  - `distribution_channels`
  - `cost_items`
  - `sales_records`
  - `royalty_statements`
  - `exchange_rates`
  - `advertiser_deals`
  - `business_reports`

### POST `/books/:bookId/business/base-currency`

更新经营基准币。

Local Studio 当前实现补充：

- 当前接口为 `POST /api/projects/{project_id}/business-base-currency`
- 请求体示例：

```json
{
  "business_base_currency": "CNY"
}
```

### POST `/books/:bookId/business/reports/export`

导出经营报表。

Local Studio 当前实现补充：

- 当前接口为 `POST /api/projects/{project_id}/business-reports/export`
- 当前导出物为 ZIP，内含：
  - `business_report.html`
  - `summary.json`
  - `full_payload.json`
  - `rights_records.csv`
  - `distribution_channels.csv`
  - `cost_items.csv`
  - `sales_records.csv`
  - `royalty_statements.csv`
  - `exchange_rates.csv`
  - `advertiser_deals.csv`

### 经营子对象接口

Local Studio 当前实现补充：

- 权利与合同：
  - `POST/PATCH/DELETE /api/projects/{project_id}/rights-records/*`
- 发行渠道：
  - `POST/PATCH/DELETE /api/projects/{project_id}/distribution-channels/*`
- 成本核算：
  - `POST/PATCH/DELETE /api/projects/{project_id}/cost-items/*`
- 销售回传：
  - `POST/PATCH/DELETE /api/projects/{project_id}/sales-records/*`
- 版税与分成：
  - `POST/PATCH/DELETE /api/projects/{project_id}/royalty-statements/*`
- 汇率：
  - `POST/PATCH/DELETE /api/projects/{project_id}/exchange-rates/*`
- 广告合作：
  - `POST/PATCH/DELETE /api/projects/{project_id}/advertiser-deals/*`

## 7. Webhook 与后台任务建议

如果 provider 支持回调，可使用：

- `POST /webhooks/providers/elevenlabs`
- `POST /webhooks/providers/openai`

若 provider 不支持回调，则采用队列轮询策略。

## 8. Worker 任务建议

Worker 侧建议拆成以下任务类型：

- `normalize_text`
- `split_chapter_into_segments`
- `generate_segment_audio`
- `run_asr_diff`
- `run_audio_qc`
- `render_chapter_audio`
- `export_book_package`

## 9. 幂等与重试

### 9.1 幂等键建议

- `segment_id + text_hash + voice_profile_id + model + provider`

### 9.2 重试原则

- 网络错误可自动重试
- provider 4xx 默认不重试
- provider 5xx 可指数退避重试

## 10. 存储与命名建议

对象存储路径示例：

- `books/{bookId}/segments/{segmentId}/takes/{takeId}.mp3`
- `books/{bookId}/chapters/{chapterId}/renders/{renderId}.mp3`
- `books/{bookId}/exports/{exportTaskId}.zip`

## 11. 审计要求

以下动作必须写入 `activity_logs`：

- 项目创建
- 文本导入
- Segment 编辑
- 生成任务发起
- 生成成功和失败
- 审核通过和退回
- 导出
