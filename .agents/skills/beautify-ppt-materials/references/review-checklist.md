# Review checklist

Compare against the original source manifest, approved slide text hash, and approved style hash. Record each result as `V`, `!`, or `X`.

## Content

- All source items are represented or explicitly marked out of scope.
- Every approved visible string appears exactly and uses Traditional Chinese.
- No unapproved words, fabricated facts, placeholder copy, or garbled text appear.
- Summaries preserve source meaning.
- Exactly one cover exists and the deck contains 1-12 slides.

## Visual system

- Palette, title hierarchy, typography character, geometry, and image language remain consistent.
- Page composition varies with teaching purpose without looking like a different deck.
- Supplied logos and must-preserve images remain recognizable and undistorted.
- Each slide has one clear focal point, readable hierarchy, and no clipping or overflow.

## Generation evidence

- Every page has a built-in `image_gen` call or corresponding generated-images source path.
- Source and copied-asset SHA-256 values match.
- Every final PNG is readable and approximately 16:9.
- Every inspection field is true; failed pages were retried no more than twice.

## PPTX

- Slide count and order match the approved specification.
- Each slide contains one full-bleed PNG and no second text layer.
- Rendered PPTX slides match the approved PNGs.
- Presentation render and overflow tests pass.

## Final decision

- `V`: requirement passed.
- `!`: non-blocking warning; explain impact.
- `X`: blocking failure. Do not report completion while any `X` remains.
