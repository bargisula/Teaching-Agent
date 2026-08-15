---
name: beautify-ppt-materials
description: Beautify user-provided teaching materials, screenshots, images, PDFs, documents, or existing slides into a consistent Traditional Chinese educational PPT. Use when the user invokes $beautify-ppt-materials or asks Codex to 美編教材、統一簡報風格、把材料或圖片整理成 PPT、先確認逐頁中文再生圖. Require separate text and style confirmations before calling built-in image_gen, then inspect complete slide PNGs, assemble an image-first PPTX, and save V/!/X review evidence.
---

# Beautify PPT Materials

Turn supplied materials into a consistent image-first educational deck. This is a Skill used by Codex, not a new Teaching Agent core Agent.

## Required outcome

Finish only when the job contains approved slide text, an approved style system, real built-in image generation evidence, inspected 16:9 slide PNGs, an image-first PPTX, and review files. A written prompt set without generated images is incomplete.

## Create the job

1. Create a job outside this Skill folder, normally under `library/beautify-jobs/<job-id>/`.
2. Run `node .agents/skills/beautify-ppt-materials/scripts/manage-job.mjs init --job <job-folder>`.
3. Copy or reference every user-provided file in `source/source-manifest.json`. Label each image as `content`, `style-reference`, `logo`, or `must-preserve`.
4. Inspect every supplied image with `view_image`. Use the PDF, document, or presentation Skill when those formats must be read.
5. Preserve source meaning. Do not invent facts or silently discard material.

Read [schemas.md](references/schemas.md) before authoring job JSON. Read [review-checklist.md](references/review-checklist.md) before rendering.

## Gate 1: approve all visible Chinese text

1. Write `content/slide-text.json` with 1-12 contiguous pages beginning at 0 and exactly one cover at page 0.
2. Put every visible string for each slide in `textMustAppear`, including title, subtitle, labels, footer, and chart text. Use Traditional Chinese (`zh-Hant`).
3. Cite the supplied material in `sourceRefs`, and identify any summarization in `editorialNotes`.
4. Show the user the complete per-slide text list. State clearly that this confirms text only, not style.
5. Stop and wait. Do not infer approval from an earlier message.
6. After explicit approval, run `node .agents/skills/beautify-ppt-materials/scripts/manage-job.mjs confirm-text --job <job-folder>`.

The script stores a SHA-256 hash. Any later text change invalidates the gate.

## Gate 2: approve style

1. After Gate 1, write `style/style-system.json` and `visual-spec.json`.
2. Define one deck-wide palette, typography hierarchy, title system, image language, geometry, spacing, layout rules, and avoid list.
3. Keep the cover distinct but visibly related to the interior pages. Vary composition by teaching purpose while preserving the same visual system.
4. Present the style direction and one representative-page specification. This gate confirms style only.
5. Stop and wait for explicit approval.
6. After approval, run:

```powershell
node .agents/skills/beautify-ppt-materials/scripts/manage-job.mjs confirm-style --job <job-folder>
node .agents/skills/beautify-ppt-materials/scripts/manage-job.mjs preflight-render --job <job-folder>
```

Do not call image generation unless preflight succeeds.

## Generate complete slide images

Use the system `imagegen` Skill and Codex built-in `image_gen`; do not use an API key or a PowerShell/System.Drawing fallback.

For each page in order:

1. Build one prompt from the approved page specification and locked style system.
2. Call built-in `image_gen` once. Generate the complete 16:9 slide as a bitmap, not a loose illustration.
3. Include every `textMustAppear` string verbatim and prohibit unapproved text, simplified Chinese, placeholder text, presentation UI, borders, and watermarks.
4. Identify each supplied image as a content insert, style reference, logo, or must-preserve input. Inspect local images with `view_image` first.
5. Copy the selected generated file from Codex-managed generated-images storage to `visual-design/assets/slide-NN.png`.
6. Inspect the saved PNG with `view_image`: exact text, Traditional Chinese, source fidelity, style consistency, composition, and overflow.
7. Retry only the failed page, at most twice. Stop if it still fails; never substitute a placeholder.
8. Record prompt, source path/hash, asset path/hash, and retries in `visual-design/imagegen-provenance.json`.
9. Record inspection booleans in `review/imagegen-inspection.json`.

Run `node .agents/skills/beautify-ppt-materials/scripts/finalize-images.mjs --job <job-folder>`. It derives completion from actual files and hashes. Never hand-author a completed status.

## Assemble PPTX

After image finalization passes, use the `presentations` Skill and its required workspace runtime to create `deck/deck.pptx`:

- Use one full-bleed PNG per slide and no second text layer.
- Preserve the approved page order.
- Render and inspect every PPTX slide.
- Run the presentation overflow test required by the presentation Skill.

Write `review/pptx-review.md` with slide count, render result, overflow result, and `status: PASS` only when all pass.

## Complete review

Compare final results with supplied materials, approved text, and approved style. Use [review-checklist.md](references/review-checklist.md). Save `imagegen-review.md`, `content-review.md`, `visual-review.md`, `pptx-review.md`, and `report.md` under `review/`.

Use `V`, `!`, and `X`. Any `X` means incomplete. Report output paths, built-in image generation use, prompts, retries, and warnings.

## Invocation example

```text
$beautify-ppt-materials
請把我附上的教材文字與圖片美編成 8 張繁體中文 PPT。先列出每張所有中文讓我確認，再提出風格讓我確認；兩次都確認後才生成完整投影片圖片並組成 PPTX。
```
