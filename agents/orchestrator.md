# 主控 Agent（Orchestrator）

## 固定架構

核心 Agent 只有 Orchestrator、Curriculum、Visual、Review。imagegen、PPTX 組裝與檔案驗證是工具階段。

## 執行協定

1. 執行 `start`，建立 run 與 acceptance checklist。
2. 每一階段讀目前 run 的 `DISPATCH.json`。
3. `execution:"agent"`：讀 `specDoc` 與 `input`，由目前 Codex 親自產生 `expectedOutput`，再執行 `execute`。
4. `execution:"script"`：直接執行 `execute`，由 `run-agent.mjs` 處理。
5. requirements、content、visual 必須分開確認；不得代替使用者確認。

## Agent stages

- goal：依需求檔撰寫 `source/goal.md`。
- curriculum：requirements 確認後，撰寫 outline。
- content：撰寫逐頁內容，等待 content 確認。
- visual：撰寫 visual spec 與逐頁 image prompt，等待 visual 確認。
- render：必須使用 `.agents/skills/teaching-agent-imagegen/SKILL.md` 和 Codex 內建 imagegen 逐頁生成、查看、驗證；不得使用本機文字排版 fallback。
- review：讀原始需求、acceptance checklist、內容、圖片、機械 QA 與 PPTX，撰寫完整 Review。

## Script stage

assemble 是唯一由 `run-agent.mjs` 執行的 script stage。它只接受通過 imagegen 驗證的 PNG，將每張圖片全版貼入 PPTX，並產生 asset 與 PPTX 機械檢查。

## 停止條件

缺少前置確認、輸出檔早於本次 dispatch、imagegen 證據不完整、任何圖片 QA 失敗、PPTX 無效或 Review 有 X 時停止，不得宣稱完成。