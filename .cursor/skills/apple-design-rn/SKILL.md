---
name: apple-design-rn
description: Apply Apple-platform design quality (type scale, spacing, hierarchy, materials, motion, touch targets, accessibility, dark mode, icons, haptics) to an Expo / React Native app and its web landing page. Use during UI work, UI polish passes, and design reviews of owner screens or the marketing site.
license: MIT (this file). See Attribution for the sources.
---

# Apple-grade design for Expo / React Native (+ web)

Use this skill when you build, polish or review UI. **Work within the repo's existing theme, components and navigation.** Put every value below into the existing token file instead of hard-coding it. When a rule conflicts with the app's brand, keep the brand and record the trade-off.

## 1. Tokens first
- Keep one theme module for colors (named by role: bg, surface, label, secondaryLabel, separator, accent, destructive, success), the type scale, spacing, radii, shadows, durations and springs. Screens import tokens; there are no raw hex values or magic numbers in screens.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40. Screen margin is 16 (20 on large phones/tablets). Card padding is 16. Related items sit 8–12 apart; groups 24–32.
- Radii: 8 (controls), 12 (cards), 16–20 (sheets). On iOS add `borderCurve: 'continuous'` so corners look like the system's.

## 2. Typography
- Default body size is **17**, minimum **11**. Use a few weights (regular, semibold, bold) and let size + weight carry the hierarchy.
- Scale (size/line-height): largeTitle 34/41 · title1 28/34 · title2 22/28 · title3 20/25 · headline 17/22 semibold · body 17/22 · callout 16/21 · subheadline 15/20 · footnote 13/18 · caption 12/16 (use sparingly).
- Fonts: system by default (`Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' })`). For a brand font, load it with `expo-font` and keep the same size and weight map. Display serifs are for headings only.
- **Dynamic Type:** leave `allowFontScaling` on. Use `maxFontSizeMultiplier` (1.6–2) only on dense chrome, never on body text. Test at the largest accessibility size: rows wrap and grow, never clip. Use `useWindowDimensions().fontScale` to turn horizontal rows into vertical stacks when text is large.

## 3. Layout & hierarchy
- Use `react-native-safe-area-context` (`SafeAreaProvider`, `useSafeAreaInsets`) on every screen. Nothing sits under the notch, home indicator or tab bar.
- Each screen has one job and one primary action, within thumb reach (bottom bar or header right). Destructive actions are never the default.
- Lay out by available width (`useWindowDimensions`), not by device. At ≥768 show two columns or list+detail, but **never drop a feature at small widths**.
- Use inset grouped cards for settings, with `StyleSheet.hairlineWidth` separators.
- Empty states: icon, short title, one help line, one CTA. Loading: skeletons in the final layout shape. Errors: say what happened and how to fix it, with a Retry.

