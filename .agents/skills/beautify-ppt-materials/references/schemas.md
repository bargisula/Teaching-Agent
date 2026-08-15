# Job schemas

Use UTF-8 JSON. Keep job artifacts outside the Skill directory.

## `source/source-manifest.json`

```json
{
  "jobTitle": "教材名稱",
  "language": "zh-Hant",
  "requestedSlides": 8,
  "sources": [{"id": "source-01", "path": "source/material.pdf", "role": "content", "mustPreserve": true, "notes": "主要教材"}]
}
```

Allowed image roles: `content`, `style-reference`, `logo`, `must-preserve`.

## `content/slide-text.json`

```json
{
  "language": "zh-Hant",
  "slides": [{"page": 0, "type": "cover", "title": "教材標題", "textMustAppear": ["教材標題", "副標題"], "sourceRefs": ["source-01#page=1"], "editorialNotes": "未改寫"}]
}
```

- Use 1-12 slides, numbered contiguously from 0.
- Use exactly one `cover`, at page 0.
- Put every visible string in `textMustAppear`; do not add decorative words later.
- Use `sourceRefs` to make source coverage auditable.

## `style/style-system.json`

```json
{
  "language": "zh-Hant",
  "styleName": "現代知識工作台",
  "designIntent": "清楚、專業、具有編輯感",
  "palette": {"background": "#F4F1EA", "primary": "#18233C", "accent": "#90C83E"},
  "typography": {"title": "粗黑體、左上對齊", "body": "清晰無襯線體"},
  "imageLanguage": "平面資訊插圖與簡化立體物件",
  "titleSystem": "固定左上標題區與相同尺寸層級",
  "layoutRules": ["每頁一個焦點", "保留充足留白"],
  "avoid": ["簡體中文", "未確認文字", "浮水印"]
}
```

## `visual-spec.json`

```json
{
  "language": "zh-Hant",
  "aspectRatio": "16:9",
  "styleSystem": "style/style-system.json",
  "pages": [{"page": 0, "type": "cover", "role": "opening", "title": "教材標題", "coreMessage": "課程承諾", "textMustAppear": ["教材標題", "副標題"], "textMustNotAppear": ["未確認裝飾文字"], "sourceRefs": ["source-01#page=1"], "layout": "主標題與代表視覺", "imagePrompt": "完整 16:9 教材封面"}]
}
```

Each page's `textMustAppear` must exactly match the approved slide-text entry, including order.

## `visual-design/imagegen-provenance.json`

```json
{
  "generatedBy": "codex-built-in-imagegen",
  "slides": [{"page": 0, "prompt": "final prompt", "sourcePath": "C:/Users/name/.codex/generated_images/.../image.png", "sourceSha256": "64 lowercase hex", "assetPath": "visual-design/assets/slide-00.png", "assetSha256": "64 lowercase hex", "retries": 0}]
}
```

## `review/imagegen-inspection.json`

```json
{
  "slides": [{"page": 0, "textAccurate": true, "traditionalChinese": true, "sourceFaithful": true, "styleConsistent": true, "compositionSupportsMessage": true, "noOverflow": true, "notes": ""}]
}
```
