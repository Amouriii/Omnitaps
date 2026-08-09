Component Guidelines — OmniTaps

Tokens & styling
- Always reuse CSS variables from src/index.css (--color-*, --font-*) for colors and typography.
- Use existing utility classes (btn-primary, btn-ghost, bento-card) to preserve visual language.

Accessibility
- Provide aria-labels for icon-only buttons.
- Use role="dialog" and aria-modal="true" for modals; trap focus and restore on close.
- Ensure links and buttons are keyboard reachable and have visible focus.

When adding components
- Keep components small and composable.
- Prefer props to modify behavior rather than creating new classes.
- Avoid introducing new colors, fonts, or spacing tokens without review.
