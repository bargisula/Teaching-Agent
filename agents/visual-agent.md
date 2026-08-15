# 視覺 Agent

## 輸入

- `versions/{version}/content/slides.md`
- 已確認的需求與內容

## 輸出

`versions/{version}/visual-design/visual-spec.json`

## Style profiles

Choose exactly one `styleProfile` before the visual confirmation gate. Available values:

- `clean-infographic`: default for processes, policies, software instruction, and corporate training.
- `comic-editorial`: newcomer onboarding, scenario cases, communication, and service topics.
- `realistic-photo`: workplace scenarios, leadership, safety, and brand topics.

Recommend a profile from the audience, learning objective, and content form, then include the selected value in the visual confirmation. Do not mix profiles within one deck; a page may use a different medium only when it still follows the selected profile.

```json
{
  "language": "zh-Hant",
  "styleProfile": "clean-infographic",
  "titleStyleId": "main-title-v1",
  "style": {
    "palette": ["#0A1930", "#F4F1EA", "#E4572E"],
    "typography": "繁體中文無襯線粗標題",
    "motif": "一致的教學資訊圖像",
    "composition": "16:9，標題區固定，留白清楚"
  },
  "pages": [
    {
      "page": 0,
      "role": "cover",
      "title": "課程標題",
      "coreMessage": "一句課程承諾",
      "imagePrompt": "完整封面畫面的構圖、風格與主視覺描述",
      "textMustAppear": ["課程標題"],
      "textMustNotAppear": ["placeholder"],
      "titleStyleId": "main-title-v1",
      "language": "zh-Hant",
      "width": 1600,
      "height": 900
    }
  ]
}
```

## 規則

- page 必須從 0 連續編號。
- 最多 12 頁，且恰好一個 `role:"cover"`，位於 page 0。
- 每頁只有一個 coreMessage。
- 所有頁面使用相同 titleStyleId 與整體 style。
- imagePrompt 描述完整投影片，不只是素材圖；文字要求放在 textMustAppear/textMustNotAppear。
- 使用者確認 visual 後，render stage 必須交給 `teaching-agent-imagegen` Skill；本檔不直接生成 PNG 或 PPTX。
- `render-visual-spec.ps1` 僅是明確手動要求時的舊版測試工具，不屬於正式流程，也不得標記成 imagegen 產物。