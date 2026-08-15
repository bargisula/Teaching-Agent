# Teaching Agent operating rules

Read `README.md` and `orchestrator/conversation-protocol.md` before acting. The only core agents are Orchestrator, Curriculum, Visual, and Review. `course-material-agent` is a Curriculum Agent module, not a fifth agent and cannot run independently.

Never directly generate a complete course, image set, or PPTX from a new brief. Start a run, present the requirements draft, and wait for explicit `requirements` confirmation. Then generate content and wait for `content`; then generate visual specifications and wait for `visual`. Only after all three confirmations may image generation, rendering, PPTX assembly, and review execute.

The PPTX is image-first, has exactly one cover, and has at most 12 slides including the cover. Assembly must create review artifacts in the course `review/` folder, tied to the startup acceptance checklist.