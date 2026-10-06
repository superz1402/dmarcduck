# UI System — "humane data"

The UI is the product's differentiator, not decoration. Complex data (XML
verdicts, IPs, rates) must feel calm, legible, and honest. This document is
the law for visual decisions.

## Design language

- **Warm paper, ink, one accent.** Background `#faf9f5` (light) / `#171613`
  (dark). Text near-black ink. The ONLY accent is amber (the duck's bill,
  `#d97706` / `#f59e0b`). Semantic colors: green = authenticated, red =
  failing/spoof-suspect, amber = attention.
- **No AI-generated-look patterns.** Banned: purple-blue gradients,
  glassmorphism blur cards, emoji as icons, uniform 3-col icon feature grids
  with short CSS-animated spans, neon glows, fake screenshots.
- **Type.** System font stack (fast, native feel). Headings semibold with
  tight tracking; body regular, `leading-relaxed` for paragraphs. Numeric
  data uses `.tnum` (tabular numerals) — aligned columns everywhere.
- **Space.** Cards use `p-4`/`p-6`; sections breathe (`py-16` on marketing
  pages). Density is earned through hierarchy, not compression.

## Tokens

All colors/radii/fonts live in `src/app/globals.css` as CSS variables,
mapped to Tailwind via `@theme inline`. Components NEVER hardcode hex —
they consume semantic classes (`bg-card`, `text-muted-foreground`,
`bg-success-soft`, ...). Dark mode is a token swap (`.dark`), driven by
`next-themes` (system default, user toggle in header).

## Component primitives (`src/components/ui/`)

Hand-rolled, small, shadcn-inspired APIs (Button/Card/Input/Badge/Table/
Skeleton/Spinner/EmptyState/VerdictDot). Rules:

- Buttons: 4 variants + 3 sizes; disabled states always styled.
- Badges carry TEXT (pass/fail/mixed/spoof?) — color supports, never replaces.
- `VerdictDot` always pairs a colored dot with `sr-only` text.
- Tables: uppercase micro-labels for headers, hover row tint, scroll
  regions (`max-h-96 overflow-y-auto .scroll-slim`) for long lists.
- `EmptyState` = title + one honest sentence + optional action.

## Interaction states (mandatory trio)

Every async surface implements all three BEFORE the happy path:

1. **Loading** — `Skeleton` placeholders shaped like the content, or
   `Spinner` inside the action button (never blocking overlays).
2. **Empty** — `EmptyState` with the next step in the sentence ("Add a
   domain above, then..."), never a sad blank panel.
3. **Error** — inline `role="alert"` text in `bg-danger-soft`, human
   phrasing ("Network hiccup — check your connection"), never raw codes.

## Accessibility rules

- Semantic landmarks: `header/nav/main/footer`, one `h1` per page.
- Skip-to-content link (visible on focus).
- Focus-visible ring using `--ring` (amber), never removed.
- Touch targets ≥44px on mobile (buttons are h-10/h-12).
- `role="status"` for health banners, `role="img"` + aria-label for the
  pass/fail bar (data communicated in words).
- Icon-only buttons carry `aria-label`.

## Motion

Functional only: hover tints, `animate-pulse` skeletons, `animate-spin`
spinner. No entrance animations, no parallax, no scroll hijacking.
`prefers-reduced-motion` respected by browser default for these primitives.

## Playbook for new screens (for agents)

1. Copy the structure of an existing screen (domain-detail is the reference).
2. Start with the empty/loading/error trio, then wire data.
3. Check mobile at 375px and desktop at 1280px.
4. Read the rendered page in a browser before declaring done.
