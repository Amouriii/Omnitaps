Accessibility Checklist — OmniTaps UI Improvements

Guiding principles:
- Use semantic HTML landmarks (header, main, nav, footer).
- Ensure keyboard focus order is logical and visible via :focus-visible.
- Provide skip links for keyboard/screen-reader users.
- Ensure interactive controls have accessible names (aria-label, visible text).
- Modals must trap focus, be dismissible via Escape, and restore focus on close.
- Color contrast should meet WCAG AA for normal text.

Checks performed:
- Added skip link and main landmarks.
- Mobile nav has aria-controls and keyboard focus handling with Escape close.
- Modal implements focus trap and restores focus.
- :focus-visible rules added for nav, buttons, and cards to match hover states.

Recommended manual checks:
- Run Lighthouse accessibility audit.
- Test with screen reader (NVDA/VoiceOver).
- Keyboard-only navigation: Tab through header, open mobile menu, modal flows.
