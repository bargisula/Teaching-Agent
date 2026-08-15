# Teaching Agent 方案一：Codex 內建 imagegen 整合規格

## 目標

在不使用 `OPENAI_API_KEY`、不由 Node.js 直接呼叫 Images API 的前提下，讓 Teaching Agent 在 Visual confirmation 通過後，由 Codex Agent 使用內建 imagegen 工具，逐張生成完整投影片 PNG，然後自動檢查並組裝成 image-first PPTX。

## 核心原則

1. `course-material-agent` 不是第五個 Agent。
2. imagegen 是工具階段，不是新的 Agent。
3. Visual Agent 只負責產生 `visual-spec.json` 與每張投影片的 image prompt。
4. 使用者必須分別確認 `requirements`、`content`、`visual`。
5. 未完成三個確認，不得呼叫 imagegen。
6. imagegen 失敗時必須停止，不得使用簡單色塊或文字 fallback 假裝完成。
7. PPTX 只能貼入已生成並通過檢查的 PNG，不再額外疊加文字層。
8. 總張數最多 12 張，且必須恰好 1 張封面。

## 執行流程

```text
requirements draft
  ↓ 使用者確認 requirements
Curriculum Agent：outline/content
  ↓ 使用者確認 content
Visual Agent：visual-spec.json + image prompts
  ↓ 使用者確認 visual
Codex Agent：逐張呼叫內建 imagegen
  ↓
儲存 slide-00.png ... slide-NN.png
  ↓
image QA：尺寸、數量、封面、繁體中文、標題一致性
  ↓
PPTX assembler：PNG 全版貼入
  ↓
Review Agent：產生 checklist 與 review 報告
```

## Skill 的責任

應建立或修改一個 imagegen 專用 Skill，例如：

```text
.agents/skills/teaching-agent-imagegen/SKILL.md
```

Skill 必須定義：

- 觸發條件：只有在 `visual` confirmation 已完成後觸發。
- 輸入：`visual-spec.json`、課程需求、內容大綱、設計規範。
- 每張投影片的 prompt 結構。
- 圖像必須使用繁體中文。
- 封面固定為 `slide-00.png`。
- 每張圖片必須是完整投影片畫面，不是素材圖。
- 生成後的檔名與輸出資料夾。
- 失敗重試規則。
- 禁止使用 fallback 圖片代替 imagegen 結果。
- 完成後要寫入 `imagegen-status.json`。

Skill 不應負責：

- 決定是否已確認 requirements/content/visual。
- 管理整個 run state。
- 組裝 PPTX。
- 產生 Review 報告。

## Orchestrator 的責任

`orchestrator/orchestrator.mjs` 必須保留三個確認閘門：

```text
curriculum 需要 requirements
content     需要先完成 curriculum
visual      需要 content confirmation
render      需要 visual confirmation
assemble    需要 imagegen 與 QA 通過
review      需要 PPTX 已完成
```

建議新增狀態欄位：

```json
{
  "imagegen": {
    "status": "pending",
    "completed": 0,
    "expected": 8,
    "failedSlides": []
  }
}
```

## Visual spec 格式

`visual-spec.json` 每張投影片至少包含：

```json
{
  "page": 0,
  "role": "cover",
  "title": "Skill 與 Agent 入門",
  "coreMessage": "Skill 是可重複使用的工作方法，Agent 是執行工作的角色",
  "imagePrompt": "16:9 教材封面，繁體中文標題...",
  "textMustAppear": ["Skill 與 Agent 入門"],
  "textMustNotAppear": ["簡體中文", "placeholder"],
  "titleStyleId": "main-title-v1",
  "language": "zh-Hant",
  "width": 1600,
  "height": 900
}
```

## Agent 呼叫 imagegen 的規則

Codex Agent 讀取 `visual-spec.json` 後，對每一張投影片執行一次 imagegen：

1. 先生成 `slide-00.png` 封面。
2. 再依頁碼順序生成其他投影片。
3. 每次只處理一張，避免頁碼與輸出錯置。
4. 使用指定的 `imagePrompt`，並補充統一視覺規格。
5. 生成後檢查檔案確實存在，再進入下一張。
6. 失敗最多重試 2 次；仍失敗就標記 `failed` 並停止整個 run。

