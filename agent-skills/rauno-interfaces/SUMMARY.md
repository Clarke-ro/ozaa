---
name: rauno-interfaces
description: Small interface details that make an app feel finished (inputs, type, motion, touch, a11y). Summary only. Use while building any screen, and in the polish pass before a PR.
---
<!--
Source: https://github.com/raunofreiberg/interfaces (README "Web Interface Guidelines", commit 81f523a, 2023-06-06)
Author: Rauno Freiberg
License: none published, so this is a SUMMARY in our own words, not a copy. Read the original at the link.
How Ozaa adapts it: rules written for the web are mapped to React Native where they apply.
-->

# Rauno's interface details, summarized for Ozaa

## Inputs and forms
- Tapping a label focuses its field. Use the right keyboard: `keyboardType="phone-pad"` for MoMo numbers, `email-address` for email.
- Enter or the keyboard "Done" key submits the form.
- Turn off autocorrect and spellcheck on names, codes and phone numbers.
- Icons inside a field sit on top of it with padding and also focus the field when tapped.
- Switches take effect at once. No "Are you sure?" for a toggle (owner service toggles save on change).
- Disable a button right after it is pressed until the request ends, so nothing is sent twice (Pay, Place order, Call waiter).
- No dead gaps between rows in a list. Make the rows taller instead of adding margins.

## Type
- Never use weights under 400. Medium headings look best at 500 to 600.
- Do not change weight on press or selection; it shifts the layout.
- Use tabular figures for prices, totals, timers and scores (`fontVariant: ['tabular-nums']`).
- Subset fonts to the languages you ship (Ozaa: Latin plus ɛ ɔ ŋ ɖ ƒ ʋ ɣ and ₵).
- Inputs on web are at least 16 px so iOS Safari does not zoom.

## Motion
- Interaction animations are 200 ms or less.
- Scale sheets and dialogs in from about 0.8 with a fade, not from 0.
- Buttons scale to about 0.96 on press, never 0.8.
- Frequent, low-novelty actions (adding to cart, removing a row) get little or no motion.
- Pause loops and videos that are off screen (story circles, game when backgrounded).

## Touch
- No hover styles on touch (on web wrap them in `@media (hover: hover)`).
- Do not autofocus inputs on phones; the keyboard covers the screen.
- Autoplay video must be muted and inline. Unmount off-screen videos; too many will choke cheap phones.
- Replace the default tap highlight with a pressed state, never with nothing.

## Accessibility
- Icon-only buttons need an accessible label (`accessibilityLabel`).
- Disabled buttons cannot show tooltips; say why next to the button.
- Focus rings follow the corner radius.
- Images are real images with alt text.

## Design behaviour
- Update the screen first and roll back with a message if the server says no (optimistic updates), except for payments: payments only show success after the server confirms.
- Show feedback next to what caused it: a check on the copy button, a red outline on the bad field.
- Empty states tell people what to do next.
