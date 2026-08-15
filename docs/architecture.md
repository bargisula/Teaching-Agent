# Teaching Agent 系統與資料架構

## 目標

讓教材可以被建立、搜尋、修改、審查、發布與回溯。教材管理頁面是入口，Agent 是工作流程，`library/` 是正式資料來源。

## 教材資料模型

每套教材使用一個 `<course-slug>`，例如 `codex-accounting-basics`：

```text
library/courses/codex-accounting-basics/
├─ manifest.json
├─ source/
├─ versions/v0.1/
├─ versions/v0.2/
└─ published/
```

`manifest.json` 至少包含教材 ID、名稱、描述、標籤、受眾、狀態、最新版本、發布版本、更新時間與版本清單。

## 版本規則

- `v0.x`：規劃、視覺稿或審查中的工作版本。
- `v1.0`：第一個正式發布版本。
- `v1.1`：內容不變、修正錯字或小幅視覺調整。
- `v2.0`：教學目標、結構或主要內容有重大改變。
- 任何版本都不可直接覆蓋；修改前先複製出新版本。

狀態建議為：`draft` → `review` → `approved` → `published`。被退回時回到 `draft`，但保留審查紀錄。

## Agent 與資料的關係

1. 主控 Agent 選擇教材工作區並讀取 `manifest.json`。
2. 教材規劃 Agent 在目前版本的 `outline/` 與 `source/` 工作。
3. 視覺導演 Agent 將規格寫入 `visual-design/`，素材放入 `assets/`。
4. 品質檢查 Agent 將報告寫入 `review/`，不得默默修改原始內容。
5. 使用者核准後才把該版本標記為 `published`，並更新索引。
