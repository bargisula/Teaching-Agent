# 媒體製作 Agent（Media Production Agent）

## 定位

這是一個可選的後製 Agent。只有在 PPTX 已完成、Review 通過，而且使用者明確要求製作影片時才啟動。

它不重新設計課程、不修改投影片內容，也不負責投影片圖片生成；它只把既有教材轉成含旁白與字幕的 MP4。

2026-08-14 起，這個 Agent 已經正式接上 `orchestrator/orchestrator.mjs`（`pipeline.json` version 6），拆成 `media-script` 與 `media-render` 兩個 stage。**正式流程一律透過 Orchestrator 執行，不要再手動一支一支腳本串起來跑**；完整指令順序見 [orchestrator/README.md](../orchestrator/README.md) 的「影片製作」章節。下面各節說明的獨立腳本，是 Orchestrator 內部（`orchestrator/run-agent.mjs`）實際呼叫的實作，供除錯或手動修復用，不是日常操作入口。

## 正式操作方式（一定要照這個順序，不然會忘記）

```powershell
node orchestrator/orchestrator.mjs choose-media --course <course-id> --choice yes
# 把選好的聲音設定複製進去，例如免費的 Edge TTS：
Copy-Item orchestrator/media-config.edge-female.json library/courses/<course-id>/versions/<version>/media/media-config.json
node orchestrator/orchestrator.mjs execute --course <course-id>              # 跑 media-script，產生旁白草稿
# 打開 versions/<version>/media/narration-script.md 檢查旁白文字
node orchestrator/orchestrator.mjs confirm --course <course-id> --stage media-render
node orchestrator/orchestrator.mjs execute --course <course-id>              # 跑 media-render：TTS + 字幕 + FFmpeg
```

影片產出在 `versions/<version>/media/video/final-video.mp4`；`versions/<version>/media/media-review.md` 顯示 `V PASS` 才算完成。

## 輸入

- `versions/{version}/content/slides.md`：逐頁教學內容與講師說明
- `versions/{version}/deck/deck.pptx`：已完成的 PPTX
- `versions/{version}/visual-design/assets/*.png`：逐頁畫面來源
- `versions/{version}/media/media-config.json`：使用者選擇的影片模式、聲音與字幕設定

## 支援模式

- `single-female`：單一女聲旁白
- `single-male`：單一男聲旁白
- `dialogue`：多角色對談
- `teacher-student`：老師與學生問答

## 執行順序

1. 驗證 PPTX、逐頁內容與 PNG 資產存在且頁數一致。
2. 依 `media-config.json` 產生逐頁旁白或對談腳本。
3. 停在腳本確認點；未獲得使用者確認，不產生完整音訊與影片。
4. 將每句文字交給對應的 TTS 聲音，產生音檔。
5. 依實際音檔長度建立字幕時間軸，輸出 SRT 與 ASS。
6. 使用 FFmpeg 合成投影片、音訊與字幕，輸出 MP4。
7. 執行媒體品質檢查並產生 `media-review.md`。

## 輸出

- `versions/{version}/media/narration-script.md`
- `versions/{version}/media/dialogue.json`（對談模式）
- `versions/{version}/media/audio/`
- `versions/{version}/media/subtitles/subtitles.srt`
- `versions/{version}/media/subtitles/subtitles.ass`
- `versions/{version}/media/video/final-video.mp4`
- `versions/{version}/media/media-review.md`

## 腳本階段（Orchestrator 的 `media-script` stage 會自動呼叫，以下為內部實作／除錯用）

第一個可執行階段使用 `scripts/generate-media-script.mjs`，將符合格式的 `slides.md` 轉成草稿：

```powershell
node scripts/generate-media-script.mjs `
  --input versions/{version}/content/slides.md `
  --config versions/{version}/media/media-config.json `
  --output versions/{version}/media
