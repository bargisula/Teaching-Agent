---
name: teaching-agent-imagegen
description: Generate complete Teaching Agent slide PNGs with Codex built-in image generation after requirements, content, and visual confirmations. Use when a Teaching Agent run reaches the render stage, when DISPATCH.json names this skill, or when Codex must turn visual-spec.json into Traditional Chinese slide images before PPTX assembly.
---

# Teaching Agent Image Generation

Generate complete slide images. This is a tool stage used by the Visual Agent, not a fifth Agent.

## Preconditions

1. Read the current run `state.json` and `DISPATCH.json`.
2. Require `currentStage` to equal `render`.
3. Require all `requirements`, `content`, and `visual` confirmations to equal `true`.
4. Read the dispatched `visual-spec.json`. Stop if it has no pages, more than 12 pages, non-contiguous page numbers starting at 0, or anything other than exactly one cover at page 0.
5. Resolve `styleProfile` before generating. Read `references/style-profiles/<styleProfile>.json`; allowed profiles are `clean-infographic`, `comic-editorial`, and `realistic-photo`. Treat a missing profile as `clean-infographic` only for legacy visual specs. Stop for an unknown profile.

## Generate each slide

For every page in ascending order:

1. Build one prompt from `imagePrompt`, `title`, `coreMessage`, `textMustAppear`, `textMustNotAppear`, `titleStyleId`, the global visual style, and every `promptRules` item in the resolved style profile. Include its `avoid` items as explicit exclusions.
2. Call the built-in `image_gen` tool once for that page. Do not use an API key or fallback CLI.
3. Require a complete 16:9 slide image, not a loose illustration.
4. Require all visible text to be Traditional Chinese. Include every `textMustAppear` string verbatim and exclude every `textMustNotAppear` string.
5. The built-in tool saves under Codex-managed storage first. Copy the selected output into `visual-design/assets/slide-NN.png`; do not assume the tool accepts a project destination argument.
6. Inspect the saved image with `view_image`. Check exact text, Traditional Chinese, title consistency, message-supporting composition, and clipping/overflow.
7. Retry only the failed requirement, at most twice. If it still fails, stop. Never substitute PowerShell, System.Drawing, HTML, SVG, or placeholder art.

Use this prompt prefix:

```text
Use case: productivity-visual
Asset type: complete 16:9 educational slide
Create the entire slide as one polished bitmap image.
All visible text must be Traditional Chinese and must reproduce required text verbatim.
Use one consistent title system across the deck.
Do not show presentation software UI, slide borders, placeholder copy, watermarks, simplified Chinese, garbled text, or extra text.
```

## Record inspection

After viewing every slide, write `visual-design/imagegen-inspection.json` with one entry per page and these boolean fields: `textAccurate`, `traditionalChinese`, `titleConsistent`, `compositionSupportsMessage`, and `noOverflow`. All five must be true.

## Finalize

Run the bundled validator. It derives status from the spec, inspection evidence, and actual PNGs; do not hand-author a completed status file.

```powershell
node .agents/skills/teaching-agent-imagegen/scripts/finalize-imagegen.mjs --course <course-id> --version <version>
node orchestrator/orchestrator.mjs execute --course <course-id>
```

Report final PNG paths, prompts used, and retries.