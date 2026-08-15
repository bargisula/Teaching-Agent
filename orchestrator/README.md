# Orchestrator

Orchestrator 是 Teaching Agent 的唯一流程入口。它管理 run state、確認閘門、dispatch、acceptance checklist 與階段順序。

## 階段

`goal → curriculum → content → visual → render → assemble → review`

Review 完成後，使用者可選擇是否進入可選的 Media Production Agent（`media-script → media-render` 兩個 stage，見下方「影片製作」）：

```powershell
node orchestrator.mjs choose-media --course <course-id> --choice yes
node orchestrator.mjs choose-media --course <course-id> --choice no
```

requirements、content、visual 是三個獨立確認點。尚未確認時，`execute` 必須停止；不得使用舊的一鍵執行方式。

## 指令

```powershell
node orchestrator.mjs start --course <course-id>
node orchestrator.mjs status --course <course-id>
node orchestrator.mjs confirm --course <course-id> --stage <stage-id>
node orchestrator.mjs execute --course <course-id>
```

assemble 完成後必須存在 `review/report.md`、`review/pptx-review.md` 與 `review/asset-review.md`。

## 影片製作（可選，PPTX Review 完成後才能啟動）

2026-08-14 起，Media Production Agent 已正式接上 Orchestrator（`pipeline.json` version 6），拆成兩個 stage：

- `media-script`：script 執行，讀 `versions/{version}/content/slides.md` 產生旁白草稿（`narration-script.md`、`dialogue.json`），不需要確認才能跑。
- `media-render`：script 執行，**需要先 confirm `mediaScript` 這個閘門**才能跑；跑的時候會自動核准腳本、依 `media-config.json` 的 provider 呼叫對應 TTS、合併音軌、產字幕、用 FFmpeg 合成影片，最後跑 `review-media-output.mjs` 產生 `media-review.md`。

### 操作步驟（完整、照順序）

```powershell
# 1. 先確認這個課程的 review 已經是 completed，且 currentStage 是 review
node orchestrator.mjs status --course <course-id>

# 2. 選擇要做影片
node orchestrator.mjs choose-media --course <course-id> --choice yes

# 3. 在 versions/{version}/media/ 底下放入 media-config.json（選一種聲音設定複製過去）
#    - 免費、不需要 API Key：orchestrator/media-config.edge-female.json（Edge TTS，需先裝 Python edge-tts 套件並保持連網）
#    - 需要 OPENAI_API_KEY：orchestrator/media-config.openai-female.json
#    - 純測試、不產生真人語音：orchestrator/media-config.mock.json
Copy-Item orchestrator/media-config.edge-female.json library/courses/<course-id>/versions/<version>/media/media-config.json

# 4. 跑 media-script，產生旁白草稿
node orchestrator.mjs execute --course <course-id>

# 5. 打開 versions/{version}/media/narration-script.md 檢查旁白文字，滿意後才進行下一步
#    （這是唯一的人工檢查點；一旦 confirm，media-render 會自動核准腳本並直接跑到底）

# 6. 確認腳本，解鎖 media-render
node orchestrator.mjs confirm --course <course-id> --stage media-render

# 7. 跑 media-render（TTS + 字幕 + FFmpeg，7 頁大約需要數分鐘，視 TTS 供應商而定）
node orchestrator.mjs execute --course <course-id>

# 8. 確認結果
type library\courses\<course-id>\versions\<version>\media\media-review.md
```

完成後影片在 `versions/{version}/media/video/final-video.mp4`；`media-review.md` 顯示 `V PASS` 才算完成。

### 舊 run 補丁（一次性，只有 2026-08-14 之前建立、且已跑完 review 的課程才需要）

在這個功能接上之前建立的 run，其 `state.json` 沒有 `media-script`／`media-render` 的 stage 欄位與 `mediaScript` 確認欄位，`choose-media` 會直接報錯。若要幫這種舊課程補做影片，需要手動在該 run 的 `state.json` 補上：

```json
"confirmations": { ..., "mediaRequested": false, "mediaScript": false, "media": false },
"stages": {
  ...,
  "media-script": { "status": "pending", "agent": "Media Production Agent", "output": "versions/{version}/media/narration-script.md", "artifactSha256": null },
  "media-render": { "status": "pending", "agent": "Media Production Agent", "output": "versions/{version}/media/video/final-video.mp4", "artifactSha256": null }
}
```

且 `currentStage` 必須是 `"review"`（不是 `null`）`choose-media` 才會放行。之後新開的 run（`orchestrator.mjs start`）不需要這個步驟，會自動套用最新 `pipeline.json`。
