# AI Publisher 本機版安裝手冊

版本：Local MVP  
適用對象：本機安裝、演示、內部測試  
適用平台：macOS

## 目錄

1. 文件目的
2. 系統概覽
3. 環境需求
4. 目錄說明
5. 安裝步驟
6. 啟動系統
7. 登入與基本驗證
8. 可選的真實 AI Provider 配置
9. 停止系統
10. 回歸測試
11. 資料位置與備份
12. 常見問題

## 1. 文件目的

本手冊用於說明如何在一台 Mac 上安裝、啟動與驗證 `AI Publisher Local Studio`。

本版本為單機版架構：

- 前端：瀏覽器中的 Web App
- 後端：FastAPI
- 資料庫：SQLite
- 檔案儲存：本地檔案目錄
- 本地語音：macOS `say`

本版不使用：

- Docker
- Redis
- 獨立 Worker

## 2. 系統概覽

目前已實作的流程如下：

`登入 -> 專案管理 -> 匯入文本 -> 拆章拆段 -> 編輯朗讀稿 -> 配置聲線 -> 生成音訊 -> 審核 -> 章節渲染 -> ZIP 匯出`

系統同時支援兩種運行方式：

- 基礎模式：只使用本機 `macOS say`
- 擴充模式：接 `OpenAI` 或 `ElevenLabs`

若未配置任何 API key，系統仍可完整執行本機流程。

此外，目前也已預留兩組專案級擴展設定：

- `漫畫設定`
- `Video 設定`

它們位於 UI 的「系統設定」頁，用於保存後續 comic / video 流程要用的模型模板；本版僅保存設定，不直接執行漫畫或影片生成。

## 3. 環境需求

請先確認本機具備以下條件：

- macOS
- Python 3.11 或以上
- 可使用系統指令 `say`
- 可使用系統指令 `afconvert`
- 可連線本機 `127.0.0.1`

可用以下指令快速確認：

```bash
python3 --version
which say
which afconvert
```

## 4. 目錄說明

專案主要目錄如下：

- `api/app/`：後端程式
- `web/`：前端頁面與樣式
- `api/data/app.db`：SQLite 資料庫
- `api/generated/`：匯入檔案、生成音訊、render、匯出檔
- `run_local.sh`：本機啟動腳本
- `requirements.txt`：Python 依賴
- `.env.local.example`：環境變數範例
- `scripts/smoke_test_local.py`：本機回歸測試腳本

## 5. 安裝步驟

### 5.1 進入專案目錄

```bash
cd "/Users/lijiaxi/Documents/AI publisher"
```

### 5.2 確保啟動腳本可執行

```bash
chmod +x run_local.sh
```

### 5.3 建立虛擬環境與安裝依賴

若你直接使用啟動腳本，這一步通常會自動完成。

