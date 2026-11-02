---
name: principle-never-block-on-the-human
description: "Apply when tempted to ask 'should I do X?' on reversible work."
disable-model-invocation: true
---
<!--
Source: https://github.com/cursor/plugins/tree/main/pstack/skills/principle-never-block-on-the-human (same text as the pstack 0.15.36 plugin installed for this bot, loaded via the Skill tool)
License: MIT (c) 2026 Lauren Tan
Commit: 4dd1d05
Copied: 2026-10-31 for the Ozaa build kit. Text unchanged below this header.
-->

# Never Block on the Human

The human supervises asynchronously. Agents must stay unblocked. Make reasonable decisions, proceed, and let the human course-correct after the fact. Since code changes are reversible and reviewable, a wrong decision usually costs less than blocking.

- Proceed, then present. Do the work, show the result. Don't ask "should I do X?" Do X, explain why.
- Make the system self-healing. When you notice a problem, log it and fix it in the next round.
- Irreversible actions (force-push, delete production data, send external messages) still require confirmation.
- Reversible actions (write code, edit notes, split tasks) should proceed without blocking.
- Product direction comes from the human. Execution should not block.
