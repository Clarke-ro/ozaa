---
name: principle-laziness-protocol
description: "Apply when refactoring, evaluating diff size, or tempted to add abstractions, layers, or signal threading. Bias toward deletion and the smallest change that solves the problem."
disable-model-invocation: true
---
<!--
Source: https://github.com/cursor/plugins/tree/main/pstack/skills/principle-laziness-protocol (same text as the pstack 0.15.36 plugin installed for this bot, loaded via the Skill tool)
License: MIT (c) 2026 Lauren Tan
Commit: 4dd1d05
Copied: 2026-10-31 for the Cravins build kit. Text unchanged below this header.
-->

# Laziness Protocol

- **Consolidate decisions.** Do not repeat the same choice in several places. Put it behind one source of truth and pass the result as a simple flag.
- **Minimize the diff.** Make the smallest change that solves the problem. Fewer lines beat "elegant" boilerplate.
