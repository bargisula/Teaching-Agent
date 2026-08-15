# Teaching Agent PPT 產線踩坑紀錄

版本：2026-07-20  
範圍：T-0009 pipeline 改版、ai-document-basics v0.1/v0.2、LLM 入門 PPT v0.1，以及目前 Teaching Agent 專案。

## 1. 沙盒擋無頭瀏覽器：render 必須保留 fallback

- **現象**：render 階段嘗試用 Chrome/Edge headless 將 HTML 頁面截成 PNG 時，Codex 桌面版環境可能無法啟動無頭瀏覽器；既有 T-0009 流程仍需產出可交付 PNG。
- **原因**：桌面版沙盒限制瀏覽器程序與 headless 截圖能力；這是執行環境限制，不是 HTML 本身必然錯誤。現行 `run-agent.mjs:74-83` 會尋找 Chrome/Edge、執行 headless screenshot，失敗後呼叫 `render-fallback.ps1`，再以 JS raster fallback 保底。
- **解法/繞法**：保留三層路徑：
  1. 先用 `chrome.exe --headless=new --screenshot=... file:///...` 產生 PNG（`orchestrator/run-agent.mjs:74-80`）。
  2. 失敗時呼叫 `powershell -File orchestrator/render-fallback.ps1 -Output ... -Label ... -Caption ...`（`run-agent.mjs:81`）。
  3. fallback 仍無檔案時，使用 `rasterFallback()` 直接產出有效 PNG（`run-agent.mjs:68`）。
  fallback 圖只應承擔背景/圖表，不要把可編輯標題與重點文字烙進 PNG。
- **影響範圍**：主要影響 render 階段；也會連帶影響 assemble（沒有 PNG 就不能組裝）與 review。若 fallback 將文字畫進圖片，則會違反混合模式 PPT 的可編輯文字要求。

## 2. 原生文字框 vs 圖片貼入：可編輯性是驗收條件

- **現象**：把整張頁面以 PNG 貼進 PPT 最容易維持設計，但 PowerPoint 裡標題與重點無法點選、修改；T-0009 已明確要求 Alpha 能直接編輯文字。
- **原因**：PNG 是單一點陣圖，PowerPoint 只知道它是一張圖片，不知道裡面的字串。這不是 `python-pptx` 或 `pptxgenjs` 的讀取差異，而是輸出物件類型本身造成的。
- **解法/繞法**：採混合模式：HTML/SVG/PNG 只提供背景與圖表；組裝時用 `pptxgenjs.addText()` 疊加標題、核心訊息與重點（現行 `run-agent.mjs:89-99`）。驗收時一定要在 PowerPoint 點選第一頁標題和一個 bullet，確認是原生文字框。visual-agent 的規則也固定要求 PNG 只負責背景/圖表、可編輯文字留在 PPT（`agents/visual-agent.md:3-9`）。
- **影響範圍**：影響 render、assemble、review 三階段與成品驗收；不影響內容與視覺規格本身。若改成全圖貼入，整份 deck 都會失去可編輯性。

## 3. 中文編碼：所有中間檔與回報都要明確 UTF-8

- **現象**：過去曾出現中文亂碼；在 Windows PowerShell、Node.js、跨 AI 回報流程中，檔案可能看似成功寫出，但被其他工具讀取時文字已損壞。
- **原因**：不同工具對預設 code page 的處理不一致；若寫檔未指定 encoding，或讀檔未去除 BOM，中文就可能在 agent 交接或 JSON/Markdown 解析時出錯。TaskHub knowledge 也記錄過 T-0001 的 UTF-8 事故。
- **解法/繞法**：
  - Node.js 寫檔固定使用 `fs.writeFileSync(..., 'utf8')`；現行 `run-agent.mjs:11-14` 的 `text()`/`put()`/`putJson()` 已採此模式。
  - Node.js 讀取 JSON/Markdown 時使用 UTF-8，並以 `.replace(/^\uFEFF/, '')` 去除 BOM（`run-agent.mjs:11-12`、`orchestrator/orchestrator.mjs:6,19`）。
  - PowerShell 讀寫中文時明確使用 `-Encoding UTF8`；REPORT、slides.md、visual-spec.json 都以 UTF-8 保存。
  - 回報內容避免從不同 code page 的命令輸出直接拼回檔案；需要保存時先轉成 UTF-8。
- **影響範圍**：影響所有階段的檔案交接、JSON 解析、PPT 文字內容與跨 AI 回報，不只是 render。

## 4. 版面、字型與溢版：能開啟不等於能投影

- **現象**：文字可能在 HTML 預覽看似正常，進入 PowerPoint 後因中文字型替代、標題過長、文字框高度不足而換行、裁切或溢出；只檢查 ZIP/PPTX 結構無法抓到這些問題。
- **原因**：HTML 與 PowerPoint 的排版引擎不同；字型缺失會改變字寬與行高。現行組裝器使用固定字型與固定框位（`run-agent.mjs:92-97`），並以 `fit:'shrink'` 作有限度保護，但沒有取代人工實機檢查。
- **解法/繞法**：
  - 統一指定中文字型 `Microsoft JhengHei`，英文可用 `Arial`/`Segoe UI`；不要依賴系統預設字型。
  - 標題、核心訊息、bullet 使用不同高度與字級；現行成品為 27pt、17pt、16pt（`run-agent.mjs:93,95-96`）。文字超長時先縮短文案，再使用 `fit:'shrink'`。
  - render 後檢查 PNG 尺寸與檔案有效性；review 階段目前只做 PNG/ZIP 基本檢查（`run-agent.mjs:101-107`），所以仍需 PowerPoint 實機逐頁檢查。
  - 若使用新的簡報工具，另做 bbox/overflow 掃描；本次 artifact-tool LLM PPT 已掃描 5 張 layout JSON，確認無物件超出 1280×720 畫布。
