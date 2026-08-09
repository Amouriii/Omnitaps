OmniTaps — UI improvements

What changed (performance & accessibility)

- Added a Tailwind config (tailwind.config.cjs) with content globs and a small safelist so production builds purge unused CSS safely while preserving utility classes used dynamically.
- No large image assets were found; consider converting future large raster assets to WebP/AVIF and adding width/height attributes to avoid layout shift.
- Modal component implements basic focus trapping and restores focus on close.

How to build

- Development: npm run dev
- Production build: npm run build

Notes

All changes preserve existing design tokens and the logo. Review components in src/components and pages for accessibility and keyboard behavior.