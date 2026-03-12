# AI Publisher 預設角色帳號

本機版會自動建立以下預設帳號；如果資料庫裡同 email 的帳號已存在，系統不會覆蓋原有資料。

`admin` 帳號密碼維持不變：

- `admin@example.com / admin123`

## 帳號列表

| 角色 | 帳號 | 密碼 | 可用頁面 | 用途 |
|---|---|---|---|---|
| 管理員 | `admin@example.com` | `admin123` | `專案 / 文本準備 / 聲線設定 / 角色設定 / 漫畫腳本 / 分鏡工作台 / 畫格生成 / 頁面排版 / 漫畫設定 / Video 設定 / 生成任務 / 審核校對 / 匯出交付 / 系統設定` | 完整流程、演示、系統管理 |
| 文本編輯 | `editor@example.com` | `editor123` | `專案 / 文本準備 / 生成任務` | 匯入文本、整理朗讀稿、批量生成 |
| 審核員 | `reviewer@example.com` | `review123` | `專案 / 審核校對` | 音訊審核、問題標記、通過或退回 |
| 交付管理 | `delivery@example.com` | `delivery123` | `專案 / 匯出交付` | 章節渲染、ZIP 匯出、交付檢查 |
| 設定管理 | `settings@example.com` | `settings123` | `專案 / 聲線設定 / 角色設定 / 漫畫設定 / Video 設定 / 系統設定` | 模型模板、角色資產、專案配置 |

## 使用建議

- 要跑一遍完整 audiobook 流程，建議使用 `admin@example.com / admin123`。
- 只做文本整理與生成，可使用 `editor@example.com / editor123`。
- 只做審核，可使用 `reviewer@example.com / review123`。
- 只做交付與匯出，可使用 `delivery@example.com / delivery123`。
- 只做聲線、角色、漫畫或 Video 模板設定，可使用 `settings@example.com / settings123`。

## 介面表現

- 登入頁會顯示這些預設角色帳號，並支援一鍵帶入帳密。
- 登入後左側選單會依角色自動過濾，只顯示該帳號可用的頁面。
- 即使手動輸入網址或前端切頁，後端也會再次做權限檢查。