- **影響範圍**：影響 render 預覽、assemble 文字框與 review；常見於所有中文 PPTX，不限某一教材。

## 5. 風格參數地圖：目前哪些地方寫死，改風格要動哪裡

目前 pipeline 沒有從 `styles/` 載入風格；`styles/edu-poster.json` 已存在，但尚未被 `run-agent.mjs` 消費。T-0013 的工作就是把下面的硬編碼移到風格 tokens。

| 風格責任 | 目前檔案與行數 | 現況 | T-0013 應改成 |
|---|---|---|---|
| 階段順序、輸入輸出 | `orchestrator/pipeline.json:2-74` | 七階段與每階段路徑寫死 | 增加 pipeline-level `style`，預設 `edu-poster`，傳入 visual/render |
| visual-spec schema | `agents/visual-agent.md:3-9` | 只有 page/template/title/message/bullets/visual 欄位 | 每頁增加 `pageTemplate` 與 `style` tokens；保留文字可編輯規則 |
| 頁面模板與鏡像 | `orchestrator/run-agent.mjs:64,69-71` | template 只在 `visual-left/right` 兩種，HTML 版型字串寫死 | 由 `styles/<id>.json.pageTemplates` 決定 cover/section/content-photo/content-list/conclusion 與左右鏡像 |
| HTML render 背景、卡片、圓、線、字體 | `orchestrator/run-agent.mjs:71` | 大段 CSS 內嵌，色值/尺寸/字體寫死 | 從 tokens 產生 CSS；禁止把文字做成背景圖 |
| fallback PNG 顏色、字體、圖形 | `orchestrator/render-fallback.ps1:10-33` | `$dark/$accent/$light/$node`、字體、座標固定 | 由 render tokens 或 fallback-safe tokens 注入；至少保留無瀏覽器時可重現的 fallback |
| PPT 背景與原生文字 | `orchestrator/run-agent.mjs:89-99` | `E5EEE6`、`F9FCF8`、`173B32`、`31584C`、`C85D32`、Arial/Microsoft JhengHei 與尺寸寫死 | 以 `palette`、`typography.roles`、motifs 產生 fresh option objects |
| review 文字與尺寸描述 | `orchestrator/run-agent.mjs:101-107` | 檢查報告寫死 27/17/16pt 與固定左右安全區描述 | 讀 style tokens 後把實際 tokens 寫入報告，並檢查 doneChecklist |
| 已定義但尚未消費的風格 | `styles/edu-poster.json:1-78` | 已有 palette、typography、motifs、layout、pageTemplates、renderNotes、doneChecklist | 作為唯一風格來源；新增風格只需複製 JSON 並指定 style id |

## 6. artifact-tool runtime 路徑：工具初始化不一定找到 bundled package

- **現象**：LLM 入門 PPT 使用簡報技能時，初始化腳本尋找專案內 `.cache/codex-runtimes/.../@oai/artifact-tool/package.json`，回報 package.json 缺失；但本機其實有 bundled `@oai/artifact-tool`。
- **原因**：初始化器以專案目錄推導 runtime cache；桌面環境的實際 runtime 位於使用者層級 `.cache`，與專案內預期路徑不同。
- **解法/繞法**：先確認實際 bundled runtime，再讓 Node.js 透過暫時 `node_modules` junction 解析 `@oai/artifact-tool`，完成匯出後清理 junction。不可把這個 workaround 寫死進正式 pipeline；正式機制應由 workspace dependency loader 或環境設定提供穩定路徑。
- **影響範圍**：影響使用 artifact-tool 的簡報建立/修改工作，不影響既有 pptxgenjs pipeline；若無 fallback，會在 deck 產出前中止。

## 7. 自動品檢依賴不完整：要區分工具失敗與成品失敗

- **現象**：本次執行 `slides_test.py` 時，因 Python 缺少 `pdf2image` 而在載入階段失敗；不能把「檢查器沒跑」誤報成「簡報有錯」，也不能把它當成通過。
- **原因**：工具依賴未在專案環境中完整安裝；現有 pipeline 的 review 只檢查 PNG header/bytes 與 PPTX ZIP header（`run-agent.mjs:101-107`），不等同於完整的視覺 overflow 檢查。
- **解法/繞法**：報告中明確標記 QA 工具 unavailable；改做可重現的 layout/bbox 掃描，並把 PowerPoint 實機檢查列為待確認。後續風格機制需把「工具可執行」與「檢查結果」分成兩個狀態。
- **影響範圍**：影響 review/驗收可信度，不直接改變 render 或 assemble 產物。

## 產線共通檢查順序

1. 讀取單一輸入檔，明確以 UTF-8 解析並記錄 input hash。
2. visual-spec 每頁確認 template、背景/圖片用途與可編輯文字責任。
3. render 先嘗試 headless，再走 fallback；保留 HTML 與 PNG 供追查。
4. assemble 確認 PNG 只做背景/圖表，標題與重點用原生文字框。
5. review 同時做檔案結構、尺寸/bbox、文字可編輯性與 PowerPoint 實機檢查。
6. 風格變更只改 `styles/<style-id>.json`；若必須改程式，先更新風格參數地圖與測試。
