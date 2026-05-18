# PHP777  -  Brand & UI System

Single source of truth for **color**, **spacing**, **type**, **radius**, **buttons**, and **section patterns**. Implement changes in [`css/style.css`](css/style.css), shared partials under [`partials/`](partials/), and existing BEM-style blocks - not ad-hoc per page.

Visual identity: **deep navy surfaces**, **near-white type**, **blue primary** (`--primary` family) for navigation and main CTAs, **red accent** (`--accent-gold`  -  legacy name, implements scarlet/coral emphasis). Hero and chrome lean on **`--gradient-hero`** (navy → card blue → deeper blue). There is **no** violet Aurora shell or `body.site` aurora layer in this codebase.

---

## 1. Spacing

There are **no** `--space-*` variables yet. Prefer **reusing existing patterns** from nearby components before inventing new `rem` values.

**Canonical layout anchors** (from `style.css`):

| Pattern | Value | Where |
|---------|--------|--------|
| Section vertical padding | `2.5rem 0` → `4rem 0` from `769px` | `.section` |
| Tighter section band | `1.25rem 0` → `2rem 0` from `769px` | `.section--tight` (blog inline CTA, etc.) |
| Section (small screens) | `1.75rem 0` | `.section` at `max-width: 480px` |
| Section header bottom gap | `2rem` → `3rem` from `769px` | `.section__header` |
| M88 band header gap | `1.75rem` | `.section--m88 .section__header` |
| Container horizontal padding | `max(1rem, safe)` → `max(1.25rem, safe)` from `480px` | `.container` |
| Container max width | `1280px` (`var(--max-width)`) | `.container` |
| SEO zigzag vertical padding | `2.5rem 0` → `4rem 0` from `769px` | `.seo-zigzag` |
| Mobile drawer padding | `calc(4rem + safe-top)` top, sides `max(1.25rem, safe-right)` | `.mobile-menu` |

**Hierarchy habit:** `.section` sets outer rhythm; inner stacks use gaps already common in grids and cards (`0.875rem`–`1.5rem`).

---

## 2. Typography hierarchy

**Family**

- Body / UI: **`'Segoe UI', system-ui, -apple-system, sans-serif`** on `body` (`font-size: 16px`, `line-height: 1.6`, `color: var(--text)`).

**Section titles**

- `.section__title`: `clamp(1.75rem, 3vw, 2.5rem)`, weight `800`.
- `.section__subtitle`: `color: var(--text-muted)`, centered by default; max-width `600px` (use `.section__subtitle--wide` for `42rem`).
- `.section__eyebrow`: uppercase, `letter-spacing: 0.12em`, `color: var(--accent-gold)`.

**Hero**

- `.hero__title`: `clamp(1.75rem, 5vw, 3.5rem)`, weight `800`; accent spans use `var(--accent-gold)`.
- `.hero__subtitle`: ~`1.15rem`, `var(--text-muted)`.

**Long-form**

- **`.seo-content`**: max-width `720px`; paragraphs and lists use **`var(--text-muted)`**.
- **`.blog-article__content`**: same muted treatment for body copy.

**Links**

- Default: `color: var(--primary-light)`; hover: **`var(--accent-gold)`**.

**Do not** introduce one-off heading scales per page; extend `style.css` in one place if a new level is needed.

---

## 3. Border radius hierarchy

Tokens live on `:root`:

| Token | Value | Typical use |
|-------|--------|-------------|
| `--radius-sm` | `8px` | Logo badge, nav links, inputs, skip link |
| `--radius-md` | `12px` | **`.btn`**, strategy boxes |
| `--radius-lg` | `20px` | Cards (product, blog, stat bands, article cover) |
| `--radius-xl` | `28px` | Larger surfaces where used |
| `50px` / `999px` | pill | Hero badge (`.hero__badge`), some chips |

**Buttons:** base `.btn` uses **`border-radius: var(--radius-md)`** (rounded rectangle), not full pill.

**Practical rule:** prefer **`var(--radius-sm|md|lg|xl)`** for UI; the file may still contain occasional literals - align new work to these tokens.

---

## 4. Button hierarchy

Structure: **base** `.btn` + **variant** + optional **size**.