如需手動執行，可使用：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
```

### 5.4 可選：建立環境變數檔

如果你暫時只使用本機版，不一定需要這一步。

若後續要接 `OpenAI` 或 `ElevenLabs`，請先建立：

```bash
cp .env.local.example .env.local
```

## 6. 啟動系統

直接執行：

```bash
./run_local.sh
```

啟動成功後，預設服務位址為：

- [http://127.0.0.1:8000](http://127.0.0.1:8000)

正常情況下：

- 瀏覽器可開啟首頁
- 後端 API 可回應健康檢查

可用以下指令檢查：

```bash
curl http://127.0.0.1:8000/api/health
```

預期回應類似：

```json
{"status":"ok","app":"AI Publisher Local Studio"}
```

## 7. 登入與基本驗證

開啟瀏覽器後，可使用以下預設角色帳號登入：

- `admin@example.com / admin123`：管理員，完整流程；此帳號密碼保持不變
- `editor@example.com / editor123`：文本準備與生成
- `reviewer@example.com / review123`：審核校對
- `delivery@example.com / delivery123`：匯出交付
- `settings@example.com / settings123`：聲線、角色、漫畫與系統設定

完整列表見 [預設角色帳號](default_accounts.md)。

介面預設會以 `繁體中文` 顯示；如果要切換語言，可在：

- 登入頁右上角
- 登入後左側欄底部

切換成 `简体中文 / English / 日本語 / 한국어`。

若要做完整端到端驗證，建議使用 `admin@example.com / admin123` 登入。

登入後建議先做一次最小驗證：

1. 建立一個新專案
2. 匯入一個 `.txt`、`.md`、`.docx` 或 `.epub` 文本
3. 確認章節與段落已生成
4. 在文本準備頁保存一個段落
5. 在生成工作台生成一段音訊
6. 到審核頁確認可播放音訊

若要驗證擴展設定是否可用，也可額外檢查：

7. 進入「系統設定」頁
8. 確認目前專案可看到 `漫畫設定 / Video 設定`
9. 儲存一組模型配置並重新進入頁面確認有回顯

## 8. 可選的真實 AI Provider 配置

本系統目前已支援：

- `OpenAI TTS / ASR`
- `ElevenLabs TTS / ASR`

如果不配置 API key，系統會自動回退到本機 `macOS say`。

### 8.1 配置 OpenAI

在 `.env.local` 中填入：

```bash
OPENAI_API_KEY=你的_openai_key
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_ASR_MODEL=gpt-4o-mini-transcribe
```

### 8.2 配置 ElevenLabs

在 `.env.local` 中填入：

```bash
ELEVENLABS_API_KEY=你的_elevenlabs_key
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2
ELEVENLABS_ASR_MODEL=scribe_v2
```

### 8.3 配置 ASR Provider 優先順序

在 `.env.local` 中可設定：

```bash
AI_PUBLISHER_ASR_PROVIDER=auto
```

可用值：

- `auto`
- `openai`
- `elevenlabs`
- `mock`

說明：

- `auto`：優先 OpenAI，其次 ElevenLabs，最後 mock
- `mock`：永遠使用本機規則化 QC，不呼叫真實 ASR

### 8.4 配置完成後重新啟動

修改 `.env.local` 後，請重新執行：

```bash
./run_local.sh
```

### 8.5 在 UI 中建立聲線設定

進入「聲線設定」頁後可建立：

- `macOS say`
- `OpenAI`
- `ElevenLabs`

注意：

- OpenAI 的 `voice_name` 可直接選內建 voice
- ElevenLabs 的 `voice_name` 欄位需填入實際 `voice_id`

### 8.6 專案級漫畫 / Video 模型設定

在「系統設定」頁，當前選中的專案可保存：

- 漫畫用的劇本、分鏡、圖像與風格設定
- Video 用的腳本、鏡頭、圖像、影片、字幕與時長設定

注意：

- 這些設定目前只作為模板保存到專案資料
- 不需要額外安裝套件即可保存
- 是否真正可生成漫畫 / 影片，取決於後續是否接入對應 provider 與流程

## 9. 停止系統

若系統正在終端中運行，可在該終端按：

```bash
Ctrl + C
```

這會停止：

- FastAPI server
- 自動 reload 程序

## 10. 回歸測試

服務啟動後，可執行自動 smoke test：

```bash
.venv/bin/python scripts/smoke_test_local.py
```

該腳本會自動驗證以下流程：

`登入 -> 建立專案 -> 匯入文本 -> 生成 -> 審核通過 -> 章節渲染 -> ZIP 匯出`

若最後看到類似輸出，即表示流程正常：

```text
login ok
project ok
import ok
generation queued
review ok
render ok
export ok
```

## 11. 資料位置與備份

### 11.1 SQLite 資料庫

系統資料庫位置：

```text
api/data/app.db
```

### 11.2 生成檔案

生成與匯出檔案位於：

```text
api/generated/
```

包含：

- `imports/`
- `audio/`
- `renders/`
- `exports/`

### 11.3 備份建議

若要做最小備份，至少備份：

- `api/data/app.db`
- `api/generated/`

## 12. 常見問題

### 12.1 無法啟動 `run_local.sh`

請先確認：

- 已在專案根目錄
- `run_local.sh` 已有執行權限

執行：

```bash
chmod +x run_local.sh
```

### 12.2 `say` 或 `afconvert` 找不到

表示目前環境不是完整 macOS 執行環境，或系統路徑異常。

請先檢查：

```bash
which say
which afconvert
```

### 12.3 瀏覽器打不開 `127.0.0.1:8000`

請確認：

- server 是否仍在執行
- 終端是否有報錯
- `curl http://127.0.0.1:8000/api/health` 是否可回應

### 12.4 想接真實 OpenAI 或 ElevenLabs，但沒有生效

請確認：

- `.env.local` 是否存在
- API key 是否正確
- 修改後是否已重新啟動 `./run_local.sh`
- 聲線設定頁是否已建立對應 provider 的 voice profile

### 12.5 想完全重置本機資料

請先停止系統，再刪除：

```text
api/data/app.db
api/generated/
```

下次啟動時系統會自動重建初始資料。

注意：這會清除所有本機專案、音訊與匯出結果。