## 4. Touch & controls
- Hit targets are **≥44×44 pt** (Android ≥48 dp). Use `hitSlop` or padding for small icons, and leave ≥8 pt between targets.
- Use `Pressable` (or the repo's Button) for everything tappable, with a pressed state (opacity ~0.7 or a 0.97 scale spring). Never put tap handlers on a plain View.
- Forms: correct `keyboardType`, `textContentType`/`autoComplete`, `returnKeyType` with focus chaining, and keyboard avoidance (`KeyboardAvoidingView` or `react-native-keyboard-controller`). Prefer pickers, segments and toggles over typing. Validate inline and never wipe the user's input.
- Sheets: one at a time, swipe to dismiss, a clear Cancel, and a grabber when resizable (Expo Router `presentation: 'formSheet'|'modal'` or `@gorhom/bottom-sheet`).
- Destructive actions get `Alert.alert` with a `'destructive'` button plus Cancel, or an undo toast.

## 5. Navigation
- Top-level sections go in a bottom tab bar (3–5 tabs, each with an icon + short label). Everything else lives in native stacks with the back gesture. On tablet or web the tab bar can become a sidebar.
- Use native-stack header features (`headerLargeTitle`, `headerBlurEffect`, `headerSearchBarOptions`) instead of hand-built headers.
- Keep scroll position and form drafts when switching tabs.

## 6. Color, materials, dark mode
- Light and dark both come from the same role tokens (`useColorScheme()` or the theme provider). Elevated dark surfaces are not pure black; dark-mode text is around 92–95% white rather than pure white.
- Contrast: **4.5:1** for text ≤17, **3:1** for ≥18 or bold text and for UI glyphs. Never use color alone to show state; add an icon, text or shape.
- Spend the accent on one thing per screen (the primary action and selection) and keep the rest neutral.
- Materials: `expo-blur` `BlurView` (iOS tints `systemMaterial` / `systemChromeMaterial`) for tab bars, headers and floating controls. Fall back to a solid surface on Android/web and when `AccessibilityInfo.isReduceTransparencyEnabled()`.

## 7. Icons
- Use one icon family at a weight that matches the adjacent text. On iOS, `expo-symbols` `SymbolView` gives SF Symbols, with a fallback (`@expo/vector-icons` Ionicons, or Lucide on web) elsewhere. Size icons around the text's cap height to 1.2×. Every icon-only button has an `accessibilityLabel`.

## 8. Motion & haptics
- Motion explains change (push, sheet, reorder, insert or delete). Keep it at 150–300 ms and interruptible.
- `react-native-reanimated`: `withSpring` (damping ~15–20, stiffness ~150–200), layout animations (`FadeIn`, `LinearTransition`) for list changes, `react-native-gesture-handler` for drag/swipe.
- Reduce Motion: `useReducedMotion()` or `AccessibilityInfo.isReduceMotionEnabled()`. Replace movement with opacity fades.
- `expo-haptics`: `selectionAsync` for picker/segment changes, `impactAsync(Light)` for toggles and drops, `notificationAsync(Success|Warning|Error)` for save/validation results. No haptics on scroll or on every tap.

## 9. Accessibility (failures are blockers)
- Set `accessibilityRole` (button, link, header, switch, image, adjustable), `accessibilityLabel`, `accessibilityHint` only when needed, and `accessibilityState` {selected, checked, disabled, busy}.
- Group composite rows (`accessible` with one label). Hide decorative images (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`).
- Announce async results with `AccessibilityInfo.announceForAccessibility`. Focus order follows the visual order.
- Test with VoiceOver and TalkBack, the largest text size, dark mode, Reduce Motion and Reduce Transparency.

## 10. Writing
- Labels say what happens ("Save changes", "Publish menu"), and an action keeps its name through the flow. Use one capitalization convention consistently. No jargon or filler, and no apologetic errors: say what went wrong and how to fix it.

## 11. Web landing page
- Type: a system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) or the brand font. Fluid sizes via `clamp()` (hero ≈ `clamp(2.5rem, 6vw, 4.5rem)`), body 17–18px, line-height 1.4–1.6, a measure of 60–75 characters.
- Layout: 8px grid, sections padded 80–120px on desktop / 48–64px on mobile, max width ~1100–1200px. One idea per section and a single primary CTA, repeated.
- Color: CSS custom properties by role, a `prefers-color-scheme` dark variant, and a sticky nav with `backdrop-filter: blur()` plus a solid fallback.
- Motion: subtle reveals (opacity + 8–16px translate, ≤400ms), turned off under `prefers-reduced-motion`.
- Accessibility: landmarks, a single `h1`, visible focus, 4.5:1 contrast, alt text, ≥44px tap targets, keyboard-operable accordions and modals (focus trap, Esc).
- Performance: responsive images (`srcset`, AVIF/WebP), `font-display: swap`, Lighthouse ≥90 for performance and accessibility.

## 12. Review output
List findings as **Critical / High / Medium / Low**. Each states what is wrong, with numbers (size, contrast, target), why, and the fix in RN/Expo or CSS terms. End with "What works". Don't flatten the brand and don't invent guidelines: check the HIG (https://developer.apple.com/design/human-interface-guidelines/) and cite it when in doubt.

## Attribution
- **swiftui-pro** by Paul Hudson, https://github.com/twostraws/swiftui-agent-skill, **MIT License** © 2026 Paul Hudson. The principles in sections 1, 3, 4 and 9 (central design constants, 44×44 targets, flexible layouts that never drop features, standard empty states, labelled icon buttons, Reduce Motion, real buttons instead of tap gestures, no color-only meaning) are adapted from its `references/design.md` and `references/accessibility.md` and translated to React Native. The license is kept in `../swiftui-agent-skill/LICENSE`.
- **apple-design-skill** by dickwu, https://github.com/dickwu/apple-design-skill. **There is no open-source license file.** Its HIG pages are Apple Inc.'s copyrighted text, which the repo reproduces with source links. **Nothing is copied from it here**; it is only referenced. General ideas (severity-ranked review lenses, the mapping of Apple terms to React Native) are restated in original wording. For full HIG detail, install that skill from its repo.
- Neither project is affiliated with Apple.

## Notes for this repo

Checked against the Expo app's `package.json` and `package-lock.json`. That dependency set is the same on every app branch. `main` has no `package.json` yet. Do not install packages to follow this skill.

- **SDK:** Expo SDK 58 (`expo` 58.0.22), React Native 0.88.1, React 19.3.0.
- **Navigation:** `expo-router` 58.0.29. Screens import `Stack` and `Tabs` from `expo-router`. The lockfile includes `standard-navigation` and `react-native-screens`. It does not include `@react-navigation/native` or `@react-navigation/native-stack`. `headerLargeTitle`, `headerBlurEffect` and `headerSearchBarOptions` are React Navigation native-stack names, so confirm them on the installed Expo Router before using them. Existing sheets use `presentation: 'modal'` and `presentation: 'transparentModal'`.
- **Present:** `react-native-reanimated` 4.7.1, `react-native-gesture-handler` 3.3.0, `react-native-safe-area-context` 5.10.1, `expo-haptics` 58.0.7, `expo-symbols` 58.0.4, `expo-font` 58.0.11, `lucide-react-native` 1.66.0.
- **Missing:** `expo-blur`, `react-native-keyboard-controller`, `@gorhom/bottom-sheet`, `@expo/vector-icons`. Use a solid surface token where the skill calls for `BlurView`. Use React Native `KeyboardAvoidingView` for the keyboard. Keep sheets on Expo Router `presentation` options. Use `expo-symbols` `SymbolView` and `lucide-react-native` for icons.
- Attribution points at `../swiftui-agent-skill/LICENSE`. That copy is not in this repo. See `.cursor/skills/README.md`.