統一 prompt 必須包含：

```text
這是一張 16:9 教材投影片的完整畫面。
所有可見文字必須使用繁體中文。
不可出現簡體中文、亂碼、placeholder、假文字或未完成文字。
標題使用指定的 titleStyleId，與其他投影片一致。
不要輸出投影片外框、簡報軟體介面或額外畫布。
```

## 輸出結構

```text
library/courses/<course-id>/versions/<version>/
├─ visual-design/
│  ├─ visual-spec.json
│  ├─ image-prompts.json
│  └─ assets/
│     ├─ slide-00.png
│     ├─ slide-01.png
│     └─ ...
├─ imagegen-status.json
├─ acceptance/
│  └─ acceptance-checklist.json
├─ deck/
│  └─ deck.pptx
└─ review/
   ├─ imagegen-review.md
   ├─ asset-review.md
   ├─ pptx-review.md
   └─ report.md
```

## imagegen-status.json

成功範例：

```json
{
  "status": "completed",
  "expected": 8,
  "completed": 8,
  "files": [
    "assets/slide-00.png",
    "assets/slide-01.png"
  ],
  "failedSlides": [],
  "generatedBy": "Codex built-in imagegen",
  "updatedAt": "2026-07-29T00:00:00.000Z"
}
```

失敗時必須是：

```json
{
  "status": "failed",
  "completed": 3,
  "expected": 8,
  "failedSlides": [4],
  "reason": "imagegen did not return a usable PNG"
}
```

## QA 檢查

在 PPTX 組裝前，必須檢查：

| 檢查項目 | 通過條件 |
|---|---|
| imagegen status | `completed` |
| 圖片數量 | 等於內容頁數 |
| 封面 | 存在且只有 1 張 `slide-00.png` |
| 張數 | 不超過 12 張 |
| 尺寸 | 每張為 16:9，建議 1600×900 |
| 檔案 | 每張 PNG 可讀且非空白 |
| 語言 | 可見文字為繁體中文 |
| 標題 | 所有頁面遵守同一 `titleStyleId` |
| 內容 | 每頁只有一個核心訊息 |
| 圖像 | 圖像支持該頁訊息，不是裝飾替代品 |

任何關鍵項目為 `X`，都不得組裝 PPTX。

## PPTX 組裝規則

只有當：

```text
imagegen-status = completed
image QA = PASS
```

才可執行 assemble。每張 PNG 以全版方式貼入 PPTX：

```text
x = 0
 y = 0
 width = 13.333
 height = 7.5
```

PPTX 不應再加入第二層文字、標題或裝飾元件。

## Review 交付

完成後自動產生：

- `imagegen-review.md`：逐張 imagegen 與圖片檢查結果。
- `asset-review.md`：圖片數量、檔案、尺寸、封面檢查。
- `pptx-review.md`：PPTX 張數、全版圖片、可開啟性檢查。
- `report.md`：依原始需求與 acceptance checklist 的總結，使用 `V / ! / X`。

## 驗收標準

成功必須同時滿足：

1. 沒有 API Key 也能由 Codex Agent 使用內建 imagegen 產生圖片。
2. 三個 confirmation gate 都確實生效。
3. 圖片全部存在於指定 assets 資料夾。
4. 沒有 imagegen 成功紀錄時，PPTX 不會生成。
5. PPTX 只有全版 PNG，沒有第二層文字。
6. 恰好一張封面，總張數不超過 12 張。
7. Review 結果自動寫入 `review/`。

## 不算完成的情況

以下都不算完成：

- 只修改 SKILL.md，但實際流程仍直接執行舊 render script。
- 用 PowerShell 色塊與文字產生 PNG，卻標示為 imagegen。
- imagegen 失敗後改用 fallback PNG 仍繼續組裝。
- 只產生視覺規格，沒有實際 PNG。
- 只產生 PPTX，沒有 `imagegen-status.json` 與 Review 報告。