| Variant | Purpose | Visual |
|---------|---------|--------|
| `.btn--primary` | Main blue CTA | `var(--gradient-primary)` (#2563eb → #1d4ed8), white text; optional sparkle overlay in `.promo-card` |
| `.btn--gold` | High-emphasis accent CTA | `var(--gradient-gold)` (red gradient), white text, sparkle animation (`::before`) |
| `.btn--secondary` | Secondary | `var(--bg-card)`, `var(--text)`, border `1px solid rgba(255,255,255,0.2)` |
| `.btn--outline` | Tertiary / ghost-outline | Transparent fill, light border; hover picks up primary tint (blog CTAs, paired with `.btn--primary`) |

| Modifier | Effect |
|----------|--------|
| `.btn--lg` | Larger padding / font |

There is **no** `.btn--ghost` class - use `.btn--outline` or extend `style.css` if you need a softer treatment.

**Hierarchy rule:** one strong CTA (**primary** or **gold**) per logical group; **secondary** or **outline** for alternatives. Base `.btn` includes hover lift + shadow.

---

## 5. Modular sections & DRY

**CSS**

- Vertical bands: **`.section`**; muted band: **`.section--muted`** (`background: rgba(0,0,0,0.2)`); tighter vertical rhythm: **`.section--tight`**.
- Headers: **`.section__header`**, **`.section__title`**, **`.section__subtitle`**; left-aligned variant **`.section__header--left`**; eyebrow **`.section__eyebrow`**.
- Homepage / M88-inspired blocks: **`.section--m88`** and related utilities (`.layout-split`, `.stat-inline`, etc.) further down in `style.css`.
- SEO alternating layout: **`.seo-zigzag`**, **`.seo-block`**, **`.seo-block__*`**.
- Content width: **`.container`** (`max-width: var(--max-width)`).

**HTML / partials**

- Shared chrome: **`partials/header.html`**, **`partials/footer.html`**, **`partials/cta-banner.html`**, **`partials/sidebar.html`**.

**DRY checklist**

1. Spacing: match neighboring sections or §1 before adding arbitrary values.
2. Radius: prefer **`--radius-*`** tokens.
3. Buttons: `.btn` + variant (including `.btn--outline` when needed) + optional `.btn--lg`.
4. Sections: `.section` (+ optional `.section--tight` / `.section--muted`) + `.container` + existing `.section__*` patterns.

---

## 6. Color roles (navy base, blue primary, red accent)

Implement with **`:root` tokens** and shared components - not stray hex on pages unless matching an established gradient.

| Role | Token | Notes |
|------|--------|-------|
| Page / deep background | `--bg-dark` | `#0a1628`; RGB sibling `--bg-deep-rgb` for translucent overlays |
| Cards / panels | `--bg-card`, `--bg-card-hover` | `#132337`, `#1c3554` |
| Primary (blue) | `--primary`, `--primary-dark`, `--primary-light` | `#2563eb`, `#1d4ed8`, `#60a5fa`; `--primary-rgb` for alphas |
| Accent (“gold” name, red UI) | `--accent-gold`, `--accent-gold-light`, `--accent-rgb` | `#dc2626`, `#f87171`, `220, 38, 38` |
| Primary text | `--text` | `#f8fafc` |
| Muted text | `--text-muted` | `#cbd5e1` |
| Gradients | `--gradient-primary`, `--gradient-gold`, `--gradient-hero` | Blue CTA, red CTA, hero wash |

**Shadows:** `--shadow`, `--shadow-lg`.

**Sticky header:** `rgba(var(--bg-deep-rgb), 0.95)` + blur; bottom border uses primary tint.

---

## 7. Long-form & editorial

There is **no** `.prose` or `.section--longform-editorial` module in this codebase.

**Policy / SEO article body**

- **`.seo-content`** inside `.container`: readable column, headings `h2`/`h3`, body **`var(--text-muted)`**.

**Blog**

- **`.blog-article__content`** for article typography; category line uses **`var(--accent-gold)`**.
- Inline promo strip: **`.blog-inline-cta`** (with **`.section--tight`** and **`.cta-banner`**); paired actions use **`.btn--primary`** + **`.btn--outline`**; title rhythm via **`.blog-inline-cta .section__title`** (`margin-bottom: 0.75rem`).

**SEO homepage blocks**

- **`.seo-zigzag`** + **`.seo-block`** for split image/text rows (RTL zigzag on even rows at desktop).

Extend patterns in **`style.css`**; avoid one-off page-only class trees.

---

## 8. Motion & technical reference

- Global easing: **`var(--transition)`** (`0.3s ease`), **`var(--transition-slow)`**, **`var(--transition-bounce)`** where declared.
- Buttons: hover **`translateY(-2px)`** + **`var(--shadow)`**.
- **`sparkle-sweep`** / **`sparkle-twinkle`**: used on `.btn--gold` and promo primary buttons.
- Scroll helper **`.animate-on-scroll`** is forced visible in CSS (Intersection Observer fallback) - do not rely on it to hide content.

---

## 9. Safe areas & mobile

**`:root`** defines **`--safe-top`**, **`--safe-right`**, **`--safe-bottom`**, **`--safe-left`** (`env(safe-area-inset-*, 0px)`). **`padding-left` / `padding-right`** on `.container` and key wrappers use **`max(…rem, var(--safe-*))`** so notched devices stay usable.

---

*When tokens or components change, update this file in the same change so the documentation stays aligned with [`css/style.css`](css/style.css).*
