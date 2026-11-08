---
name: principle-subtract-before-you-add
description: "Apply when sequencing an addition, refactor, or rewrite. Remove dead code, redundant validators, and stub references first, then build on the simpler base."
disable-model-invocation: true
---
<!--
Source: https://github.com/cursor/plugins/tree/main/pstack/skills/principle-subtract-before-you-add (same text as the pstack 0.15.36 plugin installed for this bot, loaded via the Skill tool)
License: MIT (c) 2026 Lauren Tan
Commit: 4dd1d05
Copied: 2026-10-31 for the Cravins build kit. Text unchanged below this header.
-->

# Subtract Before You Add

When evolving a system, remove complexity first, then build. Default to subtraction.

Make simplification a continual investment. Leave the design slightly simpler and more capable behind the same or smaller surface than you found it.

- Sequence removal before construction
- Cut before you polish (get to the minimum before investing in quality)
- Design for observed usage, not speculative edge cases
- No speculative validators, parsers, or guards beyond what the spec demands
- Simplify prompts (remove redundant instructions, excessive templates)
- When a reference has no novel content, delete it rather than leaving a stub
