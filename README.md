# AI Publisher Local Studio

本專案是一個先在本機 Mac 上跑通 audiobook 生產閉環的單機版 MVP。

正式安裝手冊請見：

- [docs/local_install_manual.md](/Users/lijiaxi/Documents/AI publisher/docs/local_install_manual.md)

目前技術棧：

- 前端：瀏覽器內執行的 React 風格單頁應用，執行時檔案已本地化，靜態資源由 FastAPI 直接提供
- 後端：FastAPI
- 資料庫：SQLite 檔案資料庫
- 檔案儲存：本地目錄 `api/generated/`
- 本地語音：macOS `say` + `afconvert`
- 真實 AI Provider：OpenAI TTS / ASR、ElevenLabs TTS / ASR

## 已實作流程

`登入 -> 專案管理 -> 匯入文本 -> 拆章拆段 -> 編輯 TTS 文本 -> 配置聲線 -> 生成音訊 -> 審核 -> 章節渲染 -> ZIP 匯出`

## 目錄

- `api/app/`: FastAPI 後端、SQLite 初始化、文本處理、音訊處理
- `web/`: Web 前端頁面與樣式
- `api/data/app.db`: SQLite 資料庫檔案
- `api/generated/`: 匯入檔案、段落音訊、章節 render、匯出 zip

## 本機執行

需求：

- macOS
- Python 3.11+
- 系統內可用 `say` 與 `afconvert`

啟動：

```bash
cd "/Users/lijiaxi/Documents/AI publisher"
chmod +x run_local.sh
./run_local.sh
```

若要接真實 AI provider，先建立 `.env.local`：

```bash
cp .env.local.example .env.local
```

然後填入：

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- 視需要調整 `AI_PUBLISHER_ASR_PROVIDER=auto|openai|elevenlabs|mock`

啟動後請開啟：

- [http://127.0.0.1:8000](http://127.0.0.1:8000)

預設登入帳號：

- 電子郵件：`admin@example.com`
- 密碼：`admin123`

## 本機回歸測試

服務啟動後可執行：

```bash
.venv/bin/python scripts/smoke_test_local.py
```

腳本會自動驗證：

`登入 -> 建立專案 -> 匯入文本 -> 生成 -> 審核通過 -> 章節渲染 -> ZIP 匯出`

## 支援的匯入格式

- `.txt`
- `.md`
- `.docx`

## 目前實作說明

- 不使用 Docker
- 不使用 Redis
- 不使用獨立 Worker
- 非同步任務透過 FastAPI `BackgroundTasks` 處理
- 若有設定 `OPENAI_API_KEY` 或 `ELEVENLABS_API_KEY`，系統會優先使用真實 TTS / ASR
- 若未設定 API key，系統仍可回退到本地 `macOS say` 與規則化 QC

## 真實 Provider 用法

### OpenAI

- 在 `.env.local` 設定 `OPENAI_API_KEY`
- 到聲線設定頁建立 `provider=openai`
- `model` 建議用 `gpt-4o-mini-tts`
- `voice_name` 可選 `alloy / ash / ballad / coral / echo / fable / nova / onyx / sage / shimmer / verse`

### ElevenLabs

- 在 `.env.local` 設定 `ELEVENLABS_API_KEY`
- 到聲線設定頁建立 `provider=elevenlabs`
- `model` 建議用 `eleven_multilingual_v2`
- `voice_name` 欄位請填實際 `voice_id`

### ASR

- 預設 `AI_PUBLISHER_ASR_PROVIDER=auto`
- 若有 OpenAI key，會優先用 OpenAI 轉寫
- 若沒有 OpenAI 但有 ElevenLabs key，會改用 ElevenLabs 轉寫
- 都沒有時，系統退回規則化 mock QC

## 下一步建議

- 把本地 `say` 替換成 ElevenLabs / OpenAI TTS
- 把 mock ASR/QC 替換成真實 ASR 與 diff 檢測
- 把前端改成正式 React + Vite 建置流程
