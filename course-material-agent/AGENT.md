# Curriculum Agent 教材模組

本資料夾不是第五個核心 Agent，而是 Curriculum Agent 使用的教材設計資源包。

## 核心 Agent 邊界

核心 Agent 只有：

1. Orchestrator
2. Curriculum Agent
3. Visual Agent
4. Review Agent

`course-material-agent` 不列入核心 Agent 清單，不建立獨立 Run、不負責流程派發、不管理確認狀態、不直接生成 PPTX。

## 所屬關係

```text
Orchestrator
  ↓
Curriculum Agent
  └─ 使用 course-material-agent 的 Skills、模板、範例與測試
  ↓
Visual Agent
```

## 資源

- `skills/outline-parser/`：整理需求、學習目標與課程大綱
- `skills/image-generator/`：定義視覺需求與圖像提示詞格式；實際生成由 Visual Agent 執行
- `examples/`：教材設計範例
- `tests/`：模組測試案例

## 輸出邊界

本模組只提供 Curriculum Agent 的中間產物格式與設計資源，不直接產出正式教材版本、圖像或 PPTX。
