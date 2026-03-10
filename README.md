# AI Publisher Local Studio

本專案是一個面向 `audiobook` 生產流程的本機版 Web Studio，目標是在一台 Mac 上先跑通完整內容生產閉環。

它目前聚焦於單機 MVP：

- Web UI：登入、專案管理、文本準備、聲線設定、生成、審核、匯出
- Backend：FastAPI
- Database：SQLite
- Storage：本機檔案目錄
- Audio：macOS `say`，並已預留 `OpenAI / ElevenLabs` 真實 provider 接入

## 專案狀態

- 狀態：`MVP / Active Development`
- 目標：先穩定跑通本機端的 audiobook 生產工作台
- 架構策略：模組化單體，不使用 Docker、Redis、獨立 Worker

## 主要能力

- 支援 `.txt / .md / .docx` 文本匯入
- 自動拆章拆段
- `source_text / tts_text` 雙軌編輯
- 聲線設定與段落級覆寫
- 本機生成音訊
- Review Queue 與問題標記
- 章節渲染與 ZIP 匯出
- 本機 smoke test
- 可選接入 `OpenAI TTS / ASR`
- 可選接入 `ElevenLabs TTS / ASR`

## 畫面預覽

### 專案總覽

![Projects Overview](docs/assets/manual/01_projects_overview.png)

### 文本準備

![Text Prep](docs/assets/manual/02_text_prep.png)

### 審核工作台

![Review Console](docs/assets/manual/05_review_console.png)

## 目前流程

`登入 -> 專案管理 -> 匯入文本 -> 拆章拆段 -> 編輯朗讀稿 -> 配置聲線 -> 生成音訊 -> 審核 -> 章節渲染 -> ZIP 匯出`

## 快速開始

### 環境需求

- macOS
- Python 3.11+
- 可使用系統指令 `say`
- 可使用系統指令 `afconvert`

### 啟動

```bash
git clone https://github.com/xuan139/ai-publisher-local-studio.git
cd ai-publisher-local-studio
chmod +x run_local.sh
./run_local.sh
```

啟動後開啟：

- [http://127.0.0.1:8000](http://127.0.0.1:8000)

預設登入帳號：

- 電子郵件：`admin@example.com`
- 密碼：`admin123`

### 回歸測試

```bash
.venv/bin/python scripts/smoke_test_local.py
```

該腳本會驗證：

`登入 -> 建立專案 -> 匯入文本 -> 生成 -> 審核通過 -> 章節渲染 -> ZIP 匯出`

## 真實 AI Provider

目前已接入：

- `OpenAI TTS / ASR`
- `ElevenLabs TTS / ASR`

如果未配置任何 API key，系統會自動回退到本機：

- `macOS say`
- 規則化 mock QC

### 配置方式

```bash
cp .env.local.example .env.local
```

可配置項：

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `AI_PUBLISHER_ASR_PROVIDER=auto|openai|elevenlabs|mock`

## 目錄結構

- `api/app/`：FastAPI 後端、資料庫初始化、文本處理、音訊處理、AI provider adapter
- `web/`：前端頁面與樣式
- `docs/`：需求文檔、功能手冊、安裝手冊
- `mockups/`：靜態畫面稿與 PNG
- `scripts/`：smoke test 等腳本
- `tools/`：文檔與 PDF 輔助工具

## 文檔

- [一頁操作說明](docs/audiobook_one_page_guide.md)
- [一頁操作說明 Printable HTML](docs/audiobook_one_page_guide_print.html)
- [審核員一頁說明](docs/reviewer_one_page_guide.md)
- [審核員一頁說明 Printable HTML](docs/reviewer_one_page_guide_print.html)
- [本機安裝手冊](docs/local_install_manual.md)
- [需求文檔 REQ](docs/audiobook_platform_req.md)
- [功能手冊 HTML](docs/audiobook_platform_function_manual.html)
- [系統架構草案](docs/publishing_platform_architecture.md)

## 協作規劃

本倉庫已初始化以下協作結構：

- Milestones
- 初始 Issues
- GitHub Issue Templates

用於跟蹤：

- Phase 1 MVP
- AI provider 接入
- UI / UX 打磨

## 授權

本倉庫採用自定義授權，詳見 [LICENSE](LICENSE)。

重點說明：

- 程式碼與原創文檔允許在授權條件下使用、修改與再分發
- 第三方 PDF 與外部參考材料不包含在該授權內
