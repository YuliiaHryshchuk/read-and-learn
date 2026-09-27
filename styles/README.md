# SCSS design foundation

The project uses a desktop-first design system. Base classes target desktop and
the `mobile-*` variants override them at `600px` and below.

## Files

- `_tokens.scss` is the single source for colors, typography, spacing, and breakpoints.
- `_functions.scss` exposes validated `color()`, `space()`, and `font-size()` helpers.
- `_mixins.scss` contains `down()`, `page-container`, and `focus-ring` mixins.
- `theme.scss` exposes tokens as global CSS custom properties.
- `utilities.scss` generates global utility classes.

## Spacing

The spacing scale is `0, 4, 8, 12, 16, 24, 32, 40, 48px` and is addressed as
steps `0` through `8`.

```tsx
<div className="d-flex align-center gap-3 mt-5 px-4 mobile-flex-column mobile-px-2" />
```

Available prefixes are `m`, `mt`, `mr`, `mb`, `ml`, `mx`, `my`, `p`, `pt`,
`pr`, `pb`, `pl`, `px`, `py`, `gap`, `row-gap`, and `column-gap`.

## Sizing and layout

Common helpers include `width-100`, `w-100`, `height-100`, `min-width-0`,
`flex-1`, `d-flex`, `d-grid`, `flex-column`, `flex-wrap`, alignment and
justification helpers, plus `page-container`.

## Tokens in CSS Modules

Prefer runtime variables for component styles:

```scss
.card {
  padding: var(--space-4);
  color: var(--color-text-strong);
  background: var(--color-surface);
  font-family: var(--font-sans);
}
```

Use SCSS helpers when a value is needed during compilation:

```scss
@use "../styles/functions";
@use "../styles/mixins";

.card {
  border-color: functions.color(border);

  @include mixins.down(sm) {
    padding: functions.space(2);
  }
}
```
