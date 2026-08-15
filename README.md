# Teaching Agent

Teaching Agent 將已確認的教材需求轉成完整繁體中文投影片圖片，再拼成 image-first PPTX。

## 流程

1. `start` 建立 run 與 acceptance checklist。
2. Curriculum Agent 產生需求／目標草案，等待 requirements 確認。
3. 產生大綱與逐頁內容，等待 content 確認。
4. Visual Agent 產生 `visual-spec.json` 與每頁 image prompt，等待 visual 確認。
5. Codex 使用內建 imagegen 逐張生成完整 PNG，搬入 assets，逐張查看並完成 imagegen 驗證。
6. assemble 將每張 PNG 全版貼入 PPTX，不加第二層文字。
7. Review Agent 對照最初需求、內容、視覺、圖片與 PPTX，輸出 V/!/X 報告。

核心 Agent 只有 Orchestrator、Curriculum、Visual、Review。imagegen 與 PPTX 組裝是工具階段。最多 12 張且恰好一張封面。

## 操作

```powershell
node orchestrator/orchestrator.mjs start --course <course-id>
node orchestrator/orchestrator.mjs status --course <course-id>
node orchestrator/orchestrator.mjs confirm --course <course-id> --stage <current-stage>
node orchestrator/orchestrator.mjs execute --course <course-id>
```

每次先讀目前 run 的 `DISPATCH.json`。`execution:"agent"` 需要 Codex 親自依 specDoc 產生輸出；render 必須使用 `.agents/skills/teaching-agent-imagegen/SKILL.md`。`execution:"script"` 才由程式自動執行。

正式流程不使用 `render-visual-spec.ps1`，也不存在繞過三個確認點的 `run-all`。

## 影片製作（可選）

Review 完成後可選擇是否製作影片（旁白＋字幕＋MP4），由 Media Production Agent 負責，透過 Orchestrator 的 `media-script` → `media-render` 兩個 stage 執行。完整操作步驟見 [orchestrator/README.md](orchestrator/README.md#影片製作可選pptx-review-完成後才能啟動)。

## 安裝與啟動

```powershell
npm install
start.bat
```

`start.bat` 會啟動 `server.mjs`（本機教材編輯室後端，預設 `http://localhost:4173`）並自動開啟瀏覽器頁面（`catalog/`）。生成出來的教材會存在本機的 `library/`（不隨 repo 提供，執行後自動建立）。

## 專案結構

```
orchestrator/           流程核心。orchestrator.mjs 是唯一入口，管理 run 狀態、三個確認閘門、
                         stage dispatch。pipeline.json 定義各 stage 順序與執行方式。
                         media-config.*.json 是影片旁白/TTS 的設定範本（複製後改用）。
                         review-templates/ 是各 review 產出物的格式模板。
agents/                  四個核心 Agent 的職責說明文件（Orchestrator、Curriculum、Visual、Review、
                         以及選用的 Media Production）。
skills/                  Agent 執行各階段時使用的技能說明（大綱規劃、需求訪談、投影片審查、視覺方向）。
.agents/skills/          給 Codex 內建 imagegen 呼叫、以及 PPT 美編用的 Skill 定義（含腳本與參考規格）。
course-material-agent/   Curriculum Agent 底下的教材製作子模組，不能獨立跑，需經由根目錄 orchestrator
                         的三個確認點流程。
scripts/                 各 stage 用到的工具腳本：影片旁白/字幕/TTS/FFmpeg 合成、PPTX 組裝、
                         curriculum/content/visual 內容生成、格式驗證等。
styles/                  投影片版型設定（JSON），每個版型在 previews/ 有對應的成品 sample
                         （PNG + PPTX）供預覽外觀。
visual-style-repository/ imagegen 用的原創漫畫視覺風格參考庫（構圖／線條／色彩方向，非可直接複製的
                         版權圖）。
assets/                  manifest.json 登記的共用背景／素材圖，供 styles/ 版型引用。
catalog/                 本機教材編輯室的前端頁面（server.mjs 提供服務）。
docs/                    架構決策、pptx 製作經驗、imagegen 整合規劃等技術筆記。
server.mjs / start.bat   本機 Web 介面的後端與一鍵啟動腳本。
AGENT.md / AGENTS.md     給 AI Agent（Codex/Claude 等）的操作規則，正式跑流程前必讀。
```

`library/`（生成的教材成品）與本機快取／暫存檔不隨 repo 提供，已列在 `.gitignore`。