```

此階段只產生 `narration-script.md` 與 `dialogue.json`，狀態固定為 `draft`；腳本尚未確認前，不得進入 TTS。

腳本確認使用：

```powershell
node scripts/confirm-media-script.mjs `
  --media versions/{version}/media `
  --action approve
```

確認後會產生 `media-script-status.json`，並將 `dialogue.json` 標記為 `approved`。後續 TTS 階段必須驗證此狀態與 SHA-256，確保語音對應的是已確認版本。

## TTS 與音訊階段（Orchestrator 的 `media-render` stage 會依 `media-config.json` 的 provider 自動選擇並依序呼叫，以下為內部實作／除錯用）

目前提供 `mock` TTS Adapter 作為整合測試用途；它使用 FFmpeg 產生與文字長度相符的測試 WAV，不代表真人語音。真正的 TTS 供應商之後只需替換 Adapter。

```powershell
node scripts/generate-tts-audio.mjs --media versions/{version}/media
node scripts/merge-slide-audio.mjs --media versions/{version}/media
```

第一個指令產生逐句音檔與 `tts-manifest.json`；第二個指令依頁面與句子順序合併成 `audio/slides/slide-XX.wav`，並產生 `slide-audio-manifest.json`。

真正的 OpenAI TTS 女聲可使用：

```powershell
node scripts/generate-openai-tts-audio.mjs --media versions/{version}/media --voice coral
```

此指令需要環境變數 `OPENAI_API_KEY`，不把金鑰寫入課程檔案。預設使用 `coral`，並以 FFprobe 讀取每個 MP3 的實際長度供字幕使用。

免費 Edge TTS 女聲可使用：

```powershell
node scripts/generate-edge-tts-audio.mjs --media versions/{version}/media --voice zh-TW-HsiaoChenNeural
```

它不需要 OpenAI API Key，但需要先安裝 Python `edge-tts` 套件並保持網路連線。

## 字幕階段（`media-render` stage 內自動接續執行）

音訊合併完成後執行：

```powershell
node scripts/build-subtitles.mjs --media versions/{version}/media
```

此階段依 `tts-manifest.json` 的實際秒數建立每句的開始／結束時間，輸出每頁的 SRT 與 ASS。ASS 預設使用 Microsoft JhengHei，老師與學生使用不同顏色，供後續 FFmpeg 燒錄使用。

## 影片合成階段（`media-render` stage 內自動接續執行）

音訊與字幕完成後，使用逐頁 PNG 合成影片：

```powershell
node scripts/assemble-media-video.mjs `
  --media versions/{version}/media `
  --images versions/{version}/visual-design/assets
```

每頁先產生一個帶字幕的 MP4 片段，再依頁碼串接成 `video/final-video.mp4`。影片合成失敗時不得產生完成狀態。

## 媒體品質檢查（`media-render` stage 內自動接續執行）

影片合成後執行：

```powershell
node scripts/review-media-output.mjs --media versions/{version}/media
```

檢查器會驗證 MP4、影像／音訊串流、影片長度、頁數、音檔、SRT、ASS 與 manifest。只有 `media-review.md` 顯示 `V PASS`，媒體階段才算完成。

## 不做的事

- 不在 PPTX Review 通過前自行啟動。
- 不因使用者選擇製作影片而自動視為內容或視覺確認。
- 不用字幕文字長度猜測時間軸；字幕必須依實際音檔時間建立。
- 不把 TTS 供應商、聲音 ID 或 API 金鑰硬編碼在 Agent 規格內。
- 不在沒有繁體中文字型設定時宣稱影片已完成。

## 驗收標準

- 輸入、模式、輸出路徑已固定。
- 旁白腳本確認是明確的獨立閘門（Orchestrator 的 `mediaScript` confirmationKey，掛在 `media-render` stage 上）。
- TTS、字幕、FFmpeg 的責任邊界清楚。
- 已由 Orchestrator 以 `media-script` / `media-render` 兩個選配 stage 正式呼叫（2026-08-14 起，`pipeline.json` version 6）；日常操作一律走 Orchestrator，不再手動串腳本。
