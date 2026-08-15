# Teaching Agent project rules

## Session startup

Every session must read `README.md` and `orchestrator/conversation-protocol.md` before acting.

## Architecture

There are exactly four core agents: Orchestrator, Curriculum, Visual, and Review. `course-material-agent/` is a Curriculum resource module. Image generation and PPTX assembly are tool stages, not agents.

## Mandatory workflow

Use `orchestrator/orchestrator.mjs` as the only entry point. The independent gates are requirements, content, and visual. Never infer one confirmation from another.

For every current stage, read the run's `DISPATCH.json`:

- If `execution` is `agent`, read `specDoc` and `input`, personally author `expectedOutput`, then execute the stage.
- If the stage is `render`, use `.agents/skills/teaching-agent-imagegen/SKILL.md` and Codex built-in `image_gen`. Generate one complete Traditional Chinese slide PNG per page, copy it into the course assets folder, inspect it, and run the bundled finalizer. Never use the PowerShell/System.Drawing fallback in the formal flow.
- If `execution` is `script`, execute it through the orchestrator.
- If the stage is `review`, inspect every slide and compare all results with the initial requirements and acceptance checklist.

The deck has exactly one cover and at most 12 slides including the cover. PPTX assembly uses one full-bleed PNG per slide and no second text layer.

## Acceptance

A run is complete only when imagegen evidence, PNGs, PPTX, `content-review.md`, `visual-review.md`, `asset-review.md`, `pptx-review.md`, `imagegen-review.md`, and final `report.md` all exist and pass. Review results use V/!/X and must cite the initial acceptance checklist. There is no `run-all` shortcut.